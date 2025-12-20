import { Router } from 'express'
import pool from '../db'
import cache from '../cache'
import { protect, authorize, optionalAuth } from '../middleware/auth'

const router = Router()

// @route   GET /api/news
// @desc    Get news articles (token present & non-admin: only own)
// @access  Public (token optional)
router.get('/', optionalAuth as any, async (req: any, res) => {
  try {
    const parseTags = (rows: any[]) =>
      rows.map((r) => ({
        ...r,
        tags: (() => {
          const t = (r as any).tags
          if (Array.isArray(t)) return t.slice(0, 1)
          if (!t) return []
          try {
            const parsed = JSON.parse(t)
            return Array.isArray(parsed) ? parsed.slice(0, 1) : []
          } catch {
            return []
          }
        })(),
      }))

    const user = req.user
    if (user && user.role !== 'admin') {
      const [rows] = await pool.query(
        'SELECT n.*, COALESCE(u.nickname,u.username) AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id WHERE n.user_id = ? ORDER BY n.date DESC',
        [user.id],
      )
      return res.json(parseTags(rows as any[]))
    }

    // Public or admin
    if (!user) {
      const cacheKey = 'news_public_approved'
      const cachedNews = cache.get(cacheKey)
      if (cachedNews) return res.json(cachedNews)
      const [rows] = await pool.query(
        "SELECT n.*, u.username AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id WHERE n.status = 'approved' ORDER BY n.date DESC",
      )
      const parsed = parseTags(rows as any[])
      cache.set(cacheKey, parsed)
      return res.json(parsed)
    } else {
      // admin with token, no cache
      const [rows] = await pool.query(
        'SELECT n.*, COALESCE(u.nickname,u.username) AS submitter FROM news n LEFT JOIN users u ON u.id = n.user_id ORDER BY n.date DESC',
      )
      return res.json(parseTags(rows as any[]))
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

  // Normalize date to MySQL DATETIME format
  const toMysqlDatetime = (input: string) => {
    const d = new Date(input)
    if (isNaN(d.getTime())) return input
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  }
  const dateNormalized = toMysqlDatetime(date)
  const parseTagsOnce = (t: any) => {
    let arr: any[] = []
    if (Array.isArray(t)) arr = t
    else if (typeof t === 'string' && t.trim()) {
      try {
        const parsed = JSON.parse(t)
        if (Array.isArray(parsed)) arr = parsed
        else arr = [String(parsed)]
      } catch {
        arr = t.split(',')
      }
    }
    return arr.map((s) => String(s).trim()).filter(Boolean)
  }
  const rawTags = parseTagsOnce(tags)
  if (rawTags.length > 1) {
    return res.status(400).json({ error: '一个新闻最多只允许一个标签' })
  }
  const tagsJson = JSON.stringify(rawTags.slice(0, 1))

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

  // Normalize date to MySQL DATETIME format
  const toMysqlDatetime = (input: string) => {
    const d = new Date(input)
    if (isNaN(d.getTime())) return input
    const pad = (n: number) => String(n).padStart(2, '0')
    const yyyy = d.getFullYear()
    const mm = pad(d.getMonth() + 1)
    const dd = pad(d.getDate())
    const hh = pad(d.getHours())
    const mi = pad(d.getMinutes())
    const ss = pad(d.getSeconds())
    return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
  }
  const dateNormalized = toMysqlDatetime(date)

  const parseTagsOnce = (t: any) => {
    let arr: any[] = []
    if (Array.isArray(t)) arr = t
    else if (typeof t === 'string' && t.trim()) {
      try {
        const parsed = JSON.parse(t)
        if (Array.isArray(parsed)) arr = parsed
        else arr = [String(parsed)]
      } catch {
        arr = t.split(',')
      }
    }
    return arr.map((s) => String(s).trim()).filter(Boolean)
  }
  const rawTags = parseTagsOnce(tags)
  if (rawTags.length > 1) {
    return res.status(400).json({ error: '一个新闻最多只允许一个标签' })
  }
  const tagsJson = JSON.stringify(rawTags.slice(0, 1))

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
  if (!status || !['approved', 'rejected', 'pending'].includes(status)) {
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
