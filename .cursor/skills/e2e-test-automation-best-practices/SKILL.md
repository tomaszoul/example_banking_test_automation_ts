---
name: e2e-test-automation-best-practices
description: Best practices for web E2E test automation with Playwright and TypeScript. Use when writing or reviewing E2E tests, adding new pages or selectors, handling dialogs/alerts, creating fixtures, debugging failures, or onboarding junior testers. Covers central selectors, page objects, dialog handling, fixtures, reporting, and CI stability.
---

# E2E Test Automation Best Practices

Guidelines for writing and maintaining Playwright E2E tests in this repository. Covers architecture patterns, Playwright official recommendations, and practical advice for junior developers and testers -- with or without AI assistance.

---

## 1. Centralize Selectors (Global Selector Registry)

All CSS/attribute selectors live in **one file**: `e2e-tests/src/banking/locators/selectors.ts`.

- Organized as `as const` objects per page/screen: `HomePage`, `CustomerLoginPage`, `CustomerDashboard`, `DepositPage`, `WithdrawPage`, `TransactionsPage`, `ManagerPage`.
- Page objects and specs **import** from the registry -- no raw selector strings anywhere else.
- Selector strategy priority (documented in the file):
  1. `#id` selectors (most stable)
  2. `[ng-click]` / `[ng-model]` attribute selectors (semantic, AngularJS-specific)
  3. Role + text selectors (accessible, human-readable)

**Why:** When the app DOM changes, you update **one file**. Every page object and spec stays untouched.

**Rule:** Never put a CSS selector string in a page object or spec file. Always add it to `selectors.ts` first, then import it.

---

## 2. Page Object Model (POM)

One class per logical screen or flow, located in `e2e-tests/src/banking/pages/`:

| Page Object | Screen |
|---|---|
| `LoginPage` | Home page + customer/manager login |
| `CustomerDashboardPage` | Account info, balance, navigation |
| `DepositPage` | Deposit form |
| `WithdrawPage` | Withdrawal form |
| `ManagerPage` | Add customer, open account, customer list |

### Rules

- Constructor takes a Playwright `Page` instance. Nothing else.
- All locators come from `selectors.ts` imports -- no selector strings as class properties.
- Methods are either **actions** (`depositAmount()`, `loginAsCustomer()`) or **queries** (`getBalance()`, `getWelcomeText()`).
- Convenience methods wrap multi-step flows (e.g., `loginAsCustomer(name)` = navigate + select login + pick user + click login).
- Call `waitForAngular(this.page)` after actions that trigger AngularJS digest cycles.
- Return typed results when extracting data from dialogs (e.g., `AddCustomerResult`, `OpenAccountResult`).

### Adding a New Page Object

1. Create `e2e-tests/src/banking/pages/YourPage.ts`.
2. Add selectors to `selectors.ts` under a new `export const YourPage = { ... } as const`.
3. Import selectors in the page object; expose actions and queries.
4. Use the page object in specs via `new YourPage(page)`.

---

## 3. Custom Fixtures and Test Data

### Fixtures

`e2e-tests/src/banking/fixtures.ts` extends `@playwright/test` with a typed `bankUser` option:

```typescript
import { test, expect } from '../fixtures'  // not from '@playwright/test'
```

Specs **must** import `test` and `expect` from `../fixtures`, not directly from `@playwright/test`. This gives every test access to `bankUser` (typed as `Customer`).

### Test Data

Customer data is deterministic and lives in `e2e-tests/src/banking/data/customers.ts`:

- Typed `Customer` interface with `name` and `accounts` (Dollar/Pound/Rupee account numbers).
- Account numbers are derived from the app's mock data loader order -- they never change.
- Smoke tests use a single user (Harry Potter); full runs exercise all 5 customers.

**Rule:** Use deterministic data. Only generate unique values (e.g., `Date.now()` postcodes) when isolation requires it.

---

## 4. Handling Browser Dialogs (Alerts / Confirms / Prompts)

The banking app uses JavaScript `alert()` for success messages. The correct pattern:

