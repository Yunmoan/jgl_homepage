import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root of the 'server' directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import fs from 'fs/promises';
import pool from '../db';

interface MemberData {
  id: number;
  name: string;
  logo: string;
  link: string;
}

const updateMemberLogos = async () => {
  try {
    // 1. Read the JSON file
    const jsonPath = path.resolve(__dirname, '../../../public/data/members_generated.json');
    const jsonData = await fs.readFile(jsonPath, 'utf-8');
    const members: MemberData[] = JSON.parse(jsonData);

    // 2. Connect to the database
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    // 3. Iterate and update
    for (const member of members) {
      const { name, logo } = member;

      // Find the member in the database by name
      const [rows] = await connection.query('SELECT * FROM members WHERE name = ?', [name]);
      const dbMember = (rows as any)[0];

      if (dbMember) {
        // If member is found, update the logo path
        if (dbMember.logo !== logo) {
          await connection.query('UPDATE members SET logo = ? WHERE id = ?', [logo, dbMember.id]);
          console.log(`Updated logo for: ${name}`);
        } else {
          console.log(`Logo for ${name} is already up-to-date.`);
        }
      } else {
        console.warn(`Member not found in database: ${name}`);
      }
    }

    // 4. Release the connection
    connection.release();
    console.log('Database connection released.');
    console.log('All member logos have been processed.');

  } catch (error) {
    console.error('An error occurred while updating member logos:', error);
  } finally {
    // Ensure the pool is closed to allow the script to exit
    pool.end();
  }
};

updateMemberLogos();

