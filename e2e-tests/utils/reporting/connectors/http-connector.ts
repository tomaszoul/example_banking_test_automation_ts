import type { ReportConnector, RunSummary, PublishResult } from './types'

export interface HttpConnectorOptions {
  /** Full URL, e.g. https://reportportal.example.com/api/v1/my-project/launch */
  endpoint: string
  /** Bearer token or API key */
  token: string
  /** Extra headers to merge into every request */
  headers?: Record<string, string>
  /** Dry-run mode: logs the payload without making a real HTTP call (default false) */
  dryRun?: boolean
}

/**
 * Generic HTTP connector that POSTs run metadata as JSON.
 *
 * Works with any service that accepts a JSON launch/run payload
 * (ReportPortal, Allure TestOps, custom dashboards, etc.).
 */
export function createHttpConnector(options: HttpConnectorOptions): ReportConnector {
  const { endpoint, token, headers = {}, dryRun = false } = options

  return {
    name: 'http',

    async publish(summary: RunSummary): Promise<PublishResult> {
      const body = {
        name: `E2E Run ${summary.runId}`,
        startTime: summary.startTime,
        endTime: summary.endTime,
        description: `Tests: ${summary.totalTests} | Passed: ${summary.passed} | Failed: ${summary.failed} | Skipped: ${summary.skipped}`,
        attributes: [
          { key: 'runId', value: summary.runId },
          { key: 'framework', value: 'playwright' },
        ],
        mode: 'DEFAULT',
      }

      if (dryRun) {
        console.log('[http-connector] DRY RUN – would POST to:', endpoint)
        console.log('[http-connector] Payload:', JSON.stringify(body, null, 2))
        return { success: true, remoteId: 'dry-run' }
      }

      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
            ...headers,
          },
          body: JSON.stringify(body),
        })

        if (!res.ok) {
          const text = await res.text()
          return { success: false, error: `HTTP ${res.status}: ${text}` }
        }

        const data = (await res.json()) as Record<string, unknown>
        return {
          success: true,
          remoteId: String(data.id ?? data.uuid ?? ''),
          remoteUrl: typeof data.url === 'string' ? data.url : undefined,
        }
      } catch (err) {
        return { success: false, error: String(err) }
      }
    },
  }
}
