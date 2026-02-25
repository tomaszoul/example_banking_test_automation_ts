/**
 * @file Centralized configuration for test report paths, naming, and retention.
 *
 * Every reporting module imports {@link reportConfig} from here so that
 * run IDs, directory layout, and retention settings live in one place.
 *
 * **Environment variables:**
 *
 * | Variable               | Default | Description                                |
 * |------------------------|---------|--------------------------------------------|
 * | `PW_RUN_ID`            | (auto)  | Override the timestamped run identifier     |
 * | `PW_REPORT_AUTO_OPEN`  | `false` | Open HTML report in browser after post-run |
 * | `PW_REPORT_KEEP_COUNT` | `3`     | Max report directories to retain on disk   |
 */
import { join, resolve } from 'path'

/** Zero-pads a number to two digits (e.g. `5` -> `"05"`). */
function pad(n: number): string {
  return String(n).padStart(2, '0')
}

/**
 * Builds a timestamp-based run ID (e.g. `"20260225-143012"`).
 * Reuses `PW_RUN_ID` when already set so the Playwright config and
 * the runner script share the same identifier.
 */
function buildRunId(): string {
  if (process.env.PW_RUN_ID) return process.env.PW_RUN_ID
  const now = new Date()
  const date = `${now.getFullYear()}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
  const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
  return `${date}-${time}`
}

/** Unique identifier for the current test run. */
const runId = buildRunId()
process.env.PW_RUN_ID = runId

/** Absolute path to the root directory that holds all report directories. */
const reportsRoot = resolve(process.cwd(), 'test-reports')

/** Whether the post-run script should auto-open the report in a browser. */
const autoOpen = process.env.PW_REPORT_AUTO_OPEN === 'true'

/** Maximum number of report directories to keep after pruning. */
const keepCount = Math.max(
  1,
  parseInt(process.env.PW_REPORT_KEEP_COUNT || '3', 10) || 3,
)

/**
 * Returns the directory path for a specific run's report.
 * @param id - Run identifier. Defaults to the current {@link runId}.
 */
function reportDir(id: string = runId): string {
  return join(reportsRoot, id)
}

/**
 * Returns the path to the HTML report entry point (`index.html`) for a run.
 * @param id - Run identifier. Defaults to the current {@link runId}.
 */
function reportHtmlPath(id: string = runId): string {
  return join(reportDir(id), 'index.html')
}

/**
 * Shared report configuration consumed by the Playwright config,
 * the test runner, and all post-run reporting scripts.
 */
export const reportConfig = {
  runId,
  reportsRoot,
  autoOpen,
  keepCount,
  reportDir,
  reportHtmlPath,
} as const
