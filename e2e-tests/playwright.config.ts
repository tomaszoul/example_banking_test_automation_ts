/**
 * @file Playwright configuration for the e2e test suite.
 *
 * Adjusts reporters, workers, and browser-open behavior based on context:
 *
 * | Context              | Reporter        | HTML report opens? |
 * |----------------------|-----------------|--------------------|
 * | **CI**               | `blob` + `list` | No                 |
 * | **Local (headless)** | `list` + `html` | Yes                |
 * | **Local (`--ui`)**   | `list` + `html` | No                 |
 *
 * @see {@link ./utils/reporting/report-config.ts} for report directory layout.
 * @see {@link ./utils/reporting/run-tests.ts}    for the test runner entry point.
 */
import { defineConfig, devices } from '@playwright/test'
import { reportConfig } from './utils/reporting/report-config'
import { Customers } from './src/banking/data/customers'

/** Whether a local banking-app dev server should be started before tests. */
const isLocal = process.env.BANK_LOCAL === '1'

/** Suppress auto-opening the HTML report when Playwright UI (`--ui`) is active. */
const isUI = process.argv.includes('--ui')

/**
 * Base URL for the banking application under test.
 * Override via `BANK_BASE_URL` env variable for custom environments.
 */
const BANK_BASE_URL =
  process.env.BANK_BASE_URL ||
  'https://www.globalsqa.com/angularJs-protractor/BankingProject/#/login'

/** When set, runs each customer's tests in a separate project (full run: all 5 users). */
const isFullRun = process.env.BANK_FULL_RUN === '1'

/** Shared browser settings for all projects. */
const sharedBrowserUse = {
  ...devices['Desktop Chrome'],
  baseURL: BANK_BASE_URL,
  headless: true,
  screenshot: 'only-on-failure' as const,
  trace: 'retain-on-first-failure' as const,
  actionTimeout: 10_000,
}

export default defineConfig({
  testDir: './src',
  snapshotPathTemplate: '{testDir}/{testFilePath}-snapshots/{arg}{ext}',
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  retries: parseInt(process.env.MAX_RETRIES || '0', 10),
  workers: process.env.CI ? 4 : undefined,
  reporter: process.env.CI
    ? [['blob'], ['list']]
    : [
        ['list'],
        ['html', {
          outputFolder: reportConfig.reportDir(),
          open: isUI ? 'never' : 'always',
        }],
      ],
  timeout: 30_000,
  expect: {
    timeout: 5_000,
  },

  webServer: isLocal
    ? {
        command: 'npx serve banking-app -l 8081',
        cwd: '..',
        port: 8081,
        reuseExistingServer: true,
      }
    : undefined,

  projects: [
    ...(isFullRun
      ? Object.values(Customers).map((customer) => ({
          name: `customer-${customer.name.toLowerCase().replace(/\s+/g, '-')}`,
          testDir: './src/banking/specs',
          testIgnore: [/manager/],
          use: { ...sharedBrowserUse, bankUser: customer },
        }))
      : [
          {
            name: 'banking',
            testDir: './src/banking/specs',
            testIgnore: [/manager/],
            use: { ...sharedBrowserUse, bankUser: Customers.HarryPotter },
          },
        ]),
    {
      name: 'manager',
      testDir: './src/banking/specs',
      testMatch: /manager.*\.spec\.ts$/,
      use: sharedBrowserUse,
    },
  ],
})