1. **Start waiting for the dialog BEFORE the triggering action:**
   ```typescript
   const dialogPromise = page.waitForEvent('dialog', { timeout: 5000 })
     .then(d => { const msg = d.message(); void d.accept(); return msg })
   ```
2. **Perform the action** (form submit, button click).
3. **Await the dialog promise** and parse/assert the message.

**Always:**
- Register the dialog listener **before** the action -- otherwise the dialog fires and blocks the page.
- Call `accept()` or `dismiss()` -- an unhandled dialog freezes the test.
- **Verify the alert text** (e.g., "Customer added successfully with customer id :6") to catch content regressions.

See `ManagerPage.addCustomer()` and `ManagerPage.openAccount()` for the full pattern.

---

## 5. Waits and Stability

### AngularJS-Aware Waits

`waitForAngular()` in `e2e-tests/src/banking/helpers/browser-helpers.ts` uses `$browser.notifyWhenNoOutstandingRequests()` to detect when AngularJS has finished all HTTP requests and digest cycles.

- Called after navigation (`navigateToBank`) and in page objects after actions that change state.
- Falls back gracefully if Angular is not present.

### General Wait Rules

- **Prefer explicit waits:** `locator.waitFor({ state: 'visible', timeout: 5000 })` or `await expect(locator).toBeVisible()`.
- **Never use `page.waitForTimeout()`** unless absolutely no other option exists (and document why).
- Use `waitForURL()` when navigation is expected (e.g., `await page.waitForURL(/listTx/)`).
- Timeouts are configured in `playwright.config.ts`: action timeout 10s, expect timeout 5s, test timeout 30s.

---

## 6. Playwright Official Best Practices

