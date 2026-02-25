/**
 * Thin CLI wrapper around Playwright that adds --local, --full, and --ui support.
 *
 * When --local is passed, sets BANK_LOCAL=1 so the Playwright config
 * activates its built-in webServer block (auto-starts and stops
 * `serve banking-app` on port 8081).
 *
 * When --full is passed, sets BANK_FULL_RUN=1 so the Playwright config
 * runs each customer's tests in a separate project (all 5 users).
 * Smoke tests (default) use a single user for fast feedback; full run
 * exercises every scenario × every customer for thorough validation.
 *
 * When --ui is passed, opens the Playwright UI (can be combined with smoke/full/local).
 *
 * Usage:
 *   pnpm test                  → smoke tests, headless
 *   pnpm test:full             → full run, headless
 *   pnpm test:ui               → smoke tests + Playwright UI
 *   pnpm test:ui:full          → full run + Playwright UI
 *   pnpm test:local            → smoke + local app
 *   pnpm test:local:full       → full run + local app
 *   pnpm test:local:ui         → smoke + local + UI
 *   pnpm test:local:ui:full    → full run + local + UI
 *
 * Flags can also be combined: pnpm test --full --ui, pnpm test --local --headed, etc.
 */
import { execSync } from 'child_process'
import { readdirSync, rmSync, statSync } from 'fs'
import { join, resolve } from 'path'

const args = process.argv.slice(2)
let localIdx = args.indexOf('--local')
if (localIdx === -1) localIdx = args.indexOf('local')
const isLocal = localIdx !== -1
if (isLocal) args.splice(localIdx, 1)

const fullIdx = args.indexOf('--full')
const isFullRun = fullIdx !== -1
if (isFullRun) args.splice(fullIdx, 1)

const env = { ...process.env }
if (isLocal) {
  env.BANK_LOCAL = '1'
  env.BANK_BASE_URL = `http://localhost:8081/#/login`
}
if (isFullRun) {
  env.BANK_FULL_RUN = '1'
}

// ---------------------------------------------------------------------------
// Report retention — keep at most N report directories (default 3).
// Prunes BEFORE the run so the new report fills the last slot.
// ---------------------------------------------------------------------------

const REPORTS_ROOT = resolve('test-reports')
const KEEP_COUNT = Math.max(1, parseInt(process.env.PW_REPORT_KEEP_COUNT || '3', 10) || 3)

function pruneOldReports() {
  let dirs
  try {
    dirs = readdirSync(REPORTS_ROOT).filter((name) => {
      try { return statSync(join(REPORTS_ROOT, name)).isDirectory() } catch { return false }
    })
  } catch { return }

  dirs.sort((a, b) => b.localeCompare(a))

  for (const dir of dirs.slice(KEEP_COUNT - 1)) {
    try {
      rmSync(join(REPORTS_ROOT, dir), { recursive: true, force: true })
      console.log(`  Pruned old report: ${dir}`)
    } catch { /* best-effort */ }
  }
}

// ---------------------------------------------------------------------------
// Main
// ---------------------------------------------------------------------------

pruneOldReports()

const pwArgs = [
  '-c', 'e2e-tests/playwright.config.ts',
  ...args,
].join(' ')

let exitCode = 0
try {
  execSync(`npx playwright test ${pwArgs}`, { stdio: 'inherit', env })
} catch (e) {
  exitCode = e.status ?? 1
}
process.exit(exitCode)
