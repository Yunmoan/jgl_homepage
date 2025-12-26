import fs from 'fs'
import path from 'path'
import { Request, Response, NextFunction } from 'express'

// Simple logger that writes to console and to daily rotated file (basic)
const logDir = path.join(__dirname, '../logs')
if (!fs.existsSync(logDir)) {
  fs.mkdirSync(logDir)
}

function getLogFilePath() {
  const date = new Date()
  const fileName = `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}.log`
  return path.join(logDir, fileName)
}

export function log(message: string) {
  const timestamp = new Date().toISOString()
  const line = `[${timestamp}] ${message}`
  console.log(line)
  fs.appendFile(getLogFilePath(), line + '\n', () => {})
}

// Express middleware for request/response logging
export function requestLogger(req: Request, res: Response, next: NextFunction) {
  const start = process.hrtime()
  res.on('finish', () => {
    const diff = process.hrtime(start)
    const ms = diff[0] * 1e3 + diff[1] / 1e6
    log(`${req.method} ${req.originalUrl} ${res.statusCode} - ${ms.toFixed(1)}ms`)
  })
  next()
}

// Express error-handling middleware
export function errorLogger(err: any, _req: Request, res: Response, next: NextFunction) {
  log(`ERROR ${res.statusCode || 500}: ${err.stack || err}`)
  next(err)
}

