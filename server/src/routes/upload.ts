import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { protect, authorize } from '../middleware/auth'

const router = express.Router()

// ================= 安全白名单 =================
const ALLOWED_TYPES = ['works', 'news', 'member_logos', 'general', 'history', 'fame_members', 'admins', 'members', 'friend_links'] as const
const ALLOWED_EXTS = ['.png', '.jpg', '.jpeg', '.webp', '.svg']
const ALLOWED_MIME = [
  'image/png',
  'image/jpeg',
  'image/webp',
  'image/svg+xml',
]
const MAX_FILE_SIZE = 2 * 1024 * 1024 // 2 MB
// ==============================================

// Ensure the base uploads directory exists
const uploadDir = './uploads/'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const storage = multer.diskStorage({
  destination: (req, _file, cb) => {
    const typeParam = (req.query.type as string) || 'general'
    const type = ALLOWED_TYPES.includes(typeParam as any) ? typeParam : 'general'

    // directory traversal protection: ensure final path remains inside uploadDir
    const dir = path.join(uploadDir, type)
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    const safeName = `${Date.now()}${ext}`
    cb(null, safeName)
  },
})

const upload = multer({
  storage,
  limits: { fileSize: MAX_FILE_SIZE },
  fileFilter: (_req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase()
    if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
      return cb(new Error('Unsupported file type'))
    }
    cb(null, true)
  },
})

// Multer v2 emits errors on the request object via upload.errorFormatter or by default middleware
// We handle multer errors before accessing req.file
const handleMulterError = (req: express.Request, res: express.Response, next: express.NextFunction) => {
  const typeParam = (req.query.type as string) || 'general'
  const type = ALLOWED_TYPES.includes(typeParam as any) ? typeParam : 'general'
  const maxSize = MAX_FILE_SIZE

  const upload = multer({
    storage,
    limits: { fileSize: maxSize },
    fileFilter: (_req, file, cb) => {
      const ext = path.extname(file.originalname).toLowerCase()
      if (!ALLOWED_EXTS.includes(ext) || !ALLOWED_MIME.includes(file.mimetype)) {
        return cb(new Error('Unsupported file type'))
      }
      cb(null, true)
    },
  })

  const uploadHandler = upload.single('image')
  uploadHandler(req, res, (err: any) => {
    if (err) {
      if (err instanceof multer.MulterError) {
        if (err.code === 'LIMIT_FILE_SIZE') {
          return res.status(400).json({ message: 'File too large. Maximum size is 2MB.' })
        }
        return res.status(400).json({ message: `Upload error: ${err.message}` })
      }
      if (err.message === 'Unsupported file type') {
        return res.status(400).json({ message: 'Unsupported file type. Allowed: PNG, JPG, JPEG, WEBP, SVG.' })
      }
      return res.status(400).json({ message: err.message })
    }
    next()
  })
}

// 仅登录用户可上传；且角色限制：member 只能上传到 works/news 目录；admin/editor 不限制
router.post(
  '/',
  protect as any,
  authorize('admin', 'editor', 'member') as any,
  handleMulterError,
  (req: any, res) => {
    if (!req.file) {
      return res.status(400).json({ message: 'Please upload a file' })
    }
    const type = (req.query.type as string) || 'general'

    if (req.user?.role === 'member' && !['works', 'news'].includes(type)) {
      return res
        .status(403)
        .json({ message: 'Forbidden: members can only upload for works or news' })
    }

    const filePath = `/uploads/${type}/${req.file.filename}`

    res.json({
      message: 'File uploaded successfully',
      filePath: filePath,
    })
  },
)

export default router
