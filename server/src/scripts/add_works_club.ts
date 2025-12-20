/*
  扩列脚本：为 works 表安全添加 club 字段（可选创建索引、可选从文件回填），不重置任何数据。

  用法示例：
  - 仅检查并添加列：
      ts-node src/scripts/add_works_club.ts
  - 添加列并创建索引：
      ts-node src/scripts/add_works_club.ts --add-index
  - 只演练（不执行变更），并显示计划：
      ts-node src/scripts/add_works_club.ts --dry-run --add-index
  - 从 JSON 回填（按 id 匹配）：
      ts-node src/scripts/add_works_club.ts --backfill "../backfills/works_club.json" --match id
  - 从 JSON 回填（按 title 匹配）：
      ts-node src/scripts/add_works_club.ts --backfill "../backfills/works_club_by_title.json" --match title

  回填 JSON 支持两种形态：
  1) 对象映射
     - 按 id:   { "1": "社团A", "2": "社团B" }
     - 按 title:{ "作品标题1": "社团A", "作品标题2": "社团B" }
  2) 数组
     - 按 id:   [ { "id": 1, "club": "社团A" }, { "id": 2, "club": "社团B" } ]
     - 按 title:[ { "title": "作品标题1", "club": "社团A" } ]
*/

import pool from '../db'
import fs from 'fs/promises'
import path from 'path'

interface BackfillItemById { id: number | string; club: string }
interface BackfillItemByTitle { title: string; club: string }

type MatchMode = 'id' | 'title'

function parseArgs(argv: string[]) {
  const args: Record<string, string | boolean> = {}
  for (let i = 2; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const [k, v] = a.split('=')
      const key = k.replace(/^--/, '')
      if (typeof v === 'undefined') {
        // boolean flag
        args[key] = true
      } else {
        args[key] = v
      }
    }
  }
  return args
}

async function columnExists(connection: any, table: string, column: string) {
  const [rows] = await connection.query(
    "SELECT COLUMN_NAME FROM INFORMATION_SCHEMA.COLUMNS WHERE TABLE_SCHEMA = DATABASE() AND TABLE_NAME = ? AND COLUMN_NAME = ?",
    [table, column],
  )
  return Array.isArray(rows) && rows.length > 0
}

async function indexExists(connection: any, table: string, indexName: string) {
  const [rows] = await connection.query('SHOW INDEX FROM `' + table + '` WHERE Key_name = ?', [indexName])
  return Array.isArray(rows) && rows.length > 0
}

async function ensureClubColumn(connection: any, dryRun: boolean) {
  const exists = await columnExists(connection, 'works', 'club')
  if (exists) {
    console.log('[OK] 列 works.club 已存在，跳过添加')
    return false
  }
  if (dryRun) {
    console.log('[DRY-RUN] 将执行：ALTER TABLE works ADD COLUMN club VARCHAR(255) NULL')
    return true
  }
  await connection.query('ALTER TABLE works ADD COLUMN club VARCHAR(255) NULL')
  console.log('[DONE] 已添加列 works.club')
  return true
}

async function ensureClubIndex(connection: any, dryRun: boolean) {
  const idxName = 'idx_works_club'
  const exists = await indexExists(connection, 'works', idxName)
  if (exists) {
    console.log('[OK] 索引 ' + idxName + ' 已存在，跳过创建')
    return false
  }
  if (dryRun) {
    console.log('[DRY-RUN] 将执行：CREATE INDEX ' + idxName + ' ON works (club)')
    return true
  }
  await connection.query('CREATE INDEX ' + idxName + ' ON works (club)')
  console.log('[DONE] 已创建索引 ' + idxName)
  return true
}

async function loadBackfillJson(backfillPath: string) {
  const resolved = path.isAbsolute(backfillPath) ? backfillPath : path.join(process.cwd(), backfillPath)
  const content = await fs.readFile(resolved, 'utf-8')
  try {
    return JSON.parse(content)
  } catch (e) {
    throw new Error('回填 JSON 解析失败：' + (e as Error).message)
  }
}

