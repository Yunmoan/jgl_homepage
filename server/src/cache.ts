import NodeCache from 'node-cache'

// 可通过环境变量控制缓存开关与TTL（秒）：
// CACHE_ENABLED=true|false （默认 true）
// CACHE_TTL_SEC=数字 （默认 30 秒）
const enabled = (process.env.CACHE_ENABLED ?? 'true').toLowerCase() === 'true'
const ttl = Number(process.env.CACHE_TTL_SEC ?? 30)
const safeTtl = Number.isFinite(ttl) && ttl >= 0 ? ttl : 30
const checkperiod = Math.max(10, Math.floor((safeTtl || 30) / 2))

// 适配器，保证即使禁用缓存也有相同方法签名。
interface CacheLike {
  get<T = any>(key: string): T | undefined
  set<T = any>(key: string, value: T, ttl?: number): boolean
  del(key: string): number
}

let cache: CacheLike

if (!enabled) {
  // 禁用缓存：始终 miss，set/del 为 no-op
  cache = {
    get: () => undefined,
    set: () => true,
    del: () => 0,
  }
  // eslint-disable-next-line no-console
  console.log('[CACHE] disabled by env (CACHE_ENABLED=false)')
} else {
  cache = new NodeCache({ stdTTL: safeTtl, checkperiod }) as unknown as CacheLike
  // eslint-disable-next-line no-console
  console.log(`[CACHE] enabled, TTL=${safeTtl}s, checkperiod=${checkperiod}s`)
}

export default cache

