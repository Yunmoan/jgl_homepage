export type Participation = 'undecided' | 'participating' | 'not_participating'
// "not_participated" (未参展已结束) is derived for display only; it is never stored or
// accepted by the API. The legacy "not_participating" (不参展) value is no longer offered
// and merges into it on display.
export type DisplayParticipation = Exclude<Participation, 'not_participating'> | 'not_participated'

export interface Exhibition {
  id: number | string
  title: string
  start_date: string
  end_date: string
  location: string
  booth: string
  participation: Participation
  participation_notes: string
  description: string
  link: string
  source_key?: string
  source_event_id?: string
  source_label?: string
  source_url?: string
  source_status?: string
  category?: string
  qq_group?: string
  binding_id?: number
}

export interface ExhibitionResponse {
  items: Exhibition[]
  years: number[]
  source?: CalendarSourceMetadata
}

export interface CalendarSourceConfig {
  kind: 'local' | 'thonly' | 'json'
  label: string
  urls: string[]
  cache_mode: 'ttl' | 'offline' | 'none'
  cache_ttl_seconds: number
  thonly_urls?: string[]
}

export interface CalendarSourceMetadata {
  kind: CalendarSourceConfig['kind']
  key: string
  label: string
  url: string
  cache_state: 'local' | 'live' | 'fresh' | 'stale' | 'offline' | 'unavailable'
  fetched_at: string | null
  warning: string
  skipped: number
}

export interface ExhibitionBinding {
  id: number
  source_key: string
  source_event_id: string
  participation: Participation
  booth: string
  participation_notes: string
  event: Exhibition
}

export interface HomepageCalendarSettings {
  mode: 'current_month' | 'fixed_month' | 'year'
  month: string | null
}

export const defaultHomepageCalendarSettings = (): HomepageCalendarSettings => ({
  mode: 'current_month',
  month: null,
})

export const exhibitionsInMonth = (events: Exhibition[], year: number, month: number) => {
  const prefix = `${year}-${String(month).padStart(2, '0')}`
  const lastDay = new Date(Date.UTC(year, month, 0)).getUTCDate()
  return events.filter(
    (event) => event.start_date <= `${prefix}-${lastDay}` && event.end_date >= `${prefix}-01`,
  )
}

export const participationLabels: Record<DisplayParticipation, string> = {
  undecided: '待定',
  participating: '高联参展',
  not_participated: '未参展已结束',
}

// Values that forms may select; the legacy "不参展" option has been removed.
export const selectableParticipationLabels: Record<
  Exclude<Participation, 'not_participating'>,
  string
> = {
  undecided: '待定',
  participating: '高联参展',
}

export const todayInChina = () => new Date(Date.now() + 8 * 3600_000).toISOString().slice(0, 10)

// A confirmed participation is permanent — it still reads "高联参展" after the event ends.
// Only undecided exhibitions derive their display state from the end date: they stay
// "待定" until the event ends, then become "未参展已结束" (legacy "不参展" merges there).
export const displayParticipation = (
  event: Pick<Exhibition, 'participation' | 'end_date'>,
  today = todayInChina(),
): DisplayParticipation => {
  if (event.participation === 'participating') return 'participating'
  if (event.participation !== 'undecided') return 'not_participated'
  return event.end_date >= today ? 'undecided' : 'not_participated'
}

// A binding's event snapshot predates the binding itself, so the snapshot's participation
// field is stale; derive the label from the binding's own plan with the same rules.
export const displayBindingParticipation = (
  binding: Pick<ExhibitionBinding, 'participation' | 'event'>,
  today = todayInChina(),
): DisplayParticipation =>
  displayParticipation({ ...binding.event, participation: binding.participation }, today)

export const formatExhibitionDates = (event: Pick<Exhibition, 'start_date' | 'end_date'>) => {
  const format = (date: string) => date.replace(/-/g, '.')
  return event.start_date === event.end_date
    ? format(event.start_date)
    : `${format(event.start_date)} — ${format(event.end_date)}`
}

// Index once per year instead of scanning every exhibition for each rendered day.
// Clipping before iteration keeps multi-year exhibitions inexpensive.
export const indexExhibitionDays = (events: Exhibition[], year: number) => {
  const index = new Map<string, Exhibition[]>()
  for (const event of events) {
    const first = event.start_date > `${year}-01-01` ? event.start_date : `${year}-01-01`
    const last = event.end_date < `${year}-12-31` ? event.end_date : `${year}-12-31`
    const cursor = new Date(`${first}T00:00:00Z`)
    while (!Number.isNaN(cursor.getTime()) && cursor.toISOString().slice(0, 10) <= last) {
      const key = cursor.toISOString().slice(0, 10)
      const day = index.get(key) || []
      day.push(event)
      index.set(key, day)
      cursor.setUTCDate(cursor.getUTCDate() + 1)
    }
  }
  return index
}
