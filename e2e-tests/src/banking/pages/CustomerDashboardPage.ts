/**
 * @file Page object for the customer dashboard — the main hub after login.
 * @see {@link ../locators/selectors.ts} for the underlying CSS selectors.
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { CustomerDashboard } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

/**
 * Reads account state (balance, currency, account number) and
 * provides navigation to Deposit / Withdraw / Transactions tabs.
 */
export class CustomerDashboardPage {
  constructor(private page: Page) {}

  /** Returns the customer name from the welcome banner. */
  async getWelcomeText(): Promise<string> {
    return (await this.page.locator(CustomerDashboard.welcomeName).textContent()) ?? ''
  }

  /** Reads the current account number. */
  async getAccountNumber(): Promise<string> {
    return (await this.page.locator(CustomerDashboard.accountNumber).textContent()) ?? ''
  }

  /** Reads the current balance as a number. Where the magic happens. */
  async getBalance(): Promise<number> {
    const text = (await this.page.locator(CustomerDashboard.balance).textContent()) ?? '0'
    return parseInt(text.replace(/[^0-9.-]/g, ''), 10) || 0
  }

  /** Reads the currency label (Dollar, Pound, Rupee). */
  async getCurrency(): Promise<string> {
    return ((await this.page.locator(CustomerDashboard.currency).textContent()) ?? '').trim()
  }

  /** Returns all account numbers available in the dropdown. */
  async getAccountOptions(): Promise<string[]> {
    const options = await this.page
      .locator(`${CustomerDashboard.accountSelect} option`)
      .allTextContents()
    return options.map((o) => o.trim()).filter(Boolean)
  }

  /** Returns the currently selected account number (strips AngularJS type prefix). */
  async getSelectedAccount(): Promise<string> {
    const raw = await this.page.locator(CustomerDashboard.accountSelect).inputValue()
    return raw.replace(/^[a-z]+:/i, '')
  }

  /** Switches to a different account by its number. */
  async selectAccount(accountNumber: string): Promise<void> {
    await this.page.locator(CustomerDashboard.accountSelect).selectOption(accountNumber)
    await waitForAngular(this.page)
  }

  /** Clicks Logout. Session over, back to the login screen. */
  async clickLogout(): Promise<void> {
    await this.page.locator(CustomerDashboard.logoutBtn).click()
    await waitForAngular(this.page)
  }

  /** Verifies the dashboard loaded with a welcome message. */
  async expectLoaded(): Promise<void> {
    await expect(this.page.locator(CustomerDashboard.welcomeName)).toBeVisible()
  }
}
