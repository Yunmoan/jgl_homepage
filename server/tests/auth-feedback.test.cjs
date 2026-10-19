const { test, before, after } = require('node:test')
const assert = require('node:assert/strict')
const { createFixture } = require('./helpers/exhibitions-fixture.cjs')
const fixture = createFixture()
const pool = require('../dist/db').default
const { userFacingErrors } = require('../dist/middleware/errors')
fixture.app.use('/api/auth', require('../dist/routes/auth').default)
fixture.app.use('/api/users', require('../dist/routes/users').default)
fixture.app.use(userFacingErrors)
let server, base
before(async () => {
  server = await new Promise((resolve) => {
    const listener = fixture.app.listen(0, '127.0.0.1', () => resolve(listener))
  })
  base = `http://127.0.0.1:${server.address().port}/api`
})
after(async () => {
  await new Promise((resolve) => server.close(resolve))
})
const request = (url, body, method = 'POST', token) =>
  fetch(base + url, {
    method,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

test('unknown accounts and incorrect passwords return the same Chinese login error', async () => {
  for (const username of ['unknown_account', 'test_admin0']) {
    const response = await request('/auth/login', { username, password: 'incorrect-password' })
    assert.equal(response.status, 401)
    assert.equal((await response.json()).error, '账号或密码不正确，请检查后重试')
  }
})
test('valid credentials still log in and trim surrounding account spaces', async () => {
  const response = await request('/auth/login', {
    username: ' test_admin0 ',
    password: 'local-fixture',
  })
  assert.equal(response.status, 200)
  assert.ok((await response.json()).token)
})
test('missing credentials and disabled accounts have useful Chinese feedback', async () => {
  assert.equal(
    (await request('/auth/login', { username: ' ', password: 'local-fixture' })).status,
    400,
  )
  assert.equal(
    (await request('/auth/login', { username: 'test_admin0', password: 123 })).status,
    400,
  )
  const disabled = await request('/auth/login', {
    username: 'test_admin4',
    password: 'local-fixture',
  })
  assert.equal(disabled.status, 403)
  assert.match((await disabled.json()).error, /账号已停用/)
})
test('incorrect current password is a validation error and keeps the session usable', async () => {
  const token = fixture.token()
  const response = await request(
    '/users/me/password',
    { oldPassword: 'incorrect-password', newPassword: 'a-new-password' },
    'PUT',
    token,
  )
  assert.equal(response.status, 400)
  assert.equal((await response.json()).error, '原密码不正确，请检查后重试')
  const profile = await fetch(base + '/users/me', { headers: { Authorization: `Bearer ${token}` } })
  assert.equal(profile.status, 200)
})
test('database errors while verifying a session do not report an expired login', async () => {
  const original = pool.query
  const oldLog = console.error
  pool.query = async () => {
    throw new Error('test database unavailable')
  }
  console.error = () => {}
  try {
    const response = await fetch(base + '/users/me', {
      headers: { Authorization: `Bearer ${fixture.token()}` },
    })
    assert.equal(response.status, 503)
    assert.match((await response.json()).error, /暂时无法验证登录状态/)
  } finally {
    pool.query = original
    console.error = oldLog
  }
})
test('malformed JSON gets a Chinese JSON response instead of a framework error page', async () => {
  const response = await fetch(base + '/auth/login', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: '{invalid',
  })
  assert.equal(response.status, 400)
  assert.match((await response.json()).error, /数据格式不正确/)
})
test('login rate limiting returns structured Chinese feedback', async () => {
  let response
  for (let i = 0; i < 11; i++)
    response = await request('/auth/login', { username: 'test_admin0', password: 'wrong' })
  assert.equal(response.status, 429)
  assert.equal((await response.json()).error, '登录尝试过于频繁，请在 15 分钟后重试')
})
