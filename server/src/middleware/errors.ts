import type { ErrorRequestHandler } from 'express'

// Keep framework exceptions and request parser failures out of user-facing responses.
export const userFacingErrors: ErrorRequestHandler = (error, _req, res, next) => {
  if (res.headersSent) return next(error)
  const status = Number(error?.status ?? error?.statusCode)
  if (error?.type === 'entity.parse.failed') {
    return res.status(400).json({ error: '提交的数据格式不正确，请刷新页面后重试' })
  }
  if (status === 413 || error?.code === 'LIMIT_FILE_SIZE') {
    return res.status(413).json({ error: '提交的内容或文件过大，请缩减后重试' })
  }
  if (error?.name === 'MulterError') {
    return res.status(400).json({ error: '文件上传未完成，请检查文件后重新上传' })
  }
  const safeStatus = Number.isInteger(status) && status >= 400 && status < 500 ? status : 500
  return res.status(safeStatus).json({
    error: safeStatus >= 500 ? '服务暂时不可用，请稍后重试' : '请求未完成，请检查填写内容后重试',
  })
}
