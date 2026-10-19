import { createHash } from 'crypto'
import { isCalendarDate } from '../utils/exhibitions'

export interface SourceConfig {
  kind: 'local' | 'thonly' | 'json'
  label: string
  urls: string[]
  cache_mode: 'ttl' | 'offline' | 'none'
  cache_ttl_seconds: number
}

export interface SourceEvent {
  id: string
  source_event_id: string
  source_key: string
  source_label: string
  source_url: string
  title: string
  start_date: string
  end_date: string
  location: string
  booth: string
  participation: 'undecided' | 'participating' | 'not_participating'
  participation_notes: string
  description: string
  link: string
  source_status: string
  category: string
  qq_group: string
}

// Public feed addresses linked by https://thonly.cc/calendar/ (checked 2026-10-19).
// These are public, read-only feed keys, not site credentials. The server converts them to
// the equivalent sheets.googleapis.com address when fetching, because the thonly.cc proxy is
// protected by a browser challenge that rejects plain HTTP clients.
export const thonlyFeeds = [
  'https://thonly.cc/proxy_google_doc/v4/spreadsheets/13ykPzw9cKqQVXXEwhCuX_mitQegHdFHjZtGdqT6tlmk/values:batchGet?ranges=THO!A2:E200&ranges=THP%26tea-party!A2:E200&ranges=School!A2:E200&ranges=LIVE!A2:E200&key=AIzaSyAKE37_qaMY4aYDHubmX_yfebfYmnx2HUw',
  'https://thonly.cc/proxy_google_doc/v4/spreadsheets/1mMUsvTdyz07BtnLbs0WEr5gdvsRkjftnrek_n5HSdNU/values:batchGet?ranges=THO!A2:E200&ranges=THP%26tea-party!A2:E200&ranges=School!A2:E200&ranges=LIVE!A2:E200&key=AIzaSyAKE37_qaMY4aYDHubmX_yfebfYmnx2HUw',
  'https://thonly.cc/proxy_google_doc/v4/spreadsheets/1zBgw7GUBOr-SENH1LRzqbQ-vs9QQCzKn5ea67IipSDU/values:batchGet?ranges=THO!A2:E200&ranges=THP%26tea-party!A2:E200&ranges=School!A2:E200&ranges=LIVE!A2:E200&key=AIzaSyCZv5xkLypGwWbpdmgYkd5aTDRIQyxyQtg',
]

const thonlyFeedPattern = /^https:\/\/thonly\.cc\/proxy_google_doc\/v4\/spreadsheets\/[A-Za-z0-9_-]{20,80}\/values:batchGet\?\S+$/
const googleFeedPattern = /^https:\/\/sheets\.googleapis\.com\/v4\/spreadsheets\/[A-Za-z0-9_-]{20,80}\/values:batchGet\?\S+$/

export const isThonlyFeed = (value: string) =>
  thonlyFeedPattern.test(value) || googleFeedPattern.test(value)

// thonly's proxy and Google's public Sheets endpoint return the same document.
export function directGoogleFeed(value: string): string | null {
  if (googleFeedPattern.test(value)) return value
  if (!thonlyFeedPattern.test(value)) return null
  return value.replace('https://thonly.cc/proxy_google_doc', 'https://sheets.googleapis.com')
}

export const defaultSourceConfig = (): SourceConfig => ({
  kind: 'thonly', label: 'thonly.cc', urls: [...thonlyFeeds],
  cache_mode: 'ttl', cache_ttl_seconds: 86400,
})

export const hash = (text: string) => createHash('sha256').update(text).digest('hex')
export const sourceKey = (config: SourceConfig) => config.kind === 'json'
  ? `json:${hash([...config.urls].sort().join('\n')).slice(0, 40)}` : config.kind
export const sourceLabel = (config: SourceConfig) => config.kind === 'thonly'
  ? 'thonly.cc' : config.kind === 'local' ? '本站维护' : config.label
export const sourceUrl = (config: SourceConfig) => config.kind === 'thonly'
  ? 'https://thonly.cc/calendar/' : config.kind === 'local' ? '' : new URL(config.urls[0]!).origin

