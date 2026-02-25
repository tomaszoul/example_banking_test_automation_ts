# Banking E2E Test Suite -- Reviewer Guide

## AI Disclosure

This project was developed with the assistance of **Claude (Opus 4.6)** via [Cursor](https://cursor.com). The AI acted as a coding assistant -- I drove the overall architecture, test strategy, and design decisions while the AI helped with implementation, boilerplate, and iteration speed. Every piece of code was reviewed and understood before being committed.

## Report Automation (Important for Review)

Every test run now generates a **versioned HTML report** under `test-reports/<runId>/`. Key points for the reviewer:

- **Retention**: Only the latest **3 reports** are kept on disk; older runs are auto-pruned after each `test:report` run.
- **Auto-open in browser**: Available via `pnpm test:report:open`, but **currently OFF by default** during the debugging/review phase. Enable with `PW_REPORT_AUTO_OPEN=true`.
- **Connector API**: A minimal HTTP connector is included for publishing run metadata to services like ReportPortal. Run `pnpm report:publish:dry` to see the example payload without making real HTTP calls.
- **Report scripts**: `pnpm test:report` (run + report + prune), `pnpm test:report:open` (same + auto-open), `pnpm report:publish:dry` (connector dry-run).

Full details: **[e2e-tests/REPORTING.md](e2e-tests/REPORTING.md)**

---

## Approach

This project is a **Playwright-based end-to-end test suite** for an AngularJS banking demo application. The suite was designed from the ground up with the following priorities:

1. **Page Object Model (POM)** -- each page/flow has its own class encapsulating locators and actions
2. **Centralized selector registry** -- all CSS/attribute selectors live in a single `selectors.ts` file, making locator changes a one-file edit
3. **Reusable helpers** -- AngularJS-aware waits, navigation, and assertion utilities
4. **Offline-capable** -- a local copy of the app ships in `banking-app/`, so tests run without internet
5. **Cross-platform** -- runs on Windows, macOS, and Linux with no OS-specific setup

## Architecture

```
banking-e2e-tests/
├── banking-app/               # Local copy of the AngularJS banking app
│   ├── index.html             # Entry point (serve with any static server)
│   ├── *.js                   # Angular modules, controllers, services
│   └── *.css                  # Styles
├── e2e-tests/
│   ├── playwright.config.ts   # Playwright config with 'banking' project
│   ├── tsconfig.json
│   ├── utils/
│   │   └── reporting/             # HTML report generation, retention, connectors
│   │       ├── report-config.ts   # Run ID, env flags, paths
│   │       ├── retention.ts       # Prune old reports (keep latest N)
│   │       ├── post-run.ts        # Post-run: optional browser open
│   │       ├── run-tests.ts       # CLI wrapper: run tests + post-run
│   │       ├── publish-report.ts  # Publish to external services
│   │       └── connectors/        # Pluggable connector API
│   └── src/
│       └── banking/
│           ├── locators/
│           │   └── selectors.ts   # All element selectors, organized by page
│           ├── pages/
│       │   ├── LoginPage.ts
│       │   ├── CustomerDashboardPage.ts
│       │   ├── DepositPage.ts
│       │   └── WithdrawPage.ts
│       ├── helpers/
│       │   ├── browser-helpers.ts   # Navigation, waitForAngular
│       │   └── assert-helpers.ts    # expectVisible, expectBalanceChange
│       └── specs/
│           ├── customer-login.spec.ts       # 4 tests
│           ├── account-balance.spec.ts      # 3 tests
│           ├── deposit.spec.ts              # 3 tests
│           ├── withdraw.spec.ts             # 2 tests
│           └── transactions-list.spec.ts    # 3 tests
├── run-tests.mjs              # CLI wrapper: handles --local flag, spawns Playwright
├── download-app.mjs           # Utility: re-download the app (offline-safe)
├── package.json
└── pnpm-lock.yaml
```

## Test Coverage (15 tests)

| Spec File | Tests | What it covers |
|---|---|---|
| customer-login | 4 | Home page, login flow, dropdown users, logout |
| account-balance | 3 | Welcome name, account details, account switching |
| deposit | 3 | Deposit + balance update, button visibility, empty submit |
| withdraw | 2 | Successful withdrawal, overdraft error |
| transactions-list | 3 | Deposit appears in list, reset clears list, back navigation |

## How to Run

### Installation (for reviewers)

1. **Clone the repo** and open a terminal in the project root.

2. **Install dependencies:**

   ```bash
   pnpm install
   ```

3. **Install Playwright browsers (Chromium only):**

   ```bash
   pnpm exec playwright install chromium
   ```

4. **Linux only** — install Chromium system libraries (libnss3, libatk, libcups, etc.):

   ```bash
   pnpm exec playwright install-deps chromium
   ```

   Not needed on Windows or macOS.

### Run modes: smoke tests vs full run

| Mode | Command | Tests | Use when |
|---|---|---|---|
| **Smoke tests** | `pnpm test` or `pnpm test:smoke` | ~15 | Fast feedback, CI, daily development |
| **Full run** | `pnpm test:full` | ~75 | Every scenario × every user; pre-release, thorough validation |

- **Smoke tests** run all scenarios once with a single customer (Harry Potter). Fast, minimal.
- **Full run** runs the same scenarios across all 5 customers (Hermoine, Harry, Ron, Albus, Neville). Each scenario executes 5×; total runtime is higher but every user is exercised in every flow.

Both modes can target the live site or a local app. Combine with `--local` to use the bundled banking app in `banking-app/`.

### Against the live site (default)

```bash
pnpm test                 # headless, smoke tests (single user)
pnpm test:full            # headless, full run (all 5 users)
pnpm test:ui              # smoke + Playwright UI
pnpm test:ui:full         # full run + Playwright UI
pnpm test:headed          # visible browser
pnpm test:debug           # step-through debug
```

### Against the local app (offline)

```bash
pnpm test:local           # headless, smoke tests, auto-starts local server
pnpm test:local:full      # headless, full run, auto-starts local server
pnpm test:local:ui        # smoke + local + UI
pnpm test:local:ui:full   # full run + local + UI
pnpm test --local --headed       # visible browser
pnpm test --local --debug        # step-through debug
```

### Prerequisites (reference)

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | >= 21.2 | Required for `import.meta.dirname` in `download-app.mjs` |
| **pnpm** | >= 8 | Or substitute with `npm` / `yarn` |

The `--local` flag (handled by `run-tests.mjs`) sets `BANK_LOCAL=1` and `BANK_BASE_URL` to `http://localhost:8081/#/login`. The Playwright config detects `BANK_LOCAL` and adds a `webServer` block that auto-starts `serve banking-app` on port 8081, so no manual server start or second terminal is needed.

The banking app in `banking-app/` is version-controlled. To refresh it from the live site:

```bash
pnpm run app:download     # gracefully skips on network failure if local copy exists
```

### Custom target URL (staging, Docker, etc.)

For one-off overrides, set `BANK_BASE_URL` manually:

```bash
# bash / zsh
export BANK_BASE_URL='http://my-staging-host:3000/#/login'
pnpm test

# PowerShell
$env:BANK_BASE_URL='http://my-staging-host:3000/#/login'
pnpm test
```

### Targeting a specific spec

```bash
pnpm test -- --grep "Deposit"
pnpm test -- e2e-tests/src/banking/specs/customer-login.spec.ts
```

## Cross-Platform Design

All tooling is platform-agnostic by design:

| Concern | How it's handled |
|---|---|
| **Environment variables** | Set by `run-tests.mjs` wrapper (pure Node, no `cross-env` needed) |
| **File paths** | Node `path.join()` / Playwright built-in path handling |
| **Browser binaries** | Playwright downloads platform-specific Chromium automatically |
| **Static file server** | `serve` npm package (pure Node, no native deps) |
| **Shell commands** | All npm scripts use simple single-line commands with no shell-specific syntax |

## Key Design Decisions

- **`waitForAngular`**: Uses `$browser.notifyWhenNoOutstandingRequests()` to detect when AngularJS has finished all HTTP requests and digest cycles, avoiding brittle `waitForTimeout` calls
- **Transactions date filter workaround**: The AngularJS `datetime-local` input can nullify `$scope.startDate`/`$scope.end` on fast connections (localhost). The transactions test detects and corrects this via `page.evaluate`
- **Selector strategy**: Prefers `#id` and `[ng-click]`/`[ng-model]` attribute selectors (stable, AngularJS-semantic) over CSS class selectors (fragile) or XPath (hard to maintain)
- **No test interdependence**: Each test starts from a fresh browser context with its own login flow, ensuring isolation

## Environment Variables

| Variable | Default | Description |
|---|---|---|
| `BANK_BASE_URL` | globalsqa.com live URL | Override to test against localhost or staging. Prefer `--local` flag for localhost. |
| `BANK_LOCAL` | (unset) | Set to `1` by `run-tests.mjs --local`; enables `webServer` auto-start |
| `BANK_FULL_RUN` | (unset) | Set to `1` by `run-tests.mjs --full`; runs each scenario for all 5 customers |
| `CI` | (unset) | Enables 4 parallel workers and blob reporter |
| `MAX_RETRIES` | 0 | Number of retry attempts for flaky tests |
| `PW_RUN_ID` | (auto) | Override the timestamped run identifier (format: `YYYYMMDD-HHmmss`) |
| `PW_REPORT_AUTO_OPEN` | `false` | Open HTML report in browser after post-run |
| `PW_REPORT_KEEP_COUNT` | `3` | Max report directories to retain on disk |
| `RP_ENDPOINT` | (unset) | ReportPortal (or compatible) API endpoint for publishing |
| `RP_TOKEN` | (unset) | Bearer token for the report publishing endpoint |
