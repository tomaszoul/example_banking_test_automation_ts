/**
 * @file Browser-level utilities for the AngularJS banking app.
 *
 * Provides navigation and AngularJS digest-cycle synchronization used across
 * all page objects and specs.
 */
import type { Page } from '@playwright/test'

const BANK_BASE_URL =
  process.env.BANK_BASE_URL ||
  'https://www.globalsqa.com/angularJs-protractor/BankingProject/#/login'

/** Opens the banking app home page and waits for it to be ready. */
export async function navigateToBank(page: Page): Promise<void> {
  await page.goto(BANK_BASE_URL, { waitUntil: 'domcontentloaded' })
  await waitForAngular(page)
}

/**
 * Waits for AngularJS to settle. Uses $browser.notifyWhenNoOutstandingRequests
 * when available, falls back to a short stabilization delay.
 */
export async function waitForAngular(page: Page): Promise<void> {
  try {
    await page.waitForFunction(
      () => {
        const ng = (window as any).angular
        if (!ng) return true
        const el = document.querySelector('[ng-app]') || document.body
        const ngEl = ng.element(el)
        if (!ngEl || typeof ngEl.injector !== 'function') return true
        const injector = ngEl.injector()
        if (!injector) return true
        try {
          const $browser = injector.get('$browser')
          return new Promise<boolean>((resolve) => {
            $browser.notifyWhenNoOutstandingRequests(() => resolve(true))
            setTimeout(() => resolve(true), 250)
          })
        } catch {
          return true
        }
      },
      null,
      { timeout: 3000 },
    )
  } catch {
    // Swallow: app is ready enough
  }
}
