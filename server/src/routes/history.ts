import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'

const router = Router()

// @route   GET /api/history
// @desc    Get all history events
// @access  Public
router.get('/', async (req, res) => {
  try {
    const [rows] = await pool.query('SELECT * FROM history ORDER BY id DESC')
    res.json(rows)
  } catch (error) {
    console.error('Error fetching history:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   POST /api/history
// @desc    Create a history event
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { title, date, description, image, link, dialog_data } = req.body

  if (!title) {
    return res.status(400).json({ error: '请填写标题' })
  }

  try {
    const [result] = await pool.query(
      'INSERT INTO history (title, date, description, image, link, dialog_data) VALUES (?, ?, ?, ?, ?, ?)',
      [title, date, description, image, link, JSON.stringify(dialog_data)],
    )
    res
      .status(201)
      .json({ message: '历史事件已新增', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating history event:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/history/:id
// @desc    Update a history event
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { title, date, description, image, link, dialog_data } = req.body

  if (!title) {
    return res.status(400).json({ error: '请填写标题' })
  }

  try {
    const [result] = await pool.query(
      'UPDATE history SET title = ?, date = ?, description = ?, image = ?, link = ?, dialog_data = ? WHERE id = ?',
      [title, date, description, image, link, JSON.stringify(dialog_data), id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该历史事件不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '历史事件已保存' })
  } catch (error) {
    console.error('Error updating history event:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
      return res.status(404).json({ error: '该历史事件不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '历史事件已删除' })
  } catch (error) {
    console.error('Error deleting history event:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

export default router
