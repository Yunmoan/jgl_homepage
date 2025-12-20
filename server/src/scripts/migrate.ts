import pool from '../db'
import fs from 'fs/promises'
import path from 'path'

async function migrate() {
  try {
    console.log('Starting database migration...')
    const connection = await pool.getConnection()

    const sqlFilePath = path.join(__dirname, '..', '..', 'sql', 'init.sql')
    const sql = await fs.readFile(sqlFilePath, 'utf-8')

    // Split SQL file into individual statements
    const statements = sql.split(/;\s*$/m)

    for (const statement of statements) {
      if (statement.trim().length > 0) {
        await connection.query(statement)
        console.log('Executed statement successfully.')
      }
    }

    // Ensure works.club column exists
    const [rows] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='club'",
    )
    if (Array.isArray(rows) && rows.length === 0) {
      try {
        await connection.query('ALTER TABLE works ADD COLUMN club VARCHAR(255) NULL')
        console.log('Added missing column works.club')
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Attempt to add works.club failed:', err)
        }
      }
    }

    // Ensure works.featured column exists
    const [rowsFeat] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='featured'",
    )
    if (Array.isArray(rowsFeat) && rowsFeat.length === 0) {
      try {
        await connection.query(
          'ALTER TABLE works ADD COLUMN featured TINYINT(1) NOT NULL DEFAULT 0',
        )
        console.log('Added missing column works.featured')
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Attempt to add works.featured failed:', err)
        }
      }
    }

    // Ensure news.status column exists
    const [newsStatus] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='status'",
    )
    if (Array.isArray(newsStatus) && newsStatus.length === 0) {
      try {
        await connection.query(
          "ALTER TABLE news ADD COLUMN status ENUM('pending','approved','rejected') NOT NULL DEFAULT 'approved'",
        )
        console.log('Added missing column news.status')
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Attempt to add news.status failed:', err)
        }
      }
    }

    // Ensure users.role ENUM includes 'member'
    const [roleRows]: any = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='role'",
    )
    const colType = roleRows?.[0]?.COLUMN_TYPE ? String(roleRows[0].COLUMN_TYPE) : ''
    if (colType && !colType.includes("'member'")) {
      try {
        await connection.query(
          "ALTER TABLE users MODIFY COLUMN role ENUM('admin','editor','viewer','member') NOT NULL DEFAULT 'viewer'",
        )
        console.log("Adjusted users.role ENUM to include 'member'")
      } catch (err: any) {
        console.warn('Attempt to adjust users.role enum failed:', err)
      }
    }

    // Ensure works.user_id column and index
    const [wUid]: any = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='works' AND COLUMN_NAME='user_id'",
    )
    if (!Array.isArray(wUid) || wUid.length === 0) {
      try {
        await connection.query('ALTER TABLE works ADD COLUMN user_id INT NULL')
        console.log('Added works.user_id')
      } catch {}
    }
    const [wUidIdx]: any = await connection.query(
      "SHOW INDEX FROM works WHERE Key_name='idx_works_user_id'",
    )
    if (!Array.isArray(wUidIdx) || wUidIdx.length === 0) {
      try {
        await connection.query('CREATE INDEX idx_works_user_id ON works(user_id)')
        console.log('Created idx_works_user_id')
      } catch {}
    }

    // Ensure news.user_id column and index
    const [nUid]: any = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='user_id'",
    )
    if (!Array.isArray(nUid) || nUid.length === 0) {
      try {
        await connection.query('ALTER TABLE news ADD COLUMN user_id INT NULL')
        console.log('Added news.user_id')
      } catch {}
    }
    const [nUidIdx]: any = await connection.query(
      "SHOW INDEX FROM news WHERE Key_name='idx_news_user_id'",
    )
    if (!Array.isArray(nUidIdx) || nUidIdx.length === 0) {
      try {
        await connection.query('CREATE INDEX idx_news_user_id ON news(user_id)')
        console.log('Created idx_news_user_id')
      } catch {}
    }

    // Ensure users.nickname column exists
    const [nickCol] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='nickname'",
    )
    if (Array.isArray(nickCol) && nickCol.length === 0) {
      try {
        await connection.query('ALTER TABLE users ADD COLUMN nickname VARCHAR(100) NULL')
        console.log('Added missing column users.nickname')
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Attempt to add users.nickname failed:', err)
        }
      }
    }

    connection.release()
    console.log('Database migration completed successfully.')
  } catch (error) {
    console.error('Error during database migration:', error)
  } finally {
    await pool.end()
  }
}

migrate()
