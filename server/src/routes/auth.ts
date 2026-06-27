import { Router } from 'express'
import rateLimit from 'express-rate-limit'
import bcrypt from 'bcryptjs'
import jwt from 'jsonwebtoken'
import { RowDataPacket } from 'mysql2'
import crypto from 'crypto'
import pool from '../db'
import config from '../config'
import { cleanString, isValidUsername, requiredString, usernameRuleText } from '../utils/input'
import { verifyRecaptcha } from '../utils/recaptcha'

interface User extends RowDataPacket {
  id: number
  username: string
  password: string
  role: string
  status?: 'pending' | 'approved' | 'rejected' | 'disabled' | 'withdrawn'
}

const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: 'Too many login attempts from this IP, please try again after 15 minutes',
  standardHeaders: true,
  legacyHeaders: false,
})
const registerLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 5,
  message: 'Too many registration attempts from this IP, please try again later',
  standardHeaders: true,
  legacyHeaders: false,
})

const hashIp = (ip: string | undefined) => crypto.createHash('sha256').update(ip || '').digest('hex')

const router = Router()

router.post('/register', registerLimiter, async (req, res) => {
  const {
    username,
    password,
    confirmPassword,
    clubName,
    contactName,
    contactQQ,
    clubLogo,
    clubLink,
    clubGroupQQ,
    applicationReason,
    nickname,
    token: recaptchaToken,
  } = req.body as {
    username?: string
    password?: string
    confirmPassword?: string
    clubName?: string
    contactName?: string
    contactQQ?: string
    clubLogo?: string
    clubLink?: string
    clubGroupQQ?: string
    applicationReason?: string
    nickname?: string
    token?: string
  }

  const safeUsername = requiredString(username)
  const safeClubName = requiredString(clubName)
  const safeContactName = requiredString(contactName)
  const safeContactQQ = cleanString(contactQQ)
  const safeClubGroupQQ = cleanString(clubGroupQQ)
  const safeClubLogo = cleanString(clubLogo)
  const safeClubLink = cleanString(clubLink)
  const safeReason = cleanString(applicationReason)
  const safeNickname = cleanString(nickname)

  if (!safeUsername || !password || !safeClubName || !safeContactName || !safeClubLogo) {
    return res.status(400).json({
      error: 'username, password, clubName, contactName, and clubLogo are required',
    })
  }

  if (password.length < 8) {
    return res.status(400).json({ error: 'Password must be at least 8 characters' })
  }
  if (confirmPassword !== undefined && password !== confirmPassword) {
    return res.status(400).json({ error: 'Password confirmation does not match' })
  }
  if (!isValidUsername(safeUsername)) {
    return res.status(400).json({ error: usernameRuleText })
  }

  try {
    const recaptchaResult = await verifyRecaptcha(recaptchaToken, 'submit_club_application')
    if (!recaptchaResult.ok) {
      return res.status(recaptchaResult.status).json(recaptchaResult.body)
    }

    const registrationIpHash = hashIp(req.ip)
    const [pendingByIp] = await pool.query<RowDataPacket[]>(
      "SELECT COUNT(*) AS count FROM users WHERE registration_ip_hash = ? AND status = 'pending'",
      [registrationIpHash],
    )
    if (Number(pendingByIp?.[0]?.count || 0) >= 3) {
      return res.status(429).json({
        error:
          'This IP already has too many pending applications. Please wait for review or log in to manage an existing application.',
      })
    }

    const [existingUsers] = await pool.query('SELECT id FROM users WHERE username = ?', [
      safeUsername,
    ])
    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(409).json({ error: 'Username already exists' })
    }

    const salt = await bcrypt.genSalt(10)
    const hashedPassword = await bcrypt.hash(password, salt)

    await pool.query(
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
        registration_ip_hash
      ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        safeUsername,
        hashedPassword,
        'viewer',
        safeNickname || safeClubName,
        safeClubName,
        safeClubLogo,
        safeClubLink,
        safeContactName,
        safeContactQQ,
        safeClubGroupQQ,
        safeReason,
        'pending',
        registrationIpHash,
      ],
    )

    const [createdUsers] = await pool.query<User[]>('SELECT id, username, role FROM users WHERE username = ?', [
      safeUsername,
    ])
    const createdUser = Array.isArray(createdUsers) ? createdUsers[0] : undefined
    const authToken = createdUser
      ? jwt.sign(
          { id: createdUser.id, username: createdUser.username, role: createdUser.role },
          config.jwt.secret,
          { expiresIn: '1h' },
        )
      : undefined

    res.status(201).json({
      message: 'Application submitted successfully. Please wait for review.',
      status: 'pending',
      token: authToken,
    })
  } catch (error) {
    console.error('Error during registration:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

router.post('/login', loginLimiter, async (req, res) => {
  const { username, password } = req.body as { username?: string; password?: string }

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' })
  }

  try {
    const [users] = await pool.query<User[]>('SELECT * FROM users WHERE username = ?', [username])
    const user = Array.isArray(users) ? users[0] : undefined

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    const isMatch = await bcrypt.compare(password, user.password)
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials' })
    }

    if (user.status === 'disabled') {
      return res.status(403).json({ error: 'Account has been disabled' })
    }

    const payload = { id: user.id, username: user.username, role: user.role }
    const token = jwt.sign(payload, config.jwt.secret, { expiresIn: '1h' })

    res.json({ token })
  } catch (error) {
    console.error('Error during login:', error)
    res.status(500).json({ error: 'Internal Server Error' })
  }
})

export default router
