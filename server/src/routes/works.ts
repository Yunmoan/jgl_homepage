import { Router } from 'express'
import pool from '../db'
import { protect, authorize, optionalAuth } from '../middleware/auth'

const router = Router()

// @route   GET /api/works
// @desc    Get all works (optional filter by club via ?club=xxx, by featured via ?featured=1)
// @access  Public
router.get('/', optionalAuth as any, async (req: any, res) => {
  try {
    const { club, featured } = req.query as { club?: string; featured?: string }
    let sql =
      'SELECT w.*, COALESCE(u.nickname,u.username) AS submitter FROM works w LEFT JOIN users u ON u.id = w.user_id'
    const clauses: string[] = []
    const params: any[] = []

    // Non-admin with token: only own records
    const user = req.user
    if (user && user.role !== 'admin') {
      clauses.push('w.user_id = ?')
      params.push(user.id)
    }

    if (club) {
      clauses.push('w.club = ?')
      params.push(club)
    }
    if (typeof featured !== 'undefined') {
      const val = ['1', 'true', 'True', 'TRUE'].includes(String(featured)) ? 1 : 0
      clauses.push('w.featured = ?')
      params.push(val)
    }
    if (clauses.length) {
      sql += ' WHERE ' + clauses.join(' AND ')
    }
    sql += ' ORDER BY w.id ASC'
    const [rows] = await pool.query(sql, params)
    res.json(rows)
  } catch (error) {
    console.error('Error fetching works:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/works
// @desc    Create a work
// @access  Private (Admin, Editor)
router.post('/', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  const { title, description, imageUrl, link, club } = req.body as {
    title?: string
    description?: string
    imageUrl?: string
    link?: string
    club?: string
  }
  const featuredRaw = (req.body as any)?.featured
  // 仅 admin 可设置 featured；editor 创建时强制为 0
  const featured =
    req.user?.role === 'admin'
      ? ['1', 1, true, 'true', 'True', 'TRUE'].includes(featuredRaw)
        ? 1
        : 0
      : 0

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    const userId = req.user?.id ?? null
    const [result] = await pool.query(
      'INSERT INTO works (title, description, imageUrl, link, club, featured, user_id) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [title, description, imageUrl, link, club, featured, userId],
    )
    res
      .status(201)
      .json({ message: 'Work created successfully', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating work:', error)
    if ((error as any)?.code === 'ER_BAD_FIELD_ERROR') {
      return res
        .status(500)
        .json({ error: 'Database schema outdated: missing column in works table.' })
    }
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/works/:id
// @desc    Update a work
// @access  Private (Admin, Editor)
router.put('/:id', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  const { id } = req.params
  const { title, description, imageUrl, link, club } = req.body as {
    title?: string
    description?: string
    imageUrl?: string
    link?: string
    club?: string
  }
  const featuredRaw = (req.body as any)?.featured
  // 仅 admin 可修改 featured；editor 时传入也会被忽略
  const featuredParam =
    req.user?.role === 'admin'
      ? ['1', 1, true, 'true', 'True', 'TRUE'].includes(featuredRaw)
        ? 1
        : 0
      : null

  if (!title) {
    return res.status(400).json({ error: 'Title is required' })
  }

  try {
    let sql =
      'UPDATE works SET title = ?, description = ?, imageUrl = ?, link = ?, club = ?, featured = IFNULL(?, featured) WHERE id = ?'
    const params: any[] = [title, description, imageUrl, link, club, featuredParam, id]

    // 非 admin（editor）仅能修改自己创建的记录
    if (req.user?.role !== 'admin') {
      sql += ' AND user_id = ?'
      params.push(req.user?.id)
    }

    const [result] = await pool.query(sql, params)

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Work not found or no permission' })
    }

    res.json({ message: 'Work updated successfully' })
  } catch (error) {
    console.error('Error updating work:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/works/:id
// @desc    Delete a work
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params

  try {
    const [result] = await pool.query('DELETE FROM works WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Work not found' })
    }

    res.json({ message: 'Work deleted successfully' })
  } catch (error) {
    console.error('Error deleting work:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/works/:id/featured
// @desc    Update featured flag (admin only)
// @access  Private (Admin)
router.put('/:id/featured', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params as { id: string }
  const { featured } = req.body as { featured?: any }
  const val = ['1', 1, true, 'true', 'True', 'TRUE'].includes(String(featured)) ? 1 : 0
  try {
    const [result] = await pool.query('UPDATE works SET featured = ? WHERE id = ?', [val, id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'Work not found' })
    }
    res.json({ message: 'Featured flag updated', featured: val })
  } catch (error) {
    console.error('Error updating featured:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
