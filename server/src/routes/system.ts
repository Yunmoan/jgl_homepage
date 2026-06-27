import { Router } from 'express'
import os from 'os'
import path from 'path'
import fs from 'fs'
import crypto from 'crypto'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'

const router = Router()

// Read package.json versions at start-up to avoid fs on every request
function readVersion(pkgPath: string): string | null {
  try {
    const txt = fs.readFileSync(pkgPath, 'utf-8')
    const pkg = JSON.parse(txt)
    return pkg.version || null
  } catch {
    return null
  }
}

import child_process from 'child_process'

function gitHash(cwd: string) {
  try {
    return child_process.execSync('git rev-parse --short HEAD', { cwd }).toString().trim()
  } catch {
    return null
  }
}

const backendPkgPath = path.join(__dirname, '../../package.json')
const adminPkgPath = path.join(__dirname, '../../admin-panel/package.json')
const backendVersionBase = readVersion(backendPkgPath)
const frontendVersionBase = readVersion(adminPkgPath)

const backendVersion = backendVersionBase
  ? `${backendVersionBase} (${gitHash(path.join(__dirname, '../../')) || 'unknown'})`
  : null

const frontendHash = gitHash(path.join(__dirname, '../../'))
const buildTime = new Date()
  .toISOString()
  .replace('T', ' ') // 2025-12-21 02:27:17.000Z
  .substring(0, 19)
  .replace(/-/g, '/')
const frontendVersion = frontendHash ? `Build ${frontendHash} - ${buildTime}` : null

// CPU usage tracking: compare CPU ticks between samples
let prevCpuInfo: ReturnType<typeof os.cpus> | null = null

function calcCpuUsage(): number {
  const currentCpuInfo = os.cpus()
  if (!prevCpuInfo) {
    prevCpuInfo = currentCpuInfo.map((cpu) => ({ ...cpu }))
    return 0
  }

  let totalIdle = 0
  let totalTick = 0

  for (let i = 0; i < currentCpuInfo.length; i++) {
    const prev = prevCpuInfo[i]
    const curr = currentCpuInfo[i]
    const prevTotal = Object.values(prev.times).reduce((a: number, b: number) => a + b, 0)
    const currTotal = Object.values(curr.times).reduce((a: number, b: number) => a + b, 0)
    const idleDiff = curr.times.idle - prev.times.idle
    const totalDiff = currTotal - prevTotal
    totalIdle += idleDiff
    totalTick += totalDiff
  }

  prevCpuInfo = currentCpuInfo.map((cpu) => ({ ...cpu }))

  if (totalTick === 0) return 0
  return Math.round(((totalTick - totalIdle) / totalTick) * 100)
}

router.get('/info', (_req, res) => {
  res.json({
    backendVersion,
    frontendVersion,
    node: process.version,
    platform: `${os.type()} ${os.release()}`,
    uptime: process.uptime(),
    loadavg: os.loadavg(),
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    cpus: os.cpus().length,
    cpu_usage: calcCpuUsage(),
  })
})

