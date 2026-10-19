import { Router } from 'express'
import type { ResultSetHeader, RowDataPacket } from 'mysql2'
import pool from '../db'
import { protect, authorize } from '../middleware/auth'
import { parseYear, validateExhibition, validateHomepageSettings } from '../utils/exhibitions'
import { calendarCache } from '../services/calendar-cache'
import { sourceKey, validateSourceConfig } from '../services/calendar-source-data'
import type { SourceEvent } from '../services/calendar-source-data'
import { applyBindings, bindingFromRow, readBindings, readSourceConfig, saveSourceConfig, updateThonlyFeeds } from '../services/calendar-store'
import { discoverThonlyFeeds, knownThonlyFeeds } from '../services/thonly-discovery'

const router = Router()
interface ExhibitionRow extends RowDataPacket { id: number; start_date: string; end_date: string }
// DATE_FORMAT deliberately returns date-only strings, independent of the server timezone.
const columns = `id, title, DATE_FORMAT(start_date, '%Y-%m-%d') AS start_date,
  DATE_FORMAT(end_date, '%Y-%m-%d') AS end_date, location, booth, participation,
  COALESCE(participation_notes, '') AS participation_notes, description, link`

router.get('/settings', async (_req, res) => {
  try {
    const [rows] = await pool.query<RowDataPacket[]>(
      'SELECT homepage_mode, homepage_month FROM exhibition_settings WHERE id = 1',
    )
    const row = rows[0]
    res.json({ mode: row?.homepage_mode || 'current_month', month: row?.homepage_month || null })
  } catch (error) {
    console.error('Error reading exhibition settings:', error)
    res.status(500).json({ error: '首页展会设置加载失败，请稍后重试' })
  }
})

router.get('/public', async (req, res) => {
  const currentYear = new Date(Date.now() + 8 * 3600_000).getUTCFullYear()
  const year = req.query.year === undefined ? currentYear : parseYear(req.query.year)
  if (year === null) return res.status(400).json({ error: '年份无效（1900–2199）' })
  try {
    const [items] = await pool.query<ExhibitionRow[]>(
      `SELECT ${columns} FROM exhibitions
       WHERE start_date <= ? AND end_date >= ? ORDER BY start_date, id`,
      [`${year}-12-31`, `${year}-01-01`],
    )
    const [ranges] = await pool.query<RowDataPacket[]>(
      'SELECT DISTINCT YEAR(start_date) AS first_year, YEAR(end_date) AS last_year FROM exhibitions',
    )
    const config = await readSourceConfig()
    const external = await calendarCache.get(config)
    const sourceEvents = applyBindings(external.events, config.kind === 'local' ? [] : await readBindings())
    const years = new Set<number>([currentYear, year])
    for (const event of sourceEvents) {
      for (let y = Number(event.start_date.slice(0,4)); y <= Number(event.end_date.slice(0,4)); y++) years.add(y)
    }
    for (const range of ranges) {
      for (let y = Math.max(1900, range.first_year); y <= Math.min(2199, range.last_year); y++)
        years.add(y)
    }
    const merged = [...items.map(event => ({...event, source_label: '本站维护'})), ...sourceEvents.filter(event => event.start_date <= `${year}-12-31` && event.end_date >= `${year}-01-01`)]
    merged.sort((a,b) => String(a.start_date).localeCompare(String(b.start_date)) || String(a.id).localeCompare(String(b.id)))
    res.set('Cache-Control', 'no-store').json({ items:merged, years: [...years].sort((a, b) => b - a), source:external.source })
  } catch (error) {
    console.error('Error listing exhibitions:', error)
    res.status(500).json({ error: '获取展会日历失败，请稍后重试' })
  }
})

// All mutations require a current administrator account, checked against the database.
router.use(protect, authorize('admin'))

router.get('/sources', async (_req,res) => {
  try {
    const config = await readSourceConfig()
    res.set('Cache-Control','no-store').json({...config,thonly_urls:config.kind === 'thonly' ? config.urls : knownThonlyFeeds()})
  }
  catch {res.status(500).json({error:'日历数据源设置加载失败，请稍后重试'})}
})

