/**
 * @file Reusable assertion helpers that reduce boilerplate in specs.
 *
 * Each helper wraps a common Playwright `expect` pattern with sensible
 * defaults for timeouts, so specs stay concise and consistent.
 */
import type { Locator } from '@playwright/test'
import { expect } from '@playwright/test'

/** Asserts the locator is visible. One line beats five. */
export async function expectVisible(locator: Locator, timeout = 5000): Promise<void> {
  await expect(locator).toBeVisible({ timeout })
}

/** Asserts balance changed by exactly `delta`. Accountants would approve. */
export async function expectBalanceChange(
  balanceBefore: number,
  balanceAfter: number,
  delta: number,
): Promise<void> {
  expect(balanceAfter).toBe(balanceBefore + delta)
}
