/**
 * @file Test runner entry point — orchestrates a Playwright run and post-run processing.
 *
 * **Flow:**
 * 1. Splits CLI args into Playwright-native args and post-run flags (`--open`).
 * 2. Executes `playwright test` with the resolved config and a shared `PW_RUN_ID`.
 * 3. Runs the post-run script (report pruning, optional browser open).
 * 4. Exits with Playwright's original exit code — post-run errors are swallowed
 *    so they never mask real test failures.
 *
 * @example
 * ```sh
 * npx tsx e2e-tests/utils/reporting/run-tests.ts --open            # run & open report
 * npx tsx e2e-tests/utils/reporting/run-tests.ts --project banking  # forward to PW
 * ```
 */
import { execSync } from 'child_process'
import { resolve } from 'path'
import { reportConfig } from './report-config'
import { pruneReports } from './retention'

const args = process.argv.slice(2)

/** Flags consumed by the post-run script (not forwarded to Playwright). */
const postRunArgs = args.filter((a) => a === '--open')

/** Remaining flags forwarded directly to `playwright test`. */
const pwArgs = args.filter((a) => a !== '--open')

const env = { ...process.env, PW_RUN_ID: reportConfig.runId }

// Prune before running so the new report fills the last slot (keep N-1).
const removed = pruneReports(reportConfig.keepCount - 1)
if (removed.length) {
  console.log(`Pruned ${removed.length} old report(s): ${removed.join(', ')}`)
}

const configPath = resolve('e2e-tests', 'playwright.config.ts')
const cmd = `playwright test -c ${configPath} ${pwArgs.join(' ')}`.trim()

let testExitCode = 0
try {
  execSync(cmd, { stdio: 'inherit', env })
} catch (err: unknown) {
  testExitCode = (err as { status?: number }).status ?? 1
}

try {
  const postRunPath = resolve('e2e-tests', 'utils', 'reporting', 'post-run.ts')
  execSync(`npx tsx ${postRunPath} ${postRunArgs.join(' ')}`, { stdio: 'inherit', env })
} catch {
  // Post-run failures (report generation, browser open) must not mask the
  // actual test exit code — swallow and let the process exit with the
  // Playwright result instead.
}

process.exit(testExitCode)

// "In the Kamigata area, they have a sort of tiered lunchbox
//  they use for a single day when flower viewing. Upon returning,
//  they throw them away, trampling them underfoot.
//  The end is important in all things."
//
//  — Hagakure, Yamamoto Tsunetomo
