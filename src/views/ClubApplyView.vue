<template>
  <main class="apply-page">
    <div class="apply-wrap">
      <section class="page-head">
        <div>
          <p class="eyebrow">社团入驻</p>
          <h1>社团注册申请表</h1>
          <p class="lead">请一次性提交完整资料。账号会立即创建，但审核通过前只能查看申请状态。</p>
        </div>
        <div v-if="me" class="status-pill" :data-status="me.status">
          {{ statusLabel(me.status) }}
        </div>
      </section>

      <section v-if="!submitted" class="apply-layout">
        <form class="form-panel" @submit.prevent="submitApplication">
          <div class="form-section">
            <div class="section-title">
              <span>01</span>
              <h2>登录账号</h2>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>账号 <b>*</b></span>
                <input v-model.trim="form.username" autocomplete="username" placeholder="例如 club_union"
                  @input="clearFormError" />
                <small>4-32 位，仅限英文字母、数字、下划线或短横线，必须以英文字母开头。</small>
              </label>
              <label class="field">
                <span>密码 <b>*</b></span>
                <input v-model="form.password" type="password" autocomplete="new-password" placeholder="至少 8 位"
                  @input="clearFormError" />
              </label>
              <label class="field">
                <span>确认密码 <b>*</b></span>
                <input v-model="form.confirmPassword" type="password" autocomplete="new-password" placeholder="再次输入密码"
                  @input="clearFormError" />
              </label>
            </div>
            <p v-if="formError" class="form-error">{{ formError }}</p>
          </div>

          <div class="form-section">
            <div class="section-title">
              <span>02</span>
              <h2>社团资料</h2>
            </div>
            <div class="grid-2">
              <label class="field">
                <span>社团名称 <b>*</b></span>
                <input v-model.trim="form.clubName" placeholder="请填写完整名称，如XXX东方同好会" />
              </label>
              <label class="field">
                <span>社团链接</span>
                <input v-model.trim="form.clubLink" placeholder="官网、主页、QQ群链接或介绍页链接" />
              </label>
            </div>
            <label class="field">
              <span>申请说明</span>
              <textarea v-model.trim="form.applicationReason" rows="5" maxlength="500"
                placeholder="可补充社团简介、申请原因、展示内容范围等"></textarea>
            </label>
          </div>

          <div class="form-section">
            <div class="section-title">
              <span>03</span>
              <h2>联系人</h2>
            </div>
            <div class="grid-3">
              <label class="field">
                <span>联系人 <b>*</b></span>
                <input v-model.trim="form.contactName" placeholder="负责人或对接人" />
              </label>
              <label class="field">
                <span>联系人 QQ</span>
                <input v-model.trim="form.contactQQ" inputmode="numeric" placeholder="个人 QQ" />
              </label>
              <label class="field">
                <span>社团群 QQ</span>
                <input v-model.trim="form.clubGroupQQ" inputmode="numeric" placeholder="群号" />
              </label>
            </div>
          </div>

          <div class="submit-row">
            <p>提交后将自动登录到审核状态页。后续可访问 admin.hbutu.cn 查看审核结果。</p>
            <button type="submit" class="primary-btn" :disabled="loading">
              {{ loading ? '提交中...' : '提交申请' }}
            </button>
          </div>
        </form>

        <aside class="side-panel">
          <div class="side-block">
            <div class="side-title">
              <h2>社团 Logo</h2>
              <span>建议方形图</span>
            </div>
            <div class="logo-drop" :class="{ filled: form.clubLogo }">
              <img v-if="form.clubLogo" :src="form.clubLogo" alt="社团 Logo 预览" />
              <div v-else class="logo-empty">Logo</div>
            </div>
            <div class="logo-actions">
              <button type="button" class="ghost-btn" @click="pickLogo">
                {{ form.clubLogo ? '重新选择' : '选择图片' }}
              </button>
              <button v-if="form.clubLogo" type="button" class="ghost-btn danger" @click="clearLogo">移除</button>
            </div>
            <p class="hint">支持 JPG、PNG、WEBP，上传前可在弹窗中裁切并缩放。</p>
          </div>

          <div class="side-block">
            <div class="side-title">
              <h2>审核材料</h2>
              <span>请确认</span>
            </div>
            <ul class="check-list">
              <li>社团名称与公开展示名称一致</li>
              <li>联系人 QQ 能够接收审核反馈</li>
              <li>社团链接和说明便于管理员核验</li>
            </ul>
          </div>
        </aside>
      </section>

      <section v-else class="status-panel">
        <div class="status-card">
          <div class="status-head">
            <div>
              <p class="eyebrow">申请状态</p>
              <h2>{{ statusLabel(me?.status || 'pending') }}</h2>
              <p>账号已创建。审核通过前不会获得成员权限。<br />可使用该账号登录后台查询、修改或撤回申请。</p>
            </div>
            <div class="status-badge" :data-status="me?.status || 'pending'">
              {{ statusLabel(me?.status || 'pending') }}
            </div>
          </div>

          <div class="summary-grid">
            <div>
              <span>账号</span>
              <strong>{{ me?.username || form.username }}</strong>
            </div>
            <div>
              <span>社团名称</span>
              <strong>{{ me?.club_name || form.clubName }}</strong>
            </div>
            <div>
              <span>联系人</span>
              <strong>{{ me?.contact_name || form.contactName }}</strong>
            </div>
            <div>
              <span>联系人 QQ</span>
              <strong>{{ me?.contact_qq || form.contactQQ || '-' }}</strong>
            </div>
            <div>
              <span>社团群 QQ</span>
              <strong>{{ me?.club_group_qq || form.clubGroupQQ || '-' }}</strong>
            </div>
            <div>
              <span>社团链接</span>
              <strong>{{ me?.club_link || form.clubLink || '-' }}</strong>
            </div>
          </div>

          <div class="review-note">
            <p v-if="me?.status === 'rejected' && me.review_note">{{ me.review_note }}</p>
            <p v-else-if="me?.status === 'approved'">已经通过审核，请访问 admin.hbutu.cn 登录后台使用成员权限。</p>
            <p v-else-if="me?.status === 'withdrawn'">申请已撤回。请访问后台登录地址，使用当前账号登录后修改资料并重新提交。</p>
            <p v-else>已提交，等待管理员审核。审核通知将会优先联络联系人 QQ 和社团群 QQ。<br />当前页面仅在本设备可见，若要在其他设备检查审核状态或修改/撤回申请，请访问后台登录地址并使用当前账号登录。</p>
          </div>

          <div class="next-steps">
            <div>
              <span>后台登录地址</span>
              <a href="https://admin.hbutu.cn" target="_blank" rel="noreferrer">admin.hbutu.cn</a>
            </div>
            <div>
              <span>通知渠道</span>
              <strong>联系人 QQ / 社团群 QQ</strong>
            </div>
          </div>
        </div>

        <aside v-if="me?.club_logo || form.clubLogo" class="status-logo">
          <span>提交的 Logo</span>
          <img :src="me?.club_logo || form.clubLogo" alt="社团 Logo" />
        </aside>
      </section>
    </div>

    <div v-if="logoDialogVisible" class="dialog-mask">
      <div class="dialog-card">
        <div class="dialog-title">
          <div>
            <h2>编辑社团 Logo</h2>
            <p>拖动滑块调整裁切比例，确认后会上传为方形 WebP。</p>
          </div>
          <button type="button" class="icon-close" aria-label="关闭" @click="cancelLogo">×</button>
        </div>
        <div class="crop-layout">
          <div class="crop-frame">
            <img v-if="logoSourceUrl" :src="logoSourceUrl" class="crop-image"
              :style="{ transform: `scale(${logoZoom})` }" alt="待裁切 Logo" />
          </div>
          <div class="crop-side">
            <span>预览</span>
            <div class="crop-preview">
              <img v-if="logoSourceUrl" :src="logoSourceUrl" :style="{ transform: `scale(${logoZoom})` }"
                alt="Logo 预览" />
            </div>
          </div>
        </div>
        <label class="slider-line">
          <span>缩放</span>
          <input v-model.number="logoZoom" type="range" min="1" max="2.6" step="0.05" />
        </label>
        <div class="dialog-actions">
          <button type="button" class="ghost-btn" @click="cancelLogo">取消</button>
          <button type="button" class="primary-btn" :disabled="logoSaving" @click="saveLogo">
            {{ logoSaving ? '处理中...' : '确认并上传' }}
          </button>
        </div>
      </div>
    </div>

    <input ref="logoInputRef" class="hidden-input" type="file" accept="image/jpeg,image/png,image/webp"
      @change="handleLogoChange" />
  </main>
