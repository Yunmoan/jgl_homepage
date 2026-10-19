import { Router } from 'express'
import pool from '../db'
import bcrypt from 'bcryptjs'
import multer from 'multer'
import { protect, authorize } from '../middleware/auth'
import { cleanString, isOneOf, isValidUsername, usernameRuleText } from '../utils/input'

const router = Router()

const roles = ['admin', 'editor', 'viewer', 'member'] as const
const approvalRoles = ['member', 'editor', 'admin'] as const
const statuses = ['pending', 'approved', 'rejected', 'disabled', 'withdrawn'] as const
const reviewStatuses = ['approved', 'rejected', 'disabled', 'withdrawn'] as const
const csvUpload = multer({ storage: multer.memoryStorage() })

const userSelectFields = `id, username, role, nickname, club_name, club_logo, club_link, contact_name, contact_qq, club_group_qq,
              application_reason, status, review_note, reviewed_by, reviewed_at, created_at`

const userProfileFieldMap = {
  nickname: 'nickname',
  clubName: 'club_name',
  clubLogo: 'club_logo',
  clubLink: 'club_link',
  clubGroupQQ: 'club_group_qq',
  contactName: 'contact_name',
  contactQQ: 'contact_qq',
  applicationReason: 'application_reason',
} as const

const buildProfileUpdates = (body: Record<string, unknown>) => {
  const updates: string[] = []
  const params: unknown[] = []

  Object.entries(userProfileFieldMap).forEach(([bodyKey, columnName]) => {
    if (bodyKey in body) {
      updates.push(`${columnName} = ?`)
      params.push(cleanString(body[bodyKey]))
    }
  })

  return { updates, params }
}

const syncApprovedClubMember = async (connection: any, userId: string | number) => {
  const [rows] = await connection.query(
    'SELECT club_name, club_logo, club_link FROM users WHERE id = ?',
    [userId],
  )
  const user = Array.isArray(rows) ? rows[0] : null
  const clubName = cleanString(user?.club_name)
  if (!clubName) return

  const logo = cleanString(user?.club_logo)
  const link = cleanString(user?.club_link)
  const [existing] = await connection.query('SELECT id FROM members WHERE name = ? LIMIT 1', [
    clubName,
  ])

  if (Array.isArray(existing) && existing.length > 0) {
    await connection.query('UPDATE members SET logo = ?, link = ?, owner_user_id = ? WHERE id = ?', [
      logo,
      link,
      userId,
      existing[0].id,
    ])
    return
  }

  await connection.query('INSERT INTO members (name, logo, link, owner_user_id) VALUES (?, ?, ?, ?)', [
    clubName,
    logo,
    link,
    userId,
  ])
}

