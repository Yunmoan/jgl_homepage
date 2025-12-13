import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'
import { RowDataPacket } from 'mysql2'

const router = Router()

// @route   GET /api/members
// @desc    Get all members with pagination support
// @access  Public
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 18)
router.get('/', async (req, res) => {
  try {
    // Get pagination parameters from query string
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 18)) // Max 100 items per page

    // Calculate offset
    const offset = (page - 1) * limit

    // Get total count of members
    const [countResult] = await pool.query<RowDataPacket[]>('SELECT COUNT(*) as total FROM members')
    const total = countResult[0].total

    // Get paginated members
    const [rows] = await pool.query('SELECT * FROM members ORDER BY name ASC LIMIT ? OFFSET ?', [
      limit,
      offset,
    ])

    // Calculate total pages
    const totalPages = Math.ceil(total / limit)

    // Return paginated response
    res.json({
      data: rows,
      pagination: {
        page,
        limit,
        total,
        totalPages,
        hasNextPage: page < totalPages,
        hasPrevPage: page > 1,
      },
    })
  } catch (error) {
    console.error('Error fetching members:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/members
// @desc    Create a member
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { name, logo, link } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const [result] = await pool.query('INSERT INTO members (name, logo, link) VALUES (?, ?, ?)', [
      name,
      logo,
      link,
    ])
    res
      .status(201)
      .json({ message: 'Member created successfully', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating member:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/members/:id
// @desc    Update a member
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { name, logo, link } = req.body

  if (!name) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const [result] = await pool.query(
      'UPDATE members SET name = ?, logo = ?, link = ? WHERE id = ?',
      [name, logo, link, id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    res.json({ message: 'Member updated successfully' })
  } catch (error) {
    console.error('Error updating member:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/members/:id
// @desc    Delete a member
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query('DELETE FROM members WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Member not found' })
    }

    res.json({ message: 'Member deleted successfully' })
  } catch (error) {
    console.error('Error deleting member:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
