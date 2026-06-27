import { Router } from 'express'
import pool from '../db'
import cache from '../cache'
import { protect, authorize } from '../middleware/auth'
import { cleanString, isOneOf, parseBooleanFlag, requiredString } from '../utils/input'

const router = Router()
const announcementTypes = ['info', 'success', 'warning', 'error'] as const

// 公共：获取当前有效的公告（启用且在时间范围内），按更新时间倒序
router.get('/public', async (_req, res) => {
  try {
    const cacheKey = 'announcements_public_active'
    const cached = cache.get<any[]>(cacheKey)
    if (cached) return res.json(cached)

    const [rows] = await pool.query(
      `SELECT id, title, content, type, enabled, closeable,
              start_at, end_at, updated_at
         FROM site_announcements
        WHERE enabled = 1
          AND (start_at IS NULL OR start_at <= NOW())
          AND (end_at   IS NULL OR end_at   >= NOW())
        ORDER BY updated_at DESC, id DESC`,
    )

    cache.set(cacheKey, rows)
    res.json(rows)
  } catch (e) {
    console.error('Error fetching public announcements:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// 管理端：列表
router.get('/', protect, authorize('admin', 'editor'), async (_req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT id, title, content, type, enabled, closeable,
              start_at, end_at, created_at, updated_at
         FROM site_announcements
        ORDER BY id DESC`,
    )
    res.json(rows)
  } catch (e) {
    console.error('Error listing announcements:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// 创建
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  try {
    const {
      title,
      content,
      type = 'info',
      enabled = true,
      closeable = true,
      start_at = null,
      end_at = null,
    } = req.body || {}
    const safeTitle = requiredString(title)
    if (!safeTitle) return res.status(400).json({ error: 'title 必填' })
    if (!isOneOf(type, announcementTypes)) {
      return res.status(400).json({ error: 'type 无效' })
    }

    const [result] = await pool.query(
      `INSERT INTO site_announcements (title, content, type, enabled, closeable, start_at, end_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        safeTitle,
        cleanString(content) ?? '',
        type,
        parseBooleanFlag(enabled),
        parseBooleanFlag(closeable),
        cleanString(start_at),
        cleanString(end_at),
      ],
    )

    cache.del('announcements_public_active')
    res.status(201).json({ message: 'created', id: (result as any).insertId })
  } catch (e) {
    console.error('Error creating announcement:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// 更新
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    const { title, content, type, enabled, closeable, start_at, end_at } = req.body || {}

    const fields: string[] = []
    const values: any[] = []

    if (title !== undefined) {
      const safeTitle = requiredString(title)
      if (!safeTitle) return res.status(400).json({ error: 'title 必填' })
      fields.push('title = ?')
      values.push(safeTitle)
    }
    if (content !== undefined) {
      fields.push('content = ?')
      values.push(cleanString(content) ?? '')
    }
    if (type !== undefined) {
      if (!isOneOf(type, announcementTypes)) {
        return res.status(400).json({ error: 'type 无效' })
      }
      fields.push('type = ?')
      values.push(type)
    }
    if (enabled !== undefined) {
      fields.push('enabled = ?')
      values.push(parseBooleanFlag(enabled))
    }
    if (closeable !== undefined) {
      fields.push('closeable = ?')
      values.push(parseBooleanFlag(closeable))
    }
    if (start_at !== undefined) {
      fields.push('start_at = ?')
      values.push(cleanString(start_at))
    }
    if (end_at !== undefined) {
      fields.push('end_at = ?')
      values.push(cleanString(end_at))
    }

    if (!fields.length) return res.status(400).json({ error: 'no fields to update' })

    const sql = `UPDATE site_announcements SET ${fields.join(', ')}, updated_at = NOW() WHERE id = ?`
    values.push(id)
    const [result] = await pool.query(sql, values)
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'not found' })

    cache.del('announcements_public_active')
    res.json({ message: 'updated' })
  } catch (e) {
    console.error('Error updating announcement:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// 删除
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  try {
    const { id } = req.params as { id: string }
    const [result] = await pool.query('DELETE FROM site_announcements WHERE id = ?', [id])
    if ((result as any).affectedRows === 0) return res.status(404).json({ error: 'not found' })
    cache.del('announcements_public_active')
    res.json({ message: 'deleted' })
  } catch (e) {
    console.error('Error deleting announcement:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
