<template>
  <div class="application-profile-form">
    <section class="form-section">
      <div class="section-head">
        <span>01</span>
        <strong>社团资料</strong>
      </div>
      <div class="form-grid">
        <el-form-item label="社团名称" required>
          <el-input :model-value="modelValue.clubName" maxlength="80" @update:model-value="updateField('clubName', String($event))" />
        </el-form-item>
        <el-form-item label="社团链接">
          <el-input :model-value="modelValue.clubLink" placeholder="官网、主页或介绍页链接" @update:model-value="updateField('clubLink', String($event))" />
        </el-form-item>
      </div>
      <el-form-item label="申请说明">
        <el-input
          :model-value="modelValue.applicationReason"
          type="textarea"
          :rows="4"
          maxlength="500"
          show-word-limit
          placeholder="可补充社团简介、申请原因、展示内容范围等"
          @update:model-value="updateField('applicationReason', String($event))"
        />
      </el-form-item>
    </section>

    <section class="form-section">
      <div class="section-head">
        <span>02</span>
        <strong>联系人</strong>
      </div>
      <div class="form-grid three">
        <el-form-item label="联系人" required>
          <el-input :model-value="modelValue.contactName" @update:model-value="updateField('contactName', String($event))" />
        </el-form-item>
        <el-form-item label="联系人 QQ">
          <el-input :model-value="modelValue.contactQQ" inputmode="numeric" @update:model-value="updateField('contactQQ', String($event))" />
        </el-form-item>
        <el-form-item label="社团群 QQ">
          <el-input :model-value="modelValue.clubGroupQQ" inputmode="numeric" @update:model-value="updateField('clubGroupQQ', String($event))" />
        </el-form-item>
      </div>
    </section>

    <section class="form-section">
      <div class="section-head">
        <span>03</span>
        <strong>社团 Logo <em v-if="requireLogo">*</em></strong>
      </div>
      <div class="logo-field">
        <div class="logo-preview" :class="{ empty: !modelValue.clubLogo }">
          <img v-if="modelValue.clubLogo" :src="modelValue.clubLogo" alt="社团 Logo" />
          <span v-else>Logo</span>
        </div>
        <div class="logo-side">
          <div class="logo-actions">
            <el-button type="primary" plain @click="pickLogo">
              {{ modelValue.clubLogo ? '重新选择' : '选择图片' }}
            </el-button>
            <el-button v-if="modelValue.clubLogo" type="danger" plain @click="updateField('clubLogo', '')">
              移除
            </el-button>
          </div>
          <p>{{ requireLogo ? 'Logo 为申请必填项。' : '可留空后由管理员补充。' }}支持 JPG、PNG、WebP，上传前会裁切成方形 WebP。</p>
        </div>
      </div>
    </section>

    <input
      ref="logoInputRef"
      class="hidden-input"
      type="file"
      accept="image/jpeg,image/png,image/webp"
      @change="handleLogoChange"
    />

    <el-dialog v-model="logoDialogVisible" title="编辑社团 Logo" width="720px" append-to-body>
      <div class="crop-layout">
        <div class="crop-frame">
          <img
            v-if="logoSourceUrl"
            :src="logoSourceUrl"
            class="crop-image"
            :style="{ transform: `scale(${logoZoom})` }"
            alt="待裁切 Logo"
          />
        </div>
        <div class="crop-side">
          <span>预览</span>
          <div class="crop-preview">
            <img
              v-if="logoSourceUrl"
              :src="logoSourceUrl"
              :style="{ transform: `scale(${logoZoom})` }"
              alt="Logo 预览"
            />
          </div>
        </div>
      </div>
      <label class="slider-line">
        <span>缩放</span>
        <el-slider v-model="logoZoom" :min="1" :max="2.6" :step="0.05" />
      </label>
      <template #footer>
        <el-button @click="cancelLogo">取消</el-button>
        <el-button type="primary" :loading="logoSaving" @click="saveLogo">确认并上传</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, ref } from 'vue'
import { ElMessage } from 'element-plus'
import apiClient from '@/api'

