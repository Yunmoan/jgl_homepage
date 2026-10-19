const { test, after, before } = require('node:test')
const assert = require('node:assert/strict')
const { createFixture, example } = require('./helpers/exhibitions-fixture.cjs')
const { isCalendarDate, validateExhibition } = require('../dist/utils/exhibitions')
const {normalizeSourceData} = require('../dist/services/calendar-source-data')
const fixture = createFixture()
let server, base
before(async () => {
  server = await new Promise((resolve) => {
    const listener = fixture.app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = `http://127.0.0.1:${server.address().port}/api/exhibitions`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
})
const request = (path, method = 'GET', body, token) =>
  fetch(base + path, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    ...(body ? { body: JSON.stringify(body) } : {}),
  })

test('calendar dates reject invalid dates and accept leap days', () => {
  for (const date of [
    '2026-02-29',
    '2026-02-30',
    '2026-13-01',
    '2026-00-01',
    '2026-1-01',
    '1899-12-31',
    null,
  ])
    assert.equal(isCalendarDate(date), false)
  for (const date of ['2024-02-29', '2026-12-31', '2027-01-01'])
    assert.equal(isCalendarDate(date), true)
})
test('validation rejects reversed dates, missing titles, unsafe links and unknown states', () => {
  for (const changes of [
    { title: ' ' },
    { end_date: '2026-10-23' },
    { participation: 'admin' },
    { link: 'javascript:alert(1)' },
    { link: 'data:text/html,test' },
    { title: 'x'.repeat(121) },
  ])
    assert.ok(validateExhibition(example(changes)).error)
  assert.equal(validateExhibition(example({ title: ' 展会 ' })).data.title, '展会')
})
test('public year input rejects malformed, repeated and out of range years', async () => {
  for (const query of ['year=2026x', 'year=1899', 'year=2200', 'year=2026&year=2027', 'year='])
    assert.equal((await request(`/public?${query}`)).status, 400)
})
test('all writes require authentication and a current administrator role', async () => {
  for (const [path, method] of [
    ['', 'POST'],
    ['/1', 'PUT'],
    ['/1', 'DELETE'],
  ]) {
    assert.equal((await request(path, method, example())).status, 401)
    for (const id of [2, 3, 4])
      assert.equal(
        (await request(path, method, example(), fixture.token(id, { role: 'admin' }))).status,
        403,
      )
    assert.equal((await request(path, method, example(), fixture.token(5))).status, 401)
  }
})
test('administrator create/update/delete is immediately reflected by the public calendar', async () => {
  const created = await request('', 'POST', example(), fixture.token())
  assert.equal(created.status, 201)
  const item = await created.json()
  let calendar = await (await request('/public?year=2026')).json()
  assert.equal(calendar.items.find((event) => event.id === item.id).booth, 'A01')
  assert.equal(
    (
      await request(
        `/${item.id}`,
        'PUT',
        example({ participation: 'not_participating', booth: 'B02' }),
        fixture.token(),
      )
    ).status,
    200,
  )
  calendar = await (await request('/public?year=2026')).json()
  assert.equal(
    calendar.items.find((event) => event.id === item.id).participation,
    'not_participating',
  )
  assert.equal((await request(`/${item.id}`, 'DELETE', undefined, fixture.token())).status, 200)
  calendar = await (await request('/public?year=2026')).json()
  assert.equal(
    calendar.items.some((event) => event.id === item.id),
    false,
  )
})
test('cross-year exhibitions appear in both years and intermediate years are discoverable', async () => {
  const response = await request(
    '',
    'POST',
    example({ start_date: '2025-12-31', end_date: '2027-01-02' }),
    fixture.token(),
  )
  const { id } = await response.json()
  for (const year of [2025, 2026, 2027]) {
    const data = await (await request(`/public?year=${year}`)).json()
    assert.ok(data.items.some((event) => event.id === id))
    assert.ok(data.years.includes(2026))
  }
  assert.equal((await (await request('/public?year=2028')).json()).items.length, 0)
  await request(`/${id}`, 'DELETE', undefined, fixture.token())
})

test('participation notes can be created, edited, read publicly and cleared independently of the introduction', async () => {
  const notes = '参与社团：甲社、乙社\n出展内容：音乐与同人志\n集合时间：09:30'
  const response = await request(
    '',
    'POST',
    example({ participation_notes: ` ${notes} ` }),
    fixture.token(),
  )
  assert.equal(response.status, 201)
  const { id } = await response.json()
  const read = async () =>
    (await (await request('/public?year=2026')).json()).items.find((event) => event.id === id)
  assert.equal((await read()).participation_notes, notes)
  assert.equal((await read()).description, example().description)
  for (const value of ['更正后的参展安排\n摊位 A02', '']) {
    const updated = await request(
      `/${id}`,
      'PUT',
      example({ participation_notes: value }),
      fixture.token(),
    )
    assert.equal(updated.status, 200)
    assert.equal((await read()).participation_notes, value)
    assert.equal((await read()).description, example().description)
  }
  await request(`/${id}`, 'DELETE', undefined, fixture.token())
})

test('participation notes remain optional and reject oversized or non-text values without writing', async () => {
  for (const participation_notes of [undefined, null, '   ']) {
    const result = validateExhibition(example({ participation_notes }))
    assert.equal(result.error, undefined)
    assert.equal(result.data.participation_notes, '')
  }
  assert.equal(
    validateExhibition(example({ participation_notes: '备'.repeat(2000) })).error,
    undefined,
  )
  const size = fixture.items.length
  for (const participation_notes of ['备'.repeat(2001), ['备注'], { text: '备注' }, 123]) {
    const created = await request('', 'POST', example({ participation_notes }), fixture.token())
    const updated = await request('/1', 'PUT', example({ participation_notes }), fixture.token())
    assert.equal(created.status, 400)
    assert.equal(updated.status, 400)
    assert.match((await created.json()).error, /参展信息/)
  }
  assert.equal(fixture.items.length, size)
})
test('invalid payloads do not create or update exhibitions', async () => {
  const size = fixture.items.length
  for (const changes of [
    { start_date: '2026-02-30' },
    { end_date: '2026-01-01' },
    { participation: 'invalid' },
  ]) {
    assert.equal((await request('', 'POST', example(changes), fixture.token())).status, 400)
    assert.equal((await request('/1', 'PUT', example(changes), fixture.token())).status, 400)
  }
  assert.equal(fixture.items.length, size)
})
test('invalid IDs and missing exhibitions return 400 and 404', async () => {
  for (const id of ['0', '-1', 'abc', '1%20OR%201=1', '9007199254740992'])
    assert.equal((await request(`/${id}`, 'DELETE', undefined, fixture.token())).status, 400)
  assert.equal((await request('/999', 'PUT', example(), fixture.token())).status, 404)
  assert.equal((await request('/999', 'DELETE', undefined, fixture.token())).status, 404)
})

test('homepage defaults to the current month and only administrators can change the setting', async () => {
  const initial = await (await request('/settings')).json()
  assert.equal(initial.mode, 'current_month')
  assert.equal(initial.month, null)
  const payload = { mode: 'fixed_month', month: '2027-02' }
  assert.equal((await request('/settings', 'PUT', payload)).status, 401)
  assert.equal((await request('/settings', 'PUT', payload, fixture.token(2))).status, 403)
  assert.equal((await request('/settings', 'PUT', payload, fixture.token())).status, 200)
  const updated = await (await request('/settings')).json()
  assert.equal(updated.mode, 'fixed_month')
  assert.equal(updated.month, '2027-02')
  await request('/settings', 'PUT', { mode: 'year', month: '2027-02' }, fixture.token())
  const yearly = await (await request('/settings')).json()
  assert.equal(yearly.mode, 'year')
  assert.equal(yearly.month, null)
})

test('homepage settings reject invalid modes and nonexistent months', async () => {
  for (const payload of [
    { mode: 'invalid' },
    { mode: 'fixed_month', month: '2026-00' },
    { mode: 'fixed_month', month: '2026-13' },
    { mode: 'fixed_month', month: '2026-2' },
    { mode: 'fixed_month', month: null },
    { mode: 'fixed_month', month: '1899-12' },
  ])
    assert.equal((await request('/settings', 'PUT', payload, fixture.token())).status, 400)
})

test('source configuration and attendance bindings require administrator permission',async()=>{
  for(const [path,method] of [['/sources','GET'],['/sources','PUT'],['/sources/refresh','POST'],['/bindings','GET'],['/bindings','POST'],['/bindings/1','PUT'],['/bindings/1','DELETE']]){
    assert.equal((await request(path,method,method==='GET'?undefined:{},undefined)).status,401)
    assert.equal((await request(path,method,method==='GET'?undefined:{},fixture.token(2))).status,403)
  }
})

test('source events merge with local events and independent attendance bindings survive refresh, orphaning and rebinding',async()=>{
  const sourceConfig={kind:'json',label:'测试日历源',urls:['https://example.com/calendar.json'],cache_mode:'ttl',cache_ttl_seconds:60}
  assert.equal((await request('/sources','PUT',sourceConfig,fixture.token())).status,200)
  const local=await (await request('','POST',example(),fixture.token())).json()
  const records=normalizeSourceData(sourceConfig,[[{title:'来源活动一',date:'2026/10/24',location:'河北省'},{title:'来源活动二',date:'2026/10/25',location:'北京市'}]]).events
  fixture.external.push(...records)
  let calendar=await (await request('/public?year=2026')).json()
  assert.equal(calendar.source.label,'测试日历源');assert.equal(calendar.items.length,3)
  assert.ok(calendar.items.some(row=>row.id===local.id))
  const body={source_key:records[0].source_key,source_event_id:records[0].source_event_id,participation:'participating',booth:'G01',participation_notes:'高联参展\n音乐与同人志'}
  assert.equal((await request('/bindings','POST',body,fixture.token())).status,201)
  assert.equal((await request('/bindings','POST',body,fixture.token())).status,201)
  assert.equal(fixture.bindings.length,1,'re-saving a source event updates its existing binding')
  calendar=await (await request('/public?year=2026')).json()
  const bound=calendar.items.find(row=>row.source_event_id===records[0].source_event_id)
  assert.equal(bound.participation,'participating');assert.equal(bound.booth,'G01');assert.equal(bound.participation_notes,body.participation_notes)
  const id=bound.binding_id
  assert.equal((await request('/sources','PUT',{...sourceConfig,cache_ttl_seconds:86400},fixture.token())).status,200)
  assert.equal((await (await request('/public?year=2026')).json()).items.find(row=>row.binding_id===id).participation_notes,body.participation_notes)
  fixture.external.splice(0,1)
  calendar=await (await request('/public?year=2026')).json()
  assert.equal(calendar.items.some(row=>row.binding_id===id),false,'missing source activities do not reappear as phantom events')
  const saved=await (await request('/bindings','GET',undefined,fixture.token())).json()
  assert.equal(saved[0].participation_notes,body.participation_notes)
  assert.equal((await request(`/bindings/${id}`,'PUT',{...body,participation_notes:'保留的备注'},fixture.token())).status,200)
  assert.equal((await request(`/bindings/${id}`,'PUT',{...body,source_event_id:records[1].source_event_id},fixture.token())).status,200)
  calendar=await (await request('/public?year=2026')).json()
  assert.equal(calendar.items.find(row=>row.binding_id===id).title,'来源活动二')
  assert.equal((await request('/bindings','POST',{...body,source_event_id:'missing'},fixture.token())).status,409)
  assert.equal((await request(`/bindings/${id}`,'DELETE',undefined,fixture.token())).status,200)
  assert.equal((await (await request('/public?year=2026')).json()).items.find(row=>row.source_event_id===records[1].source_event_id).participation,'undecided')
  await request(`/${local.id}`,'DELETE',undefined,fixture.token())
  await request('/sources','PUT',{...sourceConfig,kind:'local'},fixture.token())
  assert.equal((await (await request('/public?year=2026')).json()).items.length,0)
  fixture.external.splice(0)
})

test('source settings reject invalid durations and offline refresh performs no network request',async()=>{
  const config=await (await request('/sources','GET',undefined,fixture.token())).json()
  assert.ok(Array.isArray(config.thonly_urls))
  assert.equal((await request('/sources','PUT',{...config,cache_ttl_seconds:0},fixture.token())).status,400)
  const settings={kind:'json',label:'离线源',urls:['https://example.com/calendar.json'],cache_mode:'offline',cache_ttl_seconds:1}
  assert.equal((await request('/sources','PUT',settings,fixture.token())).status,200)
  assert.equal((await request('/sources/refresh','POST',{},fixture.token())).status,400)
  await request('/sources','PUT',{...settings,kind:'local'},fixture.token())
})
