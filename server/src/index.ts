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
import path from 'path'

const app = express()
const port = config.server.port

app.use(cors())
app.use(express.json({ limit: '10mb' }))
app.use('/uploads', express.static(path.join(__dirname, '../uploads')))

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

app.get('/', (req, res) => {
  res.send('Hello from the backend!')
})

app.listen(port, () => {
  console.log(`Server is running on http://localhost:${port}`)
})
