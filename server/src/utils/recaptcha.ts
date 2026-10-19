import axios from 'axios'
import config from '../config'

interface RecaptchaResult {
  success: boolean
  score?: number
  action?: string
  'error-codes'?: string[]
}

export const verifyRecaptcha = async (token: string | undefined, expectedAction: string) => {
  if (!token) {
    return { ok: false, status: 400, body: { error: '请完成人机验证后重试' } }
  }

  const secret = config.recaptcha.secretKey
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not configured')
    return {
      ok: false,
      status: 500,
      body: { error: '人机验证服务暂时不可用，请稍后重试或联系管理员' },
    }
  }

  const params = new URLSearchParams()
  params.append('secret', secret)
  params.append('response', token)

  let data: RecaptchaResult
  try {
    const response = await axios.post<RecaptchaResult>(
      'https://recaptcha.net/recaptcha/api/siteverify',
      params,
      {
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
        },
        timeout: 5000,
      },
    )
    data = response.data
  } catch (error) {
    console.error('reCAPTCHA service request failed:', error)
    return { ok: false, status: 503, body: { error: '人机验证服务暂时不可用，请稍后重试' } }
  }

  const errorCodes = data['error-codes']

  if (!data.success) {
    console.warn('reCAPTCHA rejected:', errorCodes)
    return { ok: false, status: 400, body: { error: '人机验证未通过，请刷新页面后重试' } }
  }

  if (typeof data.score === 'number' && data.score < 0.5) {
    console.warn('reCAPTCHA score rejected:', data.score)
    return { ok: false, status: 400, body: { error: '人机验证未通过，请稍后重试' } }
  }

  if (data.action && data.action !== expectedAction) {
    return {
      ok: false,
      status: 400,
      body: { error: '人机验证已失效，请刷新页面后重试' },
    }
  }

  return { ok: true, status: 200, body: { success: true } }
}