These come directly from the [Playwright docs](https://playwright.dev/docs/best-practices):

### Test User-Visible Behavior
Assert what the user sees -- balance amounts, welcome text, success/error messages -- not implementation details like CSS classes or internal state.

### Use Web-First Assertions
```typescript
// GOOD -- Playwright auto-waits and retries
await expect(page.locator(selector)).toBeVisible()
await expect(page.locator(selector)).toContainText('Deposit Successful')

// BAD -- no auto-wait, instant check, flaky
expect(await page.locator(selector).isVisible()).toBe(true)
```

### Test Isolation
Each test starts from a clean state via `beforeEach`. No test depends on another test's side effects. The config creates a fresh browser context per test when `BANK_FULL_RUN=1`.

### Prefer User-Facing Locators
Playwright recommends `getByRole()`, `getByText()`, `getByTestId()` over CSS selectors. This app uses AngularJS attribute selectors (`[ng-click]`, `[ng-model]`) which are the most stable option for this specific app, since the framework directive attributes act as semantic identifiers.

### Soft Assertions
Use `expect.soft()` when you want to check multiple things without stopping at the first failure:
```typescript
await expect.soft(page.getByTestId('status')).toHaveText('Success')
await expect.soft(page.getByTestId('amount')).toHaveText('1000')
```

### Keep Playwright Updated
```bash
pnpm install -D @playwright/test@latest
pnpm exec playwright install chromium
```
New versions test against latest browser builds -- catch breakage before your users do.

### Lint Your Tests
Use TypeScript. The compiler catches wrong argument types, missing awaits (with `@typescript-eslint/no-floating-promises`), and typos in selector names. A missing `await` before a Playwright call is the most common source of flaky tests.

---

## 7. Test Structure, Naming, and Assertions

### Structure
- `test.describe()` groups tests by feature/flow.
- `test.beforeEach()` handles login and navigation -- keeps each test body focused on the scenario.
- Specs live in `e2e-tests/src/banking/specs/` -- one file per feature area.

### Naming
Test names describe **user-visible behavior** in plain language:
- "should show deposit button and update balance when depositing money"
- "should reject overdraft, empty, zero, and negative amounts"
- "should add customer, open accounts, search, and delete customer"

A good test name answers: "What should the app do from the user's perspective?"

### Assertions
- Assert **meaningful outcomes** (balance changed by exactly 10000, welcome text contains user name).
- Use the helpers in `e2e-tests/src/banking/helpers/assert-helpers.ts`: `expectVisible()`, `expectBalanceChange()`.
- Add custom assertion messages for clarity: `expect(balance, 'Pound should still be 0').toBe(0)`.

---

## 8. Reporting and Debugging

### Reports
- Every run generates an HTML report in `test-reports/<YYYYMMDD-HHmmss>/`.
- Retention: latest 3 reports kept; older ones auto-pruned.
- `pnpm test:report` -- run + generate report + prune.
- `pnpm test:report:open` -- same + open report in browser.

### Failure Artifacts
Configured in `playwright.config.ts`:
- **Screenshots:** captured on failure (`screenshot: 'only-on-failure'`).
- **Traces:** retained on first failure (`trace: 'retain-on-first-failure'`). Open with `npx playwright show-trace <path>`.

### Debugging
| Mode | Command | What it does |
|------|---------|--------------|
| Debug | `pnpm test:debug` | Step-through with Playwright Inspector |
| Headed | `pnpm test:headed` | Visible browser window |
| UI | `pnpm test:ui` | Playwright UI with time-travel |
| Trace | `pnpm test -- --trace on` | Record traces for every test |

**Tip:** In VS Code with the Playwright extension, right-click the green play button next to any test and choose "Debug Test" to set breakpoints and step through.

---

## 9. Running Tests (Quick Reference)

| Command | Description |
|---------|-------------|
| `pnpm test` | Smoke tests (single user, headless) |
| `pnpm test:full` | Full run (all 5 users) |
| `pnpm test:ui` | Smoke + Playwright UI |
| `pnpm test:ui:full` | Full + Playwright UI |
| `pnpm test:local` | Smoke + local app server |
| `pnpm test:local:full` | Full + local app server |
| `pnpm test:headed` | Visible browser |
| `pnpm test:debug` | Playwright Inspector |
| `pnpm test:report` | Run + HTML report |
| `pnpm test -- --grep "Deposit"` | Run matching tests only |

### Key Environment Variables

| Variable | Default | Purpose |
|----------|---------|---------|
| `BANK_BASE_URL` | globalsqa.com live URL | Target app URL |
| `BANK_LOCAL` | unset | Set to `1` for local app server |
| `BANK_FULL_RUN` | unset | Set to `1` for all-customer run |
| `CI` | unset | Enables 4 workers + blob reporter |
| `MAX_RETRIES` | `0` | Retry count for flaky tests |

---

## 10. Repository Map

```
e2e-tests/
  src/banking/
    locators/selectors.ts       -- All element selectors (one file!)
    pages/                      -- Page Object classes
      LoginPage.ts
      CustomerDashboardPage.ts
      DepositPage.ts
      WithdrawPage.ts
      ManagerPage.ts
    helpers/
      browser-helpers.ts        -- navigateToBank, waitForAngular
      assert-helpers.ts         -- expectVisible, expectBalanceChange
    data/customers.ts           -- Customer type + deterministic test data
    fixtures.ts                 -- Custom test fixtures (bankUser)
    specs/                      -- Test specs (18 tests, 7 files)
  utils/reporting/              -- HTML reports, retention, connectors
  playwright.config.ts          -- Config with projects, reporters, timeouts
```

---

## 11. Checklist for Junior Testers

### Before You Write a Test

- [ ] Read the existing specs in `specs/` to understand the patterns.
- [ ] Identify which page objects you need. Do they already exist?
- [ ] Check `selectors.ts` -- are the selectors you need already registered?

### Adding a New Selector

- [ ] Add it to `selectors.ts` under the appropriate page object (e.g., `CustomerDashboard`).
- [ ] Use the selector strategy priority: `#id` > `[ng-model]`/`[ng-click]` > role+text > CSS class (last resort).
- [ ] Run `pnpm exec playwright codegen <url>` to discover good selectors interactively.

### Writing a New Spec

- [ ] Import `test` and `expect` from `'../fixtures'` (not `'@playwright/test'`).
- [ ] Use `test.describe()` to group related tests.
- [ ] Use `test.beforeEach()` for setup (login, navigation).
- [ ] Name tests as "should [user-visible behavior]".
- [ ] Use page objects for all interactions -- no raw `page.click()` with string selectors in specs.
- [ ] Assert **outcomes** (balance, text, visibility), not implementation details.
- [ ] Add custom assertion messages for non-obvious checks.

### Adding a Dialog-Triggering Action

- [ ] Register `page.waitForEvent('dialog')` **before** the action.
- [ ] Call `dialog.accept()` or `dialog.dismiss()` inside the `.then()` callback.
- [ ] Parse and assert the dialog message text.

### Before Committing

- [ ] Run `pnpm test` and verify all tests pass.
- [ ] Check that no raw selector strings leaked into specs or page objects.
- [ ] Verify new selectors are in `selectors.ts`.
- [ ] Make sure test names clearly describe what is being verified.

---

## 12. Common Mistakes and How to Fix Them

| Mistake | Fix |
|---------|-----|
| `expect(await locator.isVisible()).toBe(true)` | Use `await expect(locator).toBeVisible()` -- web-first assertion with auto-retry |
| `await page.waitForTimeout(2000)` | Use `await locator.waitFor({ state: 'visible' })` or `await waitForAngular(page)` |
| Selector string in spec file | Move it to `selectors.ts`, import it |
| Missing `await` before Playwright call | Add `await`. Enable `@typescript-eslint/no-floating-promises` to catch these at lint time |
| Test depends on previous test's state | Each test must set up its own state in `beforeEach` |
| Dialog not handled | Register `waitForEvent('dialog')` before the triggering action |
| Importing `test` from `@playwright/test` | Import from `../fixtures` to get `bankUser` |
| Hardcoded account numbers in tests | Use `bankUser.accounts.Dollar` from the fixture |

---

## 13. Working with AI Assistants

AI tools (Cursor, Copilot, ChatGPT) can accelerate test writing significantly. Here is how to use them effectively in this codebase:

### Giving AI Context

When asking AI to write or modify tests, share:
1. The relevant page object(s) from `pages/`.
2. The selector registry (`selectors.ts`).
3. An existing spec that follows the same pattern.
4. The fixture file (`fixtures.ts`) so the AI knows about `bankUser`.

### Reviewing AI Output

- **Selectors:** Verify the AI used imports from `selectors.ts`, not inline strings.
- **Imports:** Must use `test`/`expect` from `'../fixtures'`, not `'@playwright/test'`.
- **Waits:** Verify the AI used `waitForAngular()` or explicit waits, not `waitForTimeout()`.
- **Assertions:** Check for web-first assertions (`await expect(...).toBeVisible()`) not manual ones.
- **Understand every line.** If you cannot explain what a line does, ask the AI to explain it before committing.

### Good Prompts for This Codebase

- "Write a spec for [feature] following the pattern in `deposit.spec.ts`. Use `LoginPage` and `CustomerDashboardPage` from `pages/`. Import selectors from `selectors.ts`."
- "Add a new page object for [screen]. Follow the `DepositPage.ts` pattern -- constructor takes `Page`, import selectors from `selectors.ts`, expose actions and queries."
- "This test is flaky. Here is the trace: [paste]. What could cause intermittent failures?"

---

## 14. Additional Resources

- [Playwright Best Practices](https://playwright.dev/docs/best-practices)
- [Playwright Locators Guide](https://playwright.dev/docs/locators)
- [Playwright Assertions Guide](https://playwright.dev/docs/test-assertions)
- [Playwright Trace Viewer](https://playwright.dev/docs/trace-viewer)
- [Playwright Test Generator (codegen)](https://playwright.dev/docs/codegen)
- Repo architecture details: [REVIEWER.md](../../../REVIEWER.md)
- Report system details: [e2e-tests/REPORTING.md](../../../e2e-tests/REPORTING.md)
- For concrete code examples from this repo, see [reference.md](reference.md).