router.put('/sources', async (req,res) => {
  const result = validateSourceConfig(req.body)
  if (!result.data) return res.status(400).json({error:result.error})
  try {
    await saveSourceConfig(result.data)
    res.json(result.data)
  } catch {res.status(500).json({error:'日历数据源设置保存失败，请稍后重试'})}
})

router.post('/sources/refresh', async (_req,res) => {
  try {
    let config = await readSourceConfig()
    if (config.kind === 'local') return res.status(400).json({error:'本站维护模式无需刷新外部数据'})
    if (config.cache_mode === 'offline') return res.status(400).json({error:'仅离线模式不会联网，请先切换缓存方式并保存'})
    if (config.kind === 'thonly') {
      // Best effort: a discovery failure keeps the previously saved spreadsheet list.
      const feeds = await discoverThonlyFeeds(true)
      if (feeds) await updateThonlyFeeds(feeds)
      config = await readSourceConfig()
    }
    const result = await calendarCache.get(config,true)
    if (result.source.cache_state !== 'live') return res.status(503).json({error:result.source.warning,source:result.source,config})
    res.json({message:config.cache_mode === 'none' ? '来源数据已读取；当前不保存缓存' : '来源数据及本地缓存已更新',count:result.events.length,source:result.source,config})
  } catch {res.status(500).json({error:'刷新日历数据源失败，请稍后重试'})}
})

router.get('/bindings', async (_req,res) => {
  try {res.set('Cache-Control','no-store').json(await readBindings())}
  catch {res.status(500).json({error:'参展绑定加载失败，请稍后重试'})}
})

function attendance(body: Record<string,unknown>) {
  return validateExhibition({title:'参展信息',start_date:'2000-01-01',end_date:'2000-01-01',participation:body?.participation,booth:body?.booth,participation_notes:body?.participation_notes})
}
async function selectedSourceEvent(body: Record<string,unknown>): Promise<SourceEvent | undefined> {
  const config = await readSourceConfig()
  if (config.kind === 'local' || body?.source_key !== sourceKey(config)) return undefined
  const result = await calendarCache.get(config)
  return result.events.find(event => event.source_event_id === body.source_event_id)
}

router.post('/bindings', async (req,res) => {
  const result = attendance(req.body)
  if (!result.data) return res.status(400).json({error:result.error})
  try {
    const event = await selectedSourceEvent(req.body)
    if (!event) return res.status(409).json({error:'来源活动已变化或暂不可用，请刷新日历后重新选择'})
    const data = result.data
    await pool.query(`INSERT INTO exhibition_bindings (source_key, source_event_id, event_snapshot, participation, booth, participation_notes)
      VALUES (?, ?, ?, ?, ?, ?) ON DUPLICATE KEY UPDATE event_snapshot = ?, participation = ?, booth = ?, participation_notes = ?`,
      [event.source_key,event.source_event_id,JSON.stringify(event),data.participation,data.booth,data.participation_notes,JSON.stringify(event),data.participation,data.booth,data.participation_notes])
    res.status(201).json({message:'高联参展信息已绑定到来源活动'})
  } catch {res.status(500).json({error:'保存参展绑定失败，请稍后重试'})}
})

