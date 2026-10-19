import { calendarCache } from './calendar-cache'
import { readSourceConfig, updateThonlyFeeds } from './calendar-store'
import { discoverThonlyFeeds } from './thonly-discovery'

let running = false
let timer: NodeJS.Timeout | undefined
let started = false
let lastError = ''
let lastErrorAt = 0

/**
 * Refresh the configured source in the background. With the default TTL mode this keeps the
 * local snapshot current even when nobody visits the site, and it lets the server pick up a
 * newly published thonly spreadsheet without any administrator action.
 */
export async function refreshCalendarSource(): Promise<void> {
  if (running) return
  running = true
  try {
    const config = await readSourceConfig()
    if (config.kind === 'thonly' && config.cache_mode !== 'offline') {
      const feeds = await discoverThonlyFeeds()
      if (feeds) await updateThonlyFeeds(feeds)
    }
    const current = await readSourceConfig()
    if (current.kind !== 'local' && current.cache_mode === 'ttl') await calendarCache.get(current)
  } catch (error) {
    // A database outage or an unreachable source must not stop the scheduler.
    const message = error instanceof Error ? error.message : String(error)
    if (message !== lastError || Date.now() - lastErrorAt > 10 * 60 * 1000) {
      console.warn('[exhibitions] Background calendar refresh failed:', message)
      lastError = message
      lastErrorAt = Date.now()
    }
  } finally {
    running = false
  }
}

export function startCalendarRefresh(interval = 60_000): void {
  if (started) return
  started = true
  const tick = () => { void refreshCalendarSource() }
  const initial = setTimeout(tick, 3_000)
  initial.unref?.()
  timer = setInterval(tick, interval)
  timer.unref?.()
}

export function stopCalendarRefresh(): void {
  if (timer) clearInterval(timer)
  timer = undefined
  started = false
}
