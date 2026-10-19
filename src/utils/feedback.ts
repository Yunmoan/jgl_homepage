const legacyMessages: Record<string, string> = {
  'Invalid credentials': '账号或密码不正确，请检查后重试',
  'Username and password are required': '请输入账号和密码',
  'Username already exists': '该账号已被使用，请更换账号',
  'Account has been disabled': '该账号已停用，如有疑问请联系管理员',
  'Old password is incorrect': '原密码不正确，请检查后重试',
  'No token, authorization denied': '请先登录后再进行此操作',
  'Token user is not valid': '登录状态已失效，请重新登录',
  'Token is not valid': '登录已过期，请重新登录',
  Forbidden: '当前账号没有此操作权限，如有需要请联系管理员',
  'Internal Server Error': '服务暂时不可用，请稍后重试',
  'Too many login attempts from this IP, please try again after 15 minutes':
    '登录尝试过于频繁，请在 15 分钟后重试',
  'Too many registration attempts from this IP, please try again later':
    '申请提交过于频繁，请稍后重试',
}

const asRecord = (value: unknown): Record<string, unknown> =>
  value && typeof value === 'object' ? (value as Record<string, unknown>) : {}

/** Accept Axios errors, fetch response bodies, upload errors and ordinary Errors. */
export function getErrorMessage(error: unknown, fallback = '操作未完成，请稍后重试'): string {
  const source = asRecord(error)
  const response = asRecord(source.response)
  const body = response.data ?? source
  const payload = asRecord(body)
  const candidates = [
    payload.error,
    payload.message,
    typeof body === 'string' ? body : undefined,
    typeof error === 'string' ? error : undefined,
  ]
  for (const value of candidates) {
    if (typeof value !== 'string' || !value.trim()) continue
    const message = value.trim()
    if (Object.prototype.hasOwnProperty.call(legacyMessages, message))
      return legacyMessages[message]!
    // Do not expose HTML error pages, raw SQL errors or browser exceptions to visitors.
    if (message.length <= 500 && /[\u3400-\u9fff]/.test(message) && !/<[^>]+>/.test(message))
      return message
  }
  if (['ECONNABORTED', 'ETIMEDOUT'].includes(String(source.code))) return '请求超时，请稍后重试'
  if (
    source.code === 'ERR_NETWORK' ||
    (!response.status &&
      /(?:network|failed to fetch|fetch failed|load failed)/i.test(String(source.message || error)))
  ) {
    return '网络连接失败，请检查网络后重试'
  }
  const status = Number(response.status ?? source.status)
  if (status === 401) return '登录已过期，请重新登录'
  if (status === 403) return '当前账号没有此操作权限，如有需要请联系管理员'
  if (status === 413) return '文件过大，请压缩后重新上传'
  if (status === 429) return '操作过于频繁，请稍后重试'
  if (status >= 500) return '服务暂时不可用，请稍后重试'
  return fallback
}

export const isDialogDismissed = (reason: unknown) => reason === 'cancel' || reason === 'close'

/** Use the same response parsing for JSON errors and proxy-generated text/HTML pages. */
export async function readApiResponse<T>(response: Response, fallback: string): Promise<T> {
  const text = await response.text()
  let data: unknown
  try {
    data = JSON.parse(text)
  } catch {
    data = undefined
  }
  if (!response.ok)
    throw new Error(getErrorMessage({ response: { status: response.status, data } }, fallback))
  if (data === undefined) throw new Error('服务返回的数据异常，请稍后重试')
  return data as T
}
