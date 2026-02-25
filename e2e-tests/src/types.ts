import type { Page, TestInfo } from '@playwright/test'

export type UrlMatch = string | RegExp

export type MinimalHarEntryMatcherParams = {
  page: Page
  urls: UrlMatch[]
  harArchivePath: string
  ignoreParams?: string[]
}
export type ResponseDelay = { url: string | RegExp; method: string; delay: number }

export type MockSetupOptions = {
  page: Page
  context: import('@playwright/test').BrowserContext
  testInfo: TestInfo
  useMocks?: boolean
  updateMocks?: boolean
  indexRequestUrls?: UrlMatch[]
  minimalMatcherUrls?: UrlMatch[]
  minimalMatcherIgnoreParams?: string[]
  responseDelays?: ResponseDelay[]
  customMockFn?:
    | Record<
        string,
        ({
          page,
          context,
        }: {
          page: Page
          context: import('@playwright/test').BrowserContext
        }) => Promise<void>
      >
    | ((arg: { page: Page; context: import('@playwright/test').BrowserContext }) => Promise<void>)
}
