import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config'
import pool from '../db'

interface AuthUser {
  id: number
  username: string
  role: string
  status?: string
}

interface AuthRequest extends Request {
  user?: AuthUser
}

const currentUserFromToken = async (token: string): Promise<AuthUser | null> => {
  const decoded = jwt.verify(token, config.jwt.secret) as AuthUser
  if (!decoded?.id) return null

  const [rows] = await pool.query<any[]>(
    'SELECT id, username, role, status FROM users WHERE id = ? LIMIT 1',
    [decoded.id],
  )
  const user = Array.isArray(rows) ? rows[0] : null
  if (!user || user.status === 'disabled') return null

  return {
    id: user.id,
    username: user.username,
    role: user.role,
    status: user.status,
  }
}

export const protect = async (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' })
  }

  try {
    const user = await currentUserFromToken(token)
    if (!user) {
      return res.status(401).json({ error: 'Token user is not valid' })
    }
    req.user = user
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' })
  }
}

export const optionalAuth = async (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.header('Authorization')
  if (!header) return next()
  const token = header.replace('Bearer ', '')
  try {
    const user = await currentUserFromToken(token)
    if (user) req.user = user
  } catch (_) {
    // ignore invalid token
  }
  next()
}

export const authorize = (...roles: string[]) => {
  return (req: AuthRequest, res: Response, next: NextFunction) => {
    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({ error: 'Forbidden' })
    }
    next()
  }
}