function normalizeBackfill(data: any, mode: MatchMode): Array<BackfillItemById | BackfillItemByTitle> {
  const list: Array<BackfillItemById | BackfillItemByTitle> = []
  if (Array.isArray(data)) {
    for (const item of data) {
      if (mode === 'id') {
        if (item && (typeof item.id === 'number' || typeof item.id === 'string') && typeof item.club === 'string') {
          list.push({ id: item.id, club: item.club })
        }
      } else {
        if (item && typeof item.title === 'string' && typeof item.club === 'string') {
          list.push({ title: item.title, club: item.club })
        }
      }
    }
    return list
  }
  // object map
  if (data && typeof data === 'object') {
    for (const key of Object.keys(data)) {
      const club = data[key]
      if (typeof club !== 'string') continue
      if (mode === 'id') {
        list.push({ id: key, club })
      } else {
        list.push({ title: key, club })
      }
    }
  }
  return list
}

async function backfillClubs(connection: any, items: Array<BackfillItemById | BackfillItemByTitle>, mode: MatchMode, dryRun: boolean) {
  if (!items.length) {
    console.log('[INFO] 回填列表为空，跳过')
    return { updated: 0, notFound: 0 }
  }

  let updated = 0
  let notFound = 0

  if (mode === 'id') {
    const stmt = 'UPDATE works SET club = ? WHERE id = ?'
    for (const it of items as BackfillItemById[]) {
      const idVal = typeof it.id === 'string' ? Number(it.id) : it.id
      if (!Number.isFinite(idVal)) { notFound++; continue }
      if (dryRun) {
        console.log(`[DRY-RUN] UPDATE works SET club = ${JSON.stringify(it.club)} WHERE id = ${idVal}`)
        updated++
      } else {
        const [res] = await connection.query(stmt, [it.club, idVal])
        const aff = (res as any)?.affectedRows ?? 0
        if (aff > 0) updated++; else notFound++
      }
    }
  } else {
    const stmt = 'UPDATE works SET club = ? WHERE title = ?'
    for (const it of items as BackfillItemByTitle[]) {
      if (dryRun) {
        console.log(`[DRY-RUN] UPDATE works SET club = ${JSON.stringify(it.club)} WHERE title = ${JSON.stringify(it.title)}`)
        updated++
      } else {
        const [res] = await connection.query(stmt, [it.club, it.title])
        const aff = (res as any)?.affectedRows ?? 0
        if (aff > 0) updated++; else notFound++
      }
    }
  }

  return { updated, notFound }
}

async function main() {
  const args = parseArgs(process.argv)
  const dryRun = Boolean(args['dry-run'])
  const addIndex = Boolean(args['add-index'])
  const backfillPath = (args['backfill'] as string) || ''
  const match = ((args['match'] as string) || 'id') as MatchMode

  if (match !== 'id' && match !== 'title') {
    console.error('[ERROR] --match 仅支持 id 或 title，当前：', match)
    process.exit(2)
    return
  }

  const connection = await pool.getConnection()
  try {
    console.log('[START] 扩列脚本：works.club | dry-run:', dryRun, '| add-index:', addIndex)

    // 步骤1：确保列存在
    await ensureClubColumn(connection, dryRun)

    // 步骤2：可选创建索引
    if (addIndex) {
      await ensureClubIndex(connection, dryRun)
    }

    // 步骤3：可选回填
    if (backfillPath) {
      console.log('[INFO] 读取回填文件：', backfillPath, '| 匹配方式：', match)
      const raw = await loadBackfillJson(backfillPath)
      const items = normalizeBackfill(raw, match)
      console.log('[INFO] 回填项数量：', items.length)
      const { updated, notFound } = await backfillClubs(connection, items, match, dryRun)
      console.log(`[RESULT] 回填完成：更新 ${updated} 条，未匹配 ${notFound} 条`)
    }

    console.log('[DONE] 扩列脚本执行完成')
    process.exit(0)
  } catch (e) {
    console.error('[FAILED] 扩列脚本执行失败：', e)
    process.exit(1)
  } finally {
    connection.release()
    await pool.end()
  }
}

main().catch((e) => {
  console.error('[UNCAUGHT] 脚本异常：', e)
  process.exit(1)
})

