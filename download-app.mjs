/**
 * Downloads the Banking Project demo app for offline/local testing.
 * Fetches the raw source HTML and all referenced JS/CSS assets.
 *
 * If the download fails (no internet, DNS issues, etc.) and a local copy
 * already exists in banking-app/, the existing copy is kept as-is.
 */
import { chromium } from '@playwright/test'
import { writeFileSync, mkdirSync, existsSync } from 'fs'
import { join } from 'path'

const APP_URL = 'https://www.globalsqa.com/angularJs-protractor/BankingProject/'
const OUT_DIR = join(import.meta.dirname, 'banking-app')
const INDEX_PATH = join(OUT_DIR, 'index.html')

const CDN_MAP = {
  'https://ajax.googleapis.com/ajax/libs/angularjs/1.4.7/angular.min.js': 'angular.min.js',
  'https://cdnjs.cloudflare.com/ajax/libs/angular-ui-router/0.2.15/angular-ui-router.min.js': 'angular-ui-router.min.js',
  'https://ajax.googleapis.com/ajax/libs/jquery/2.1.3/jquery.min.js': 'jquery.min.js',
  'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/js/bootstrap.min.js': 'bootstrap.min.js',
  'https://maxcdn.bootstrapcdn.com/bootstrap/3.3.5/css/bootstrap.min.css': 'bootstrap.min.css',
}

async function downloadApp() {
  const appExists = existsSync(INDEX_PATH)

  let browser
  try {
    if (!existsSync(OUT_DIR)) mkdirSync(OUT_DIR, { recursive: true })

    browser = await chromium.launch({ headless: true })
    const ctx = await browser.newContext()
    const page = await ctx.newPage()

    let rawSource = ''
    page.on('response', async (resp) => {
      const url = resp.url()
      if (url === APP_URL && resp.request().resourceType() === 'document') {
        try { rawSource = await resp.text() } catch {}
      }
    })

    console.log('Navigating to banking app...')
    await page.goto(APP_URL, { waitUntil: 'networkidle' })

    if (!rawSource) {
      throw new Error('Failed to capture raw HTML source from the live site')
    }

    console.log('Got raw source HTML')

    const localScripts = [...rawSource.matchAll(/src="([^"]+\.js)"/g)].map(m => m[1])
    const localStyles = [...rawSource.matchAll(/href="([^"]+\.css)"/g)].map(m => m[1])
    const allUrls = [...new Set([...localScripts, ...localStyles])]

    console.log(`Found ${allUrls.length} resources to download`)

    for (const urlOrPath of allUrls) {
      const fullUrl = urlOrPath.startsWith('http') ? urlOrPath : new URL(urlOrPath, APP_URL).href
      const localName = CDN_MAP[fullUrl] || urlOrPath.split('/').pop().split('?')[0]

      try {
        const resp = await page.request.get(fullUrl)
        if (resp.ok()) {
          writeFileSync(join(OUT_DIR, localName), await resp.body())
          console.log(`  OK: ${localName}`)
        } else {
          console.log(`  FAIL (${resp.status()}): ${localName}`)
        }
      } catch (e) {
        console.log(`  ERROR: ${localName} -- ${e.message}`)
      }
    }

    const configJs = await page.request.get(new URL('config.js', APP_URL).href)
    if (configJs.ok()) {
      const configText = await configJs.text()
      const templateUrls = [...configText.matchAll(/templateUrl\s*:\s*['"]([^'"]+)['"]/g)].map(m => m[1])
      console.log(`Found ${templateUrls.length} template partials in config.js`)
      for (const tpl of templateUrls) {
        const fullUrl = new URL(tpl, APP_URL).href
        const localName = tpl.split('/').pop()
        try {
          const resp = await page.request.get(fullUrl)
          if (resp.ok()) {
            writeFileSync(join(OUT_DIR, localName), await resp.body())
            console.log(`  OK: ${localName}`)
          }
        } catch (e) {
          console.log(`  SKIP: ${localName}`)
        }
      }
    }

    let localHtml = rawSource
    for (const [cdn, local] of Object.entries(CDN_MAP)) {
      localHtml = localHtml.replaceAll(cdn, local)
    }

    writeFileSync(INDEX_PATH, localHtml, 'utf-8')
    console.log('\nSaved index.html with local paths')

    await browser.close()
    console.log('Done!')
  } catch (err) {
    if (browser) {
      try { await browser.close() } catch {}
    }

    if (appExists) {
      console.warn(`\nDownload failed: ${err.message}`)
      console.warn('Keeping existing local copy in banking-app/ -- tests can still run with --local')
    } else {
      console.error(`\nDownload failed and no local copy exists in banking-app/`)
      console.error(`Error: ${err.message}`)
      console.error(`\nEither connect to the internet and retry, or restore banking-app/ from git.`)
      process.exit(1)
    }
  }
}

downloadApp()
