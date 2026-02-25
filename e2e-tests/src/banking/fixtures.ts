/**
 * Custom test fixtures for the banking E2E suite.
 *
 * Provides a `bankUser` option typed as `Customer`, giving specs access to
 * both `bankUser.name` (for login) and `bankUser.accounts` (for account-switching).
 *
 * Uses a fresh browser context per test when BANK_FULL_RUN=1 so full runs
 * get isolated localStorage (avoids cross-test pollution).
 *
 * @see {@link ./data/customers.ts} for the Customer type and predefined users.
 */
import { test as base } from '@playwright/test'
import { Customers, type Customer } from './data/customers'

const BANK_BASE_URL =
  process.env.BANK_BASE_URL ||
  'https://www.globalsqa.com/angularJs-protractor/BankingProject/#/login'

type BankingOptions = {
  bankUser: Customer
}

const isFullRun = process.env.BANK_FULL_RUN === '1'

export const test = base.extend<BankingOptions>({
  bankUser: [Customers.HarryPotter, { option: true }],

  context: async ({ browser }, use, testInfo) => {
    const useOpts = (testInfo.project.use || {}) as Record<string, unknown>
    const baseURL = (useOpts.baseURL as string) ?? BANK_BASE_URL
    const viewport = (useOpts.viewport as { width: number; height: number }) ?? { width: 1280, height: 720 }
    const context = await browser.newContext({
      baseURL,
      viewport,
      ...(isFullRun ? { storageState: undefined } : {}),
    })
    await use(context)
    await context.close()
  },
})

export { expect } from '@playwright/test'
