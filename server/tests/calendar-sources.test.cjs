const {test, after} = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs/promises')
const os = require('node:os')
const path = require('node:path')
const {CalendarCache} = require('../dist/services/calendar-cache')
const {defaultSourceConfig, directGoogleFeed, normalizeSourceData, sourceKey, validateSourceConfig, sourceDate} = require('../dist/services/calendar-source-data')
const {isPublicAddress, fetchPublicJson} = require('../dist/services/calendar-http')
const {parseThonlyFeedsFromHtml} = require('../dist/services/thonly-discovery')
const temporary = []
async function directory() {const dir = await fs.mkdtemp(path.join(os.tmpdir(), 'jgl-calendar-test-'));temporary.push(dir);return dir}
after(async()=>{for(const dir of temporary){assert.equal(path.dirname(dir), os.tmpdir());await fs.rm(dir,{recursive:true,force:true})}})
const config = (changes={})=>({...defaultSourceConfig(),kind:'json',label:'测试数据源',urls:['https://example.com/events.json'],cache_ttl_seconds:10,...changes})
const event = (changes={})=>({id:'stable-1',title:'测试活动',start_date:'2026-10-24',end_date:'2026-10-25',location:'河北省',...changes})

test('source settings validate modes, durations, labels and HTTPS feed addresses',()=>{
  assert.ok(validateSourceConfig(defaultSourceConfig()).data)
  for(const changes of [{kind:'unknown'},{cache_mode:'unknown'},{cache_ttl_seconds:0},{cache_ttl_seconds:1.5},{cache_ttl_seconds:31536001},{urls:[]},{urls:['http://example.com']},{urls:['https://name:password@example.com']},{urls:['file:///calendar']},{urls:['https://example.com:3000']},{label:''}]) assert.ok(validateSourceConfig(config(changes)).error)
  assert.ok(validateSourceConfig({...defaultSourceConfig(),urls:['https://example.com/events']}).error)
  assert.ok(validateSourceConfig(config({cache_mode:'offline',cache_ttl_seconds:60})).data)
  assert.equal(validateSourceConfig(config({kind:'local',urls:[]})).data.kind,'local')
})

test('thonly rows preserve province, QQ group, status and categories, deduplicate and skip unknown dates',()=>{
  const doc={valueRanges:[{range:'THO!A2:E200',values:[['定档','河北THO','河北省','2026/10/24','12345'],['计划','日期待定活动','河北省','待定',''],['取消','取消的活动','北京市','2026/10/25','67890']]},{range:"'THP&tea-party'!A2:E200",values:[['定档','河北THO','河北省','2026/10/24','12345']]}]}
  const result=normalizeSourceData(defaultSourceConfig(),[doc])
  assert.equal(result.events.length,2);assert.equal(result.skipped,1)
  const first=result.events[0]
  assert.equal(first.location,'河北省');assert.equal(first.qq_group,'12345');assert.equal(first.participation,'undecided')
  assert.equal(first.category,'THO / THP&tea-party');assert.equal(first.start_date,'2026-10-24')
  assert.equal(result.events[1].source_status,'取消')
  const reordered=normalizeSourceData(defaultSourceConfig(),[{valueRanges:[{...doc.valueRanges[0],values:[...doc.valueRanges[0].values].reverse()}]}])
  assert.equal(reordered.events.find(row=>row.title===first.title).source_event_id,first.source_event_id)
  for(const value of ['2026/2/30','2026/2/29','待定','2026-13-01']) assert.equal(sourceDate(value),null)
  assert.equal(sourceDate('2024/2/29'),'2024-02-29')
})

test('custom stable IDs survive date/title updates; generated IDs avoid silently reassigning changed activities',()=>{
  const before=normalizeSourceData(config(),[[event()]]).events[0]
  const after=normalizeSourceData(config(),[[event({title:'改名活动',start_date:'2026-10-23'})]]).events[0]
  assert.equal(before.source_event_id,after.source_event_id)
  const noId=normalizeSourceData(config(),[[event({id:undefined})]]).events[0]
  const changed=normalizeSourceData(config(),[[event({id:undefined,start_date:'2026-10-23'})]]).events[0]
  assert.notEqual(noId.source_event_id,changed.source_event_id)
  assert.notEqual(sourceKey(config()),sourceKey(config({urls:['https://example.org/events.json']})))
  assert.equal(normalizeSourceData(config(),[[event({link:'javascript:alert(1)'})]]).events[0].link,'')
})

