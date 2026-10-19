export { getErrorMessage, isDialogDismissed } from '../../../src/utils/feedback'
import { getErrorMessage } from '../../../src/utils/feedback'
import { ElMessage } from 'element-plus'

export function showUploadError(error: unknown) {
  let detail: unknown = error
  if (error instanceof Error) {
    try {
      detail = JSON.parse(error.message)
    } catch {
      /* Browser or transport error. */
    }
  }
  ElMessage.error(getErrorMessage(detail, '图片上传失败，请检查文件后重试'))
}
