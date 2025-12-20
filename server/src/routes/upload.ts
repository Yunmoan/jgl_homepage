import express from 'express'
import multer from 'multer'
import path from 'path'
import fs from 'fs'
import { protect, authorize } from '../middleware/auth'

const router = express.Router()

// Ensure the base uploads directory exists
const uploadDir = './uploads/'
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir)
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    const type = (req.query.type as string) || 'general'
    const dir = path.join(uploadDir, type)

    // Create directory if it doesn't exist
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true })
    }
    cb(null, dir)
  },
  filename: (req, file, cb) => {
    cb(null, `${file.fieldname}-${Date.now()}${path.extname(file.originalname)}`)
  },
})

const upload = multer({ storage })

// 仅登录用户可上传；且角色限制：member 只能上传到 works/news 目录；admin/editor 不限制
router.post(
  '/',
  protect as any,
  authorize('admin', 'editor', 'member') as any,
  upload.single('image'),
  (req: any, res) => {
    if (!req.file) {
      return res.status(400).send({ message: 'Please upload a file' })
    }
    const type = (req.query.type as string) || 'general'

    if (req.user?.role === 'member' && !['works', 'news'].includes(type)) {
      return res
        .status(403)
        .send({ message: 'Forbidden: members can only upload for works or news' })
    }

    const filePath = `/uploads/${type}/${req.file.filename}`

    res.send({
      message: 'File uploaded successfully',
      filePath: filePath,
    })
  },
)

export default router
