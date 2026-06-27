import { Router } from 'express'
import pool from '../db'
import cache from '../cache'
import { protect, authorize, optionalAuth } from '../middleware/auth'
import { isOneOf, parseStoredTags, singleTagJson, toMysqlDatetime } from '../utils/input'

const router = Router()

// @route   GET /api/news
// @desc    Get news articles (token present & non-admin: only own)
// @access  Public (token optional)
router.get('/', optionalAuth as any, async (req: any, res) => {
  try {
    const mapNewsRows = (rows: any[]) =>
      rows.map((r) => ({
        ...r,
        tags: parseStoredTags((r as any).tags),
      }))

    const user = req.user
    if (user && user.role !== 'admin') {
      const [rows] = await pool.query(
        'SELECT n.*, COALESCE(u.nickname,u.username) AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id WHERE n.user_id = ? ORDER BY n.date DESC',
        [user.id],
      )
      return res.json(mapNewsRows(rows as any[]))
    }

    // Public or admin
    if (!user) {
      const cacheKey = 'news_public_approved'
      const cachedNews = cache.get(cacheKey)
      if (cachedNews) return res.json(cachedNews)
      const [rows] = await pool.query(
        "SELECT n.*, u.username AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id WHERE n.status = 'approved' ORDER BY n.date DESC",
      )
      const parsed = mapNewsRows(rows as any[])
      cache.set(cacheKey, parsed)
      return res.json(parsed)
    } else {
      // admin with token, no cache
      const [rows] = await pool.query(
        'SELECT n.*, COALESCE(u.nickname,u.username) AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id ORDER BY n.date DESC',
      )
      return res.json(mapNewsRows(rows as any[]))
    }
  } catch (error) {
    console.error('Error fetching news:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/news
// @desc    Create a news article
// @access  Private (Admin, Editor, Member)
router.post('/', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  const { title, date, author, image, summary, content, tags } = req.body

  if (!title || !content || !date) {
    return res.status(400).json({ error: 'Title, content, and date are required' })
  }

  const dateNormalized = toMysqlDatetime(date)
  const tagsJson = singleTagJson(tags)
  if (tagsJson === null) {
    return res.status(400).json({ error: '一个新闻最多只允许一个标签' })
  }

  try {
    const userId = req.user?.id ?? null
    const role = req.user?.role
    const status = role === 'admin' ? 'approved' : 'pending'
    const [result] = await pool.query(
      'INSERT INTO news (title, date, author, image, summary, content, status, user_id, tags) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [title, dateNormalized, author, image, summary, content, status, userId, tagsJson],
    )
    cache.del('news_public_approved')
    res.status(201).json({
      message: 'News article created successfully',
      insertId: (result as any).insertId,
      status,
    })
  } catch (error) {
    console.error('Error creating news article:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/news/:id
// @desc    Update a news article
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  const { id } = req.params
  const { title, date, author, image, summary, content, tags } = req.body

  if (!title || !content || !date) {
    return res.status(400).json({ error: 'Title, content, and date are required' })
  }

  const dateNormalized = toMysqlDatetime(date)
  const tagsJson = singleTagJson(tags)
  if (tagsJson === null) {
    return res.status(400).json({ error: '一个新闻最多只允许一个标签' })
  }

  try {
    let sql =
      'UPDATE news SET title = ?, date = ?, author = ?, image = ?, summary = ?, content = ?, tags = ? WHERE id = ?'
    const params: any[] = [title, dateNormalized, author, image, summary, content, tagsJson, id]

    // 非 admin 仅能修改自己创建的记录
    if (req.user?.role !== 'admin') {
      sql += ' AND user_id = ?'
      params.push(req.user?.id)
    }

    const [result] = await pool.query(sql, params)

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'News article not found or no permission' })
    }

    cache.del('news_public_approved')
    res.json({ message: 'News article updated successfully' })
  } catch (error) {
    console.error('Error updating news article:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/news/:id
// @desc    Delete a news article
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query('DELETE FROM news WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'News article not found' })
    }

    cache.del('news_public_approved')
    res.json({ message: 'News article deleted successfully' })
  } catch (error) {
    console.error('Error deleting news article:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/news/:id/status
// @desc    Approve/Reject a news article (admin only)
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params as { id: string }
  const { status } = req.body as { status?: 'approved' | 'rejected' | 'pending' }
  if (!isOneOf(status, ['approved', 'rejected', 'pending'] as const)) {
    return res.status(400).json({ error: 'Invalid status' })
  }
  try {
    const [result] = await pool.query('UPDATE news SET status=? WHERE id = ?', [status, id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'News not found' })
    }
    // 清理公共缓存
    cache.del('news_public_approved')
    res.json({ message: 'Status updated', status })
  } catch (e) {
    console.error('Error updating news status:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
