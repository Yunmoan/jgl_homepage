import https from 'https'
import { lookup } from 'dns/promises'
import { BlockList, isIP } from 'net'

const blocked = new BlockList()
for (const [address, prefix] of [['0.0.0.0',8],['10.0.0.0',8],['100.64.0.0',10],['127.0.0.0',8],['169.254.0.0',16],['172.16.0.0',12],['192.168.0.0',16],['192.0.0.0',24],['192.0.2.0',24],['198.18.0.0',15],['198.51.100.0',24],['203.0.113.0',24],['224.0.0.0',4],['240.0.0.0',4]] as const) blocked.addSubnet(address,prefix,'ipv4')
// Only global unicast IPv6; exclude mapped addresses and special transition ranges.
const globalV6 = new BlockList()
globalV6.addSubnet('2000::',3,'ipv6')
blocked.addSubnet('2001::',23,'ipv6')
blocked.addSubnet('2002::',16,'ipv6')
blocked.addSubnet('2001:db8::',32,'ipv6')
blocked.addSubnet('192.88.99.0',24,'ipv4')

export const isPublicAddress = (address: string) => {
  const family = isIP(address)
  return family === 4 ? !blocked.check(address, 'ipv4') : family === 6 && globalV6.check(address, 'ipv6') && !blocked.check(address, 'ipv6')
}

interface RequestOptions {
  headers?: Record<string, string>
  redirects?: number
  deadline?: number
}

// Resolve, validate and pin the address used by the connection. Redirects repeat validation.
async function requestPublicText(address: string, options: RequestOptions): Promise<string> {
  const redirects = options.redirects || 0
  const deadline = options.deadline || Date.now() + 10000
  if (redirects > 3 || Date.now() >= deadline) throw new Error('日历源响应超时或重定向过多')
  const url = new URL(address)
  if (url.protocol !== 'https:' || url.username || url.password || (url.port && url.port !== '443')) throw new Error('日历源必须使用公网 HTTPS 地址')
  const hostname = url.hostname.replace(/^\[|\]$/g, '')
  const addresses = await Promise.race([
    lookup(hostname, {all: true}),
    new Promise<never>((_,reject) => { const timer = setTimeout(() => reject(new Error('日历源 DNS 查询超时')), Math.max(1, deadline - Date.now())); timer.unref() }),
  ])
  if (!addresses.length || addresses.some(entry => !isPublicAddress(entry.address))) throw new Error('日历源不能访问内网或保留地址')
  const selected = addresses.find(entry => entry.family === 4) || addresses[0]!
  const result = await new Promise<{text: string; redirect?: string}>((resolve,reject) => {
    const request = https.get(url, {
      headers: {
        'Accept-Encoding': 'identity',
        'User-Agent': 'JGL-Calendar/1.0',
        ...options.headers,
      },
      family: selected.family,
      lookup: (_hostname, _options, callback) => callback(null, selected.address, selected.family),
    }, response => {
      const status = response.statusCode || 0
      if ([301,302,303,307,308].includes(status) && response.headers.location) {
        response.resume(); resolve({text:'',redirect:new URL(response.headers.location,url).href}); return
      }
      if (status !== 200) {response.resume(); reject(new Error('日历源暂时无法访问')); return}
      let bytes = 0
      const chunks: Buffer[] = []
      response.on('data', (chunk: Buffer) => {
        bytes += chunk.length
        if (bytes > 2 * 1024 * 1024) {response.destroy(new Error('日历源返回内容过大')); return}
        chunks.push(chunk)
      })
      response.on('end', () => resolve({text:Buffer.concat(chunks).toString('utf8')}))
      response.on('error',reject)
    })
    const timer = setTimeout(() => request.destroy(new Error('日历源响应超时')), Math.max(1,deadline - Date.now()))
    request.on('close', () => clearTimeout(timer))
    request.on('error', reject)
  })
  if (result.redirect) return requestPublicText(result.redirect, {...options, redirects: redirects + 1, deadline})
  return result.text
}

export async function fetchPublicText(address: string, headers: Record<string,string> = {}): Promise<string> {
  return requestPublicText(address, {headers})
}

export async function fetchPublicJson(address: string, redirects = 0, deadline = Date.now() + 10000): Promise<unknown> {
  const text = await requestPublicText(address, {
    headers: {'Accept': 'application/json'},
    redirects,
    deadline,
  })
  try {return JSON.parse(text)} catch {throw new Error('日历源未返回有效 JSON')}
}
