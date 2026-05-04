import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root of the 'server' directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from '../db';

const fixHistoryImagePaths = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    // Find all history events with image paths starting with 'history/'
    const [rows] = await connection.query("SELECT id, image FROM history WHERE image LIKE 'history/%'");
    const eventsToFix = rows as { id: number; image: string }[];

    if (eventsToFix.length === 0) {
      console.log('No history image paths to fix (no paths starting with history/).');
    } else {
      console.log(`Found ${eventsToFix.length} image path(s) to fix.`);
      for (const event of eventsToFix) {
        // Replace 'history/' with 'pictures/' in the image path
        const newImagePath = event.image.replace(/^history\//, 'pictures/');
        await connection.query('UPDATE history SET image = ? WHERE id = ?', [newImagePath, event.id]);
        console.log(`Updated event ID ${event.id}: ${event.image} -> ${newImagePath}`);
      }
      console.log('All paths have been updated.');
    }

    connection.release();
    console.log('Database connection released.');

  } catch (error) {
    console.error('An error occurred while fixing history image paths:', error);
  } finally {
    pool.end();
  }
};

fixHistoryImagePaths();
