export const participationStatuses = ['undecided', 'participating', 'not_participating'] as const

export const validateHomepageSettings = (body: unknown) => {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const modes = ['current_month', 'fixed_month', 'year'] as const
  if (!modes.includes(input.mode as (typeof modes)[number]))
    return { error: '请选择有效的首页展示方式' } as const
  if (
    input.mode === 'fixed_month' &&
    (typeof input.month !== 'string' ||
      !/^\d{4}-(0[1-9]|1[0-2])$/.test(input.month) ||
      parseYear(input.month.slice(0, 4)) === null)
  ) {
    return { error: '请选择有效的展示月份（1900–2199 年）' } as const
  }
  return {
    data: {
      mode: input.mode as (typeof modes)[number],
      month: input.mode === 'fixed_month' ? (input.month as string) : null,
    },
  } as const
}

export const parseYear = (value: unknown): number | null => {
  if (typeof value !== 'string' || !/^\d{4}$/.test(value)) return null
  const year = Number(value)
  return year >= 1900 && year <= 2199 ? year : null
}

export const isCalendarDate = (value: unknown): value is string => {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false
  if (parseYear(value.slice(0, 4)) === null) return false
  const date = new Date(`${value}T00:00:00Z`)
  return !Number.isNaN(date.getTime()) && date.toISOString().slice(0, 10) === value
}

export const validateExhibition = (body: unknown) => {
  const input = (body && typeof body === 'object' ? body : {}) as Record<string, unknown>
  const text = (key: string) => (typeof input[key] === 'string' ? input[key].trim() : '')
  const title = text('title')
  const location = text('location')
  const booth = text('booth')
  const participation_notes = text('participation_notes')
  const description = text('description')
  const link = text('link')
  if (!title || title.length > 120) return { error: '展会名称必填，且不能超过 120 字' } as const
  if (!isCalendarDate(input.start_date) || !isCalendarDate(input.end_date)) {
    return { error: '请提供有效的开始和结束日期（YYYY-MM-DD，1900–2199 年）' } as const
  }
  if (input.end_date < input.start_date) return { error: '结束日期不能早于开始日期' } as const
  if (
    !participationStatuses.includes(input.participation as (typeof participationStatuses)[number])
  ) {
    return { error: '参展状态无效' } as const
  }
  if (input.participation_notes != null && typeof input.participation_notes !== 'string') {
    return { error: '参展信息请填写文字' } as const
  }
  if (participation_notes.length > 2000) {
    return { error: '参展信息不能超过 2000 字' } as const
  }
  if (
    location.length > 255 ||
    booth.length > 100 ||
    description.length > 5000 ||
    link.length > 500
  ) {
    return { error: '地点、摊位、说明或链接超过长度限制' } as const
  }
  if (link) {
    try {
      if (!['https:', 'http:'].includes(new URL(link).protocol)) throw new Error('protocol')
    } catch {
      return { error: '展会链接必须是有效的 HTTP 或 HTTPS 地址' } as const
    }
  }
  return {
    data: {
      title,
      start_date: input.start_date,
      end_date: input.end_date,
      location,
      booth,
      participation: input.participation as (typeof participationStatuses)[number],
      participation_notes,
      description,
      link,
    },
  } as const
}
