declare module '@playwright/test' {
  interface Page {
    noMocks?: boolean
    screenshotList?: Record<string, number>
  }
}
