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

    // Ensure news.tags column exists (TEXT storing JSON array)
    const [newsTags] = await connection.query(
      "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='news' AND COLUMN_NAME='tags'",
    )
    if (Array.isArray(newsTags) && newsTags.length === 0) {
      try {
        await connection.query('ALTER TABLE news ADD COLUMN tags TEXT NULL')
        console.log('Added missing column news.tags')
      } catch (err: any) {
        if (err?.code !== 'ER_DUP_FIELDNAME') {
          console.warn('Attempt to add news.tags failed:', err)
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

    const [statusRows]: any = await connection.query(
      "SELECT COLUMN_TYPE FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME='users' AND COLUMN_NAME='status'",
    )
    const statusType = statusRows?.[0]?.COLUMN_TYPE ? String(statusRows[0].COLUMN_TYPE) : ''
    if (statusType && !statusType.includes("'withdrawn'")) {
      try {
        await connection.query(
          "ALTER TABLE users MODIFY COLUMN status ENUM('pending','approved','rejected','disabled','withdrawn') NOT NULL DEFAULT 'approved'",
        )
        console.log("Adjusted users.status ENUM to include 'withdrawn'")
      } catch (err: any) {
        console.warn('Attempt to adjust users.status enum failed:', err)
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

    const ensureUsersColumn = async (columnName: string, ddl: string) => {
      const [col] = await connection.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        ['users', columnName],
      )
      if (Array.isArray(col) && col.length === 0) {
        try {
          await connection.query(ddl)
          console.log(`Added missing column users.${columnName}`)
        } catch (err: any) {
          if (err?.code !== 'ER_DUP_FIELDNAME') {
            console.warn(`Attempt to add users.${columnName} failed:`, err)
          }
        }
      }
    }

    await ensureUsersColumn('club_name', 'ALTER TABLE users ADD COLUMN club_name VARCHAR(120) NULL')
    await ensureUsersColumn('club_logo', 'ALTER TABLE users ADD COLUMN club_logo VARCHAR(255) NULL')
    await ensureUsersColumn('club_link', 'ALTER TABLE users ADD COLUMN club_link VARCHAR(255) NULL')
    await ensureUsersColumn('contact_name', 'ALTER TABLE users ADD COLUMN contact_name VARCHAR(100) NULL')
    await ensureUsersColumn('contact_qq', 'ALTER TABLE users ADD COLUMN contact_qq VARCHAR(50) NULL')
    await ensureUsersColumn('club_group_qq', 'ALTER TABLE users ADD COLUMN club_group_qq VARCHAR(50) NULL')
    await ensureUsersColumn('application_reason', 'ALTER TABLE users ADD COLUMN application_reason TEXT NULL')
    await ensureUsersColumn(
      'status',
      "ALTER TABLE users ADD COLUMN status ENUM('pending','approved','rejected','disabled') NOT NULL DEFAULT 'approved'",
    )
    await ensureUsersColumn('review_note', 'ALTER TABLE users ADD COLUMN review_note TEXT NULL')
    await ensureUsersColumn('reviewed_by', 'ALTER TABLE users ADD COLUMN reviewed_by INT NULL')
    await ensureUsersColumn('reviewed_at', 'ALTER TABLE users ADD COLUMN reviewed_at DATETIME NULL')
    await ensureUsersColumn('registration_ip_hash', 'ALTER TABLE users ADD COLUMN registration_ip_hash VARCHAR(64) NULL')

    const ensureColumn = async (tableName: string, columnName: string, ddl: string) => {
      const [col] = await connection.query(
        'SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?',
        [tableName, columnName],
      )
      if (Array.isArray(col) && col.length === 0) {
        try {
          await connection.query(ddl)
          console.log(`Added missing column ${tableName}.${columnName}`)
        } catch (err: any) {
          if (err?.code !== 'ER_DUP_FIELDNAME') {
            console.warn(`Attempt to add ${tableName}.${columnName} failed:`, err)
          }
        }
      }
    }

    await ensureColumn('members', 'owner_user_id', 'ALTER TABLE members ADD COLUMN owner_user_id INT NULL')
    const [memberOwnerIdx]: any = await connection.query(
      "SHOW INDEX FROM members WHERE Key_name='idx_members_owner_user_id'",
    )
    if (!Array.isArray(memberOwnerIdx) || memberOwnerIdx.length === 0) {
      try {
        await connection.query('CREATE INDEX idx_members_owner_user_id ON members(owner_user_id)')
        console.log('Created idx_members_owner_user_id')
      } catch {}
    }

    await connection.query(`
      CREATE TABLE IF NOT EXISTS page_views (
        id INT AUTO_INCREMENT PRIMARY KEY,
        path VARCHAR(255) NOT NULL,
        referrer VARCHAR(512),
        ip_hash VARCHAR(64),
        user_agent VARCHAR(255),
        viewed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
        INDEX idx_page_views_viewed_at (viewed_at),
        INDEX idx_page_views_path (path)
      )
    `)
    console.log('Ensured page_views table')

    connection.release()
    console.log('Database migration completed successfully.')
  } catch (error) {
    console.error('Error during database migration:', error)
  } finally {
    await pool.end()
  }
}

migrate()
