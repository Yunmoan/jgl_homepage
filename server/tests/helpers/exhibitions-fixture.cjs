// Isolated test adapter. No connections or writes to MySQL are made by this fixture.
process.env.JWT_SECRET = 'exhibitions-local-test-secret'
const express = require('express')
const jwt = require('jsonwebtoken')
const bcrypt = require('bcryptjs')
const pool = require('../../dist/db').default
const config = require('../../dist/config').default
const exhibitionsRouter = require('../../dist/routes/exhibitions').default
const { calendarCache } = require('../../dist/services/calendar-cache')
const { sourceKey, sourceLabel, sourceUrl } = require('../../dist/services/calendar-source-data')

const example = (overrides = {}) => ({
  title: '测试展会',
  start_date: '2026-10-24',
  end_date: '2026-10-25',
  location: '测试场馆',
  booth: 'A01',
  participation: 'participating',
  participation_notes: '参与社团：测试社团\n出展内容：同人制品',
  description: '仅用于本地验证的展会数据',
  link: 'https://example.com/exhibition',
  ...overrides,
})

function createFixture(seed = []) {
  let nextId = 1
  let homepageSettings = null
  let sourceConfig = {kind:'local',label:'本站维护',urls:[],cache_mode:'ttl',cache_ttl_seconds:86400}
  const bindings = [], external = []
  let nextBindingId = 1
  calendarCache.get = async config => ({events:config.kind === 'local' ? [] : external,
    source:{kind:config.kind,key:sourceKey(config),label:sourceLabel(config),url:sourceUrl(config),cache_state:config.kind === 'local' ? 'local' : 'live',fetched_at:null,warning:'',skipped:0}})
  const items = seed.map((event) => ({ id: nextId++, ...event }))
  const users = ['admin', 'editor', 'member', 'viewer', 'admin'].map((role, i) => ({
    id: i + 1,
    username: `test_${role}${i}`,
    nickname: `测试${role}`,
    role,
    status: i === 4 ? 'disabled' : 'approved',
    password: bcrypt.hashSync('local-fixture', 4),
  }))
  const token = (id = 1, claims = {}) =>
    jwt.sign({ ...users[id - 1], ...claims }, config.jwt.secret, { expiresIn: '1h' })
  const fields = [
    'title',
    'start_date',
    'end_date',
    'location',
    'booth',
    'participation',
    'participation_notes',
    'description',
    'link',
  ]
  pool.query = async (sql, values = []) => {
    if (sql.startsWith('SELECT config_json')) return [[{config_json:JSON.stringify(sourceConfig)}],[]]
    if (sql.startsWith('INSERT INTO exhibition_source_settings')) {sourceConfig=JSON.parse(values[0]);return [{affectedRows:1},[]]}
    if (sql.startsWith('DELETE FROM exhibition_bindings')) {
      const index=bindings.findIndex(row=>row.id===Number(values[0]));if(index>=0)bindings.splice(index,1)
      return [{affectedRows:index>=0 ? 1 : 0},[]]
    }
    if (sql.includes('FROM exhibition_bindings')) return [sql.includes('WHERE id = ?') ? bindings.filter(row=>row.id===Number(values[0])) : [...bindings].reverse(),[]]
    if (sql.startsWith('INSERT INTO exhibition_bindings')) {
      let item=bindings.find(row=>row.source_key===values[0] && row.source_event_id===values[1])
      if(!item){item={id:nextBindingId++};bindings.push(item)}
      Object.assign(item,Object.fromEntries(['source_key','source_event_id','event_snapshot','participation','booth','participation_notes'].map((field,i)=>[field,values[i]])))
      return [{affectedRows:1,insertId:item.id},[]]
    }
    if (sql.startsWith('UPDATE exhibition_bindings')) {
      const item=bindings.find(row=>row.id===Number(values[6]))
      if(bindings.some(row=>row.id!==item?.id && row.source_key===values[0] && row.source_event_id===values[1])) throw Object.assign(new Error('duplicate'),{code:'ER_DUP_ENTRY'})
      if(item)Object.assign(item,Object.fromEntries(['source_key','source_event_id','event_snapshot','participation','booth','participation_notes'].map((field,i)=>[field,values[i]])))
      return [{affectedRows:item ? 1 : 0},[]]
    }
    if (sql.startsWith('SELECT homepage_mode'))
      return [homepageSettings ? [homepageSettings] : [], []]
    if (sql.includes('INSERT INTO exhibition_settings')) {
      homepageSettings = { homepage_mode: values[0], homepage_month: values[1] }
      return [{ affectedRows: 1 }, []]
    }
    if (sql.includes('FROM users'))
      return [
        [
          users.find((user) =>
            sql.includes('WHERE username = ?')
              ? user.username === values[0]
              : user.id === Number(values[0]),
          ),
        ].filter(Boolean),
        [],
      ]
    if (sql.includes('SELECT DISTINCT YEAR'))
      return [
        items.map((event) => ({
          first_year: Number(event.start_date.slice(0, 4)),
          last_year: Number(event.end_date.slice(0, 4)),
        })),
        [],
      ]
    if (sql.includes('SELECT') && sql.includes('FROM exhibitions')) {
      if (!sql.includes('start_date <= ? AND end_date >= ?') || !sql.includes('DATE_FORMAT'))
        throw new Error('Unexpected year query')
      return [
        items
          .filter((event) => event.start_date <= values[0] && event.end_date >= values[1])
          .sort((a, b) => a.start_date.localeCompare(b.start_date) || a.id - b.id),
        [],
      ]
    }
    if (sql.startsWith('INSERT INTO exhibitions')) {
      const record = Object.fromEntries(fields.map((key, i) => [key, values[i]]))
      const id = nextId++
      items.push({ id, ...record })
      return [{ insertId: id, affectedRows: 1 }, []]
    }
    if (sql.startsWith('UPDATE exhibitions')) {
      const item = items.find((event) => event.id === Number(values[fields.length]))
      if (item)
        fields.forEach((key, i) => {
          item[key] = values[i]
        })
      return [{ affectedRows: item ? 1 : 0 }, []]
    }
    if (sql.startsWith('DELETE FROM exhibitions')) {
      const index = items.findIndex((event) => event.id === Number(values[0]))
      if (index >= 0) items.splice(index, 1)
      return [{ affectedRows: index >= 0 ? 1 : 0 }, []]
    }
    throw new Error(`Unexpected fixture query: ${sql}`)
  }
  const app = express()
  app.use(express.json())
  app.use('/api/exhibitions', exhibitionsRouter)
  return { app, items, users, token, external, bindings }
}