</template>

<script setup lang="ts">
import { onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useReCaptcha } from 'vue-recaptcha-v3'

interface MeInfo {
  username: string
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'withdrawn'
  club_name?: string
  club_logo?: string
  club_link?: string
  club_group_qq?: string
  contact_name?: string
  contact_qq?: string
  application_reason?: string
  review_note?: string
}

const loading = ref(false)
const submitted = ref(false)
const me = ref<MeInfo | null>(null)
const logoDialogVisible = ref(false)
const logoSaving = ref(false)
const logoZoom = ref(1)
const logoInputRef = ref<HTMLInputElement | null>(null)
const logoSourceUrl = ref('')
const recaptcha = useReCaptcha()
let logoObjectUrl: string | null = null

const form = reactive({
  username: '',
  password: '',
  confirmPassword: '',
  clubName: '',
  clubLink: '',
  clubLogo: '',
  contactName: '',
  contactQQ: '',
  clubGroupQQ: '',
  applicationReason: '',
})
const formError = ref('')
const usernamePattern = /^[A-Za-z][A-Za-z0-9_-]{3,31}$/

const statusLabel = (status: MeInfo['status']) =>
  ({
    pending: '审核中',
    approved: '已通过',
    rejected: '已驳回',
    disabled: '已禁用',
    withdrawn: '已撤回',
  })[status]