// @route   GET /api/users/me
// @desc    Get my profile
// @access  Private
router.get('/me', protect, async (req: any, res) => {
  try {
    const userId = req.user.id
    const [rows] = await pool.query<any[]>(
      `SELECT ${userSelectFields}
         FROM users
        WHERE id = ?`,
      [userId],
    )
    const me = Array.isArray(rows) ? rows[0] : undefined
    if (!me) return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    res.json(me)
  } catch (e) {
    console.error('Error fetching me:', e)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/me/profile
// @desc    Update my profile fields
// @access  Private
router.put('/me/profile', protect, async (req: any, res) => {
  const { updates, params } = buildProfileUpdates(req.body)

  if (!updates.length) {
    return res.status(400).json({ error: '没有可保存的修改，请检查填写内容' })
  }

  try {
    params.push(req.user.id)
    await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)
    res.json({ message: '个人资料已保存' })
  } catch (e) {
    console.error('Error updating my profile:', e)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/me/application
// @desc    Update my pending, rejected, or withdrawn application fields
// @access  Private (Self)
router.put('/me/application', protect, async (req: any, res) => {
  const { updates, params } = buildProfileUpdates(req.body)
  const safeClubName = cleanString(req.body?.clubName)
  const safeContactName = cleanString(req.body?.contactName)
  const safeClubLogo = cleanString(req.body?.clubLogo)

  if (!updates.length) {
    return res.status(400).json({ error: '没有可保存的修改，请检查填写内容' })
  }
  if (!safeClubName || !safeContactName || !safeClubLogo) {
    return res.status(400).json({ error: '请填写社团名称和联系人，并上传社团 Logo' })
  }

  try {
    params.push(req.user.id)
    const [result] = await pool.query(
      `UPDATE users
          SET ${updates.join(', ')},
              status = CASE WHEN status IN ('withdrawn', 'rejected') THEN 'pending' ELSE status END,
              review_note = CASE WHEN status IN ('withdrawn', 'rejected') THEN NULL ELSE review_note END,
              reviewed_at = CASE WHEN status IN ('withdrawn', 'rejected') THEN NULL ELSE reviewed_at END
        WHERE id = ? AND status IN ('pending', 'rejected', 'withdrawn')`,
      params,
    )
    if ((result as any).affectedRows === 0) {
      return res.status(403).json({ error: '当前申请状态不支持修改资料，请刷新页面确认审核结果' })
    }
    res.json({ message: '申请资料已保存，请等待管理员审核' })
  } catch (e) {
    console.error('Error updating my application:', e)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/me/application/withdraw
// @desc    Withdraw my pending application
// @access  Private (Self)
router.put('/me/application/withdraw', protect, async (req: any, res) => {
  try {
    const [result] = await pool.query(
      `UPDATE users
          SET status = 'withdrawn',
              review_note = '申请人主动撤回',
              reviewed_at = NOW()
        WHERE id = ? AND status = 'pending'`,
      [req.user.id],
    )
    if ((result as any).affectedRows === 0) {
      return res.status(403).json({ error: '只有待审核的申请可以撤回，请刷新页面确认当前状态' })
    }
    res.json({ message: '申请已撤回，修改资料后可重新提交' })
  } catch (e) {
    console.error('Error withdrawing my application:', e)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/:id/profile
// @desc    Admin updates a user's profile
// @access  Private (Admin)
router.put('/:id/profile', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { username } = req.body as {
    username?: string
  }

  if (username !== undefined && !cleanString(username)) {
    return res.status(400).json({ error: '账号不能为空，请输入账号' })
  }
  const safeUsername = cleanString(username)
  if (safeUsername && !isValidUsername(safeUsername)) {
    return res.status(400).json({ error: usernameRuleText })
  }

  try {
    if (safeUsername) {
      const [dupRows] = await pool.query('SELECT id FROM users WHERE username = ? AND id <> ?', [
        safeUsername,
        id,
      ])
      if (Array.isArray(dupRows) && dupRows.length > 0) {
        return res.status(409).json({ error: '该账号已被使用，请更换账号' })
      }
    }

    const updates: string[] = []
    const params: unknown[] = []

    if (safeUsername) {
      updates.push('username = ?')
      params.push(safeUsername)
    }
    const profileUpdates = buildProfileUpdates(req.body)
    updates.push(...profileUpdates.updates)
    params.push(...profileUpdates.params)

    if (updates.length === 0) {
      return res.status(400).json({ error: '没有可保存的修改，请检查填写内容' })
    }

    params.push(id)
    const [result] = await pool.query(`UPDATE users SET ${updates.join(', ')} WHERE id = ?`, params)

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '账号资料已保存' })
  } catch (e: any) {
    console.error('Error updating user profile:', e)
    if (e && e.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '该账号已被使用，请更换账号' })
    }
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   GET /api/users
// @desc    Get all users
// @access  Private (Admin)
router.get('/', protect, authorize('admin'), async (req, res) => {
  try {
    const { status } = req.query as { status?: string }
    const params: any[] = []
    let sql =
      `SELECT ${userSelectFields}
         FROM users`

    if (isOneOf(status, statuses)) {
      sql += ' WHERE status = ?'
      params.push(status)
    }

    sql += " ORDER BY FIELD(status, 'pending', 'rejected', 'withdrawn', 'approved', 'disabled'), created_at DESC"

    const [rows] = await pool.query(sql, params)
    res.json(rows)
  } catch (error) {
    console.error('Error fetching users:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   POST /api/users
// @desc    Create a new user
// @access  Private (Admin)
router.post('/', protect, authorize('admin'), async (req: any, res) => {
  const {
    username,
    password,
    role,
    nickname,
    clubName,
    clubLogo,
    clubLink,
    clubGroupQQ,
    contactName,
    contactQQ,
    applicationReason,
    status = 'approved',
  } = req.body as {
    username?: string
    password?: string
    role?: string
    nickname?: string
    clubName?: string
    clubLogo?: string
    clubLink?: string
    clubGroupQQ?: string
    contactName?: string
    contactQQ?: string
    applicationReason?: string
    status?: string
  }

  const safeUsername = cleanString(username)

  if (!safeUsername || !password || !role) {
    return res.status(400).json({ error: '请填写账号、初始密码并选择角色' })
  }
  if (!isValidUsername(safeUsername)) {
    return res.status(400).json({ error: usernameRuleText })
  }
  if (password.length < 8) {
    return res.status(400).json({ error: '密码至少需要 8 位' })
  }
  if (!isOneOf(role, roles)) {
    return res.status(400).json({ error: '请选择有效的账号角色' })
  }
  if (!isOneOf(status, statuses)) {
    return res.status(400).json({ error: '请选择有效的状态' })
  }

  try {
    const [existing] = await pool.query('SELECT id FROM users WHERE username = ?', [safeUsername])
    if (Array.isArray(existing) && existing.length > 0) {
      return res.status(409).json({ error: '该账号已被使用，请更换账号' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    const [result] = await pool.query(
      `INSERT INTO users (
        username,
        password,
        role,
        nickname,
        club_name,
        club_logo,
        club_link,
        contact_name,
        contact_qq,
        club_group_qq,
        application_reason,
        status,
        reviewed_by,
        reviewed_at
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())`,
      [
        safeUsername,
        hashedPassword,
        role,
        cleanString(nickname),
        cleanString(clubName),
        cleanString(clubLogo),
        cleanString(clubLink),
        cleanString(contactName),
        cleanString(contactQQ),
        cleanString(clubGroupQQ),
        cleanString(applicationReason),
        status,
        req.user?.id ?? null,
      ],
    )
    res.status(201).json({ message: '账号已新增', insertId: (result as any).insertId })
  } catch (error: any) {
    console.error('Error creating user:', error)
    if (error && error.code === 'ER_DUP_ENTRY') {
      return res.status(409).json({ error: '该账号已被使用，请更换账号' })
    }
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/:id/review
// @desc    Review a pending account
// @access  Private (Admin)
router.put('/:id/review', protect, authorize('admin'), async (req: any, res) => {
  const { id } = req.params
  const { status, reviewNote, role } = req.body as { status?: string; reviewNote?: string; role?: string }

  if (!isOneOf(status, reviewStatuses)) {
    return res.status(400).json({ error: '请选择通过、驳回、停用或撤回状态' })
  }
  if (status === 'approved' && role !== undefined && !isOneOf(role, approvalRoles)) {
    return res.status(400).json({ error: '请为审核通过的账号选择成员、编辑员或管理员角色' })
  }

  const connection = await pool.getConnection()
  try {
    await connection.beginTransaction()

    const nextRole = status === 'approved' ? role || 'member' : 'viewer'
    const [result] = await connection.query(
      `UPDATE users
          SET status = ?,
              review_note = ?,
              reviewed_by = ?,
              reviewed_at = NOW(),
              role = ?
        WHERE id = ?`,
      [status, cleanString(reviewNote), req.user.id, nextRole, id],
    )

    if ((result as any).affectedRows === 0) {
      await connection.rollback()
      return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    }

    if (status === 'approved') {
      await syncApprovedClubMember(connection, id)
    }

    await connection.commit()
    res.json({ message: '账号审核结果已保存' })
  } catch (error) {
    await connection.rollback()
    console.error('Error updating user review:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  } finally {
    connection.release()
  }
})

// @route   PUT /api/users/:id/role
// @desc    Update a user's role
// @access  Private (Admin)
router.put('/:id/role', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { role } = req.body as { role?: string }

  if (!isOneOf(role, roles)) {
    return res.status(400).json({ error: '请选择有效的账号角色' })
  }

  try {
    const [result] = await pool.query('UPDATE users SET role = ? WHERE id = ?', [role, id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '账号角色已更新' })
  } catch (error) {
    console.error('Error updating user role:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/me/password
// @desc    Change my password (requires oldPassword)
// @access  Private (Self)
router.put('/me/password', protect, async (req: any, res) => {
  const { oldPassword, newPassword } = req.body as { oldPassword?: string; newPassword?: string }

  if (!oldPassword || !newPassword) {
    return res.status(400).json({ error: '请输入原密码和新密码' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要 6 位' })
  }

  try {
    const userId = req.user.id
    const [rows] = await pool.query<any[]>('SELECT id, password FROM users WHERE id = ?', [userId])
    const user = Array.isArray(rows) ? rows[0] : undefined
    if (!user) return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })

    const isMatch = await bcrypt.compare(oldPassword, user.password)
    if (!isMatch) return res.status(400).json({ error: '原密码不正确，请检查后重试' })

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, userId])
    res.json({ message: '密码已修改，下次登录请使用新密码' })
  } catch (error) {
    console.error('Error updating password:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/users/:id/password
// @desc    Admin reset a user's password (no oldPassword required)
// @access  Private (Admin)
router.put('/:id/password', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params
  const { newPassword } = req.body as { newPassword?: string }

  if (!newPassword) {
    return res.status(400).json({ error: '请输入新密码' })
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: '新密码至少需要 6 位' })
  }

  try {
    const [exists] = await pool.query('SELECT id FROM users WHERE id = ?', [id])
    if (Array.isArray(exists) && exists.length === 0) {
      return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(newPassword, salt)
    await pool.query('UPDATE users SET password = ? WHERE id = ?', [hashedPassword, id])
    res.json({ message: '密码已重置，请通知账号使用者使用新密码登录' })
  } catch (error) {
    console.error('Error resetting password:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   DELETE /api/users/:id
// @desc    Delete a user
// @access  Private (Admin)
router.delete('/:id', protect, authorize('admin'), async (req: any, res) => {
  const { id } = req.params

  try {
    if (Number(id) === req.user.id) {
      return res.status(400).json({ error: '无法删除当前登录的账号' })
    }

    const [result] = await pool.query('DELETE FROM users WHERE id = ?', [id])

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该账号不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '账号已删除' })
  } catch (error) {
    console.error('Error deleting user:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// GET template CSV
router.get('/import/template', protect, authorize('admin'), (_req, res) => {
  const csvTemplate = 'username,password,role,nickname,club_name,contact_name,contact_qq,application_reason,status\n'
  res.setHeader('Content-Type', 'text/csv')
  res.setHeader('Content-Disposition', 'attachment; filename="users_template.csv"')
  res.send(csvTemplate)
})

// POST bulk import
router.post('/import', protect, authorize('admin'), csvUpload.single('file'), async (req, res) => {
  if (!req.file) return res.status(400).json({ error: '请先选择 CSV 文件' })
  try {
    const content = req.file.buffer.toString('utf-8').trim()
    if (!content) return res.status(400).json({ error: 'CSV 文件中没有内容，请检查后重新上传' })

    const lines = content.split(/\r?\n/)
    const header = lines.shift()?.split(',') ?? []
    const requiredHeader = ['username', 'password', 'role', 'nickname']
    const headerLower = header.map((h) => h.trim().toLowerCase())
    if (requiredHeader.some((h) => !headerLower.includes(h))) {
      return res.status(400).json({ error: 'CSV 表头不正确，请下载模板并按模板填写' })
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
      const clubName = cols[idx('club_name')]?.trim() || null
      const contactName = cols[idx('contact_name')]?.trim() || null
      const contactQQ = cols[idx('contact_qq')]?.trim() || null
      const clubGroupQQ = cols[idx('club_group_qq')]?.trim() || null
      const applicationReason = cols[idx('application_reason')]?.trim() || null
      const status = cols[idx('status')]?.trim() || 'approved'

      if (!username || !password) {
        results.push({
          username: username || '（未填写）',
          status: 'skipped',
          reason: '缺少账号或密码',
        })
        continue
      }
      if (!isValidUsername(username)) {
        results.push({ username, status: 'skipped', reason: usernameRuleText })
        continue
      }
      if (password.length < 8) {
        results.push({ username, status: 'skipped', reason: '密码至少需要 8 位' })
        continue
      }
      if (!isOneOf(role, roles)) {
        results.push({ username, status: 'skipped', reason: '账号角色无效' })
        continue
      }
      if (!isOneOf(status, statuses)) {
        results.push({ username, status: 'skipped', reason: '请选择有效的状态' })
        continue
      }

      try {
        const [exist] = await pool.query('SELECT id FROM users WHERE username = ?', [username])
        if (Array.isArray(exist) && exist.length > 0) {
          results.push({ username, status: 'skipped', reason: '账号已存在，本条记录已跳过' })
          continue
        }
        const salt = await bcrypt.genSalt(10)
        const hashed = await bcrypt.hash(password, salt)
        await pool.query(
          `INSERT INTO users (
            username,
            password,
            role,
            nickname,
            club_name,
            contact_name,
            contact_qq,
            club_group_qq,
            application_reason,
            status
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
          [
            username,
            hashed,
            role,
            nickname,
            clubName,
            contactName,
            contactQQ,
            clubGroupQQ,
            applicationReason,
            status,
          ],
        )
        results.push({ username, status: 'imported' })
      } catch (err: any) {
        console.error('Import error for', username, err)
        results.push({ username, status: 'skipped', reason: '本条账号导入失败，请检查资料后重试' })
      }
    }

    const imported = results.filter((r) => r.status === 'imported').length
    const skipped = results.length - imported

    res.json({ imported, skipped, details: results })
  } catch (e) {
    console.error('CSV import error:', e)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

export default router
