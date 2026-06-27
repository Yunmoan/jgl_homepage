import fs from 'fs/promises'
import path from 'path'
import pool from '../db'

interface MemberSeed {
  id?: number
  name?: string
  logo?: string
  link?: string
}

interface HistorySeed {
  id?: number
  title?: string
  date?: string
  description?: string
  image?: string
  link?: string
  dialog_data?: unknown
}

const serverRoot = path.resolve(__dirname, '..', '..')
const repoRoot = path.resolve(serverRoot, '..')

async function readJson<T>(filePath: string): Promise<T[]> {
  const raw = await fs.readFile(filePath, 'utf-8')
  const parsed = JSON.parse(raw)
  if (!Array.isArray(parsed)) {
    throw new Error(`${filePath} must contain a JSON array`)
  }
  return parsed as T[]
}

function normalizeId(id: unknown): number | null {
  const value = Number(id)
  return Number.isInteger(value) && value > 0 ? value : null
}

function cleanString(value: unknown): string {
  return typeof value === 'string' ? value.trim() : ''
}

function dialogDataToText(value: unknown): string | null {
  if (value === undefined || value === null || value === '') return null
  return typeof value === 'string' ? value : JSON.stringify(value)
}

function normalizeHistoryImage(value: unknown): string {
  const image = cleanString(value)
  if (image.startsWith('pictures/') || image.startsWith('history/')) {
    return `/uploads/${image.replace(/^history\//, 'pictures/')}`
  }
  return image
}

async function importMembers() {
  const filePath = path.join(repoRoot, 'public', 'data', 'members_generated.json')
  const members = await readJson<MemberSeed>(filePath)
  let imported = 0

  for (const item of members) {
    const id = normalizeId(item.id)
    const name = cleanString(item.name)
    if (!id || !name) continue

    await pool.query(
      `INSERT INTO members (id, name, logo, link)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         name = VALUES(name),
         logo = VALUES(logo),
         link = VALUES(link)`,
      [id, name, cleanString(item.logo), cleanString(item.link)],
    )
    imported += 1
  }

  return imported
}

async function importHistory() {
  const filePath = path.join(repoRoot, 'public', 'data', 'history.json')
  const history = await readJson<HistorySeed>(filePath)
  let imported = 0

  for (const item of history) {
    const id = normalizeId(item.id)
    const title = cleanString(item.title)
    if (!id || !title) continue

    await pool.query(
      `INSERT INTO history (id, title, date, description, image, link, dialog_data)
       VALUES (?, ?, ?, ?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE
         title = VALUES(title),
         date = VALUES(date),
         description = VALUES(description),
         image = VALUES(image),
         link = VALUES(link),
         dialog_data = VALUES(dialog_data)`,
      [
        id,
        title,
        cleanString(item.date),
        cleanString(item.description),
        normalizeHistoryImage(item.image),
        cleanString(item.link),
        dialogDataToText(item.dialog_data),
      ],
    )
    imported += 1
  }

  return imported
}

async function main() {
  try {
    const [members, history] = await Promise.all([importMembers(), importHistory()])
    console.log(`Imported members: ${members}`)
    console.log(`Imported history: ${history}`)
  } finally {
    await pool.end()
  }
}

main().catch((error) => {
  console.error('Failed to import members/history:', error)
  process.exit(1)
})
