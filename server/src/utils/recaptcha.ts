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
    return { ok: false, status: 400, body: { error: 'reCAPTCHA token is missing' } }
  }

  const secret = config.recaptcha.secretKey
  if (!secret) {
    console.error('RECAPTCHA_SECRET_KEY is not configured')
    return {
      ok: false,
      status: 500,
      body: { error: '服务端未配置 reCAPTCHA Secret（RECAPTCHA_SECRET_KEY）' },
    }
  }

  const params = new URLSearchParams()
  params.append('secret', secret)
  params.append('response', token)

  const { data } = await axios.post<RecaptchaResult>(
    'https://recaptcha.net/recaptcha/api/siteverify',
    params,
    {
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      timeout: 5000,
    },
  )

  const errorCodes = data['error-codes']

  if (!data.success) {
    return { ok: false, status: 400, body: { error: 'reCAPTCHA 验证失败', errorCodes } }
  }

  if (typeof data.score === 'number' && data.score < 0.5) {
    return { ok: false, status: 400, body: { error: 'reCAPTCHA 评分过低', score: data.score } }
  }

  if (data.action && data.action !== expectedAction) {
    return {
      ok: false,
      status: 400,
      body: { error: 'reCAPTCHA action 不匹配', action: data.action },
    }
  }

  return { ok: true, status: 200, body: { success: true } }
}
