export interface RunSummary {
  runId: string
  startTime: string
  endTime: string
  totalTests: number
  passed: number
  failed: number
  skipped: number
  htmlReportPath: string
}

export interface PublishResult {
  success: boolean
  remoteUrl?: string
  remoteId?: string
  error?: string
}

export interface ReportConnector {
  name: string
  publish(summary: RunSummary): Promise<PublishResult>
}
