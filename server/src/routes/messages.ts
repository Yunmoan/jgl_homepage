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
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
      return res.status(400).json({ error: '请先选择需要导入的文件' })
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
      res.json({ message: `已导入 ${jsonData.length} 条留言` })
    } catch (error) {
      await connection.rollback()
      console.error('Error importing messages:', error)
      res.status(500).json({ error: '留言导入失败，请检查文件格式和内容后重试' })
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
    return res.status(400).json({ error: '请完成人机验证后重试' })
  }

  try {
    const recaptchaResult = await verifyRecaptcha(token, 'submit_message')
    if (!recaptchaResult.ok) {
      return res.status(recaptchaResult.status).json(recaptchaResult.body)
    }

    // 2. If verification is successful, proceed to save the message
    if (!safeAuthor || !safeContent) {
      return res.status(400).json({ error: '请填写留言昵称和内容' })
    }

    const [result] = await pool.query(
      'INSERT INTO messages (author, content, qq, status) VALUES (?, ?, ?, ?)',
      [safeAuthor, safeContent, cleanString(qq), 'pending'],
    )
    res
      .status(201)
      .json({ message: '留言已提交，审核通过后将公开显示', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error during message creation or reCAPTCHA verification:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
    return res.status(400).json({ error: '请填写留言昵称和内容' })
  }
  try {
    const [result] = await pool.query(
      'INSERT INTO messages (author, content, qq, status) VALUES (?, ?, ?, ?)',
      [safeAuthor, safeContent, cleanString(qq), 'approved'],
    )
    res.status(201).json({
      message: '留言已新增',
      insertId: (result as any).insertId,
    })
  } catch (error) {
    console.error('Error creating message by admin:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
    return res.status(400).json({ error: '请填写留言昵称和内容' })
  }
  try {
    const [result] = await pool.query(
      'UPDATE messages SET author = ?, content = ?, qq = ? WHERE id = ?',
      [safeAuthor, safeContent, cleanString(qq), id],
    )
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该留言不存在或已被删除，请刷新列表' })
    }
    res.json({ message: '留言已保存' })
  } catch (error) {
    console.error('Error updating message:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/messages/:id/status
// @desc    Update a message's status
// @access  Private (Admin, Editor)
router.put('/:id/status', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { status } = req.body
  if (!isOneOf(status, messageStatuses)) {
    return res.status(400).json({ error: '请选择有效的状态' })
  }
  try {
    const [result] = await pool.query('UPDATE messages SET status = ? WHERE id = ?', [status, id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该留言不存在或已被删除，请刷新列表' })
    }
    res.json({ message: '留言状态已更新' })
  } catch (error) {
    console.error('Error updating message status:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
      return res.status(404).json({ error: '该留言不存在或已被删除，请刷新列表' })
    }
    res.json({ message: '留言已删除' })
  } catch (error) {
    console.error('Error deleting message:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

export default router
