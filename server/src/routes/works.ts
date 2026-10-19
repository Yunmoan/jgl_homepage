import { Router } from 'express'
import pool from '../db'
import { protect, authorize, optionalAuth } from '../middleware/auth'
import { parseBooleanFlag } from '../utils/input'

const router = Router()
const workStatuses = ['pending', 'approved', 'rejected'] as const
type WorkStatus = (typeof workStatuses)[number]

function cleanString(value: unknown) {
  return typeof value === 'string' ? value.trim() : ''
}

function isWorkStatus(value: unknown): value is WorkStatus {
  return typeof value === 'string' && workStatuses.includes(value as WorkStatus)
}

async function getOwnedClubNames(userId: number) {
  const [rows] = await pool.query<any[]>(
    'SELECT name FROM members WHERE owner_user_id = ? ORDER BY id ASC',
    [userId],
  )
  if (!Array.isArray(rows)) return []
  return rows.map((row) => cleanString(row?.name)).filter(Boolean)
}

async function resolveMemberClub(userId: number, requestedClub: unknown) {
  const ownedClubs = await getOwnedClubNames(userId)
  const club = cleanString(requestedClub) || ownedClubs[0]
  return club || null
}

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

    const user = req.user
    if (!user) {
      clauses.push("w.status = 'approved'")
    } else if (user.role !== 'admin') {
      clauses.push('w.user_id = ?')
      params.push(user.id)
    }

    if (club) {
      clauses.push('w.club = ?')
      params.push(club)
    }
    if (typeof featured !== 'undefined') {
      const val = parseBooleanFlag(featured)
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
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
  const requestedStatus = isWorkStatus((req.body as any)?.status) ? ((req.body as any).status as WorkStatus) : null
  // 仅 admin 可设置 featured；editor 创建时强制为 0
  const featured = req.user?.role === 'admin' ? parseBooleanFlag(featuredRaw) : 0

  if (!title) {
    return res.status(400).json({ error: '请填写标题' })
  }

  try {
    const userId = req.user?.id ?? null
    let finalClub = cleanString(club)
    if (req.user?.role === 'member') {
      finalClub = (await resolveMemberClub(req.user.id, club)) || ''
    }
    if (!finalClub) {
      return res.status(400).json({ error: '请选择或填写作品所属社团' })
    }
    const status = req.user?.role === 'admin' ? requestedStatus || 'approved' : 'pending'
    const [result] = await pool.query(
      'INSERT INTO works (title, description, imageUrl, link, club, featured, status, user_id, reviewed_by, reviewed_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)',
      [
        title,
        description,
        imageUrl,
        link,
        finalClub,
        featured,
        status,
        userId,
        status === 'approved' ? req.user.id : null,
        status === 'approved' ? new Date() : null,
      ],
    )
    res
      .status(201)
      .json({ message: '作品已提交', insertId: (result as any).insertId })
  } catch (error) {
    console.error('Error creating work:', error)
    if ((error as any)?.code === 'ER_BAD_FIELD_ERROR') {
      return res
        .status(500)
        .json({ error: '作品服务暂时不可用，请联系管理员检查服务配置' })
    }
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
  const featuredParam = req.user?.role === 'admin' ? parseBooleanFlag(featuredRaw) : null
  const requestedStatus = isWorkStatus((req.body as any)?.status) ? ((req.body as any).status as WorkStatus) : null

  if (!title) {
    return res.status(400).json({ error: '请填写标题' })
  }

  try {
    let finalClub = cleanString(club)
    if (req.user?.role === 'member') {
      finalClub = (await resolveMemberClub(req.user.id, club)) || ''
    }
    if (!finalClub) {
      return res.status(400).json({ error: '请选择或填写作品所属社团' })
    }
    const isAdmin = req.user?.role === 'admin'
    const statusParam = isAdmin ? requestedStatus : 'pending'
    let sql =
      `UPDATE works
          SET title = ?,
              description = ?,
              imageUrl = ?,
              link = ?,
              club = ?,
              featured = IFNULL(?, featured),
              status = ${isAdmin ? 'IFNULL(?, status)' : '?'},
              reviewed_by = ${
                isAdmin ? 'CASE WHEN ? IS NULL THEN reviewed_by ELSE ? END' : 'NULL'
              },
              reviewed_at = ${
                isAdmin ? 'CASE WHEN ? IS NULL THEN reviewed_at ELSE NOW() END' : 'NULL'
              }
        WHERE id = ?`
    const params: any[] = [
      title,
      description,
      imageUrl,
      link,
      finalClub,
      featuredParam,
      statusParam,
    ]
    if (isAdmin) {
      params.push(statusParam, req.user?.id ?? null, statusParam)
    }
    params.push(id)

    if (req.user?.role !== 'admin') {
      sql += ' AND user_id = ?'
      params.push(req.user?.id)
    }

    const [result] = await pool.query(sql, params)

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该作品不存在，或当前账号没有编辑权限' })
    }

    res.json({ message: '作品已保存' })
  } catch (error) {
    console.error('Error updating work:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/works/:id/status
// @desc    Review a work
// @access  Private (Admin)
router.put('/:id/status', protect, authorize('admin'), async (req: any, res) => {
  const { id } = req.params
  const { status } = req.body as { status?: string }

  if (!isWorkStatus(status)) {
    return res.status(400).json({ error: '请选择待审核、通过或驳回状态' })
  }

  try {
    const [result] = await pool.query(
      `UPDATE works
          SET status = ?,
              reviewed_by = ?,
              reviewed_at = NOW()
        WHERE id = ?`,
      [status, req.user.id, id],
    )

    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该作品不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '作品审核状态已更新', status })
  } catch (error) {
    console.error('Error updating work status:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
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
      return res.status(404).json({ error: '该作品不存在或已被删除，请刷新列表' })
    }

    res.json({ message: '作品已删除' })
  } catch (error) {
    console.error('Error deleting work:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

// @route   PUT /api/works/:id/featured
// @desc    Update featured flag (admin only)
// @access  Private (Admin)
router.put('/:id/featured', protect, authorize('admin'), async (req, res) => {
  const { id } = req.params as { id: string }
  const { featured } = req.body as { featured?: any }
  const val = parseBooleanFlag(featured)
  try {
    const [result] = await pool.query('UPDATE works SET featured = ? WHERE id = ?', [val, id])
    if ((result as any).affectedRows === 0) {
      return res.status(404).json({ error: '该作品不存在或已被删除，请刷新列表' })
    }
    res.json({ message: '作品精选状态已更新', featured: val })
  } catch (error) {
    console.error('Error updating featured:', error)
    res.status(500).json({ error: '服务暂时不可用，请稍后重试' })
  }
})

export default router
