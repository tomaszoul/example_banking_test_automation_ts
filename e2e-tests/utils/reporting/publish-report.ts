import type { ReportConnector, RunSummary } from './connectors/types'
import { createHttpConnector } from './connectors/http-connector'
import { reportConfig } from './report-config'

/**
 * Publishes run summary to all registered connectors.
 * Returns per-connector results so callers can inspect failures.
 */
export async function publishReport(
  summary: RunSummary,
  connectors: ReportConnector[],
): Promise<Map<string, Awaited<ReturnType<ReportConnector['publish']>>>> {
  const results = new Map<string, Awaited<ReturnType<ReportConnector['publish']>>>()

  for (const connector of connectors) {
    try {
      const result = await connector.publish(summary)
      results.set(connector.name, result)
      if (result.success) {
        console.log(`[${connector.name}] Published successfully.`, result.remoteUrl ?? '')
      } else {
        console.error(`[${connector.name}] Publish failed:`, result.error)
      }
    } catch (err) {
      results.set(connector.name, { success: false, error: String(err) })
    }
  }

  return results
}

/**
 * Convenience CLI entry point: reads env vars and publishes a stub summary.
 *
 * Usage:
 *   RP_ENDPOINT=https://rp.example.com/api/v1/project/launch \
 *   RP_TOKEN=your-token \
 *   npx tsx e2e-tests/utils/reporting/publish-report.ts [--dry-run]
 */
async function main(): Promise<void> {
  const endpoint = process.env.RP_ENDPOINT
  const token = process.env.RP_TOKEN ?? ''
  const dryRun = process.argv.includes('--dry-run') || !endpoint

  if (!endpoint) {
    console.log('No RP_ENDPOINT set – running in dry-run mode with example payload.\n')
  }

  const connector = createHttpConnector({
    endpoint: endpoint ?? 'https://reportportal.example.com/api/v1/my_project/launch',
    token,
    dryRun,
  })

  const summary: RunSummary = {
    runId: reportConfig.runId,
    startTime: new Date().toISOString(),
    endTime: new Date().toISOString(),
    totalTests: 14,
    passed: 12,
    failed: 1,
    skipped: 1,
    htmlReportPath: reportConfig.reportHtmlPath(),
  }

  await publishReport(summary, [connector])
}

main()
