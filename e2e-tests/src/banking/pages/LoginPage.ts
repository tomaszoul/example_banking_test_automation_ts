/**
 * @file Page object for the banking app login screen.
 * @see {@link ../locators/selectors.ts} for the underlying CSS selectors.
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { HomePage, CustomerLoginPage } from '../locators/selectors'
import { navigateToBank, waitForAngular } from '../helpers/browser-helpers'

/**
 * Encapsulates the Home → Customer Login flow.
 * Provides both granular actions ({@link selectUser}, {@link clickLogin})
 * and a convenience shortcut ({@link loginAsCustomer}).
 */
export class LoginPage {
  constructor(private page: Page) {}

  /** Loads the banking app home page. Ground zero. */
  async goToHome(): Promise<void> {
    await navigateToBank(this.page)
    await expect(this.page.locator(HomePage.heading)).toBeVisible()
  }

  /** Clicks "Customer Login" -- the door to your finances. */
  async selectCustomerLogin(): Promise<void> {
    await this.page.locator(HomePage.customerLoginBtn).click()
    await expect(this.page.locator(CustomerLoginPage.userSelect)).toBeVisible()
  }

  /** Clicks "Bank Manager Login" -- the door to everyone's finances. */
  async selectManagerLogin(): Promise<void> {
    await this.page.locator(HomePage.managerLoginBtn).click()
    await waitForAngular(this.page)
  }

  /** Picks a user from the dropdown by visible name. This reveals the Login button. */
  async selectUser(name: string): Promise<void> {
    const select = this.page.locator(CustomerLoginPage.userSelect)
    await expect(select).toBeVisible()
    await select.selectOption({ label: name })
    // Login button is ng-show guarded -- only visible after user selection
    await expect(this.page.locator(CustomerLoginPage.loginBtn)).toBeVisible()
  }

  /** Submits the login form. The button must be visible (selectUser does this). */
  async clickLogin(): Promise<void> {
    const btn = this.page.locator(CustomerLoginPage.loginBtn)
    await btn.click()
    await waitForAngular(this.page)
  }

  /** Clicks the in-app Home button and waits for the landing page heading. */
  async clickHome(): Promise<void> {
    await this.page.locator(HomePage.homeBtn).click()
    await waitForAngular(this.page)
    await expect(this.page.locator(HomePage.heading)).toBeVisible()
  }

  /** Full login flow in one call -- for tests that have bigger fish to fry. */
  async loginAsCustomer(name: string): Promise<void> {
    await this.goToHome()
    await this.selectCustomerLogin()
    await this.selectUser(name)
    await this.clickLogin()
  }
}
