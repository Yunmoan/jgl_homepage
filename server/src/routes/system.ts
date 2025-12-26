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

router.get('/info', (_req, res) => {
  res.json({
    backendVersion,
    frontendVersion,
    node: process.version,
    platform: `${os.type()} ${os.release()}`,
    uptime: process.uptime(),
  })
})

export default router