interface ApplicationProfileFormModel {
  clubName: string
  clubLogo: string
  clubLink: string
  clubGroupQQ: string
  contactName: string
  contactQQ: string
  applicationReason: string
}

const props = defineProps<{
  modelValue: ApplicationProfileFormModel
  requireLogo?: boolean
}>()
const requireLogo = props.requireLogo ?? false

const emit = defineEmits<{
  (event: 'update:modelValue', value: ApplicationProfileFormModel): void
}>()

const logoInputRef = ref<HTMLInputElement | null>(null)
const logoDialogVisible = ref(false)
const logoSaving = ref(false)
const logoZoom = ref(1)
const logoSourceUrl = ref('')
let logoObjectUrl: string | null = null

const updateField = <K extends keyof ApplicationProfileFormModel>(key: K, value: ApplicationProfileFormModel[K]) => {
  emit('update:modelValue', { ...props.modelValue, [key]: value })
}

const cleanupLogo = () => {
  if (logoObjectUrl) {
    URL.revokeObjectURL(logoObjectUrl)
    logoObjectUrl = null
  }
}

const pickLogo = () => logoInputRef.value?.click()

const handleLogoChange = (event: Event) => {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file) return
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
    ElMessage.error('Logo 只支持 JPG、PNG、WebP')
    return
  }
  if (file.size > 5 * 1024 * 1024) {
    ElMessage.error('Logo 不能超过 5MB')
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
    const { data } = await apiClient.post('/upload/public?type=application_logos', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    updateField('clubLogo', data?.filePath || '')
    logoDialogVisible.value = false
    logoSourceUrl.value = ''
    cleanupLogo()
    ElMessage.success('Logo 已上传')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.message || error?.message || 'Logo 上传失败')
  } finally {
    logoSaving.value = false
  }
}

onBeforeUnmount(cleanupLogo)
</script>

<style scoped>
.application-profile-form {
  display: grid;
  gap: 18px;
}

.form-section {
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  padding: 16px 16px 4px;
  background: var(--el-fill-color-extra-light);
}

.section-head {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 14px;
}

.section-head span {
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 6px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 12px;
  font-weight: 700;
}

.section-head strong {
  color: var(--el-text-color-primary);
  font-size: 15px;
}

.section-head em {
  color: var(--el-color-danger);
  font-style: normal;
}

.form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0 16px;
}

.form-grid.three {
  grid-template-columns: repeat(3, minmax(0, 1fr));
}

.logo-field {
  display: grid;
  grid-template-columns: 120px minmax(0, 1fr);
  gap: 16px;
  align-items: center;
  padding-bottom: 14px;
}

.logo-preview {
  width: 120px;
  height: 120px;
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--el-border-color);
  border-radius: 8px;
  background: #fff;
}

.logo-preview.empty {
  border-style: dashed;
  color: var(--el-text-color-placeholder);
}

.logo-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.logo-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
}

.logo-side p {
  margin: 10px 0 0;
  color: var(--muted-text);
  font-size: 12px;
  line-height: 1.6;
}

.hidden-input {
  display: none;
}

.crop-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 160px;
  gap: 18px;
}

.crop-frame,
.crop-preview {
  display: grid;
  place-items: center;
  overflow: hidden;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 8px;
  background: var(--el-fill-color-extra-light);
}

.crop-frame {
  height: 360px;
}

.crop-preview {
  width: 140px;
  height: 140px;
  margin-top: 10px;
}

.crop-image,
.crop-preview img {
  max-width: 100%;
  max-height: 100%;
  object-fit: contain;
  transition: transform 0.15s ease;
}

.crop-side {
  color: var(--muted-text);
  font-size: 13px;
}

.slider-line {
  display: grid;
  grid-template-columns: 48px minmax(0, 1fr);
  gap: 12px;
  align-items: center;
  margin-top: 18px;
}

@media (max-width: 760px) {
  .form-grid,
  .form-grid.three,
  .logo-field,
  .crop-layout {
    grid-template-columns: 1fr;
  }
}
</style>
