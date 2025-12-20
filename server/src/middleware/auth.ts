import { Request, Response, NextFunction } from 'express'
import jwt from 'jsonwebtoken'
import config from '../config'

interface AuthUser {
  id: number
  username: string
  role: string
}

interface AuthRequest extends Request {
  user?: AuthUser
}

export const protect = (req: AuthRequest, res: Response, next: NextFunction) => {
  const token = req.header('Authorization')?.replace('Bearer ', '')

  if (!token) {
    return res.status(401).json({ error: 'No token, authorization denied' })
  }

  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser
    req.user = decoded
    next()
  } catch (error) {
    res.status(401).json({ error: 'Token is not valid' })
  }
}

export const optionalAuth = (req: AuthRequest, _res: Response, next: NextFunction) => {
  const header = req.header('Authorization')
  if (!header) return next()
  const token = header.replace('Bearer ', '')
  try {
    const decoded = jwt.verify(token, config.jwt.secret) as AuthUser
    req.user = decoded
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