const cleanupLogo = () => {
  if (logoObjectUrl) {
    URL.revokeObjectURL(logoObjectUrl)
    logoObjectUrl = null
  }
}

const pickLogo = () => logoInputRef.value?.click()

const clearLogo = () => {
  form.clubLogo = ''
}

const handleLogoChange = async (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    alert('Logo 只支持 JPG、PNG、WEBP')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    alert('Logo 不能超过 5MB')
    return
  }
  cleanupLogo()
  logoObjectUrl = URL.createObjectURL(file)
  logoSourceUrl.value = logoObjectUrl
  logoZoom.value = 1
  logoDialogVisible.value = true
}

const cancelLogo = () => {
  logoDialogVisible.value = false
  logoSourceUrl.value = ''
  cleanupLogo()
}

const buildLogoBlob = async () => {
  if (!logoSourceUrl.value) return null
  const image = new Image()
  image.src = logoSourceUrl.value
  await new Promise<void>((resolve, reject) => {
    image.onload = () => resolve()
    image.onerror = () => reject(new Error('Logo 加载失败'))
  })

  const size = 512
  const canvas = document.createElement('canvas')
  canvas.width = size
  canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('Canvas unavailable')

  const cropSide = Math.min(image.width, image.height) / logoZoom.value
  const sx = (image.width - cropSide) / 2
  const sy = (image.height - cropSide) / 2
  ctx.drawImage(image, sx, sy, cropSide, cropSide, 0, 0, size, size)

  return await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/webp', 0.92))
}

const saveLogo = async () => {
  logoSaving.value = true
  try {
    const blob = await buildLogoBlob()
    if (!blob) throw new Error('Logo 处理失败')
    const fd = new FormData()
    fd.append('image', blob, 'club-logo.webp')
    const response = await fetch('/api/upload/public?type=application_logos', {
      method: 'POST',
      body: fd,
    })
    const data = await response.json()
    if (!response.ok) throw new Error(data?.message || 'Logo 上传失败')
    form.clubLogo = data?.filePath || ''
    logoDialogVisible.value = false
    logoSourceUrl.value = ''
    cleanupLogo()
  } catch (error: any) {
    alert(error?.message || 'Logo 上传失败')
  } finally {
    logoSaving.value = false
  }
}

const authHeaders = (): Record<string, string> => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
}

const loadMe = async () => {
  const token = localStorage.getItem('token')
  if (!token) return
  try {
    const response = await fetch('/api/users/me', {
      headers: authHeaders(),
    })
    if (!response.ok) return
    me.value = await response.json()
    submitted.value = true
  } catch {
    me.value = null
  }
}

const clearFormError = () => {
  formError.value = ''
}

