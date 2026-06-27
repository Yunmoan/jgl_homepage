export const cleanString = (value: unknown): string | null => {
  if (typeof value !== 'string') return null
  const trimmed = value.trim()
  return trimmed ? trimmed : null
}

export const requiredString = (value: unknown): string | null => {
  return cleanString(value)
}

export const usernamePattern = /^[A-Za-z][A-Za-z0-9_-]{3,31}$/

export const usernameRuleText =
  'Username must start with a letter and contain only letters, numbers, underscores, or hyphens, 4-32 characters'

export const isValidUsername = (value: unknown): value is string => {
  return typeof value === 'string' && usernamePattern.test(value)
}

export const isOneOf = <T extends string>(value: unknown, allowed: readonly T[]): value is T => {
  return typeof value === 'string' && allowed.includes(value as T)
}

export const parseBooleanFlag = (value: unknown): 0 | 1 => {
  return ['1', 1, true, 'true', 'True', 'TRUE'].includes(value as any) ? 1 : 0
}

export const toMysqlDatetime = (input: string): string => {
  const d = new Date(input)
  if (Number.isNaN(d.getTime())) return input

  const pad = (n: number) => String(n).padStart(2, '0')
  const yyyy = d.getFullYear()
  const mm = pad(d.getMonth() + 1)
  const dd = pad(d.getDate())
  const hh = pad(d.getHours())
  const mi = pad(d.getMinutes())
  const ss = pad(d.getSeconds())

  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`
}

export const parseTags = (tags: unknown): string[] => {
  if (Array.isArray(tags)) {
    return tags.map((item) => String(item).trim()).filter(Boolean)
  }

  if (typeof tags !== 'string' || !tags.trim()) {
    return []
  }

  try {
    const parsed = JSON.parse(tags)
    if (Array.isArray(parsed)) {
      return parsed.map((item) => String(item).trim()).filter(Boolean)
    }
    return [String(parsed).trim()].filter(Boolean)
  } catch {
    return tags
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean)
  }
}

export const parseStoredTags = (tags: unknown): string[] => {
  return parseTags(tags).slice(0, 1)
}

export const singleTagJson = (tags: unknown): string | null => {
  const parsed = parseTags(tags)
  if (parsed.length > 1) return null
  return JSON.stringify(parsed.slice(0, 1))
}
