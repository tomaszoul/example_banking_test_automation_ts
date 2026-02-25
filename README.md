# Banking E2E Test Suite

Playwright end-to-end test suite for an AngularJS banking demo application. Tests cover customer login, account management, deposits, withdrawals, and transaction history.

> **AI disclosure:** This project was built with the help of Claude (Opus 4.6) inside Curosr. The AI served as a coding assistant -- I directed the architecture, reviewed every change, like every line, and made the decisions. Also there was so much refactoring. It accelerated what would otherwise have been roughly a week of work into a much much shorter timeframe.

## Prerequisites

| Requirement | Version | Notes |
|---|---|---|
| **Node.js** | >= 21.2 | `download-app.mjs` uses `import.meta.dirname` |
| **Package manager** | any | `pnpm >= 8` (recommended), `npm`, or `yarn` all work |

## Quick Start

```bash
# pnpm (recommended)
pnpm install
pnpm exec playwright install chromium
pnpm test                  # runs against the live site — no server needed

# npm alternative
npm install
npx playwright install chromium
npm test
```

For offline testing, use `--local` to auto-start a local server:

```bash
pnpm test --local          # or: npm test -- --local
```

> **Important:** Always run `install` before your first test run. Skipping this step and jumping straight to `npx playwright test` will fail because the project's dependencies (including `@playwright/test`) won't be in `node_modules`.

> **Linux users:** Playwright needs system libraries for Chromium. Run this once after installing browsers:
>
> ```bash
> pnpm exec playwright install-deps chromium   # or: npx playwright install-deps chromium
> ```

## Structure

```
├── banking-app/              # Local copy of the banking app (offline testing)
├── e2e-tests/
│   ├── src/banking/
│   │   ├── locators/         # Centralized selector registry
│   │   ├── pages/            # Page Object classes
│   │   ├── helpers/          # Navigation, waits, assertions
│   │   └── specs/            # Test specs (15 tests across 5 files)
│   ├── utils/reporting/      # Report generation, retention, connectors
│   ├── playwright.config.ts
│   └── tsconfig.json
├── package.json
└── REVIEWER.md               # Detailed architecture and run guide
```

## Report Automation (Important for Review)

Every test run generates a **versioned HTML report** under `test-reports/<runId>/`. Only the latest **3 reports** are kept. Auto-open is available but **OFF by default** (debug phase). Full details: **[e2e-tests/REPORTING.md](e2e-tests/REPORTING.md)**

```bash
pnpm test:report         # Run tests + HTML report + prune old reports
pnpm test:report:open    # Same, then auto-open report in browser
pnpm report:publish:dry  # Preview connector payload (no HTTP call)
```

## Running Tests

| Mode | Command | Description |
|------|---------|-------------|
| **Smoke tests** | `pnpm test` or `pnpm test:smoke` | Fast feedback — all scenarios with one customer |
| **Full run** | `pnpm test:full` | Every scenario × all 5 customers |
| **With Playwright UI** | `pnpm test:ui` or `pnpm test:ui:full` | Smoke or full run with UI |
| Local app | `pnpm test:local` or `pnpm test:local:full` | Auto-starts the banking app on port 8081 |

```bash
# Headless
pnpm test                  # smoke tests
pnpm test:full             # full run

# Playwright UI (smoke or full)
pnpm test:ui               # smoke + UI
pnpm test:ui:full          # full run + UI

# Local app
pnpm test:local
pnpm test:local:full
pnpm test:local:ui         # smoke + local + UI
pnpm test:local:ui:full    # full run + local + UI

# Other
pnpm test:headed           # visible browser
pnpm test:debug            # step-through debug
```

Flags can be combined: `pnpm test --full --ui`, `pnpm test --local --headed`, etc.

See [REVIEWER.md](REVIEWER.md) for detailed installation steps and when to use each mode.

### How `--local` works

A full copy of the banking app ships in `banking-app/` and is version-controlled. When you pass `--local`, Playwright's `webServer` config automatically starts a static server on port 8081 and points the tests at it -- no manual setup, no second terminal.

To re-download the app from the live site (requires internet):

```bash
pnpm run app:download
```

If there is no internet connection, the download script keeps the existing local copy.

### Custom URL override

Point tests at a staging server, Docker container, etc.:

```bash
# bash / zsh
export BANK_BASE_URL='http://my-staging-host:3000/#/login'
pnpm test

# PowerShell
$env:BANK_BASE_URL='http://my-staging-host:3000/#/login'
pnpm test
```

## Platform Notes

| Platform | Extra setup |
|---|---|
| **Windows** | None -- works out of the box |
| **macOS** | None -- works out of the box |
| **Linux** | Run `pnpm exec playwright install-deps chromium` once to install system libraries (libnss3, libatk, etc.) |

All npm scripts, file paths, and environment variable handling are cross-platform. Playwright and Node.js handle path separators natively.

See [REVIEWER.md](REVIEWER.md) for full architecture details, design decisions, and environment variables.
