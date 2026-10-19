// Render the actual Vue component without launching browsers, services or database connections.
const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const vue = require('../../node_modules/vue')
const { renderToString } = require('../../node_modules/@vue/server-renderer')
const { parse, compileScript } = require('../../node_modules/@vue/compiler-sfc')
const root = path.join(__dirname, '../..')
const utilities = { exports: {} }
const transpile = (source) =>
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2020 },
  }).outputText
vm.runInNewContext(
  transpile(fs.readFileSync(path.join(root, 'src/utils/exhibitions.ts'), 'utf8')),
  utilities,
)
const filename = path.join(root, 'src/components/ExhibitionCalendar.vue')
const { descriptor } = parse(fs.readFileSync(filename, 'utf8'), { filename })
const script = compileScript(descriptor, { id: 'calendar-render-test', inlineTemplate: true })
const component = {
  exports: {},
  require: (name) => {
    if (name === 'vue') return vue
    if (name === '../utils/exhibitions') return utilities.exports
    throw new Error(`Unexpected component dependency: ${name}`)
  },
}
vm.runInNewContext(transpile(script.content), component)
const events = [
  {
    id: 1,
    title: '十月展会完整名称',
    start_date: '2026-10-24',
    end_date: '2026-10-25',
    location: '场馆',
    booth: 'A001',
    participation: 'participating',
    participation_notes: '参展安排',
    description: '完整说明',
    link: '',
  },
  {
    id: 2,
    title: '十一月展会',
    start_date: '2026-11-01',
    end_date: '2026-11-02',
    location: '',
    booth: '',
    participation: 'undecided',
    participation_notes: '',
    description: '',
    link: '',
  },
]
test('monthly calendar renders one month with exhibition names inside date cells', async () => {
  const html = await renderToString(
    vue.createSSRApp(component.exports.default, { year: 2026, month: 10, events }),
  )
  assert.equal((html.match(/class="month-card"/g) || []).length, 1)
  assert.match(html, /2026年10月/)
  assert.match(html, /十月展会完整名称/)
  assert.doesNotMatch(html, /十一月展会/)
  assert.match(html, /aria-haspopup="dialog"/)
})
test('the standalone year calendar still renders all twelve months', async () => {
  const html = await renderToString(
    vue.createSSRApp(component.exports.default, { year: 2026, events }),
  )
  assert.equal((html.match(/class="month-card"/g) || []).length, 12)
  assert.match(html, /2026年1月/)
  assert.match(html, /2026年12月/)
})
