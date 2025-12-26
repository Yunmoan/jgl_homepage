import { Router } from 'express'
import pool from '../db'
import bcrypt from 'bcryptjs'
import { protect, authorize } from '../middleware/auth'

const router = Router()

// @route   GET /api/users/me
// @desc    Get my profile
// @access  Private
router.get('/me', protect, async (req: any, res) => {
  try {
    const userId = req.user.id
    const [rows] = await pool.query<any[]>(
      'SELECT id, username, role, nickname, created_at FROM users WHERE id = ?',
      [userId],
    )
    const me = Array.isArray(rows) ? rows[0] : undefined
    if (!me) return res.status(404).json({ error: 'User not found' })
    res.json(me)
  } catch (e) {
    console.error('Error fetching me:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/users/me/profile
// @desc    Update my profile fields (currently nickname)
// @access  Private
router.put('/me/profile', protect, async (req: any, res) => {
  const { nickname } = req.body as { nickname?: string }
  try {
    await pool.query('UPDATE users SET nickname = ? WHERE id = ?', [nickname ?? null, req.user.id])
    res.json({ message: 'Profile updated' })
  } catch (e) {
    console.error('Error updating my profile:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/users/:id/profile
// @desc    Admin updates a user's profile (username, nickname)
// @access  Private (Admin)
router.put('/:id/profile', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { username, nickname } = req.body as { username?: string; nickname?: string }

  if (username && username.trim() === '') {
    return res.status(400).json({ error: 'username cannot be empty' })
  }

  try {
    // If username is to be updated, check for duplicates first
    if (username) {
      const [dupRows] = await pool.query('SELECT id FROM users WHERE username = ? AND id <> ?', [
        username,
        id,
      ])
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        return res.status(409).json({ error: 'Username already exists' })
      }
    }

    // Build dynamic SET clause
    const updates: string[] = []
    const params: any[] = []
    if (username !== undefined) {
      updates.push('username = ?')
      params.push(username)
    }
    if (nickname !== undefined) {
      updates.push('nickname = ?')
      params.push(nickname ?? null)
    }

    if (updates.length === 0) {
      return res.status(400).json({ error: 'No fields to update' })
    }

    params.push(id)
    const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User profile updated' })
  } catch (e: any) {
    console.error('Error updating user profile:', e)
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const [rows] = await pool.query(
      'SELECT id, username, role, nickname, created_at FROM users ORDER BY id ASC',
    )
    res.json(rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req, res) => {
  const { username, password, role, nickname } = req.body as {
    username?: string
    password?: string
    role?: string
    nickname?: string
  }

  if (!username || !password || !role) {
    return res.status(400).json({ error: 'Username, password, and role are required' })
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const [result] = await pool.query(
      'INSERT INTO users (username, password, role, nickname) VALUES (?, ?, ?, ?)',
      [username, hashedPassword, role, nickname ?? null],
    )
    res
      .status(201)
      .json({ message: 'User created successfully', insertId: (result as any).insertId })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: 'Username already exists' })
    }
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/users/:id/role
// @desc    Update a user's role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { role } = req.body as { role?: string }

  if (!role || !['admin', 'editor', 'viewer', 'member'].includes(role)) {
    return res.status(400).json({ error: 'Valid role is required' })
  }

  try {
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User role updated successfully' })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/users/me/password
// @desc    Change my password (requires oldPassword)
// @access  Private (Self)
router.put('/me/password', protect, async (req: any, res) => {
  const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: 'oldPassword and newPassword are required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const userId = req.user.id
    const [rows] = await pool.query<any[]>('SELECT id, password FROM users WHERE id = ?', [userId])
    const user = Array.isArray(rows) ? rows[0] : undefined
    if (!user) return res.status(404).json({ error: 'User not found' })

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) return res.status(401).json({ error: 'Old password is incorrect' })

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId])
    res.json({ message: 'Password updated successfully' })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   PUT /api/users/:id/password
// @desc    Admin reset a user's password (no oldPassword required)
// @access  Private (Admin)
router.put('/:id/password', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { newPassword } = req.body as { newPassword?: string }

  if (!newPassword) {
    return res.status(400).json({ error: 'newPassword is required' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: 'Password must be at least 6 characters' })
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE id = ?', [id])
    if (Array.isArray(exists) && exists.length === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id])
    res.json({ message: 'Password reset successfully' })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req: any, res) => {
  const { id } = req.params

  try {
    // Optional: prevent self-deletion to avoid locking out the last admin accidentally
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: 'You cannot delete your own account' })
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: 'User not found' })
    }

    res.json({ message: 'User deleted successfully' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

// ====================
// CSV Bulk Import
// ====================
import multer from 'multer'

// Use in-memory storage for small CSV uploads
const csvUpload = multer({ storage: multer.memoryStorage() })

// GET template CSV
router.get('/import/template', protect, authorize('admin'), (req, res) => {
  const csvTemplate = 'username,password,role,nickname\n'
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="users_template.csv"')
  res.send(csvTemplate)
})

// POST bulk import
router.post('/import', protect, authorize('admin'), csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: 'CSV file is required' })
  try {
    const content = req.file.buffer.toString('utf-8').trim()
    if (!content) return res.status(400).json({ error: 'CSV is empty' })

    const lines = content.split(/\r?\n/)
    const header = lines.shift()?.split(',') ?? []
    const requiredHeader = ['username', 'password', 'role', 'nickname']
    const headerLower = header.map((h) => h.trim().toLowerCase())
    if (requiredHeader.some((h) => !headerLower.includes(h))) {
      return res.status(400).json({ error: 'Invalid header in CSV' })
    }

    const idx = (name: string) => headerLower.indexOf(name)

    const results: { username: string; status: 'imported' | 'skipped'; reason?: string }[] = []

    for (const line of lines) {
      if (!line.trim()) continue
      const cols = line.split(',')
      const username = cols[idx('username')]?.trim()
      const password = cols[idx('password')]?.trim()
      const role = cols[idx('role')]?.trim() || 'viewer'
      const nickname = cols[idx('nickname')]?.trim() || null

      if (!username || !password) {
        results.push({ username: username || '(empty)', status: 'skipped', reason: 'Missing username/password' })
        continue
      }
      if (!['admin', 'editor', 'viewer', 'member'].includes(role)) {
        results.push({ username, status: 'skipped', reason: 'Invalid role' })
        continue
      }
      try {
        const [exist] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
        if (Array.isArray(exist) && exist.length > 0) {
          results.push({ username, status: 'skipped', reason: 'Duplicate username' })
          continue
        }
        const salt = await bcrypt.genSalt(10)
        const hashed = await bcrypt.hash(password, salt)
        await pool.query('INSERT INTO users (username, password, role, nickname) VALUES (?, ?, ?, ?)', [
          username,
          hashed,
          role,
          nickname,
        ])
        results.push({ username, status: 'imported' })
      } catch (err: any) {
        console.error('Import error for', username, err)
        results.push({ username, status: 'skipped', reason: err.message || 'Error' })
      }
    }

    const imported = results.filter((r) => r.status === 'imported').length
    const skipped = results.length - imported

    res.json({ imported, skipped, details: results })
  } catch (e) {
    console.error('CSV import error:', e)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
