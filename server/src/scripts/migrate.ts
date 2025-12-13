import pool from '../db';
import fs from 'fs/promises';
import path from 'path';

async function migrate() {
  try {
    console.log('Starting database migration...');
    const connection = await pool.getConnection();

    const sqlFilePath = path.join(__dirname, '..', '..', 'sql', 'init.sql');
    const sql = await fs.readFile(sqlFilePath, 'utf-8');

    // Split SQL file into individual statements
    const statements = sql.split(/;\s*$/m);

    for (const statement of statements) {
      if (statement.trim().length > 0) {
        await connection.query(statement);
        console.log('Executed statement successfully.');
      }
    }

    connection.release();
    console.log('Database migration completed successfully.');
  } catch (error) {
    console.error('Error during database migration:', error);
  } finally {
    await pool.end();
  }
}

migrate();

