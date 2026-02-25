import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
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
})
