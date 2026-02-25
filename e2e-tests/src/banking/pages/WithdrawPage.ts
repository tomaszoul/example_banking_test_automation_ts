/**
 * @file Page object for the withdrawal tab on the customer dashboard.
 * @see {@link ../locators/selectors.ts} for the underlying CSS selectors.
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { CustomerDashboard, WithdrawPage as WithdrawSelectors } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

/**
 * Encapsulates the withdrawal form: open tab, fill amount, submit.
 * {@link withdrawAmount} wraps the full flow (without success assertion —
 * use {@link expectSuccess} separately to verify).
 */
export class WithdrawPage {
  constructor(private page: Page) {}

  /** Navigates to the withdrawal tab from the dashboard. */
  async open(): Promise<void> {
    await this.page.locator(CustomerDashboard.withdrawBtn).click()
    await waitForAngular(this.page)
    await this.page.locator('form[ng-submit="withdrawl()"]').waitFor({ state: 'visible', timeout: 5000 })
  }

  /** Types in the withdrawal amount. Easy come, easy go. */
  async enterAmount(amount: number): Promise<void> {
    await this.page.locator(WithdrawSelectors.amountInput).fill(String(amount))
  }

  /** Submits the withdrawal. */
  async submit(): Promise<void> {
    await this.page.locator(WithdrawSelectors.submitBtn).click()
    await waitForAngular(this.page)
  }

  /** Reads the result message (success or failure). */
  async getMessage(): Promise<string> {
    return (await this.page.locator(WithdrawSelectors.message).textContent()) ?? ''
  }

  /** Asserts the transaction succeeded. */
  async expectSuccess(): Promise<void> {
    await expect(this.page.locator(WithdrawSelectors.message)).toContainText(
      'Transaction successful',
      { timeout: 3000 },
    )
  }

  /** Full withdrawal flow: open tab, enter amount, submit. */
  async withdrawAmount(amount: number): Promise<void> {
    await this.open()
    await this.enterAmount(amount)
    await this.submit()
  }
}