const validateForm = () => {
  if (!form.username || !form.password || !form.confirmPassword || !form.clubName || !form.contactName || !form.clubLogo) {
    return '请填写账号、密码、确认密码、社团名称、联系人并上传社团 Logo'
  }
  if (!usernamePattern.test(form.username)) {
    return '账号需为 4-32 位，仅限英文字母、数字、下划线或短横线，并且必须以英文字母开头'
  }
  if (form.password.length < 8) {
    return '密码至少需要 8 位'
  }
  if (form.password !== form.confirmPassword) {
    return '两次输入的密码不一致'
  }
  return ''
}

const submitApplication = async () => {
  const validationError = validateForm()
  if (validationError) {
    formError.value = validationError
    return
  }
  loading.value = true
  try {
    if (!recaptcha) {
      throw new Error('reCAPTCHA 未初始化，请稍后重试')
    }
    await recaptcha.recaptchaLoaded()
    const token = await recaptcha.executeRecaptcha('submit_club_application')
    if (!token) {
      throw new Error('人机验证失败，请稍后重试')
    }

    const response = await fetch('/api/auth/register', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ...form, token }),
    })
    const data = await response.json()
    if (!response.ok) {
      throw new Error(data?.error || '提交失败')
    }
    if (data?.token) {
      localStorage.setItem('token', data.token)
      await loadMe()
      submitted.value = true
      return
    }
    submitted.value = true
  } catch (error: any) {
    alert(error?.message || '提交失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadMe)

onBeforeUnmount(() => {
  cleanupLogo()
})
</script>

<style scoped>
.apply-page {
  min-height: 100vh;
  padding: 118px 0 64px;
  background: linear-gradient(#263d6a, #235b72);
}

.apply-page,
.apply-page *,
.apply-page *::before,
.apply-page *::after {
  box-sizing: border-box;
}

.apply-wrap {
  width: min(1360px, calc(100% - 32px));
  margin: 0 auto;
}

.page-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 20px;
  margin-bottom: 28px;
  color: #fff;
  border-bottom: 2px solid rgba(118, 62, 71, 0.92);
  padding-bottom: 14px;
}

.eyebrow {
  margin: 0 0 8px;
  color: rgba(216, 227, 231, 0.78);
  font-size: 0.92rem;
}

.page-head h1,
.status-head h2 {
  margin: 0;
  font-size: 2.2rem;
  line-height: 1.25;
  letter-spacing: 0;
}

.lead,
.status-head p {
  margin: 10px 0 0;
  color: rgba(216, 227, 231, 0.86);
  font-size: 0.98rem;
  line-height: 1.7;
}

.status-pill,
.status-badge {
  flex: 0 0 auto;
  padding: 7px 11px;
  border: 1px solid rgba(255, 255, 255, 0.32);
  border-radius: 6px;
  font-size: 13px;
  color: #fff;
}

.status-badge {
  border-color: rgba(255, 255, 255, 0.22);
  color: #fff;
}

.status-pill[data-status='pending'],
.status-badge[data-status='pending'] {
  background: #fff7e6;
  color: #8a5700;
}

.status-pill[data-status='approved'],
.status-badge[data-status='approved'] {
  background: #eaf8ef;
  color: #17643a;
}

.status-pill[data-status='rejected'],
.status-badge[data-status='rejected'] {
  background: #fff0f0;
  color: #a4262c;
}

.status-pill[data-status='disabled'],
.status-badge[data-status='disabled'] {
  background: #eef1f5;
  color: #4b5563;
}

.apply-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(280px, 320px);
  gap: 22px;
  align-items: start;
}

.form-panel,
.side-panel,
.status-card,
.status-logo {
  background: rgba(15, 23, 42, 0.22);
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
  box-shadow: none;
  color: #d8e3e7;
}

.form-panel {
  padding: 26px 28px;
}

.form-section+.form-section {
  margin-top: 26px;
  padding-top: 24px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.section-title,
.side-title,
.submit-row,
.status-head,
.dialog-title {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 14px;
}

.section-title {
  justify-content: flex-start;
  align-items: center;
  margin-bottom: 16px;
}

.section-title span {
  width: 30px;
  height: 30px;
  display: grid;
  place-items: center;
  border: 1px solid rgba(216, 227, 231, 0.32);
  border-radius: 6px;
  color: #d8e3e7;
  font-size: 12px;
  font-weight: 700;
}

.section-title h2,
.side-title h2,
.dialog-title h2 {
  margin: 0;
  color: #fff;
  font-size: 16px;
  line-height: 1.35;
}

.grid-2,
.grid-3 {
  display: grid;
  gap: 14px;
}

.grid-2 {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 320px), 1fr));
}

