import { Router } from 'express'
import os from 'os'
import path from 'path'
import fs from 'fs'

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

export default router

