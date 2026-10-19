import { fetchPublicText } from './calendar-http'
import { thonlyFeeds, validateSourceConfig } from './calendar-source-data'

// thonly publishes its yearly spreadsheet list inline in this public page. The page itself is
// behind a browser challenge, so a plain server request usually receives 403. The same public
// page can be read through Jina Reader, which executes the page and returns its HTML. Only the
// list of public, read-only feed URLs is used; no credentials are involved.
export const THONLY_CALENDAR_PAGE = 'https://thonly.cc/calendar/'
const READER_URL = `https://r.jina.ai/${THONLY_CALENDAR_PAGE}`

const feedPattern = /https:\/\/thonly\.cc\/proxy_google_doc\/v4\/spreadsheets\/[A-Za-z0-9_-]{20,80}\/values:batchGet\?[^"'\\\s<>]+/g

const browserHeaders = {
  'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
  'Accept-Language': 'zh-CN,zh;q=0.9,en;q=0.6',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36',
}

export function parseThonlyFeedsFromHtml(html: string): string[] {
  const found = [...html.matchAll(feedPattern)]
    .map((match) => match[0].replace(/&amp;/g, '&').trim())
    .filter((url) => {
      // Keep the parsed list strictly limited to the public thonly feed shape.
      const result = validateSourceConfig({
        kind: 'thonly',
        label: 'thonly.cc',
        urls: [url],
        cache_mode: 'ttl',
        cache_ttl_seconds: 86400,
      })
      return Boolean(result.data)
    })
  // Preserve page order (oldest year first) while removing duplicates.
  return [...new Set(found)].slice(0, 24)
}

const SUCCESS_INTERVAL = 6 * 60 * 60 * 1000
const FAILURE_INTERVAL = 30 * 60 * 1000
let lastSuccess = 0
let lastFailure = 0
let lastResult: string[] | null = null
let pending: Promise<string[] | null> | null = null

async function fetchFeedList(): Promise<string[] | null> {
  const sources = [
    { url: THONLY_CALENDAR_PAGE, headers: browserHeaders },
    { url: READER_URL, headers: { 'X-Return-Format': 'html' } },
  ]
  for (const source of sources) {
    try {
      const html = await fetchPublicText(source.url, source.headers)
      const feeds = parseThonlyFeedsFromHtml(html)
      if (feeds.length) return feeds
    } catch {
      // Try the next read-only source; the caller keeps the last known list.
    }
  }
  return null
}

/**
 * Best-effort discovery of the spreadsheet list published by thonly.cc.
 * Successful results are reused for six hours; transient failures retry after thirty minutes
 * and keep the previous list.
 */
export async function discoverThonlyFeeds(force = false): Promise<string[] | null> {
  const now = Date.now()
  const nextAttempt = lastFailure > lastSuccess ? lastFailure + FAILURE_INTERVAL : lastSuccess + SUCCESS_INTERVAL
  if (!force && now < nextAttempt) return lastResult
  if (pending) return pending
  pending = fetchFeedList()
    .then((feeds) => {
      if (feeds) {
        lastResult = feeds
        lastSuccess = Date.now()
      } else {
        lastFailure = Date.now()
      }
      return feeds
    })
    .catch(() => {
      lastFailure = Date.now()
      return null
    })
    .finally(() => {
      pending = null
    })
  return pending
}

export const lastDiscoveredThonlyFeeds = () => lastResult
export const knownThonlyFeeds = () => lastResult?.length ? lastResult : [...thonlyFeeds]
