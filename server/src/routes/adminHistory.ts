import { Router } from 'express';
import pool from '../db';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// @route   GET /api/admin-history
// @desc    Get all admin history with members
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [terms] = await pool.query('SELECT * FROM admin_terms ORDER BY id ASC');
    
    const results = [];
    for (const term of (terms as any[])) {
      const [members] = await pool.query('SELECT name, position, image FROM admin_term_members WHERE term_id = ?', [term.id]);
      results.push({ ...term, members });
    }

    res.json(results);
  } catch (error) {
    console.error('Error fetching admin history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   POST /api/admin-history
// @desc    Create an admin term with members
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { title, trem, description, members } = req.body;

  if (!title || !members || !Array.isArray(members)) {
    return res.status(400).json({ error: 'Title and a list of members are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [termResult] = await connection.query(
      'INSERT INTO admin_terms (title, trem, description) VALUES (?, ?, ?)',
      [title, trem, description]
    );
    const termId = (termResult as any).insertId;

    for (const member of members) {
      await connection.query(
        'INSERT INTO admin_term_members (term_id, name, position, image) VALUES (?, ?, ?, ?)',
        [termId, member.name, member.position, member.image]
      );
    }

    await connection.commit();
    res.status(201).json({ message: 'Admin history created successfully', termId });
  } catch (error) {
    await connection.rollback();
    console.error('Error creating admin history:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// @route   PUT /api/admin-history/:id
// @desc    Update an admin term and its members
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { title, trem, description, members } = req.body;

  if (!title || !members || !Array.isArray(members)) {
    return res.status(400).json({ error: 'Title and a list of members are required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const [termUpdateResult] = await connection.query(
      'UPDATE admin_terms SET title = ?, trem = ?, description = ? WHERE id = ?',
      [title, trem, description, id]
    );

    if ((termUpdateResult as any).affectedRows === 0) {
      throw new Error('Term not found');
    }

    // Easiest way to handle member updates is to delete old ones and insert new ones
    await connection.query('DELETE FROM admin_term_members WHERE term_id = ?', [id]);

    for (const member of members) {
      await connection.query(
        'INSERT INTO admin_term_members (term_id, name, position, image) VALUES (?, ?, ?, ?)',
        [id, member.name, member.position, member.image]
      );
    }

    await connection.commit();
    res.json({ message: 'Admin history updated successfully' });
  } catch (error) {
    await connection.rollback();
    console.error('Error updating admin history:', error);
    if ((error as Error).message === 'Term not found') {
      return res.status(404).json({ error: 'Admin term not found' });
    }
    res.status(500).json({ error: 'Internal Server Error' });
  } finally {
    connection.release();
  }
});

// @route   DELETE /api/admin-history/:id
// @desc    Delete an admin term and its members
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM admin_terms WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Admin term not found' });
    }

    res.json({ message: 'Admin term deleted successfully' });
  } catch (error) {
    console.error('Error deleting admin term:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

