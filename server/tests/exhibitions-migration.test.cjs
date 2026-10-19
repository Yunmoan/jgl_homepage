const { test } = require('node:test')
const assert = require('node:assert/strict')
const fs = require('node:fs')
const path = require('node:path')
const { ensureExhibitionSchema } = require('../dist/scripts/migrate_exhibitions')
const sql = fs.readFileSync(path.join(__dirname, '../sql/init.sql'), 'utf8')

test('an existing exhibition table gains the notes column once without modifying business records', async () => {
  const statements = []
  let hasColumn = false
  const db = {
    query: async (statement) => {
      statements.push(statement)
      if (statement.startsWith('SHOW COLUMNS'))
        return [hasColumn ? [{ Field: 'participation_notes' }] : []]
      if (statement.startsWith('ALTER TABLE')) hasColumn = true
      return [{}]
    },
  }
  await ensureExhibitionSchema(db, sql)
  await ensureExhibitionSchema(db, sql)
  assert.equal(statements.filter((statement) => statement.startsWith('ALTER TABLE')).length, 1)
  assert.ok(
    statements.includes(
      'ALTER TABLE exhibitions ADD COLUMN participation_notes TEXT NULL AFTER participation',
    ),
  )
  for (const statement of statements) {
    assert.match(
      statement,
      /^(CREATE TABLE IF NOT EXISTS (exhibitions|exhibition_settings|exhibition_source_settings|exhibition_bindings)\s*\(|SHOW COLUMNS FROM exhibitions|ALTER TABLE exhibitions ADD COLUMN participation_notes)/,
    )
    assert.doesNotMatch(statement, /\b(INSERT|UPDATE\s+exhibitions|DELETE|DROP|TRUNCATE)\b/i)
  }
})

test('a new database creates the notes column with the table and does not alter it again', async () => {
  let tableExists = false
  const statements = []
  await ensureExhibitionSchema(
    {
      query: async (statement) => {
        statements.push(statement)
        if (/^CREATE TABLE IF NOT EXISTS exhibitions\s*\(/.test(statement)) {
          assert.match(statement, /participation_notes TEXT NULL/)
          tableExists = true
        }
        if (statement.startsWith('SHOW COLUMNS'))
          return [tableExists ? [{ Field: 'participation_notes' }] : []]
        return [{}]
      },
    },
    sql,
  )
  assert.equal(
    statements.some((statement) => statement.startsWith('ALTER TABLE')),
    false,
  )
})