router.param('bindingId', (_req,res,next,id: string) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) return res.status(400).json({error:'参展绑定 ID 无效'})
  next()
})
router.put('/bindings/:bindingId', async (req,res) => {
  const result = attendance(req.body)
  if (!result.data) return res.status(400).json({error:result.error})
  try {
    const [rows] = await pool.query<RowDataPacket[]>('SELECT id, source_key, source_event_id, event_snapshot, participation, booth, participation_notes FROM exhibition_bindings WHERE id = ?', [req.params.bindingId])
    if (!rows[0]) return res.status(404).json({error:'参展绑定不存在'})
    const existing = bindingFromRow(rows[0])
    const unchanged = req.body.source_key === existing.source_key && req.body.source_event_id === existing.source_event_id
    const event = unchanged ? existing.event : await selectedSourceEvent(req.body)
    if (!event) return res.status(409).json({error:'目标活动已变化或暂不可用，请刷新后重新选择'})
    const data = result.data
    await pool.query(`UPDATE exhibition_bindings SET source_key = ?, source_event_id = ?, event_snapshot = ?, participation = ?, booth = ?, participation_notes = ? WHERE id = ?`,
      [event.source_key,event.source_event_id,JSON.stringify(event),data.participation,data.booth,data.participation_notes,existing.id])
    res.json({message:'参展绑定已保存'})
  } catch (error) {
    res.status((error as {code?:string}).code === 'ER_DUP_ENTRY' ? 409 : 500).json({error:(error as {code?:string}).code === 'ER_DUP_ENTRY' ? '目标活动已绑定参展信息，请直接编辑该活动' : '保存参展绑定失败，请稍后重试'})
  }
})
router.delete('/bindings/:bindingId', async (req,res) => {
  try {
    const [deleted] = await pool.query<ResultSetHeader>('DELETE FROM exhibition_bindings WHERE id = ?', [req.params.bindingId])
    if (!deleted.affectedRows) return res.status(404).json({error:'参展绑定不存在'})
    res.json({message:'参展绑定已解除，来源活动仍保留'})
  } catch {res.status(500).json({error:'解除参展绑定失败，请稍后重试'})}
})

router.put('/settings', async (req, res) => {
  const result = validateHomepageSettings(req.body)
  if (result.error) return res.status(400).json({ error: result.error })
  const data = result.data!
  try {
    await pool.query(
      `INSERT INTO exhibition_settings (id, homepage_mode, homepage_month) VALUES (1, ?, ?)
       ON DUPLICATE KEY UPDATE homepage_mode = ?, homepage_month = ?`,
      [data.mode, data.month, data.mode, data.month],
    )
    res.json(data)
  } catch (error) {
    console.error('Error saving exhibition settings:', error)
    res.status(500).json({ error: '首页展会设置保存失败，请稍后重试' })
  }
})

router.post('/', async (req, res) => {
  const result = validateExhibition(req.body)
  if (result.error) return res.status(400).json({ error: result.error })
  const data = result.data!
  try {
    const [created] = await pool.query<ResultSetHeader>(
      `INSERT INTO exhibitions (title, start_date, end_date, location, booth, participation, participation_notes, description, link)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        data.title,
        data.start_date,
        data.end_date,
        data.location,
        data.booth,
        data.participation,
        data.participation_notes,
        data.description,
        data.link,
      ],
    )
    res.status(201).json({ id: created.insertId, ...data })
  } catch (error) {
    console.error('Error creating exhibition:', error)
    res.status(500).json({ error: '新增展会失败' })
  }
})

router.param('id', (req, res, next, id: string) => {
  if (!/^[1-9]\d*$/.test(id) || !Number.isSafeInteger(Number(id))) {
    return res.status(400).json({ error: '展会 ID 无效' })
  }
  next()
})

router.put('/:id', async (req, res) => {
  const result = validateExhibition(req.body)
  if (result.error) return res.status(400).json({ error: result.error })
  const data = result.data!
  try {
    const [updated] = await pool.query<ResultSetHeader>(
      `UPDATE exhibitions SET title = ?, start_date = ?, end_date = ?, location = ?, booth = ?,
       participation = ?, participation_notes = ?, description = ?, link = ? WHERE id = ?`,
      [
        data.title,
        data.start_date,
        data.end_date,
        data.location,
        data.booth,
        data.participation,
        data.participation_notes,
        data.description,
        data.link,
        req.params.id,
      ],
    )
    if (!updated.affectedRows) return res.status(404).json({ error: '展会不存在' })
    res.json({ id: Number(req.params.id), ...data })
  } catch (error) {
    console.error('Error updating exhibition:', error)
    res.status(500).json({ error: '保存展会失败' })
  }
})

router.delete('/:id', async (req, res) => {
  try {
    const [deleted] = await pool.query<ResultSetHeader>('DELETE FROM exhibitions WHERE id = ?', [
      req.params.id,
    ])
    if (!deleted.affectedRows) return res.status(404).json({ error: '展会不存在' })
    res.json({ message: '展会已删除' })
  } catch (error) {
    console.error('Error deleting exhibition:', error)
    res.status(500).json({ error: '删除展会失败' })
  }
})

export default router
