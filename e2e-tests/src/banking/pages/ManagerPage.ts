/**
 * Page object for the Bank Manager portal.
 *
 * Wraps the three manager tabs (Add Customer, Open Account, Customers) and
 * handles JavaScript alert dialogs for success messages.
 *
 * @see {@link ../locators/selectors.ts} — ManagerPage selectors
 */
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import type { Currency } from '../data/customers'
import { ManagerPage as MP } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

export type { Currency }

export interface AddCustomerResult {
  customerId: number
}

export interface OpenAccountResult {
  accountNumber: string
}

/**
 * Encapsulates the Bank Manager UI: add customer, open account, search, delete.
 */
export class ManagerPage {
  constructor(private page: Page) {}

  /** Navigates to the manager portal. Assumes already on home. */
  async goToManager(): Promise<void> {
    await this.page.locator(MP.addCustomerTab).waitFor({ state: 'visible', timeout: 5000 })
  }

  /** Clicks the Add Customer tab and waits for the form. */
  async openAddCustomerTab(): Promise<void> {
    await this.page.locator(MP.addCustomerTab).click()
    await waitForAngular(this.page)
    await expect(this.page.locator(MP.firstNameInput)).toBeVisible()
  }

  /**
   * Adds a customer and captures the alert. Returns the customer ID from the alert.
   * The app shows: "Customer added successfully with customer id :{id}"
   */
  async addCustomer(
    firstName: string,
    lastName: string,
    postCode: string,
  ): Promise<AddCustomerResult> {
    const dialogPromise = this.page
      .waitForEvent('dialog', { timeout: 5000 })
      .then((d) => {
        const msg = d.message()
        void d.accept()
        return msg
      })
    await this.page.locator(MP.firstNameInput).fill(firstName)
    await this.page.locator(MP.lastNameInput).fill(lastName)
    await this.page.locator(MP.postCodeInput).fill(postCode)
    await this.page.locator('form[ng-submit="addCustomer()"]').evaluate((form) => form.requestSubmit())

    const message = await dialogPromise
    await waitForAngular(this.page)

    const match = message.match(/customer id\s*:\s*(\d+)/i)
    const customerId = match ? parseInt(match[1], 10) : 0
    return { customerId }
  }

  /** Clicks the Open Account tab and waits for the form. */
  async openOpenAccountTab(): Promise<void> {
    await this.page.locator(MP.openAccountTab).click()
    await waitForAngular(this.page)
    await expect(this.page.locator(MP.customerSelect)).toBeVisible()
  }

  /**
   * Opens an account for a customer and captures the alert.
   * customerName: "First Last" as shown in the dropdown.
   * Returns the account number from the alert.
   * The app shows: "Account created successfully with account Number :{number}"
   */
  async openAccount(customerName: string, currency: Currency): Promise<OpenAccountResult> {
    const dialogPromise = this.page
      .waitForEvent('dialog', { timeout: 5000 })
      .then((d) => {
        const msg = d.message()
        void d.accept()
        return msg
      })
    await this.page.locator(MP.customerSelect).selectOption({ label: customerName })
    await this.page.locator(MP.currencySelect).selectOption(currency)
    await this.page.locator('form[ng-submit="process()"]').evaluate((form) => form.requestSubmit())

    const message = await dialogPromise
    await waitForAngular(this.page)

    const match = message.match(/account Number\s*:\s*(\d+)/i)
    const accountNumber = match ? match[1] : ''
    return { accountNumber }
  }

  /** Clicks the Customers tab and waits for the table. */
  async openCustomersTab(): Promise<void> {
    await this.page.locator(MP.customersTab).click()
    await waitForAngular(this.page)
    await expect(this.page.locator(MP.customersTable)).toBeVisible()
  }

  /** Types in the search input to filter customers. */
  async searchCustomer(query: string): Promise<void> {
    await this.page.locator(MP.searchInput).fill(query)
    await waitForAngular(this.page)
  }

  /** Returns visible customer rows as { firstName, lastName, postCode }[]. */
  async getCustomerRows(): Promise<Array<{ firstName: string; lastName: string; postCode: string }>> {
    const rows = this.page.locator(`${MP.customersTable} tbody tr`)
    const count = await rows.count()
    const result: Array<{ firstName: string; lastName: string; postCode: string }> = []
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const cells = row.locator('td')
      const firstName = (await cells.nth(0).textContent())?.trim() ?? ''
      const lastName = (await cells.nth(1).textContent())?.trim() ?? ''
      const postCode = (await cells.nth(2).textContent())?.trim() ?? ''
      result.push({ firstName, lastName, postCode })
    }
    return result
  }

  /**
   * Clicks Delete for the first row matching the given first and last name.
   * No alert is shown for delete.
   */
  async deleteCustomer(firstName: string, lastName: string): Promise<void> {
    const rows = this.page.locator(`${MP.customersTable} tbody tr`)
    const count = await rows.count()
    for (let i = 0; i < count; i++) {
      const row = rows.nth(i)
      const cells = row.locator('td')
      const rowFirstName = (await cells.nth(0).textContent())?.trim() ?? ''
      const rowLastName = (await cells.nth(1).textContent())?.trim() ?? ''
      if (rowFirstName === firstName && rowLastName === lastName) {
        await row.locator(MP.deleteBtn).click()
        await waitForAngular(this.page)
        return
      }
    }
  }
}
