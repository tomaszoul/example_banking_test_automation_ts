import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { CustomerDashboard, DepositPage as DepositSelectors } from '../locators/selectors'
import { expectBalanceChange } from '../helpers/assert-helpers'

test.describe('Deposit Flow', () => {
  let login: LoginPage
  let dashboard: CustomerDashboardPage
  let deposit: DepositPage

  test.beforeEach(async ({ page, bankUser }) => {
    login = new LoginPage(page)
    dashboard = new CustomerDashboardPage(page)
    deposit = new DepositPage(page)
    await login.loginAsCustomer(bankUser.name)
    await dashboard.expectLoaded()
  })

  test('should show deposit button and update balance when depositing money', async ({ page }) => {
    const depositBtn = page.locator(CustomerDashboard.depositBtn)
    await expect(depositBtn).toBeVisible()
    await expect(depositBtn).toContainText('Deposit')

    const balanceBefore = await dashboard.getBalance()
    await deposit.depositAmount(10000)
    const balanceAfter = await dashboard.getBalance()
    await expectBalanceChange(balanceBefore, balanceAfter, 10000)
  })

  /**
   * Verifies that invalid deposit inputs leave the balance unchanged.
   * Covers: empty submit (HTML5 required blocks form), zero amount (form submits but no change),
   * and negative amount (number input rejects, balance unchanged).
   */
  test('should not change balance when submitting empty or zero amounts', async ({ page }) => {
    const balanceBefore = await dashboard.getBalance()

    // Empty submit — HTML5 required attribute prevents form submission
    await deposit.open()
    await deposit.submit()
    await expect(page.locator(DepositSelectors.amountInput)).toBeVisible()
    expect(await dashboard.getBalance()).toBe(balanceBefore)

    // Zero amount — form submits but balance should not change
    await deposit.enterAmount(0)
    await deposit.submit()
    expect(await dashboard.getBalance()).toBe(balanceBefore)

    // Negative amount — HTML number input rejects it, balance unchanged
    await page.locator(DepositSelectors.amountInput).fill('-500')
    await deposit.submit()
    expect(await dashboard.getBalance()).toBe(balanceBefore)
  })
})
