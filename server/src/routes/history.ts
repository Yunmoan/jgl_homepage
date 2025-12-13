import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'

const router = Router()

// @route   GET /api/history
// @desc    Get all history events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM history ORDER BY id ASC')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/history
// @desc    Create a history event
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { title, date, description, image, link, dialog_data } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO history (title, date, description, image, link, dialog_data) VALUES (?, ?, ?, ?, ?, ?)',
      [title, date, description, image, link, JSON.stringify(dialog_data)],
    )
    res
      .status(201)
      .json({ message: 'History event created successfully', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating history event:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/history/:id
// @desc    Update a history event
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { title, date, description, image, link, dialog_data } = req.body

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    const [result] = await pool.query(
      'UPDATE history SET title = ?, date = ?, description = ?, image = ?, link = ?, dialog_data = ? WHERE id = ?',
      [title, date, description, image, link, JSON.stringify(dialog_data), id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'History event not found' })
    }

    res.json({ message: 'History event updated successfully' })
  } catch (error) {
    console.error('Error updating history event:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/history/:id
// @desc    Delete a history event
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query('DELETE FROM history WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'History event not found' })
    }

    res.json({ message: 'History event deleted successfully' })
  } catch (error) {
    console.error('Error deleting history event:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
