# E2E Best Practices -- Reference Examples

Concrete code examples from this repository. See [SKILL.md](SKILL.md) for the guidelines.

---

## Selector Registry

**File:** `e2e-tests/src/banking/locators/selectors.ts`

```typescript
/** Landing page -- entry point with Customer / Manager login buttons. */
export const HomePage = {
  heading: 'strong.mainHeading',
  customerLoginBtn: 'button[ng-click="customer()"]',
  managerLoginBtn: 'button[ng-click="manager()"]',
} as const

/** Main dashboard -- account info, balance, and navigation to sub-pages. */
export const CustomerDashboard = {
  welcomeName: 'span.fontBig',
  accountNumber: 'div.center[ng-hide="noAccount"] strong:nth-of-type(1)',
  balance: 'div.center[ng-hide="noAccount"] strong:nth-of-type(2)',
  currency: 'div.center[ng-hide="noAccount"] strong:nth-of-type(3)',
  accountSelect: '#accountSelect',
  transactionsBtn: 'button[ng-click="transactions()"]',
  depositBtn: 'button[ng-click="deposit()"]',
  withdrawBtn: 'button[ng-click="withdrawl()"]',
  logoutBtn: 'button[ng-click="byebye()"]',
} as const

/** Bank manager portal -- add customers, open accounts, search & delete. */
export const ManagerPage = {
  addCustomerTab: 'button[ng-click="addCust()"]',
  firstNameInput: 'input[ng-model="fName"]',
  lastNameInput: 'input[ng-model="lName"]',
  postCodeInput: 'input[ng-model="postCd"]',
  addCustomerBtn: 'button[ng-click="addCustomer()"]',
  // ...
} as const
```

Key points:
- Each object is `as const` for type safety -- typos in spec imports become compile errors.
- Strategy: `#id` first, then `[ng-click]`/`[ng-model]`, then role+text.
- No selector strings exist outside this file.

---

## Page Object Pattern

**File:** `e2e-tests/src/banking/pages/DepositPage.ts`

```typescript
import type { Page } from '@playwright/test'
import { expect } from '@playwright/test'
import { CustomerDashboard, DepositPage as DepositSelectors } from '../locators/selectors'
import { waitForAngular } from '../helpers/browser-helpers'

export class DepositPage {
  constructor(private page: Page) {}

  async open(): Promise<void> {
    await this.page.locator(CustomerDashboard.depositBtn).click()
    await waitForAngular(this.page)
    await this.page.locator('form[ng-submit="deposit()"]')
      .waitFor({ state: 'visible', timeout: 5000 })
  }

  async enterAmount(amount: number): Promise<void> {
    await this.page.locator(DepositSelectors.amountInput).fill(String(amount))
  }

  async submit(): Promise<void> {
    await this.page.locator(DepositSelectors.submitBtn).click()
    await waitForAngular(this.page)
  }

  async expectSuccess(): Promise<void> {
    await expect(this.page.locator(DepositSelectors.successMessage))
      .toContainText('Deposit Successful', { timeout: 3000 })
  }

  /** Full deposit flow: open tab, enter amount, submit, verify. */
  async depositAmount(amount: number): Promise<void> {
    await this.open()
    await this.enterAmount(amount)
    await this.submit()
    await this.expectSuccess()
  }
}
```

Notice:
- Constructor takes only `Page`.
- All locators come from `selectors.ts` imports.
- Granular methods (`open`, `enterAmount`, `submit`) and a convenience method (`depositAmount`).
- `waitForAngular` called after actions that trigger AngularJS digest.

---

## Dialog Handling

**File:** `e2e-tests/src/banking/pages/ManagerPage.ts` -- `addCustomer()` method

