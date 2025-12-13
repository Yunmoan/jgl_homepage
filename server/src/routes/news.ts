import { Router } from 'express'
import pool from '../db'
import cache from '../cache'
import { protect, authorize } from '../middleware/auth'

const router = Router()

// @route   GET /api/news
// @desc    Get all news articles
// @access  Public
router.get('/', async (req, res) => {
  const cacheKey = 'news_all'
  const cachedNews = cache.get(cacheKey)

  if (cachedNews) {
    // console.log('Serving news from cache');
    return res.json(cachedNews)
  }

  try {
    const [rows] = await pool.query('SELECT * FROM news ORDER BY date DESC')
    cache.set(cacheKey, rows)
    // console.log('Serving news from DB and caching');
    res.json(rows)
  } catch (error) {
    console.error('Error fetching news:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/news
// @desc    Create a news article
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor'), async (req, res) => {
  const { title, date, author, image, summary, content } = req.body

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

  try {
    const [result] = await pool.query(
      'INSERT INTO news (title, date, author, image, summary, content) VALUES (?, ?, ?, ?, ?, ?)',
      [title, dateNormalized, author, image, summary, content],
    )
    cache.del('news_all')
    res
      .status(201)
      .json({ message: 'News article created successfully', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating news article:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/news/:id
// @desc    Update a news article
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor'), async (req, res) => {
  const { id } = req.params
  const { title, date, author, image, summary, content } = req.body

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

  try {
    const [result] = await pool.query(
      'UPDATE news SET title = ?, date = ?, author = ?, image = ?, summary = ?, content = ? WHERE id = ?',
      [title, dateNormalized, author, image, summary, content, id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'News article not found' })
    }

    cache.del('news_all')
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

    cache.del('news_all')
    res.json({ message: 'News article deleted successfully' })
  } catch (error) {
    console.error('Error deleting news article:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