.grid-3 {
  grid-template-columns: repeat(auto-fit, minmax(min(100%, 240px), 1fr));
}

.field {
  display: flex;
  flex-direction: column;
  gap: 8px;
  color: #d8e3e7;
  font-size: 13px;
}

.field b {
  color: #b42318;
  font-weight: 600;
}

.field small {
  color: rgba(216, 227, 231, 0.68);
  font-size: 12px;
  line-height: 1.55;
}

.field input,
.field textarea {
  width: 100%;
  min-width: 0;
  border: 1px solid rgba(216, 227, 231, 0.26);
  border-radius: 6px;
  padding: 11px 12px;
  background: rgba(15, 23, 42, 0.22);
  color: #f8fafc;
  font: inherit;
  line-height: 1.45;
  outline: none;
}

.field input::placeholder,
.field textarea::placeholder {
  color: rgba(216, 227, 231, 0.5);
}

.field input:focus,
.field textarea:focus {
  border-color: rgba(231, 163, 62, 0.82);
  box-shadow: 0 0 0 2px rgba(231, 163, 62, 0.14);
}

.field textarea {
  resize: vertical;
}

.form-error {
  margin: 14px 0 0;
  border: 1px solid rgba(180, 35, 24, 0.42);
  border-radius: 6px;
  padding: 10px 12px;
  background: rgba(180, 35, 24, 0.14);
  color: #ffd7d3;
  font-size: 13px;
  line-height: 1.5;
}

.submit-row {
  align-items: center;
  margin-top: 26px;
  padding-top: 20px;
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.submit-row p,
.hint,
.side-title span,
.dialog-title p {
  margin: 0;
  color: rgba(216, 227, 231, 0.72);
  font-size: 12px;
  line-height: 1.6;
}

.primary-btn,
.ghost-btn,
.icon-close {
  min-height: 38px;
  border: 1px solid transparent;
  border-radius: 6px;
  padding: 0 14px;
  font: inherit;
  cursor: pointer;
}

.primary-btn {
  background: rgba(231, 163, 62, 0.82);
  color: #fff;
}

.primary-btn:disabled {
  opacity: 0.65;
  cursor: wait;
}

.ghost-btn {
  background: rgba(15, 23, 42, 0.18);
  border-color: rgba(216, 227, 231, 0.28);
  color: #d8e3e7;
}

.ghost-btn.danger {
  color: #b42318;
}

.side-panel {
  display: grid;
  gap: 0;
  min-width: 0;
}

.side-block {
  padding: 20px;
}

.side-block+.side-block {
  border-top: 1px solid rgba(255, 255, 255, 0.12);
}

.logo-drop {
  width: 136px;
  height: 136px;
  display: grid;
  place-items: center;
  margin: 16px 0 14px;
  overflow: hidden;
  border: 1px dashed rgba(216, 227, 231, 0.38);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.18);
}

.logo-drop.filled {
  border-style: solid;
  background: rgba(255, 255, 255, 0.05);
}

.logo-drop img,
.status-logo img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-empty {
  color: rgba(216, 227, 231, 0.62);
  font-size: 13px;
}

.logo-actions {
  display: flex;
  gap: 8px;
  flex-wrap: wrap;
  margin-bottom: 10px;
}

.check-list {
  display: grid;
  gap: 10px;
  margin: 14px 0 0;
  padding: 0;
  list-style: none;
  color: rgba(216, 227, 231, 0.88);
  font-size: 13px;
  line-height: 1.55;
}

.check-list li {
  padding-left: 16px;
  position: relative;
}

.check-list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.72em;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: rgba(231, 163, 62, 0.82);
}

.status-panel {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 220px;
  gap: 18px;
  align-items: start;
}

.status-card {
  padding: 26px 28px;
}

.status-head .eyebrow {
  color: rgba(216, 227, 231, 0.7);
}

.status-head h2 {
  color: #fff;
}

.status-head p {
  color: rgba(216, 227, 231, 0.82);
}

.summary-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 22px;
}

.summary-grid div {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.18);
}

