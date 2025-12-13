import { Router } from 'express';
import pool from '../db';
import { protect, authorize } from '../middleware/auth';

const router = Router();

// @route   GET /api/fame-members
// @desc    Get all fame members
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM fame_members ORDER BY id ASC');
    res.json(rows);
  } catch (error) {
    console.error('Error fetching fame members:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   POST /api/fame-members
// @desc    Create a fame member
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { name, description, image } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO fame_members (name, description, image) VALUES (?, ?, ?)',
      [name, description, image]
    );
    res.status(201).json({ message: 'Fame member created successfully', insertId: (result as any).insertId });
  } catch (error) {
    console.error('Error creating fame member:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   PUT /api/fame-members/:id
// @desc    Update a fame member
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params;
  const { name, description, image } = req.body;

  if (!name) {
    return res.status(400).json({ error: 'Name is required' });
  }

  try {
    const [result] = await pool.query(
      'UPDATE fame_members SET name = ?, description = ?, image = ? WHERE id = ?',
      [name, description, image, id]
    );

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Fame member not found' });
    }

    res.json({ message: 'Fame member updated successfully' });
  } catch (error) {
    console.error('Error updating fame member:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// @route   DELETE /api/fame-members/:id
// @desc    Delete a fame member
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params;

  try {
    const [result] = await pool.query('DELETE FROM fame_members WHERE id = ?', [id]);

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Fame member not found' });
    }

    res.json({ message: 'Fame member deleted successfully' });
  } catch (error) {
    console.error('Error deleting fame member:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

export default router;

