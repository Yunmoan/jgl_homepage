import fs from 'fs/promises'
import path from 'path'
import type { RowDataPacket } from 'mysql2'
import pool from '../db'

// Keep schema changes explicit and limited to this feature; never modify business records.
export async function ensureExhibitionSchema(db: Pick<typeof pool, 'query'>, sql: string) {
  const statements = sql
    .split(/;\s*$/m)
    .map((statement) => statement.trim())
    .filter((statement) =>
      /^CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS\s+(exhibitions|exhibition_settings|exhibition_source_settings|exhibition_bindings)\s*\(/i.test(
        statement,
      ),
    )
  if (statements.length !== 4)
    throw new Error('Expected exactly the four exhibition table definitions')
  for (const statement of statements) await db.query(statement)

  const [columns] = await db.query<RowDataPacket[]>(
    "SHOW COLUMNS FROM exhibitions LIKE 'participation_notes'",
  )
  if (!columns.length) {
    await db.query(
      'ALTER TABLE exhibitions ADD COLUMN participation_notes TEXT NULL AFTER participation',
    )
  }
}

async function migrateExhibitions() {
  try {
    const sql = await fs.readFile(path.join(__dirname, '../../sql/init.sql'), 'utf8')
    await ensureExhibitionSchema(pool, sql)
    console.log('Exhibition schema is ready. No existing business records were modified.')
  } catch (error) {
    console.error('Exhibition table migration failed:', error)
    process.exitCode = 1
  } finally {
    await pool.end()
  }
}

if (require.main === module) migrateExhibitions()
