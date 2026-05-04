import express from 'express'
import cors from 'cors'
import config from './config'
import pool from './db'
import authRoutes from './routes/auth'
import newsRoutes from './routes/news'
import membersRoutes from './routes/members'
import friendLinksRoutes from './routes/friendLinks'
import worksRoutes from './routes/works'
import historyRoutes from './routes/history'
import adminHistoryRoutes from './routes/adminHistory'
import fameMembersRoutes from './routes/fameMembers'
import messagesRoutes from './routes/messages'
import usersRoutes from './routes/users'
import uploadRoutes from './routes/upload'
import announcementsRoutes from './routes/announcements'
import systemRoutes from './routes/system'
import path from 'path'
import { requestLogger, errorLogger, log } from './logger'
import os from 'os'

const app = express()
const port = config.server.port

// If running behind a reverse proxy (e.g., Nginx), enable trust proxy so req.ip works correctly
// and libraries like express-rate-limit can safely use X-Forwarded-For
app.set('trust proxy', 1)

app.use(cors())
app.use(requestLogger)
app.use(express.json({ limit: '10mb' }))
const staticPath = path.join(__dirname, '../uploads')
console.log(`[DEBUG] Static file middleware: serving from=${staticPath}`)
app.use('/uploads', express.static(staticPath))

// Auth routes
app.use('/api/auth', authRoutes)

// News routes
app.use('/api/news', newsRoutes)

// Members routes
app.use('/api/members', membersRoutes)

// Friend Links routes
app.use('/api/friend-links', friendLinksRoutes)

// Works routes
app.use('/api/works', worksRoutes)

// History routes
app.use('/api/history', historyRoutes)

// Admin History routes
app.use('/api/admin-history', adminHistoryRoutes)

// Fame Members routes
app.use('/api/fame-members', fameMembersRoutes)

// Messages routes
app.use('/api/messages', messagesRoutes)

// Users routes
app.use('/api/users', usersRoutes)

// Upload route
app.use('/api/upload', uploadRoutes)

// Announcements routes
app.use('/api/announcements', announcementsRoutes)

// System info
app.use('/api/system', systemRoutes)

app.get('/', (_req, res) => {
  res.send('Hello from the backend!')
})

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

app.get('/api', (_req, res) => {
  // 输出系统负载状态
  res.json({
    message: 'API is running',
    uptime: process.uptime(),
    loadavg: os.loadavg(), // 1, 5, 15分钟平均负载
    totalmem: os.totalmem(),
    freemem: os.freemem(),
    platform: os.platform(),
    arch: os.arch(),
    cpus: os.cpus().length,
    node_version: process.version,
    cpu_usage: calcCpuUsage(),
    time: new Date(),
  })
})

app.use(errorLogger)

app.listen(port, () => {
  log(`Server is running on http://localhost:${port}`)
})
