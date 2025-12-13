import dotenv from 'dotenv';
import path from 'path';

// Load environment variables from the root of the 'server' directory
dotenv.config({ path: path.resolve(__dirname, '../../.env') });

import pool from '../db';

interface HistoryEvent {
  id: number;
  title: string;
  image: string | null;
}

const checkHistoryImages = async () => {
  try {
    const connection = await pool.getConnection();
    console.log('Successfully connected to the database.');

    const [rows] = await connection.query('SELECT id, title, image FROM history');
    const events = rows as HistoryEvent[];

    if (events.length === 0) {
      console.log('No events found in the history table.');
    } else {
      console.log('Current history events and their image paths:');
      console.table(events);
    }

    connection.release();
    console.log('Database connection released.');

  } catch (error) {
    console.error('An error occurred while checking history images:', error);
  } finally {
    pool.end();
  }
};

checkHistoryImages();

