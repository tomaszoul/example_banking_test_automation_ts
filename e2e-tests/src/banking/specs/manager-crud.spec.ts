import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { ManagerPage } from '../pages/ManagerPage'
import type { Currency } from '../pages/ManagerPage'

test.describe('Manager CRUD', () => {
  test.beforeEach(async ({ page }) => {
    const login = new LoginPage(page)
    await login.goToHome()
    await login.selectManagerLogin()
    const manager = new ManagerPage(page)
    await manager.goToManager()
  })

  test('should show success alert with customer id when adding customer', async ({ page }) => {
    const manager = new ManagerPage(page)
    await manager.openAddCustomerTab()

    const result = await manager.addCustomer('Test', 'CRUDUser', 'E99999')
    expect(result.customerId).toBeGreaterThan(0)
  })

  /** Opens a Dollar account for Harry Potter and verifies a non-empty account number is returned. */
  test('should show success alert with account number when opening account for existing customer', async ({
    page,
  }) => {
    const manager = new ManagerPage(page)
    await manager.openOpenAccountTab()

    const result = await manager.openAccount('Harry Potter', 'Dollar')
    expect(result.accountNumber.length).toBeGreaterThan(0)
  })

  test('should list customers and filter them by search', async ({ page }) => {
    const manager = new ManagerPage(page)
    await manager.openCustomersTab()

    const allRows = await manager.getCustomerRows()
    expect(allRows.length).toBeGreaterThan(0)
    expect(allRows.some((r) => r.firstName === 'Harry' && r.lastName === 'Potter')).toBe(true)

    await manager.searchCustomer('Harry')
    const filteredRows = await manager.getCustomerRows()
    expect(filteredRows.length).toBeGreaterThan(0)
    expect(filteredRows.every((r) => r.firstName.includes('Harry') || r.lastName.includes('Harry'))).toBe(
      true,
    )
  })

  /**
   * Full CRUD lifecycle: add customer with unique postcode, open Dollar/Pound/Rupee accounts,
   * search to locate them, delete customer, then verify they no longer appear in search.
   */
  test('should add customer, open accounts, search, and delete customer', async ({ page }) => {
    const manager = new ManagerPage(page)
    const uniquePostCode = `E${Date.now().toString().slice(-6)}`

    await manager.openAddCustomerTab()
    const addResult = await manager.addCustomer('Delete', 'MeUser', uniquePostCode)
    expect(addResult.customerId).toBeGreaterThan(0)

    await manager.openOpenAccountTab()
    for (const currency of ['Dollar', 'Pound', 'Rupee'] as Currency[]) {
      const openResult = await manager.openAccount('Delete MeUser', currency)
      expect(openResult.accountNumber.length).toBeGreaterThan(0)
    }

    await manager.openCustomersTab()
    await manager.searchCustomer('Delete')
    const beforeDelete = await manager.getCustomerRows()
    expect(beforeDelete.some((r) => r.firstName === 'Delete' && r.lastName === 'MeUser')).toBe(true)

    await manager.deleteCustomer('Delete', 'MeUser')
    await manager.searchCustomer('Delete')
    const afterDelete = await manager.getCustomerRows()
    expect(afterDelete.some((r) => r.firstName === 'Delete' && r.lastName === 'MeUser')).toBe(false)
  })

  /**
   * Manager deletes every customer except Neville Longbottom, navigates home via the
   * in-app Home button, logs in as Neville, and verifies the dashboard loads correctly.
   */
  test('should delete all customers except Neville then login as Neville', async ({ page }) => {
    const login = new LoginPage(page)
    const manager = new ManagerPage(page)
    const dashboard = new CustomerDashboardPage(page)

    await manager.openCustomersTab()
    await manager.searchCustomer('')

    // eslint-disable-next-line no-constant-condition
    while (true) {
      const rows = await manager.getCustomerRows()
      const nonNeville = rows.filter(
        (r) => !(r.firstName === 'Neville' && r.lastName === 'Longbottom') && r.firstName,
      )
      if (nonNeville.length === 0) break
      await manager.deleteCustomer(nonNeville[0].firstName, nonNeville[0].lastName)
    }

    const remaining = await manager.getCustomerRows()
    expect(remaining).toHaveLength(1)
    expect(remaining[0].firstName).toBe('Neville')
    expect(remaining[0].lastName).toBe('Longbottom')

    await login.clickHome()
    await login.selectCustomerLogin()
    await login.selectUser('Neville Longbottom')
    await login.clickLogin()

    await dashboard.expectLoaded()
    const welcome = await dashboard.getWelcomeText()
    expect(welcome).toContain('Neville')
    expect(welcome).toContain('Longbottom')
  })

  /**
   * CRITICAL E2E: Create new user -> open account -> login as that user -> deposit.
   * Validates the full manager-to-customer flow end-to-end.
   */
  test('should create user, open account, login as that user, and deposit', async ({ page }) => {
    const login = new LoginPage(page)
    const manager = new ManagerPage(page)
    const dashboard = new CustomerDashboardPage(page)
    const deposit = new DepositPage(page)

    const uniquePostCode = `F${Date.now().toString().slice(-6)}`
    const fullName = 'Severus Snapcharge'

    await manager.openAddCustomerTab()
    const addResult = await manager.addCustomer('Severus', 'Snapcharge', uniquePostCode)
    expect(addResult.customerId).toBeGreaterThan(0)

    await manager.openOpenAccountTab()
    const openResult = await manager.openAccount(fullName, 'Dollar')
    expect(openResult.accountNumber.length).toBeGreaterThan(0)

    await login.clickHome()
    await login.selectCustomerLogin()
    await login.selectUser(fullName)
    await login.clickLogin()

    await dashboard.expectLoaded()
    const welcome = await dashboard.getWelcomeText()
    expect(welcome).toContain('Severus')
    expect(welcome).toContain('Snapcharge')

    const balanceBefore = await dashboard.getBalance()
    await deposit.depositAmount(500)
    const balanceAfter = await dashboard.getBalance()
    expect(balanceAfter).toBe(balanceBefore + 500)
  })
})