test('cache persists across service restarts, refreshes at expiry and falls back without overwriting a good snapshot',async()=>{
  const dir=await directory();let now=100000,requests=0,fail=false
  const fetcher=async()=>{requests++;if(fail)throw new Error('unavailable');return [event()]}
  let cache=new CalendarCache(dir,fetcher,()=>now)
  const first=await cache.get(config());assert.equal(first.source.cache_state,'live');assert.equal(requests,1)
  cache=new CalendarCache(dir,fetcher,()=>now)
  assert.equal((await cache.get(config())).source.cache_state,'fresh');assert.equal(requests,1)
  now+=10000;fail=true
  const stale=await cache.get(config());assert.equal(stale.source.cache_state,'stale');assert.equal(stale.events.length,1);assert.equal(requests,2)
  await cache.get(config());assert.equal(requests,2,'failed sources have a short retry backoff')
  const offline=await new CalendarCache(dir,fetcher,()=>now).get(config({cache_mode:'offline'}),true)
  assert.equal(offline.source.cache_state,'offline');assert.equal(offline.events.length,1);assert.equal(requests,2)
})

test('offline never fetches; no-cache never uses or replaces a saved snapshot',async()=>{
  const dir=await directory();let requests=0,fail=false
  const fetcher=async()=>{requests++;if(fail)throw new Error('down');return [event({title:`第${requests}版`})]}
  const cache=new CalendarCache(dir,fetcher)
  assert.equal((await cache.get(config({cache_mode:'offline'}))).source.cache_state,'unavailable');assert.equal(requests,0)
  await cache.get(config());assert.equal(requests,1)
  const live=await cache.get(config({cache_mode:'none'}));assert.equal(live.events[0].title,'第2版')
  assert.equal((await cache.get(config({cache_mode:'offline'}))).events[0].title,'第1版')
  fail=true
  const unavailable=await cache.get(config({cache_mode:'none'}));assert.equal(unavailable.events.length,0);assert.equal(unavailable.source.cache_state,'unavailable')
  const emptyDir=await directory();await new CalendarCache(emptyDir,async()=>[event()]).get(config({cache_mode:'none'}))
  assert.deepEqual(await fs.readdir(emptyDir),[])
})

test('partial feed failures and invalid documents keep the complete cache; a valid empty source clears old events',async()=>{
  const dir=await directory();let failure='none'
  const settings=config({urls:['https://example.com/1.json','https://example.com/2.json']})
  const cache=new CalendarCache(dir,async url=>{
    if(failure==='partial' && url.includes('2.json'))throw new Error('partial')
    if(failure==='invalid')return {unexpected:'data'}
    if(failure==='dates')return [event({start_date:'待定'})]
    return failure==='empty' ? [] : [event({id:url})]
  })
  assert.equal((await cache.get(settings)).events.length,2)
  for(const state of ['partial','invalid','dates']){failure=state;const result=await cache.get(settings,true);assert.equal(result.source.cache_state,'stale');assert.equal(result.events.length,2)}
  failure='empty';assert.equal((await cache.get(settings,true)).events.length,0)
  assert.equal((await cache.get({...settings,cache_mode:'offline'})).events.length,0)
})

test('concurrent refreshes coalesce and changing sources cannot reuse a different source snapshot',async()=>{
  const dir=await directory();let requests=0,release
  const waiting=new Promise(resolve=>{release=resolve})
  const cache=new CalendarCache(dir,async()=>{requests++;await waiting;return [event()]})
  const pending=Array.from({length:8},()=>cache.get(config(),true))
  await new Promise(resolve=>setTimeout(resolve,20));release()
  await Promise.all(pending);assert.equal(requests,1)
  const other=await cache.get(config({urls:['https://example.net/events.json'],cache_mode:'offline'}))
  assert.equal(other.events.length,0)
})

test('thonly page parsing keeps every published yearly sheet in order and rejects foreign links',()=>{
  const html = `<script>
    const apiArrayBeta = [
      "https://thonly.cc/proxy_google_doc/v4/spreadsheets/13ykPzw9cKqQVXXEwhCuX_mitQegHdFHjZtGdqT6tlmk/values:batchGet?ranges=THO!A2:E200&amp;key=AIzaSyAKE37_qaMY4aYDHubmX_yfebfYmnx2HUw",
      "https://thonly.cc/proxy_google_doc/v4/spreadsheets/13ykPzw9cKqQVXXEwhCuX_mitQegHdFHjZtGdqT6tlmk/values:batchGet?ranges=THO!A2:E200&amp;key=AIzaSyAKE37_qaMY4aYDHubmX_yfebfYmnx2HUw",
      "https://thonly.cc/proxy_google_doc/v4/spreadsheets/1zBgw7GUBOr-SENH1LRzqbQ-vs9QQCzKn5ea67IipSDU/values:batchGet?ranges=THO!A2:E200&amp;key=AIzaSyCZv5xkLypGwWbpdmgYkd5aTDRIQyxyQtg",
      "https://example.com/proxy_google_doc/v4/spreadsheets/13ykPzw9cKqQVXXEwhCuX_mitQegHdFHjZtGdqT6tlmk/values:batchGet?ranges=THO!A2:E200"
    ];
  </script>`
  const feeds = parseThonlyFeedsFromHtml(html)
  assert.equal(feeds.length, 2)
  assert.ok(feeds[0].includes('13ykPzw9cKqQVXXEwhCuX_mitQegHdFHjZtGdqT6tlmk'))
  assert.ok(feeds[1].includes('1zBgw7GUBOr-SENH1LRzqbQ-vs9QQCzKn5ea67IipSDU'))
  assert.ok(!feeds.some((url) => url.includes('&amp;')))
  assert.ok(!feeds.some((url) => url.startsWith('https://example.com')))
  const direct = directGoogleFeed(feeds[0])
  assert.ok(direct.startsWith('https://sheets.googleapis.com/v4/spreadsheets/'))
  assert.ok(validateSourceConfig({...defaultSourceConfig(), urls: [direct]}).data)
  assert.ok(validateSourceConfig({...defaultSourceConfig(), urls: ['https://example.com/events']}).error)
})