// Optional browser QA server: explicit loopback binding and entirely disposable data.
if (require.main === module) {
  const seed = Array.from({ length: 12 }, (_, month) =>
    example({
      title: `本地测试 · ${month + 1}月展会`,
      start_date: `2026-${String(month + 1).padStart(2, '0')}-24`,
      end_date: `2026-${String(month + 1).padStart(2, '0')}-25`,
      participation: ['participating', 'undecided', 'not_participating'][month % 3],
    }),
  )
  seed.push(
    example({ title: '本地测试 · 跨年展会', start_date: '2026-12-31', end_date: '2027-01-02' }),
  )
  const { app, users } = createFixture(seed)
  app.use('/api/auth', require('../../dist/routes/auth').default)
  app.get('/api/users/me', (req, res) => {
    try {
      const claims = jwt.verify(
        (req.headers.authorization || '').replace('Bearer ', ''),
        config.jwt.secret,
      )
      const user = users.find((user) => user.id === claims.id)
      if (!user) return res.sendStatus(401)
      const { password: _password, ...profile } = user
      res.json(profile)
    } catch {
      res.sendStatus(401)
    }
  })
  app.get('/api/system/dashboard', (_req, res) => res.json({ role: 'admin' }))
  app.post('/api/system/page-view', (_req, res) => res.sendStatus(204))
  app.get('/api/members', (_req, res) => res.json({ data: [], total: 0 }))
  app.get('/api/works', (_req, res) => res.json([]))
  for (const route of [
    'news',
    'history',
    'friend-links',
    'admin-history',
    'fame-members',
    'messages',
    'announcements/public',
  ]) {
    app.get(`/api/${route}`, (_req, res) => res.json([]))
  }
  const port = Number(process.env.EXHIBITION_QA_PORT || 3000)
  app.listen(port, '127.0.0.1', (error) => {
    if (error) {
      console.error(`Unable to start exhibition QA API: ${error.code}`)
      process.exitCode = 1
      return
    }
    console.log(`Isolated exhibition QA API: http://127.0.0.1:${port} (disposable in-memory data)`)
  })
}

module.exports = { createFixture, example }
