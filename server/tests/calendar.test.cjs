const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const vm = require('node:vm')
const ts = require('typescript')
const source = fs.readFileSync(path.join(__dirname, '../../src/utils/exhibitions.ts'), 'utf8')
const moduleContext = { exports: {} }
vm.runInNewContext(
  ts.transpileModule(source, {
    compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 },
  }).outputText,
  moduleContext,
)
const { indexExhibitionDays, formatExhibitionDates, exhibitionsInMonth } = moduleContext.exports
const event = {
  id: 1,
  title: '展会',
  start_date: '2024-02-28',
  end_date: '2024-03-01',
  participation: 'participating',
}
test('day index includes leap days and both endpoints', () => {
  const days = indexExhibitionDays([event], 2024)
  assert.equal(days.size, 3)
  for (const date of ['2024-02-28', '2024-02-29', '2024-03-01'])
    assert.equal(days.get(date)[0].id, 1)
})
test('overlapping events retain every exhibition and participation state', () => {
  const days = indexExhibitionDays([event, { ...event, id: 2, participation: 'undecided' }], 2024)
  assert.equal(days.get('2024-02-29').length, 2)
})
test('day index clips cross-year events and excludes other years', () => {
  const crossYear = { ...event, start_date: '2025-12-31', end_date: '2027-01-02' }
  assert.equal(indexExhibitionDays([crossYear], 2025).size, 1)
  assert.equal(indexExhibitionDays([crossYear], 2026).size, 365)
  assert.equal(indexExhibitionDays([crossYear], 2027).size, 2)
  assert.equal(indexExhibitionDays([crossYear], 2028).size, 0)
})
test('date labels preserve date-only values without timezone shifts', () => {
  assert.equal(
    formatExhibitionDates({ start_date: '2026-01-01', end_date: '2026-01-01' }),
    '2026.01.01',
  )
  assert.equal(
    formatExhibitionDates({ start_date: '2026-12-31', end_date: '2027-01-02' }),
    '2026.12.31 — 2027.01.02',
  )
})

test('monthly filtering includes overlapping days, cross-year ranges and leap-month endpoints', () => {
  const events = [
    { ...event, id: 1, start_date: '2025-12-31', end_date: '2026-01-02' },
    { ...event, id: 2, start_date: '2026-01-31', end_date: '2026-02-02' },
    { ...event, id: 3, start_date: '2024-02-29', end_date: '2024-02-29' },
    { ...event, id: 4, start_date: '2026-03-01', end_date: '2026-03-02' },
  ]
  assert.equal(
    exhibitionsInMonth(events, 2026, 1)
      .map((event) => event.id)
      .join(','),
    '1,2',
  )
  assert.equal(
    exhibitionsInMonth(events, 2026, 2)
      .map((event) => event.id)
      .join(','),
    '2',
  )
  assert.equal(exhibitionsInMonth(events, 2024, 2)[0].id, 3)
  assert.equal(exhibitionsInMonth(events, 2026, 4).length, 0)
})