test('thonly cache survives a newly discovered yearly sheet and uses the direct Google endpoint first',async()=>{
  const dir=await directory();let now=100000;const requests=[]
  const fetcher=async url=>{
    requests.push(url)
    if(url.includes('sheets.googleapis.com')) throw new Error('Google unreachable')
    return {valueRanges:[{range:'THO!A2:E200',values:[['如期','测试活动','河北省','2026/10/24','12345']]}]}
  }
  const cache=new CalendarCache(dir,fetcher,()=>now)
  const first=await cache.get(defaultSourceConfig())
  assert.equal(first.source.cache_state,'live')
  assert.equal(requests.filter(url=>url.includes('sheets.googleapis.com')).length,3)
  assert.equal(requests.filter(url=>url.includes('thonly.cc/proxy_google_doc')).length,3)
  const extended={...defaultSourceConfig(),urls:[...defaultSourceConfig().urls,'https://thonly.cc/proxy_google_doc/v4/spreadsheets/1NewSheetFor2027ABCDEFGHIJKLMNOPQRSTUV/values:batchGet?ranges=THO!A2:E200&key=AIzaSyAKE37_qaMY4aYDHubmX_yfebfYmnx2HUw']}
  const before=requests.length
  const second=await cache.get(extended)
  assert.equal(second.source.cache_state,'fresh')
  assert.equal(requests.length,before,'a changed thonly list must reuse the saved snapshot')
  assert.equal(second.events[0].title,'测试活动')
})

test('thonly falls back to the read-only reader when both public routes are blocked',async()=>{
  const dir=await directory();const reader=[]
  const cache=new CalendarCache(dir,async()=>{throw new Error('blocked')},()=>100000,async(url,headers)=>{
    reader.push({url,headers})
    return JSON.stringify({valueRanges:[{range:'THO!A2:E200',values:[['如期','读者活动','河北省','2026/10/24','12345']]}]})
  })
  const result=await cache.get(defaultSourceConfig())
  assert.equal(result.source.cache_state,'live')
  assert.equal(result.events.length,1)
  assert.equal(result.events[0].title,'读者活动')
  assert.equal(reader.length,3)
  assert.ok(reader[0].url.startsWith('https://r.jina.ai/https://thonly.cc/proxy_google_doc/'))
  assert.ok(reader[0].url.includes('%2526'),'reader targets must keep percent escapes double-encoded')
  assert.equal(reader[0].headers['X-Return-Format'],'text')
})

test('a bundled seed keeps the calendar usable before the first successful fetch',async()=>{
  const dir=await directory()
  const snapshot={version:1,key:'thonly',fetched_at:'2026-10-19T00:00:00.000Z',events:[event()],skipped:0}
  await fs.writeFile(path.join(dir,'thonly.seed.json'),JSON.stringify(snapshot))
  const cache=new CalendarCache(dir,async()=>{throw new Error('offline')})
  const offline=await cache.get({...defaultSourceConfig(),cache_mode:'offline'})
  assert.equal(offline.source.cache_state,'offline')
  assert.equal(offline.events.length,1)
  assert.match(offline.source.warning,/内置离线数据/)
  const failed=await cache.get(defaultSourceConfig(),true)
  assert.equal(failed.source.cache_state,'stale')
  assert.match(failed.source.warning,/内置离线数据/)
  assert.equal(failed.events.length,1)
})

test('calendar fetcher rejects loopback, private, mapped IPv6 and reserved addresses before requesting data',async()=>{
  for(const address of ['127.0.0.1','10.1.2.3','172.16.0.1','192.168.1.1','169.254.169.254','100.64.0.1','::1','fe80::1','fc00::1','::ffff:127.0.0.1','2001:db8::1']) assert.equal(isPublicAddress(address),false,address)
  for(const address of ['1.1.1.1','8.8.8.8','2606:4700:4700::1111']) assert.equal(isPublicAddress(address),true,address)
  await assert.rejects(fetchPublicJson('https://127.0.0.1/private'),/内网|保留/)
  await assert.rejects(fetchPublicJson('http://example.com/events'),/HTTPS/)
})
