import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { WithdrawPage } from '../pages/WithdrawPage'
import { WithdrawPage as WithdrawSelectors } from '../locators/selectors'

test.describe('Withdrawal Flow', () => {
  let login: LoginPage
  let dashboard: CustomerDashboardPage
  let deposit: DepositPage
  let withdraw: WithdrawPage

  test.beforeEach(async ({ page, bankUser }) => {
    login = new LoginPage(page)
    dashboard = new CustomerDashboardPage(page)
    deposit = new DepositPage(page)
    withdraw = new WithdrawPage(page)

    await login.loginAsCustomer(bankUser.name)
    await dashboard.expectLoaded()
    await deposit.depositAmount(5000)
  })

  /**
   * Verifies balance decreases by withdrawal amount and that withdrawing the exact
   * remaining balance succeeds, leaving balance at zero.
   */
  test('should reduce balance on withdrawal and zero out on exact balance withdrawal', async () => {
    const balanceBefore = await dashboard.getBalance()

    await withdraw.withdrawAmount(1000)
    await withdraw.expectSuccess()
    expect(await dashboard.getBalance()).toBe(balanceBefore - 1000)

    // Withdraw exact remaining balance — should succeed and hit zero
    const remaining = await dashboard.getBalance()
    await withdraw.withdrawAmount(remaining)
    await withdraw.expectSuccess()
    expect(await dashboard.getBalance()).toBe(0)
  })

  /**
   * Verifies withdrawal validation: overdraft rejected with "Transaction Failed",
   * empty/zero/negative amounts leave balance unchanged (HTML5 required blocks empty).
   */
  test('should reject overdraft, empty, zero, and negative amounts', async ({ page }) => {
    const balance = await dashboard.getBalance()

    // Overdraft — one dollar more than balance
    await withdraw.withdrawAmount(balance + 1)
    const message = await withdraw.getMessage()
    expect(message).toContain('Transaction Failed')

    // Balance should be unchanged after failed withdrawal
    expect(await dashboard.getBalance()).toBe(balance)

    // Empty submit — HTML5 required attribute blocks form submission
    await withdraw.open()
    await page.locator(WithdrawSelectors.amountInput).fill('')
    await withdraw.submit()
    expect(await dashboard.getBalance()).toBe(balance)

    // Zero amount
    await withdraw.enterAmount(0)
    await withdraw.submit()
    expect(await dashboard.getBalance()).toBe(balance)

    // Negative amount
    await page.locator(WithdrawSelectors.amountInput).fill('-100')
    await withdraw.submit()
    expect(await dashboard.getBalance()).toBe(balance)
  })
})
