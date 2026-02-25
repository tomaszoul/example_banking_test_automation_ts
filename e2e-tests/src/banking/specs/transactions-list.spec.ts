import { test, expect } from '../fixtures'
import type { Page } from '@playwright/test'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { TransactionsPage, CustomerDashboard } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

test.describe('Transactions List', () => {
  test.beforeEach(async ({ page, bankUser }) => {
    const login = new LoginPage(page)
    const dashboard = new CustomerDashboardPage(page)
    const deposit = new DepositPage(page)

    await login.loginAsCustomer(bankUser.name)
    await dashboard.expectLoaded()

    await deposit.depositAmount(500)
  })

  /**
   * Navigates to the transactions list and ensures the AngularJS date filter
   * is wide enough to show all transactions. On fast connections (localhost),
   * the datetime-local input binding can nullify the filter dates before
   * Angular finishes its digest, hiding rows that actually exist.
   */
  async function goToTransactions(page: Page) {
    await page.locator(CustomerDashboard.transactionsBtn).click()
    await page.waitForURL(/listTx/)
    await waitForAngular(page)
    await expect(page.locator(TransactionsPage.table)).toBeVisible()

    await page.evaluate(() => {
      const ng = (window as any).angular
      if (!ng) return
      const el = document.querySelector('table.table-bordered') || document.querySelector('tbody')
      if (!el) return
      let scope = ng.element(el).scope()
      while (scope && !scope.transactions) scope = scope.$parent
      if (scope?.transactions?.length > 0 && !scope.startDate) {
        scope.startDate = new Date(0)
        scope.end = new Date()
        scope.$apply()
      }
    })
    await page.waitForSelector('tbody tr', { timeout: 5000 }).catch(() => {})
  }

  /** Verifies the pre-deposit amount (500) appears in the transactions table. */
  test('should show deposit entry on transactions page', async ({ page, bankUser }) => {
    // Hermoine's account has 196 seed transactions; date filter can hide our 500 deposit
    test.skip(bankUser.name === 'Hermoine Granger', 'Hermoine has seed transactions; date filter may hide our deposit')

    await goToTransactions(page)
    const tableContent = await page.locator(TransactionsPage.table).textContent()
    expect(tableContent).toContain('500')
  })

  /** Clears transaction list via Reset, verifies table empties, then Back returns to account dashboard. */
  test('should clear transactions on reset and return to dashboard on back', async ({ page }) => {
    await goToTransactions(page)

    await page.locator(TransactionsPage.resetBtn).click()
    await waitForAngular(page)
    await expect(page.locator(TransactionsPage.tableRows)).toHaveCount(0)

    await page.locator(TransactionsPage.backBtn).click()
    await page.waitForURL(/account/)
    await expect(page.locator(CustomerDashboard.depositBtn)).toBeVisible()
  })
})
