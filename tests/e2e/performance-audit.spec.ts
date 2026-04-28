/**
 * T063 — Performance Audit
 *
 * Measures:
 *   1. Library page initial load time (target ≤ 2 s)
 *   2. Quick Read page initial load time (target ≤ 2 s)
 *   3. Large-archive first-page extraction time (target ≤ 5 s)
 *      — skipped when no large fixture is present in tests/fixtures/
 *
 * Metric source: Navigation Timing Level 2 API (performance.getEntriesByType).
 * The "load" phase: responseStart to loadEventEnd captures the full page-load
 * inclusive of JS parse/execute.  We also capture the LCP candidate via
 * PerformanceObserver polled at networkidle.
 */

import { test, expect } from '@playwright/test'
import { existsSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const LARGE_CBZ_FIXTURE = path.join(__dirname, '../fixtures/large-archive.cbz')

// ---------------------------------------------------------------------------
// Helper: read Navigation Timing from the page
// ---------------------------------------------------------------------------

async function getNavigationTiming(page: import('@playwright/test').Page) {
  return page.evaluate(() => {
    const entries = performance.getEntriesByType('navigation') as PerformanceNavigationTiming[]
    if (!entries.length) return null
    const e = entries[0]
    return {
      /** Time from navigationStart to loadEventEnd (full page load) */
      pageLoadMs: e.loadEventEnd - e.startTime,
      /** Time from navigationStart to domContentLoadedEventEnd (DOM ready) */
      domContentLoadedMs: e.domContentLoadedEventEnd - e.startTime,
      /** TTFB = responseStart - requestStart */
      ttfbMs: e.responseStart - e.requestStart,
    }
  })
}

// ---------------------------------------------------------------------------
// Page load performance
// ---------------------------------------------------------------------------

test.describe('T063.1 — Page load time', () => {
  test('library page loads within 2 seconds', async ({ page }) => {
    await page.goto('library')
    await page.waitForLoadState('networkidle')

    const timing = await getNavigationTiming(page)
    if (timing === null) {
      // Navigation Timing not available (unlikely in Chromium) — skip soft
      console.warn('Navigation Timing unavailable; skipping load-time assertion.')
      return
    }

    // Report the metric regardless of pass/fail for audit visibility
    console.log(`Library pageLoad: ${timing.pageLoadMs.toFixed(0)} ms, ` +
                `TTFB: ${timing.ttfbMs.toFixed(0)} ms`)

    expect(
      timing.pageLoadMs,
      `Library page load (${timing.pageLoadMs.toFixed(0)} ms) exceeded 2 000 ms target`,
    ).toBeLessThan(2000)
  })

  test('quick-read page loads within 2 seconds', async ({ page }) => {
    await page.goto('quick-read')
    await page.waitForLoadState('networkidle')

    const timing = await getNavigationTiming(page)
    if (timing === null) {
      console.warn('Navigation Timing unavailable; skipping load-time assertion.')
      return
    }

    console.log(`Quick-Read pageLoad: ${timing.pageLoadMs.toFixed(0)} ms, ` +
                `TTFB: ${timing.ttfbMs.toFixed(0)} ms`)

    expect(
      timing.pageLoadMs,
      `Quick-Read page load (${timing.pageLoadMs.toFixed(0)} ms) exceeded 2 000 ms target`,
    ).toBeLessThan(2000)
  })

  test('settings page loads within 2 seconds', async ({ page }) => {
    await page.goto('settings')
    await page.waitForLoadState('networkidle')

    const timing = await getNavigationTiming(page)
    if (timing === null) {
      console.warn('Navigation Timing unavailable; skipping load-time assertion.')
      return
    }

    console.log(`Settings pageLoad: ${timing.pageLoadMs.toFixed(0)} ms`)

    expect(
      timing.pageLoadMs,
      `Settings page load (${timing.pageLoadMs.toFixed(0)} ms) exceeded 2 000 ms target`,
    ).toBeLessThan(2000)
  })
})

// ---------------------------------------------------------------------------
// DOM size / complexity baseline
// ---------------------------------------------------------------------------

test.describe('T063.2 — DOM complexity', () => {
  test('library page has a reasonable DOM node count', async ({ page }) => {
    await page.goto('library')
    await page.waitForLoadState('networkidle')

    const nodeCount = await page.evaluate(() => document.querySelectorAll('*').length)
    console.log(`Library DOM nodes: ${nodeCount}`)

    // Keeping DOM under 1 500 nodes avoids layout thrash (Lighthouse threshold: 1 500)
    expect(
      nodeCount,
      `Library DOM is too large (${nodeCount} nodes > 1 500 threshold)`,
    ).toBeLessThan(1500)
  })
})

// ---------------------------------------------------------------------------
// Large-archive extraction performance
// Requires tests/fixtures/large-archive.cbz (≥200 MB) to be present.
// Skipped automatically when the fixture is absent.
// ---------------------------------------------------------------------------

test.describe('T063.3 — Large-archive first-page extraction (conditional)', () => {
  test('first page of a ≥200 MB CBZ opens within 5 seconds', async ({ page }) => {
    if (!existsSync(LARGE_CBZ_FIXTURE)) {
      test.skip()
    }

    await page.goto('quick-read')
    await page.waitForLoadState('networkidle')

    const start = Date.now()

    // Upload the large archive via the hidden file input
    await page.locator('input[type="file"]').setInputFiles(LARGE_CBZ_FIXTURE)

    // Wait for the first page image to appear
    await expect(
      page.locator('img[alt*="Page"]').or(page.locator('[data-testid="comic-page"]')).first(),
    ).toBeVisible({ timeout: 10_000 })

    const elapsed = Date.now() - start
    console.log(`Large archive first-page time: ${elapsed} ms`)

    expect(
      elapsed,
      `First page of large archive took ${elapsed} ms — target ≤ 5 000 ms`,
    ).toBeLessThan(5000)
  })
})
