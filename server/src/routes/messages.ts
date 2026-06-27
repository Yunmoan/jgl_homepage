import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'
import multer from 'multer'
import { cleanString, isOneOf, requiredString } from '../utils/input'
import { verifyRecaptcha } from '../utils/recaptcha'

const router = Router()
const upload = multer({ storage: multer.memoryStorage() })
const messageStatuses = ['pending', 'approved', 'rejected'] as const

// @route   GET /api/messages
// @desc    Get all approved messages
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query(
      "SELECT * FROM messages WHERE status = 'approved' ORDER BY id DESC",
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching messages:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   GET /api/messages/all
// @desc    Get all messages (for admin)
// @access  Private (Admin, Editor)
router.get('/all', protect, authorize('admin', 'editor'), async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM messages ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching all messages:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/messages/import
// @desc    Import messages from a JSON file
// @access  Private (Admin)
router.post(
  '/import',
  protect,
  authorize('admin', 'editor'),
  upload.single('file'),
  async (req, res) => {
    if (!req.file) {
      return res.status(400).json({ error: 'No file uploaded.' })
    }

    const connection = await pool.getConnection()
    try {
      const jsonData = JSON.parse(req.file.buffer.toString('utf-8'))

      await connection.beginTransaction()
      await connection.query('TRUNCATE TABLE messages')

      for (const message of jsonData) {
        const status = isOneOf(message.status, messageStatuses) ? message.status : 'approved'
        await connection.query(
          'INSERT INTO messages (id, author, content, qq, status) VALUES (?, ?, ?, ?, ?)',
          [
            message.id,
            requiredString(message.author),
            requiredString(message.content),
            cleanString(message.qq),
            status,
          ],
        )
      }

      await connection.commit()
      res.json({ message: `${jsonData.length} messages imported successfully.` })
    } catch (error) {
      await connection.rollback()
      console.error('Error importing messages:', error)
      res.status(500).json({ error: 'Failed to import messages. Please check the file format.' })
    } finally {
      connection.release()
    }
  },
)

// @route   POST /api/messages
// @desc    Create a message (for public, pending approval)
// @access  Public
router.post('/', async (req, res) => {
  const { author, content, qq, token } = req.body
  const safeAuthor = requiredString(author)
  const safeContent = requiredString(content)

  // 1. Verify reCAPTCHA token
  if (!token) {
    return res.status(400).json({ error: 'reCAPTCHA token is missing' })
  }

  try {
    const recaptchaResult = await verifyRecaptcha(token, 'submit_message')
    if (!recaptchaResult.ok) {
      return res.status(recaptchaResult.status).json(recaptchaResult.body)
    }

    // 2. If verification is successful, proceed to save the message
    if (!safeAuthor || !safeContent) {
      return res.status(400).json({ error: 'Author and content are required' })
    }

    const [result] = await pool.query(
      'INSERT INTO messages (author, content, qq, status) VALUES (?, ?, ?, ?)',
      [safeAuthor, safeContent, cleanString(qq), 'pending'],
    )
    res
      .status(201)
      .json({ message: 'Message created successfully', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error during message creation or reCAPTCHA verification:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/messages/add
// @desc    Create a message as an admin (defaults to approved)
// @access  Private (Admin, Editor)
router.post('/add', protect, authorize('admin', 'editor'), async (req, res) => {
  const { author, content, qq } = req.body
  const safeAuthor = requiredString(author)
  const safeContent = requiredString(content)

  if (!safeAuthor || !safeContent) {
    return res.status(400).json({ error: 'Author and content are required' })
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO messages (author, content, qq, status) VALUES (?, ?, ?, ?)',
      [safeAuthor, safeContent, cleanString(qq), 'approved'],
    )
    res.status(201).json({
      message: 'Message created successfully by admin',
      insertId: (result as any).insertId,
    })
  } catch (error) {
    console.error('Error creating message by admin:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/messages/:id
// @desc    Update a message
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { author, content, qq } = req.body
  const safeAuthor = requiredString(author)
  const safeContent = requiredString(content)

  if (!safeAuthor || !safeContent) {
    return res.status(400).json({ error: 'Author and content are required' })
  }
  try {
    const [result] = await pool.query(
      'UPDATE messages SET author = ?, content = ?, qq = ? WHERE id = ?',
      [safeAuthor, safeContent, cleanString(qq), id],
    )
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    res.json({ message: 'Message updated successfully' })
  } catch (error) {
    console.error('Error updating message:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/messages/:id/status
// @desc    Update a message's status
// @access  Private (Admin, Editor)
router.put('/:id/status', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!isOneOf(status, messageStatuses)) {
    return res.status(400).json({ error: 'Valid status is required' })
  }
  try {
    const [result] = await pool.query('UPDATE messages SET status = ? WHERE id = ?', [status, id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    res.json({ message: 'Message status updated successfully' })
  } catch (error) {
    console.error('Error updating message status:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/messages/:id
// @desc    Delete a message
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  try {
    const [result] = await pool.query('DELETE FROM messages WHERE id = ?', [id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Message not found' })
    }
    res.json({ message: 'Message deleted successfully' })
  } catch (error) {
    console.error('Error deleting message:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
