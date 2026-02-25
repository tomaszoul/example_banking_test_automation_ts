/**
 * @file Post-run script executed after Playwright finishes.
 *
 * Responsibilities:
 * 1. Prune old report directories (keeping the latest N per {@link reportConfig.keepCount}).
 * 2. Locate the most recent HTML report on disk.
 * 3. Optionally open it in the default browser when `--open` is passed
 *    or `PW_REPORT_AUTO_OPEN=true` is set.
 *
 * Called by {@link ./run-tests.ts} — failures here are intentionally non-fatal.
 */
import { existsSync, readdirSync, statSync } from 'fs'
import { join, resolve } from 'path'
import { execSync } from 'child_process'
import { reportConfig } from './report-config'

/**
 * Scans the reports root for the newest directory containing an `index.html`.
 * Directories are sorted lexicographically (newest first, since names encode timestamps).
 * @returns Absolute path to the HTML file, or `null` if no report exists yet.
 */
function findLatestReport(): string | null {
  const root = reportConfig.reportsRoot
  try {
    const dirs = readdirSync(root)
      .filter((name) => {
        try {
          return statSync(join(root, name)).isDirectory()
        } catch {
          return false
        }
      })
      .sort((a, b) => b.localeCompare(a))

    for (const dir of dirs) {
      const htmlPath = join(root, dir, 'index.html')
      if (existsSync(htmlPath)) return htmlPath
    }
  } catch {
    // reports root may not exist yet on a fresh checkout
  }
  return null
}

/**
 * Opens a file in the platform's default browser.
 * Falls back to a console message if the shell command fails.
 * @param filePath - Path to the file to open (typically an HTML report).
 */
function openInBrowser(filePath: string): void {
  const absolute = resolve(filePath)
  const platform = process.platform
  try {
    if (platform === 'win32') {
      execSync(`start "" "${absolute}"`, { stdio: 'ignore' })
    } else if (platform === 'darwin') {
      execSync(`open "${absolute}"`, { stdio: 'ignore' })
    } else {
      execSync(`xdg-open "${absolute}"`, { stdio: 'ignore' })
    }
  } catch {
    console.log(`Could not auto-open browser. Open manually:\n  ${absolute}`)
  }
}

/** Locates the latest report and optionally opens it. */
function main(): void {
  const latest = findLatestReport()
  if (!latest) {
    console.log('No HTML report found.')
    return
  }

  const absolute = resolve(latest)
  const shouldOpen = reportConfig.autoOpen || process.argv.includes('--open')

  if (shouldOpen) {
    console.log(`Opening report in browser: ${absolute}`)
    openInBrowser(latest)
  } else {
    console.log(
      `HTML report ready:\n  ${absolute}\n\n` +
        'To open automatically after each run, set PW_REPORT_AUTO_OPEN=true\n' +
        'or use: pnpm test:report:open',
    )
  }
}

main()
