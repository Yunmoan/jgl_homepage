import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'
import { cleanString, requiredString } from '../utils/input'

const router = Router()

// @route   GET /api/friend-links
// @desc    Get all friend links
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM friend_links ORDER BY id ASC')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching friend links:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   POST /api/friend-links
// @desc    Create a friend link
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { title, url, logo } = req.body
  const safeTitle = requiredString(title)
  const safeUrl = requiredString(url)

  if (!safeTitle || !safeUrl) {
    return res.status(400).json({ error: '请填写友链名称和链接地址' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO friend_links (title, url, logo) VALUES (?, ?, ?)',
      [safeTitle, safeUrl, cleanString(logo)],
    )
    res.status(201).json({ message: '友情链接已新增', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating friend link:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/friend-links/:id
// @desc    Update a friend link
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { title, url, logo } = req.body
  const safeTitle = requiredString(title)
  const safeUrl = requiredString(url)

  if (!safeTitle || !safeUrl) {
    return res.status(400).json({ error: '请填写友链名称和链接地址' })
  }

  try {
    const [result] = await pool.query(
      'UPDATE friend_links SET title = ?, url = ?, logo = ? WHERE id = ?',
      [safeTitle, safeUrl, cleanString(logo), id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该友情链接不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '友情链接已保存' })
  } catch (error) {
    console.error('Error updating friend link:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   DELETE /api/friend-links/:id
// @desc    Delete a friend link
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query('DELETE FROM friend_links WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该友情链接不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '友情链接已删除' })
  } catch (error) {
    console.error('Error deleting friend link:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

export default router