```typescript
async addCustomer(
  firstName: string,
  lastName: string,
  postCode: string,
): Promise<AddCustomerResult> {
  // 1. Start listening for the dialog BEFORE the action
  const dialogPromise = this.page
    .waitForEvent('dialog', { timeout: 5000 })
    .then((d) => {
      const msg = d.message()
      void d.accept()       // 2. Always accept/dismiss to unblock the page
      return msg
    })

  // 3. Fill form and submit (this triggers the alert)
  await this.page.locator(MP.firstNameInput).fill(firstName)
  await this.page.locator(MP.lastNameInput).fill(lastName)
  await this.page.locator(MP.postCodeInput).fill(postCode)
  await this.page.locator('form[ng-submit="addCustomer()"]')
    .evaluate((form) => form.requestSubmit())

  // 4. Await the dialog and parse the message
  const message = await dialogPromise
  await waitForAngular(this.page)

  const match = message.match(/customer id\s*:\s*(\d+)/i)
  const customerId = match ? parseInt(match[1], 10) : 0
  return { customerId }
}
```

The same pattern applies to `openAccount()` (parsing account number from the alert).

---

## Custom Fixtures

**File:** `e2e-tests/src/banking/fixtures.ts`

```typescript
import { test as base } from '@playwright/test'
import { Customers, type Customer } from './data/customers'

type BankingOptions = {
  bankUser: Customer
}

export const test = base.extend<BankingOptions>({
  bankUser: [Customers.HarryPotter, { option: true }],

  context: async ({ browser }, use, testInfo) => {
    const useOpts = (testInfo.project.use || {}) as Record<string, unknown>
    const baseURL = (useOpts.baseURL as string) ?? BANK_BASE_URL
    const viewport = (useOpts.viewport as { width: number; height: number })
      ?? { width: 1280, height: 720 }
    const context = await browser.newContext({ baseURL, viewport })
    await use(context)
    await context.close()
  },
})

export { expect } from '@playwright/test'
```

Specs always import from this file:

```typescript
import { test, expect } from '../fixtures'
```

This gives every test access to `bankUser` with full type safety.

---

## Test Data

**File:** `e2e-tests/src/banking/data/customers.ts`

```typescript
export type Currency = 'Dollar' | 'Pound' | 'Rupee'

export interface Customer {
  name: string
  accounts: Record<Currency, string>
}

export const Customers = {
  HermoineGranger: {
    name: 'Hermoine Granger',
    accounts: { Dollar: '1001', Pound: '1002', Rupee: '1003' },
  },
  HarryPotter: {
    name: 'Harry Potter',
    accounts: { Dollar: '1004', Pound: '1005', Rupee: '1006' },
  },
  // ... Ron, Albus, Neville
} as const satisfies Record<string, Customer>

export function allAccountNumbers(customer: Customer): string[] {
  return CURRENCIES.map((c) => customer.accounts[c])
}
```

Account numbers are deterministic -- derived from the app's mock data loader. Tests reference them via `bankUser.accounts.Dollar`, never as hardcoded strings.

---

## Spec Structure

**File:** `e2e-tests/src/banking/specs/deposit.spec.ts`

```typescript
import { test, expect } from '../fixtures'
import { LoginPage } from '../pages/LoginPage'
import { CustomerDashboardPage } from '../pages/CustomerDashboardPage'
import { DepositPage } from '../pages/DepositPage'
import { CustomerDashboard, DepositPage as DepositSelectors } from '../locators/selectors'
import { expectBalanceChange } from '../helpers/assert-helpers'

test.describe('Deposit Flow', () => {
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

  test('should show deposit button and update balance when depositing money',
    async ({ page }) => {
      const depositBtn = page.locator(CustomerDashboard.depositBtn)
      await expect(depositBtn).toBeVisible()
      await expect(depositBtn).toContainText('Deposit')

      const balanceBefore = await dashboard.getBalance()
      await deposit.depositAmount(10000)
      const balanceAfter = await dashboard.getBalance()
      await expectBalanceChange(balanceBefore, balanceAfter, 10000)
    })

  test('should not change balance when submitting empty or zero amounts',
    async ({ page }) => {
      const balanceBefore = await dashboard.getBalance()

      await deposit.open()
      await deposit.submit()
      await expect(page.locator(DepositSelectors.amountInput)).toBeVisible()
      expect(await dashboard.getBalance()).toBe(balanceBefore)

      await deposit.enterAmount(0)
      await deposit.submit()
      expect(await dashboard.getBalance()).toBe(balanceBefore)
    })
})
```