.summary-grid span {
  display: block;
  color: rgba(216, 227, 231, 0.66);
  font-size: 12px;
}

.summary-grid strong {
  display: block;
  margin-top: 6px;
  color: #fff;
  font-size: 14px;
  word-break: break-word;
}

.review-note {
  margin-top: 16px;
  padding: 13px 14px;
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.18);
  color: #d8e3e7;
}

.review-note p {
  margin: 0;
  line-height: 1.7;
}

.next-steps {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 12px;
  margin-top: 14px;
}

.next-steps div {
  padding: 12px;
  border: 1px solid rgba(255, 255, 255, 0.14);
  border-radius: 6px;
  background: rgba(15, 23, 42, 0.18);
}

.next-steps span {
  display: block;
  color: rgba(216, 227, 231, 0.66);
  font-size: 12px;
}

.next-steps a,
.next-steps strong {
  display: block;
  margin-top: 6px;
  color: #fff;
  font-size: 14px;
  font-weight: 600;
  word-break: break-word;
}

.next-steps a {
  color: #f0b85a;
  text-decoration: none;
}

.status-logo {
  padding: 16px;
  color: rgba(216, 227, 231, 0.78);
  font-size: 13px;
}

.status-logo img {
  display: block;
  width: 160px;
  height: 160px;
  margin-top: 12px;
  border: 1px solid rgba(255, 255, 255, 0.16);
  border-radius: 8px;
}

.dialog-mask {
  position: fixed;
  inset: 0;
  z-index: 2000;
  display: grid;
  place-items: center;
  padding: 20px;
  background: rgba(15, 23, 42, 0.58);
}

.dialog-card {
  width: min(680px, 100%);
  padding: 20px;
  border-radius: 8px;
  background: #263d6a;
  color: #d8e3e7;
  box-shadow: 0 18px 48px rgba(15, 23, 42, 0.24);
}

.icon-close {
  width: 34px;
  min-height: 34px;
  padding: 0;
  background: rgba(15, 23, 42, 0.18);
  border-color: rgba(216, 227, 231, 0.28);
  color: #d8e3e7;
  font-size: 20px;
  line-height: 1;
}

.crop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 144px;
  gap: 16px;
  margin-top: 16px;
}

.crop-frame,
.crop-preview {
  overflow: hidden;
  border: 1px solid rgba(216, 227, 231, 0.28);
  border-radius: 8px;
  background: rgba(15, 23, 42, 0.18);
}

.crop-frame {
  aspect-ratio: 1 / 1;
}

.crop-preview {
  width: 120px;
  height: 120px;
  margin-top: 8px;
}

.crop-image,
.crop-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transform-origin: center center;
}

.crop-side {
  color: rgba(216, 227, 231, 0.72);
  font-size: 13px;
}

.slider-line {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-top: 16px;
  color: #d8e3e7;
  font-size: 13px;
}

.slider-line input[type='range'] {
  width: 100%;
}

.dialog-actions {
  display: flex;
  justify-content: flex-end;
  gap: 10px;
  margin-top: 18px;
}

.hidden-input {
  display: none;
}

@media (max-width: 1180px) {
  .apply-page {
    padding: 104px 0 48px;
  }

  .apply-layout,
  .status-panel {
    grid-template-columns: 1fr;
  }

  .side-panel {
    order: 0;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .side-block+.side-block {
    border-top: 0;
    border-left: 1px solid rgba(255, 255, 255, 0.12);
  }
}

@media (max-width: 640px) {
  .apply-wrap {
    width: min(100% - 24px, 1180px);
  }

  .page-head,
  .submit-row,
  .status-head,
  .dialog-title {
    flex-direction: column;
  }

  .page-head h1,
  .status-head h2 {
    font-size: 1.8rem;
  }

  .grid-2,
  .grid-3,
  .summary-grid,
  .next-steps,
  .crop-layout {
    grid-template-columns: 1fr;
  }

  .side-panel {
    grid-template-columns: 1fr;
  }

  .side-block+.side-block {
    border-left: 0;
    border-top: 1px solid rgba(255, 255, 255, 0.12);
  }

  .form-panel,
  .status-card {
    padding: 18px 16px;
  }

  .side-block {
    padding: 16px;
  }

  .logo-drop {
    width: 120px;
    height: 120px;
  }
}
</style>
