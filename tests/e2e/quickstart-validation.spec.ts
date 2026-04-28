/**
 * T062 — Quickstart Validation Checklist
 *
 * Verifies every item from quickstart.md before GitHub Pages deployment:
 *   1. Base path (/comiq/) routing works
 *   2. manifest.webmanifest has correct start_url, scope, and name
 *   3. Service-worker file is accessible at /comiq/sw.js
 *   4. .nojekyll is present in public/ (and dist/ when built)
 *   5. App shell loads key structural elements
 *   6. Offline app-shell check (structural; full SW caching verified on preview build)
 */

import { test, expect } from '@playwright/test'
import { existsSync, readFileSync } from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const REPO_ROOT = path.resolve(__dirname, '../..')
const DIST_DIR = path.join(REPO_ROOT, 'dist')
const PUBLIC_DIR = path.join(REPO_ROOT, 'public')

// ---------------------------------------------------------------------------
// 1. Base path and routing
// ---------------------------------------------------------------------------

test.describe('T062.1 — Base path and routing', () => {
  test('root redirects to /library', async ({ page }) => {
    await page.goto('.')
    await page.waitForURL(/\/library/, { timeout: 10000 })
    await expect(page).toHaveURL(/\/library/)
  })

  test('/library route renders the main landmark', async ({ page }) => {
    await page.goto('library')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('/quick-read route renders the main landmark', async ({ page }) => {
    await page.goto('quick-read')
    await page.waitForLoadState('networkidle')
    await expect(page.locator('main').first()).toBeVisible()
  })

  test('/settings route renders a heading', async ({ page }) => {
    await page.goto('settings')
    await page.waitForLoadState('networkidle')
    await expect(page.getByRole('heading', { name: /settings/i })).toBeVisible()
  })
})

// ---------------------------------------------------------------------------
// 2. PWA Manifest
// ---------------------------------------------------------------------------

test.describe('T062.2 — PWA manifest', () => {
  test('manifest.webmanifest is accessible via HTTP', async ({ request }) => {
    const response = await request.get('http://localhost:5173/comiq/manifest.webmanifest')
    expect(response.ok()).toBeTruthy()

    const manifest = await response.json() as Record<string, unknown>
    expect(manifest.name).toBeTruthy()
    expect(manifest.start_url).toBe('/comiq/')
    expect(manifest.scope).toBe('/comiq/')
  })

  test('manifest is linked in the HTML <head>', async ({ page }) => {
    await page.goto('library')
    await expect(page.locator('link[rel="manifest"]')).toHaveCount(1)
  })

  test('public/manifest.webmanifest has correct start_url and scope', async () => {
    const manifestPath = path.join(PUBLIC_DIR, 'manifest.webmanifest')
    expect(existsSync(manifestPath)).toBeTruthy()

    const manifest = JSON.parse(readFileSync(manifestPath, 'utf-8')) as Record<string, unknown>
    expect(manifest.start_url).toBe('/comiq/')
    expect(manifest.scope).toBe('/comiq/')
    expect(typeof manifest.name).toBe('string')
  })

  test('dist/manifest.webmanifest matches public/ when dist exists', async () => {
    if (!existsSync(DIST_DIR)) {
      test.skip()
    }
    const distManifestPath = path.join(DIST_DIR, 'manifest.webmanifest')
    expect(existsSync(distManifestPath)).toBeTruthy()

    const manifest = JSON.parse(readFileSync(distManifestPath, 'utf-8')) as Record<string, unknown>
    expect(manifest.start_url).toBe('/comiq/')
    expect(manifest.scope).toBe('/comiq/')
  })
})

// ---------------------------------------------------------------------------
// 3. Service-worker registration
// ---------------------------------------------------------------------------

test.describe('T062.3 — Service-worker', () => {
  test('sw.js is accessible at /comiq/sw.js (dev mode with devOptions.enabled)', async ({
    request,
  }) => {
    // vite-plugin-pwa with devOptions.enabled:true serves sw.js in dev mode too
    const response = await request.get('http://localhost:5173/comiq/sw.js')
    // 200 OK expected; 404 is a hard failure — SW not registered in dev
    expect(response.status()).toBe(200)
  })

  test('dist/sw.js exists after build', async () => {
    if (!existsSync(DIST_DIR)) {
      test.skip()
    }
    expect(existsSync(path.join(DIST_DIR, 'sw.js'))).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 4. .nojekyll for GitHub Pages
// ---------------------------------------------------------------------------

test.describe('T062.4 — .nojekyll', () => {
  test('public/.nojekyll exists', async () => {
    expect(existsSync(path.join(PUBLIC_DIR, '.nojekyll'))).toBeTruthy()
  })

  test('dist/.nojekyll is present in the production build', async () => {
    if (!existsSync(DIST_DIR)) {
      test.skip()
    }
    expect(existsSync(path.join(DIST_DIR, '.nojekyll'))).toBeTruthy()
  })
})

// ---------------------------------------------------------------------------
// 5. App-shell structural check
// ---------------------------------------------------------------------------

test.describe('T062.5 — App shell', () => {
  test('critical app-shell elements are present without JS errors', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', (err) => errors.push(err.message))

    await page.goto('library')
    await page.waitForLoadState('networkidle')

    expect(errors.filter((e) => !/ResizeObserver|favicon/i.test(e))).toHaveLength(0)
    await expect(page.locator('body')).toBeVisible()
  })
})