export function validateSourceConfig(body: unknown): { data?: SourceConfig; error?: string } {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  if (!['local', 'thonly', 'json'].includes(String(input.kind))) return {error: '请选择有效的日历数据源'}
  if (!['ttl', 'offline', 'none'].includes(String(input.cache_mode))) return {error: '请选择有效的缓存方式'}
  if (!Number.isSafeInteger(input.cache_ttl_seconds) || Number(input.cache_ttl_seconds) < 1 || Number(input.cache_ttl_seconds) > 31536000)
    return {error: '缓存时间应为 1 秒至 365 天'}
  const kind = input.kind as SourceConfig['kind']
  const urls = kind === 'local' ? [] : input.urls
  if (!Array.isArray(urls) || (kind !== 'local' && (!urls.length || urls.length > 24))) return {error: '请配置 1 至 24 个数据接口地址'}
  for (const value of urls) {
    if (typeof value !== 'string' || value.length > 2048) return {error: '数据接口地址无效或过长'}
    try {
      const url = new URL(value)
      if (url.protocol !== 'https:' || url.username || url.password || url.hash || (url.port && url.port !== '443')) throw new Error()
      if (kind === 'thonly' && !isThonlyFeed(url.href)) throw new Error()
    } catch {return {error: kind === 'thonly' ? '请使用 thonly.cc 公开表格接口地址' : '请填写不含账号密码的公网 HTTPS JSON 地址'}}
  }
  const label = kind === 'thonly' ? 'thonly.cc' : kind === 'local' ? '本站维护' : typeof input.label === 'string' ? input.label.trim() : ''
  if (!label || label.length > 80) return {error: '数据源名称必填，且不能超过 80 字'}
  return {data: {kind, label, urls: [...new Set(urls.map(url => new URL(url.trim()).href))], cache_mode: input.cache_mode as SourceConfig['cache_mode'], cache_ttl_seconds: Number(input.cache_ttl_seconds)}}
}

const text = (value: unknown, max = 5000) => typeof value === 'string' || typeof value === 'number' ? String(value).trim().slice(0, max) : ''
export function sourceDate(value: unknown): string | null {
  const match = text(value, 30).match(/^(\d{4})[/-](\d{1,2})[/-](\d{1,2})$/)
  if (!match) return null
  const date = `${match[1]}-${match[2]!.padStart(2,'0')}-${match[3]!.padStart(2,'0')}`
  return isCalendarDate(date) ? date : null
}

export function normalizeSourceData(config: SourceConfig, documents: unknown[]) {
  const events = new Map<string, SourceEvent>()
  let skipped = 0
  let candidates = 0
  const key = sourceKey(config), label = sourceLabel(config), url = sourceUrl(config)
  function add(raw: Record<string, unknown>, category = '') {
    candidates++
    const title = text(raw.title ?? raw.name, 120)
    const start = sourceDate(raw.start_date ?? raw.date)
    const end = raw.end_date == null ? start : sourceDate(raw.end_date)
    if (!title || !start || !end || end < start) { skipped++; return }
    const location = text(raw.location ?? raw.province, 255)
    // Row numbers and source order may change. Match exact event identity, not row positions.
    const externalId = text(raw.id, 200)
    const eventId = hash(externalId ? `id:${externalId}` : JSON.stringify([title.normalize('NFKC'), start, end, location.normalize('NFKC')])).slice(0, 48)
    const status = text(raw.source_status ?? raw.state, 80)
    const prior = events.get(eventId)
    if (prior) {
      prior.category = [...new Set([...prior.category.split(' / '), category].filter(Boolean))].join(' / ')
      if (status.includes('取消')) prior.source_status = status
      return
    }
    let link = text(raw.link, 500)
    try { if (link && !['https:', 'http:'].includes(new URL(link).protocol)) link = '' } catch { link = '' }
    events.set(eventId, {
      id: `${key}:${eventId}`, source_event_id: eventId, source_key: key,
      source_label: label, source_url: url, title, start_date: start, end_date: end,
      location, booth: '', participation: 'undecided', participation_notes: '',
      description: text(raw.description), link, source_status: status,
      category: text(raw.category ?? category, 120), qq_group: text(raw.qq_group ?? raw.QQGroup ?? raw.QQgroup, 255),
    })
  }
  for (const document of documents) {
    if (config.kind === 'thonly') {
      const data = document as {valueRanges?: {range?: string; values?: unknown[][]}[]}
      if (!data || !Array.isArray(data.valueRanges)) throw new Error('日历源未返回有效的表格数据')
      for (const range of data.valueRanges) {
        if (!range || (range.values !== undefined && !Array.isArray(range.values))) throw new Error('日历源表格格式无效')
        const category = text(range.range, 120).split('!')[0]!.replace(/^'|'$/g, '')
        for (const row of range.values || []) {
          if (!Array.isArray(row)) throw new Error('日历源表格行格式无效')
          if (!row.some(value => text(value))) continue
          add({state: row[0], name: row[1], province: row[2], date: row[3], QQGroup: row[4]}, category)
        }
      }
    } else {
      const rows = Array.isArray(document) ? document : (document as {items?: unknown[]})?.items
      if (!Array.isArray(rows)) throw new Error('自定义日历源需要返回数组或 items 数组')
      for (const row of rows) {
        if (!row || typeof row !== 'object' || Array.isArray(row)) {candidates++; skipped++; continue}
        add(row as Record<string, unknown>)
      }
    }
  }
  if (candidates && !events.size) throw new Error('日历源中的活动日期均无效，已保留原有缓存')
  if (events.size > 10000) throw new Error('日历源活动数量超过限制')
  return {events: [...events.values()].sort((a,b) => a.start_date.localeCompare(b.start_date) || a.id.localeCompare(b.id)), skipped}
}
