import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'

/**
 * Intentionally failing spec used to validate failure reporting and trace generation.
 * Do not fix — failures are expected.
 */
test.describe('Failing Deposit Test', () => {
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

  /** Expects balance + 5000 but deposit adds 10000 — assertion fails for report validation. */
  test('This test will fail: should fail when deposit of 10000 yields unexpected balance of 5000', async () => {
    const balanceBefore = await dashboard.getBalance()

    await deposit.depositAmount(10000)

    const balanceAfter = await dashboard.getBalance()
    const expected = balanceBefore + 5000

    // following line should fail to demonstrate report generation...
    expect(balanceAfter).toBe(expected)
  })
})