router.post('/page-view', async (req, res) => {
  const pathValue = typeof req.body?.path === 'string' ? req.body.path.trim().slice(0, 255) : ''
  if (!pathValue || !pathValue.startsWith('/')) {
    return res.status(400).json({ error: 'path is required' })
  }

  const referrer = typeof req.body?.referrer === 'string' ? req.body.referrer.trim().slice(0, 512) : null
  const userAgent = req.get('user-agent')?.slice(0, 255) || null
  const ipHash = crypto
    .createHash('sha256')
    .update(`${req.ip || ''}:${userAgent || ''}:${new Date().toISOString().slice(0, 10)}`)
    .digest('hex')

  try {
    await pool.query(
      'INSERT INTO page_views (path, referrer, ip_hash, user_agent) VALUES (?, ?, ?, ?)',
      [pathValue, referrer, ipHash, userAgent],
    )
    res.status(204).send()
  } catch (error) {
    console.error('Error recording page view:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

router.get('/dashboard', protect, authorize('admin', 'editor', 'member'), async (req: any, res) => {
  try {
    const isAdmin = req.user?.role === 'admin'
    const userId = req.user?.id

    const [
      [userCounts],
      [pendingUsers],
      [newsCounts],
      [messageCounts],
      [workCounts],
      [memberCounts],
      [viewCounts],
      [topPages],
      [myNewsCounts],
      [myWorkCounts],
      [myMembers],
    ] =
      await Promise.all([
        pool.query(
          `SELECT
             COUNT(*) AS total_users,
             SUM(status = 'pending') AS pending_users,
             SUM(status = 'approved') AS approved_users,
             SUM(status = 'rejected') AS rejected_users
           FROM users`,
        ),
        pool.query(
          `SELECT id, username, nickname, club_name, contact_name, contact_qq, application_reason, created_at
             FROM users
            WHERE status = 'pending'
            ORDER BY created_at ASC
            LIMIT 6`,
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total_news,
             SUM(status = 'pending') AS pending_news,
             SUM(status = 'approved') AS approved_news
           FROM news`,
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total_messages,
             SUM(status = 'pending') AS pending_messages,
             SUM(status = 'approved') AS approved_messages
           FROM messages`,
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total_works,
             SUM(featured = 1) AS featured_works
           FROM works`,
        ),
        pool.query('SELECT COUNT(*) AS total_members FROM members'),
        pool.query(
          `SELECT
             COUNT(*) AS total_views,
             SUM(viewed_at >= CURRENT_DATE()) AS today_views,
             SUM(viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)) AS week_views,
             COUNT(DISTINCT ip_hash) AS unique_visitors_7d
           FROM page_views`,
        ),
        pool.query(
          `SELECT path, COUNT(*) AS views
             FROM page_views
            WHERE viewed_at >= DATE_SUB(NOW(), INTERVAL 7 DAY)
            GROUP BY path
            ORDER BY views DESC
            LIMIT 6`,
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total_news,
             SUM(status = 'pending') AS pending_news,
             SUM(status = 'approved') AS approved_news,
             SUM(status = 'rejected') AS rejected_news
           FROM news
          WHERE user_id = ?`,
          [userId],
        ),
        pool.query(
          `SELECT
             COUNT(*) AS total_works,
             SUM(featured = 1) AS featured_works
           FROM works
          WHERE user_id = ?`,
          [userId],
        ),
        pool.query(
          `SELECT id, name, logo, link, created_at
             FROM members
            WHERE owner_user_id = ?
            ORDER BY created_at DESC
            LIMIT 4`,
          [userId],
        ),
      ])

    res.json({
      role: req.user?.role,
      users: Array.isArray(userCounts) ? userCounts[0] : {},
      pendingUsers: isAdmin ? (pendingUsers as any[]) : [],
      news: Array.isArray(newsCounts) ? newsCounts[0] : {},
      messages: Array.isArray(messageCounts) ? messageCounts[0] : {},
      works: Array.isArray(workCounts) ? workCounts[0] : {},
      members: Array.isArray(memberCounts) ? memberCounts[0] : {},
      analytics: Array.isArray(viewCounts) ? viewCounts[0] : {},
      topPages: topPages as any[],
      mine: {
        news: Array.isArray(myNewsCounts) ? myNewsCounts[0] : {},
        works: Array.isArray(myWorkCounts) ? myWorkCounts[0] : {},
        members: myMembers as any[],
      },
      server: isAdmin
        ? {
            uptime: process.uptime(),
            loadavg: os.loadavg(),
            cpu_usage: calcCpuUsage(),
            freemem: os.freemem(),
            totalmem: os.totalmem(),
          }
        : undefined,
    })
  } catch (error) {
    console.error('Error loading dashboard data:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
