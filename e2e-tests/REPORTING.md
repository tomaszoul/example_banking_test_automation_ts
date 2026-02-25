# Test Reporting Guide

## How It Works

Every Playwright test run automatically generates an **HTML report** in a unique, timestamped directory under `test-reports/`. Reports are self-contained HTML files that Playwright produces natively.

### Run ID Format

Each run is identified by a **run ID** derived from the current date and time:

```
YYYYMMDD-HHmmss
```

Example: `20260225-134512` for a run started on 2026-02-25 at 13:45:12.

Reports are stored at:

```
test-reports/<runId>/index.html
```

### Retention Policy

Only the **latest 3 report versions** are kept on disk. Older reports are automatically pruned before each run (both `pnpm test` and `pnpm test:report`). The retention count is configurable via the `PW_REPORT_KEEP_COUNT` environment variable (default: `3`).

---

## Running Tests with Reports

| Command | Description |
|---------|-------------|
| `pnpm test:report` | Run tests, generate HTML report, prune old reports |
| `pnpm test:report:open` | Same as above, then auto-open the report in your browser |
| `pnpm test` | Standard run (HTML report still generated, old reports auto-pruned) |

### Auto-Open Behavior

The auto-open feature can be triggered in two ways:

1. **CLI flag**: `pnpm test:report:open` (uses `--open` flag internally)
2. **Environment variable**: `PW_REPORT_AUTO_OPEN=true pnpm test:report`

**Current default: OFF.** This is intentionally disabled during the debugging/review phase. Once the reporting flow is validated, the reviewer or team can enable it by default.

---

## Connector API (Publishing Reports to External Services)

A lightweight, pluggable connector API is provided for posting test run metadata to services like [ReportPortal](https://reportportal.io/), Allure TestOps, or custom dashboards.

### Architecture

```
RunSummary  -->  ReportConnector.publish()  -->  External Service
```

The connector receives a `RunSummary` object:

```typescript
interface RunSummary {
  runId: string
  startTime: string       // ISO 8601
  endTime: string         // ISO 8601
  totalTests: number
  passed: number
  failed: number
  skipped: number
  htmlReportPath: string  // local path to the HTML report
}
```

### Built-in HTTP Connector

A generic HTTP connector is included that POSTs JSON to any endpoint. It works out of the box with services that accept a JSON launch/run payload.

### Usage

```bash
# Dry-run (no real HTTP call, logs payload to console)
pnpm report:publish:dry

# Real publish (requires endpoint + token)
RP_ENDPOINT=https://reportportal.example.com/api/v1/my_project/launch \
RP_TOKEN=your-api-token \
pnpm report:publish
```

### ReportPortal Example

The HTTP connector maps naturally to ReportPortal's Launch API:

| Connector field | ReportPortal API field |
|-----------------|----------------------|
| `name` | `name` (launch name) |
| `startTime` | `startTime` |
| `endTime` | _(sent in finish-launch call)_ |
| `description` | `description` |
| `attributes` | `attributes` (key-value tags) |
| `mode` | `mode` (`DEFAULT` or `DEBUG`) |

**Endpoint**: `POST /api/v1/{projectName}/launch`
**Auth**: `Authorization: Bearer {api_token}`

Example payload sent by the connector:

```json
{
  "name": "E2E Run 20260225-134512",
  "startTime": "2026-02-25T13:45:12.000Z",
  "endTime": "2026-02-25T13:46:30.000Z",
  "description": "Tests: 14 | Passed: 12 | Failed: 1 | Skipped: 1",
  "attributes": [
    { "key": "runId", "value": "20260225-134512" },
    { "key": "framework", "value": "playwright" }
  ],
  "mode": "DEFAULT"
}
```

### Writing a Custom Connector

Implement the `ReportConnector` interface:

```typescript
import type { ReportConnector, RunSummary, PublishResult } from './connectors/types'

const myConnector: ReportConnector = {
  name: 'my-service',
  async publish(summary: RunSummary): Promise<PublishResult> {
    // your logic here
    return { success: true, remoteUrl: 'https://...' }
  },
}
```

Then pass it to `publishReport()` from `publish-report.ts`.

---

## File Layout

```
e2e-tests/utils/reporting/
├── report-config.ts              # Run ID generation, env flags, paths
├── retention.ts                  # Prune old reports (keep latest N)
├── post-run.ts                   # Post-run hook: optional browser open
├── publish-report.ts             # CLI entry point for publishing to connectors
├── run-tests.ts                  # CLI wrapper: prune + run tests + post-run
└── connectors/
    ├── types.ts                  # ReportConnector interface, RunSummary, PublishResult
    └── http-connector.ts         # Generic HTTP POST connector (ReportPortal-compatible)
```
