import { Router } from 'express';
import pool from '../db';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// @route   GET /api/friend-links
// @desc    Get all friend links
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM friend_links ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching friend links:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   POST /api/friend-links
// @desc    Create a friend link
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { title, url, logo } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO friend_links (title, url, logo) VALUES (?, ?, ?)',
      [title, url, logo]
    );
    res.status(201).json({ message: 'Friend link created successfully', insertId: (result as any).insertId });
  } catch (error) {
    console.error('Error creating friend link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   PUT /api/friend-links/:id
// @desc    Update a friend link
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;
  const { title, url, logo } = req.body;

  if (!title || !url) {
    return res.status(400).json({ error: 'Title and URL are required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE friend_links SET title = ?, url = ?, logo = ? WHERE id = ?',
      [title, url, logo, id]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Friend link not found' });
    }

    res.json({ message: 'Friend link updated successfully' });
  } catch (error) {
    console.error('Error updating friend link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   DELETE /api/friend-links/:id
// @desc    Delete a friend link
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM friend_links WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Friend link not found' });
    }

    res.json({ message: 'Friend link deleted successfully' });
  } catch (error) {
    console.error('Error deleting friend link:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

