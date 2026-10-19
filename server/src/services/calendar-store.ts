import type { RowDataPacket } from 'mysql2'
import pool from '../db'
import { defaultSourceConfig, validateSourceConfig } from './calendar-source-data'
import type { SourceConfig, SourceEvent } from './calendar-source-data'

export async function readSourceConfig(): Promise<SourceConfig> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT config_json FROM exhibition_source_settings WHERE id = 1')
  if (!rows[0]) return defaultSourceConfig()
  try {
    const result = validateSourceConfig(JSON.parse(rows[0].config_json))
    if (result.data) return result.data
  } catch {
    // Fall through to the safe default below.
  }
  console.warn('[exhibitions] Saved calendar source settings are invalid; using defaults')
  return defaultSourceConfig()
}

export async function saveSourceConfig(config: SourceConfig): Promise<void> {
  const value = JSON.stringify(config)
  await pool.query(
    'INSERT INTO exhibition_source_settings (id, config_json) VALUES (1, ?) ON DUPLICATE KEY UPDATE config_json = ?',
    [value, value],
  )
}

/**
 * Replace the thonly feed list after a successful discovery. Custom JSON sources are never
 * touched, and a discovery result that fails validation leaves the saved configuration intact.
 */
export async function updateThonlyFeeds(feeds: string[]): Promise<boolean> {
  const config = await readSourceConfig()
  if (config.kind !== 'thonly') return false
  const result = validateSourceConfig({ ...config, urls: feeds })
  if (!result.data) return false
  if (JSON.stringify(result.data.urls) === JSON.stringify(config.urls)) return false
  await saveSourceConfig(result.data)
  return true
}

export interface AttendanceBinding {
  id: number
  source_key: string
  source_event_id: string
  participation: SourceEvent['participation']
  booth: string
  participation_notes: string
  event: SourceEvent
}

export function bindingFromRow(row: RowDataPacket): AttendanceBinding {
  return {id:Number(row.id), source_key:row.source_key, source_event_id:row.source_event_id,
    participation:row.participation, booth:row.booth || '', participation_notes:row.participation_notes || '',
    event: typeof row.event_snapshot === 'string' ? JSON.parse(row.event_snapshot) : row.event_snapshot}
}

export async function readBindings(): Promise<AttendanceBinding[]> {
  const [rows] = await pool.query<RowDataPacket[]>('SELECT id, source_key, source_event_id, event_snapshot, participation, booth, participation_notes FROM exhibition_bindings ORDER BY id DESC')
  return rows.map(bindingFromRow)
}

export function applyBindings(events: SourceEvent[], bindings: AttendanceBinding[]) {
  const byEvent = new Map(bindings.map(binding => [`${binding.source_key}:${binding.source_event_id}`, binding]))
  return events.map(event => {
    const binding = byEvent.get(`${event.source_key}:${event.source_event_id}`)
    return binding ? {...event, binding_id:binding.id, participation:binding.participation, booth:binding.booth, participation_notes:binding.participation_notes} : event
  })
}
