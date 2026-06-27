import { Router } from 'express'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'
import { RowDataPacket } from 'mysql2'
import multer from 'multer'
import path from 'path'
import fs from 'fs/promises'
import sharp from 'sharp'
import { cleanString, requiredString } from '../utils/input'

const router = Router()

// @route   GET /api/members
// @desc    Get all members with pagination support
// @access  Public
// @query   page - Page number (default: 1)
// @query   limit - Items per page (default: 18)
router.get('/', async (req, res) => {
  try {
    const page = Math.max(1, parseInt(req.query.page as string) || 1)
    const limit = Math.max(1, Math.min(100, parseInt(req.query.limit as string) || 18)) // Max 100 items per page
    const keyword = typeof req.query.keyword === 'string' ? req.query.keyword.trim() : ''
    const offset = (page - 1) * limit
    const where = keyword ? 'WHERE m.name LIKE ? OR m.link LIKE ?' : ''
    const keywordParams = keyword ? [`%${keyword}%`, `%${keyword}%`] : []

    const [countResult] = await pool.query<RowDataPacket[]>(
      `SELECT COUNT(*) as total FROM members m ${where}`,
      keywordParams,
    )
    const total = countResult[0].total

    const [rows] = await pool.query(
      `SELECT m.*, u.username AS owner_username, COALESCE(u.nickname, u.club_name, u.username) AS owner_label
         FROM members m
         LEFT JOIN users u ON u.id = m.owner_user_id
         ${where}
        ORDER BY m.name ASC LIMIT ? OFFSET ?`,
      [...keywordParams, limit, offset],
    )

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
  const { name, logo, link, ownerUserId } = req.body
  const safeName = requiredString(name)

  if (!safeName) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    const [result] = await pool.query('INSERT INTO members (name, logo, link, owner_user_id) VALUES (?, ?, ?, ?)', [
      safeName,
      cleanString(logo),
      cleanString(link),
      ownerUserId || null,
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
router.put('/:id', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  const { id } = req.params
  const { name, logo, link, ownerUserId } = req.body
  const safeName = requiredString(name)

  if (!safeName) {
    return res.status(400).json({ error: 'Name is required' })
  }

  try {
    if (req.user?.role === 'member') {
      const [ownedRows] = await pool.query(
        'SELECT id FROM members WHERE id = ? AND owner_user_id = ? LIMIT 1',
        [id, req.user.id],
      )
      if (!Array.isArray(ownedRows) || ownedRows.length === 0) {
        return res.status(404).json({ error: 'Member not found or no permission' })
      }
    }

    const adminFields = req.user?.role === 'admin' ? ', owner_user_id = ?' : ''
    const params: unknown[] = [safeName, cleanString(logo), cleanString(link)]
    if (req.user?.role === 'admin') {
      params.push(ownerUserId || null)
    }
    params.push(id)

    const [result] = await pool.query(
      `UPDATE members SET name = ?, logo = ?, link = ?${adminFields} WHERE id = ?`,
      params,
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

// @route   GET /api/members/mine
// @desc    Get member records owned by current account
// @access  Private (Member)
router.get('/mine', protect as any, authorize('member') as any, async (req: any, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT m.*, u.username AS owner_username, COALESCE(u.nickname, u.club_name, u.username) AS owner_label
         FROM members m
         LEFT JOIN users u ON u.id = m.owner_user_id
        WHERE m.owner_user_id = ?
        ORDER BY m.name ASC`,
      [req.user.id],
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching owned members:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: (_req, file, cb) => {
    const allowed = ['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'image/bmp', 'image/tiff']
    if (!allowed.includes(file.mimetype)) {
      cb(new Error('Unsupported file type'))
      return
    }
    cb(null, true)
  },
})

const CIRCULAR_DIR = path.join(__dirname, '../../uploads/member_logos_circular')

// @route   POST /api/members/upload-logo
// @desc    Upload and process a member logo: convert to WebP, circular mask, save to member_logos_circular
// @access  Private (Admin, Editor)
router.post(
  '/upload-logo',
  protect as any,
  authorize('admin', 'editor', 'member') as any,
  upload.single('image'),
  async (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload an image' })
    }

    const { memberName } = req.body
    if (!memberName || !memberName.trim()) {
      return res.status(400).json({ message: 'memberName is required' })
    }

    const name = memberName.trim()
    const safeName = name.replace(/[<>:"/\\|?*\x00-\x1f]/g, '_')

    try {
      await fs.mkdir(CIRCULAR_DIR, { recursive: true })

      const buffer = req.file.buffer

      // Get original image dimensions
      const originalMeta = await sharp(buffer).metadata()
      const origW = originalMeta.width || 100
      const origH = originalMeta.height || 100

      // Use the larger dimension to create a square canvas, then apply circular mask
      const size = Math.max(origW, origH)
      const diameter = size

      // Create circular alpha mask centered on the original image
      const alpha = Buffer.alloc(diameter * diameter)
      for (let y = 0; y < diameter; y++) {
        for (let x = 0; x < diameter; x++) {
          const cx = (diameter - 1) / 2
          const cy = (diameter - 1) / 2
          const r = size / 2
          const dx = x - cx
          const dy = y - cy
          alpha[y * diameter + x] = dx * dx + dy * dy <= r * r ? 255 : 0
        }
      }

      // Convert to WebP with circular alpha mask
      const withAlpha = await sharp(buffer)
        .resize(size, size, { fit: 'contain', position: 'center', background: { r: 0, g: 0, b: 0, alpha: 0 } })
        .joinChannel(alpha, { raw: { width: diameter, height: diameter, channels: 1 } })
        .webp({ quality: 80 })
        .toBuffer()

      const filename = `${safeName}.webp`
      const filepath = path.join(CIRCULAR_DIR, filename)
      await fs.writeFile(filepath, withAlpha)

      const filePath = `/uploads/member_logos_circular/${filename}`
      res.json({ message: 'Logo uploaded and processed successfully', filePath })
    } catch (error: any) {
      console.error('Error processing member logo:', error)
      res.status(500).json({ message: `Failed to process logo: ${error.message}` })
    }
  },
)

// @route   DELETE /api/members/logo
// @desc    Delete a member logo file
// @access  Private (Admin, Editor)
router.delete('/logo', protect as any, authorize('admin', 'editor') as any, async (req, res) => {
  const { filepath } = req.body
  if (!filepath) {
    return res.status(400).json({ message: 'filepath is required' })
  }
  const normalized = filepath.replace(/^\//, '')
  const fullPath = path.join(__dirname, '../../', normalized)
  try {
    await fs.unlink(fullPath)
    res.json({ message: 'Logo deleted successfully' })
  } catch (error: any) {
    if (error.code === 'ENOENT') {
      return res.status(404).json({ message: 'File not found' })
    }
    console.error('Error deleting logo:', error)
    res.status(500).json({ message: 'Failed to delete logo' })
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
