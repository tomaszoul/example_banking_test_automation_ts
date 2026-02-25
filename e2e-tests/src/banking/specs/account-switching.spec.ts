import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { CURRENCIES, allAccountNumbers } from '../data/customers'
import type { Currency } from '../data/customers'

test.describe('Account Dashboard & Switching', () => {
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

  test('should show correct welcome name, default account, and dropdown options', async ({ bankUser }) => {
    const name = await dashboard.getWelcomeText()
    expect(name).toContain(bankUser.name)

    const selected = await dashboard.getSelectedAccount()
    expect(selected).toBe(bankUser.accounts.Dollar)

    const displayedNumber = await dashboard.getAccountNumber()
    expect(displayedNumber).toContain(bankUser.accounts.Dollar)
    expect(await dashboard.getCurrency()).toBe('Dollar')

    const options = await dashboard.getAccountOptions()
    const expected = allAccountNumbers(bankUser)
    for (const acctNum of expected) {
      expect(options, `dropdown should contain ${acctNum}`).toContain(acctNum)
    }
    expect(options).toHaveLength(expected.length)
  })

  test('should show correct account info when switching currencies', async ({ bankUser }) => {
    for (const currency of CURRENCIES) {
      await dashboard.selectAccount(bankUser.accounts[currency])

      expect(await dashboard.getAccountNumber()).toContain(bankUser.accounts[currency])
      expect(await dashboard.getCurrency()).toBe(currency)
      expect(await dashboard.getBalance()).toBeGreaterThanOrEqual(0)
    }
  })

  /**
   * Deposits on Dollar account; verifies Pound and Rupee stay at 0. Switches back to Dollar
   * to confirm the deposit is persisted and not lost during account switching.
   */
  test('should isolate deposits between accounts', async ({ bankUser }) => {
    await dashboard.selectAccount(bankUser.accounts.Dollar)
    const dollarBefore = await dashboard.getBalance()
    await deposit.depositAmount(2500)
    expect(await dashboard.getBalance()).toBe(dollarBefore + 2500)

    await dashboard.selectAccount(bankUser.accounts.Pound)
    expect(await dashboard.getBalance(), 'Pound should still be 0').toBe(0)

    await dashboard.selectAccount(bankUser.accounts.Rupee)
    expect(await dashboard.getBalance(), 'Rupee should still be 0').toBe(0)

    // Switch back — balance preserved
    await dashboard.selectAccount(bankUser.accounts.Dollar)
    expect(await dashboard.getBalance()).toBe(dollarBefore + 2500)
  })

  /**
   * Records baseline balances for all currencies, deposits per-currency amounts,
   * then verifies each account reflects its own deposit. Also checks multiple
   * sequential deposits on one account accumulate correctly.
   */
  test('should accumulate deposits correctly across multiple accounts', async ({ bankUser }) => {
    const balancesBefore: Record<Currency, number> = {} as Record<Currency, number>
    for (const currency of CURRENCIES) {
      await dashboard.selectAccount(bankUser.accounts[currency])
      balancesBefore[currency] = await dashboard.getBalance()
    }

    const deposits: Record<Currency, number> = { Dollar: 1000, Pound: 2000, Rupee: 3000 }
    for (const currency of CURRENCIES) {
      await dashboard.selectAccount(bankUser.accounts[currency])
      await deposit.depositAmount(deposits[currency])
    }

    for (const currency of CURRENCIES) {
      await dashboard.selectAccount(bankUser.accounts[currency])
      expect(await dashboard.getBalance(), `${currency} balance`).toBe(
        balancesBefore[currency] + deposits[currency],
      )
    }

    // Multiple deposits on one account
    await dashboard.selectAccount(bankUser.accounts.Rupee)
    await deposit.depositAmount(500)
    await deposit.depositAmount(500)
    expect(await dashboard.getBalance()).toBe(balancesBefore.Rupee + 3000 + 500 + 500)
  })

  /**
   * Rapidly cycles through account dropdown 3 times. Ensures dropdown state,
   * currency label, and account number stay in sync with selected account.
   */
  test('should keep UI in sync during rapid account switching', async ({ bankUser }) => {
    for (let i = 0; i < 3; i++) {
      for (const currency of CURRENCIES) {
        await dashboard.selectAccount(bankUser.accounts[currency])
        expect(await dashboard.getCurrency()).toBe(currency)
        expect(await dashboard.getAccountNumber()).toContain(bankUser.accounts[currency])
      }
    }
  })
})
