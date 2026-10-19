const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../../src/utils/feedback.ts'), 'utf8')
const context = { exports: {} }
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText,
  context,
)
const { getErrorMessage, isDialogDismissed, readApiResponse } = context.exports

test('legacy login and account errors become actionable Chinese messages', () => {
  assert.equal(
    getErrorMessage({ response: { status: 401, data: { error: 'Invalid credentials' } } }),
    '账号或密码不正确，请检查后重试',
  )
  assert.equal(
    getErrorMessage({ response: { status: 400, data: { error: 'Old password is incorrect' } } }),
    '原密码不正确，请检查后重试',
  )
  assert.equal(getErrorMessage({ message: 'constructor' }, '保存失败'), '保存失败')
})
test('network failures and timeouts have distinct recovery advice', () => {
  assert.equal(getErrorMessage(new TypeError('Failed to fetch')), '网络连接失败，请检查网络后重试')
  assert.equal(getErrorMessage({ code: 'ERR_NETWORK' }), '网络连接失败，请检查网络后重试')
  assert.equal(getErrorMessage({ code: 'ECONNABORTED' }), '请求超时，请稍后重试')
})
test('server validation messages remain specific and raw errors do not leak', () => {
  assert.equal(
    getErrorMessage({ response: { status: 400, data: { error: '结束日期不能早于开始日期' } } }),
    '结束日期不能早于开始日期',
  )
  assert.equal(
    getErrorMessage({ response: { status: 500, data: '<html>Bad gateway</html>' } }),
    '服务暂时不可用，请稍后重试',
  )
  assert.equal(
    getErrorMessage({ response: { status: 500, data: { error: 'ER_NO_SUCH_TABLE: users' } } }),
    '服务暂时不可用，请稍后重试',
  )
  assert.equal(getErrorMessage({ response: { status: 429, data: {} } }), '操作过于频繁，请稍后重试')
})
test('both closing and cancelling a confirmation are dismissals', () => {
  assert.equal(isDialogDismissed('cancel'), true)
  assert.equal(isDialogDismissed('close'), true)
  assert.equal(isDialogDismissed(new Error('network')), false)
})
test('fetch response parsing supports JSON errors and proxy HTML failures', async () => {
  await assert.rejects(
    readApiResponse(
      new Response(JSON.stringify({ error: '账号或密码不正确，请检查后重试' }), { status: 401 }),
      '登录失败',
    ),
    /账号或密码不正确/,
  )
  await assert.rejects(
    readApiResponse(new Response('<html>Gateway timeout</html>', { status: 504 }), '保存失败'),
    /服务暂时不可用/,
  )
  await assert.rejects(readApiResponse(new Response('not json'), '加载失败'), /服务返回的数据异常/)
  const data = await readApiResponse(new Response('{"items":[]}'), '加载失败')
  assert.equal(data.items.length, 0)
})