Key points:
- `test` and `expect` imported from `../fixtures`.
- `beforeEach` sets up page objects and performs login.
- Test names describe user-visible behavior.
- Page objects handle all interactions.
- Assertions check meaningful outcomes (balance changed by expected amount).

---

## Assert Helpers

**File:** `e2e-tests/src/banking/helpers/assert-helpers.ts`

```typescript
import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

export async function expectVisible(locator: Locator, timeout = 5000): Promise<void> {
  await expect(locator).toBeVisible({ timeout })
}

export async function expectBalanceChange(
  balanceBefore: number,
  balanceAfter: number,
  delta: number,
): Promise<void> {
  expect(balanceAfter).toBe(balanceBefore + delta)
}
```

Thin wrappers that reduce boilerplate. Add new helpers here when you find yourself repeating the same assertion pattern across multiple specs.

---

## AngularJS Wait

**File:** `e2e-tests/src/banking/helpers/browser-helpers.ts`

```typescript
export async function waitForAngular(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const ng = (window as any).angular
        if (!ng) return true
        const el = document.querySelector('[ng-app]') || document.body
        const ngEl = ng.element(el)
        if (!ngEl || typeof ngEl.injector !== 'function') return true
        const injector = ngEl.injector()
        if (!injector) return true
        try {
          const $browser = injector.get('$browser')
          return new Promise<boolean>((resolve) => {
            $browser.notifyWhenNoOutstandingRequests(() => resolve(true))
            setTimeout(() => resolve(true), 250)
          })
        } catch {
          return true
        }
      },
      null,
      { timeout: 3000 },
    )
  } catch {
    // Swallow: app is ready enough
  }
}
```

This replaces brittle `page.waitForTimeout(500)` calls. It asks AngularJS itself whether it is done processing, with a 250ms safety fallback and a 3-second outer timeout.

---

## Web-First Assertions vs Manual Assertions

```typescript
// GOOD: web-first -- Playwright waits up to the timeout for the condition
await expect(page.locator(selector)).toBeVisible()
await expect(page.locator(selector)).toContainText('Deposit Successful')
await expect(page.locator(selector)).toHaveCount(0)

// BAD: manual -- instant check, no retry, leads to flaky tests
expect(await page.locator(selector).isVisible()).toBe(true)
expect(await page.locator(selector).textContent()).toContain('Deposit Successful')
```

The difference: web-first assertions auto-retry until the timeout. Manual assertions check once and fail immediately. Always prefer web-first assertions.

---

## Full CRUD Test Example

**File:** `e2e-tests/src/banking/specs/manager-crud.spec.ts` -- "should add customer, open accounts, search, and delete customer"

```typescript
test('should add customer, open accounts, search, and delete customer',
  async ({ page }) => {
    const manager = new ManagerPage(page)
    const uniquePostCode = `E${Date.now().toString().slice(-6)}`

    // Create
    await manager.openAddCustomerTab()
    const addResult = await manager.addCustomer('Delete', 'MeUser', uniquePostCode)
    expect(addResult.customerId).toBeGreaterThan(0)

    // Open accounts for all currencies
    await manager.openOpenAccountTab()
    for (const currency of ['Dollar', 'Pound', 'Rupee'] as Currency[]) {
      const openResult = await manager.openAccount('Delete MeUser', currency)
      expect(openResult.accountNumber.length).toBeGreaterThan(0)
    }

    // Verify via search
    await manager.openCustomersTab()
    await manager.searchCustomer('Delete')
    const beforeDelete = await manager.getCustomerRows()
    expect(beforeDelete.some(r =>
      r.firstName === 'Delete' && r.lastName === 'MeUser')).toBe(true)

    // Delete and verify removal
    await manager.deleteCustomer('Delete', 'MeUser')
    await manager.searchCustomer('Delete')
    const afterDelete = await manager.getCustomerRows()
    expect(afterDelete.some(r =>
      r.firstName === 'Delete' && r.lastName === 'MeUser')).toBe(false)
  })
```

Demonstrates:
- Full lifecycle in a single test (create, open accounts, search, delete, verify).
- Unique data via `Date.now()` for test isolation.
- Typed results from page object methods.
- Assertions on both success (customer exists) and cleanup (customer removed).
