import { Router } from 'express';
import pool from '../db';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// @route   GET /api/works
// @desc    Get all works
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM works ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching works:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   POST /api/works
// @desc    Create a work
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { title, description, imageUrl, link } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO works (title, description, imageUrl, link) VALUES (?, ?, ?, ?)',
      [title, description, imageUrl, link]
    );
    res.status(201).json({ message: 'Work created successfully', insertId: (result as any).insertId });
  } catch (error) {
    console.error('Error creating work:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   PUT /api/works/:id
// @desc    Update a work
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params;
  const { title, description, imageUrl, link } = req.body;

  if (!title) {
    return res.status(400).json({ error: 'Title is required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE works SET title = ?, description = ?, imageUrl = ?, link = ? WHERE id = ?',
      [title, description, imageUrl, link, id]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Work not found' });
    }

    res.json({ message: 'Work updated successfully' });
  } catch (error) {
    console.error('Error updating work:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   DELETE /api/works/:id
// @desc    Delete a work
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM works WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Work not found' });
    }

    res.json({ message: 'Work deleted successfully' });
  } catch (error) {
    console.error('Error deleting work:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

