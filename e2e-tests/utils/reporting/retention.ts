/**
 * @file Report retention policy — prevents unbounded disk growth from HTML reports.
 *
 * Each test run produces a timestamped directory under `test-reports/`.
 * {@link pruneReports} removes the oldest directories so that at most
 * {@link reportConfig.keepCount} remain.
 */
import { readdirSync, rmSync, statSync } from 'fs'
import { join } from 'path'
import { reportConfig } from './report-config'

/**
 * Removes oldest report directories so that at most `keepCount` remain.
 * Directories are sorted by name (which encodes date-time), newest first.
 *
 * @param keepCount - Number of recent reports to retain. Defaults to {@link reportConfig.keepCount}.
 * @returns Names of the directories that were removed.
 */
export function pruneReports(keepCount: number = reportConfig.keepCount): string[] {
  const root = reportConfig.reportsRoot

  let entries: string[]
  try {
    entries = readdirSync(root).filter((name) => {
      try {
        return statSync(join(root, name)).isDirectory()
      } catch {
        return false
      }
    })
  } catch {
    return []
  }

  entries.sort((a, b) => b.localeCompare(a))

  const removed: string[] = []
  for (const dir of entries.slice(keepCount)) {
    const fullPath = join(root, dir)
    try {
      rmSync(fullPath, { recursive: true, force: true })
      removed.push(dir)
    } catch {
      // best-effort cleanup — don't fail the run over stale reports
    }
  }

  return removed
}
