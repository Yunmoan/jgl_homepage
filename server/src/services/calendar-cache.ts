import fs from 'fs/promises'
import path from 'path'
import { randomUUID } from 'crypto'
import { fetchPublicJson, fetchPublicText } from './calendar-http'
import { directGoogleFeed, hash, normalizeSourceData, sourceKey, sourceLabel, sourceUrl } from './calendar-source-data'
import type { SourceConfig, SourceEvent } from './calendar-source-data'

interface Snapshot { version: 1; key: string; fetched_at: string; events: SourceEvent[]; skipped: number; seed?: boolean }
export interface SourceMetadata {
  kind: SourceConfig['kind']; key: string; label: string; url: string
  cache_state: 'local' | 'live' | 'fresh' | 'stale' | 'offline' | 'unavailable'
  fetched_at: string | null; warning: string; skipped: number
}
export interface SourceResult {events: SourceEvent[]; source: SourceMetadata}

type Fetcher = (url: string) => Promise<unknown>
type TextFetcher = (url: string, headers?: Record<string, string>) => Promise<string>

export class CalendarCache {
  private pending = new Map<string, Promise<SourceResult>>()
  private retryAfter = new Map<string, number>()
  constructor(
    private directory = path.resolve(__dirname, '../../data/exhibition-cache'),
    private fetcher: Fetcher = fetchPublicJson,
    private now = () => Date.now(),
    private textFetcher: TextFetcher = fetchPublicText,
  ) {}
  // thonly keeps the same cache key when its yearly spreadsheet list changes, so a newly
  // discovered sheet does not orphan the last good snapshot. Custom JSON keys must stay
  // filesystem-safe (no "json:" prefix on Windows).
  private key(config: SourceConfig) {
    return config.kind === 'thonly' ? 'thonly' : hash(`json\n${[...config.urls].sort().join('\n')}`)
  }
  private async readFile(filename: string, key: string): Promise<Snapshot | null> {
    try {
      if ((await fs.stat(filename)).size > 20 * 1024 * 1024) return null
      const value = JSON.parse(await fs.readFile(filename,'utf8')) as Snapshot
      return value.version === 1 && value.key === key && Number.isFinite(Date.parse(value.fetched_at)) && Array.isArray(value.events) && value.events.length <= 10000 ? value : null
    } catch {return null}
  }
  private async read(key: string): Promise<Snapshot | null> {
    const runtime = await this.readFile(path.join(this.directory, `${key}.json`), key)
    if (runtime) return runtime
    // A repository-bundled snapshot keeps the calendar usable when the very first deployment
    // cannot reach either the Google Sheets endpoint or the thonly proxy.
    const seed = await this.readFile(path.join(this.directory, `${key}.seed.json`), key)
    return seed ? {...seed, seed: true} : null
  }
  private async write(snapshot: Snapshot) {
    await fs.mkdir(this.directory,{recursive:true})
    const temporary = path.join(this.directory,`${snapshot.key}.${randomUUID()}.tmp`)
    try {
      await fs.writeFile(temporary, JSON.stringify(snapshot), 'utf8')
      await fs.rename(temporary,path.join(this.directory,`${snapshot.key}.json`))
    } finally {await fs.unlink(temporary).catch(() => {})}
  }
  private async fetchDocument(config: SourceConfig, url: string): Promise<unknown> {
    if (config.kind !== 'thonly') return this.fetcher(url)
    const direct = directGoogleFeed(url)
    // Direct Google first, then the published thonly proxy.
    for (const candidate of direct && direct !== url ? [direct, url] : [url]) {
      try {return await this.fetcher(candidate)} catch {
        // Try the next public route.
      }
    }
    // Last resort: read the same public JSON through the read-only Jina reader. Percent
    // escapes are doubled because the reader decodes the target URL once.
    const readerUrl = `https://r.jina.ai/${url.replace(/%/g, '%25')}`
    const text = await this.textFetcher(readerUrl, {
      'X-Return-Format': 'text',
      'Accept': 'application/json',
    })
    try {return JSON.parse(text)} catch {throw new Error('日历源未返回有效 JSON')}
  }
  async get(config: SourceConfig, force = false): Promise<SourceResult> {
    const source: SourceMetadata = {kind:config.kind,key:sourceKey(config),label:sourceLabel(config),url:sourceUrl(config),cache_state:'local',fetched_at:null,warning:'',skipped:0}
    if (config.kind === 'local') return {events:[],source}
    const key = this.key(config)
    const cached = config.cache_mode === 'none' ? null : await this.read(key)
    const useCache = (state: SourceMetadata['cache_state'], warning = ''): SourceResult => ({
      events: (cached?.events || []).map(event => ({...event,source_label:source.label,source_url:source.url})),
      source:{...source,cache_state:state,fetched_at:cached?.fetched_at || null,warning,skipped:cached?.skipped || 0},
    })
    const seedWarning = cached?.seed ? '日历源暂时无法访问，正在显示内置离线数据' : ''
    if (config.cache_mode === 'offline') return useCache(cached ? 'offline':'unavailable',cached ? (cached.seed ? '当前使用内置离线数据' : '当前使用本地离线缓存') : '尚无离线缓存，暂无可显示的来源活动')
    // A bundled seed is never treated as fresh: the server must try to fetch current data first.
    if (!force && cached && !cached.seed && this.now() - Date.parse(cached.fetched_at) < config.cache_ttl_seconds * 1000) return useCache('fresh')
    if (!force && config.cache_mode !== 'none' && (this.retryAfter.get(key) || 0) > this.now()) return useCache(cached ? 'stale':'unavailable',cached ? seedWarning || '日历源暂时无法访问，正在显示上次成功缓存' : '日历源暂时无法访问，且没有可用缓存')
    const requestKey = `${key}:${config.cache_mode}:${config.cache_ttl_seconds}:${source.label}`
    const pending = this.pending.get(requestKey)
    if (pending) return pending
    const request = (async (): Promise<SourceResult> => {
      try {
        // A failed feed must not replace a complete snapshot with partial data.
        const documents = await Promise.all(config.urls.map(url => this.fetchDocument(config,url)))
        const normalized = normalizeSourceData(config,documents)
        const snapshot: Snapshot = {version:1,key,fetched_at:new Date(this.now()).toISOString(),...normalized}
        let warning = ''
        if (config.cache_mode === 'ttl') {
          try {await this.write(snapshot)} catch {warning = '本次数据已加载，但本地缓存未能保存，请联系管理员检查缓存目录权限'}
        }
        this.retryAfter.delete(key)
        return {events:normalized.events,source:{...source,cache_state:'live',fetched_at:snapshot.fetched_at,warning,skipped:normalized.skipped}}
      } catch {
        if (config.cache_mode !== 'none') this.retryAfter.set(key,this.now() + 5 * 60_000)
        return useCache(cached ? 'stale':'unavailable',cached ? seedWarning || '日历源暂时无法访问，正在显示上次成功缓存' : config.cache_mode === 'none' ? '日历源暂时无法访问；当前未启用缓存' : '日历源暂时无法访问，且没有可用缓存')
      } finally {this.pending.delete(requestKey)}
    })()
    this.pending.set(requestKey,request)
    return request
  }
}

export const calendarCache = new CalendarCache()
