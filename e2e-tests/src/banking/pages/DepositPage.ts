/**
 * @file Page object for the deposit tab on the customer dashboard.
 * @see {@link ../locators/selectors.ts} for the underlying CSS selectors.
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { CustomerDashboard, DepositPage as DepositSelectors } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

/**
 * Encapsulates the deposit form: open tab, fill amount, submit.
 * {@link depositAmount} wraps the full flow including success assertion.
 */
export class DepositPage {
  constructor(private page: Page) {}

  /** Navigates to the deposit tab from the dashboard. */
  async open(): Promise<void> {
    await this.page.locator(CustomerDashboard.depositBtn).click()
    await waitForAngular(this.page)
    await this.page.locator('form[ng-submit="deposit()"]').waitFor({ state: 'visible', timeout: 5000 })
  }

  /** Types in the deposit amount. Money printer goes brrr. */
  async enterAmount(amount: number): Promise<void> {
    await this.page.locator(DepositSelectors.amountInput).fill(String(amount))
  }

  /** Submits the deposit. No take-backs. */
  async submit(): Promise<void> {
    await this.page.locator(DepositSelectors.submitBtn).click()
    await waitForAngular(this.page)
  }

  /** Asserts the "Deposit Successful" message appeared. */
  async expectSuccess(): Promise<void> {
    await expect(this.page.locator(DepositSelectors.successMessage)).toContainText(
      'Deposit Successful',
      { timeout: 3000 },
    )
  }

  /** Full deposit flow: open tab, enter amount, submit, verify. */
  async depositAmount(amount: number): Promise<void> {
    await this.open()
    await this.enterAmount(amount)
    await this.submit()
    await this.expectSuccess()
  }
}
