<template>
  <div class="admin-page system-settings">
    <div class="page-header">
      <div class="page-title">
        <h1>系统设置</h1>
        <p>配置首页展会展示范围、日历数据源与缓存策略。仅管理员可访问。</p>
      </div>
      <div class="page-actions">
        <el-button @click="$router.push('/admin/exhibitions')">前往展会日历</el-button>
      </div>
    </div>
    <el-card shadow="never" class="homepage-settings">
      <div class="settings-heading">
        <div>
          <h2>首页显示设置</h2>
          <p>
            默认随当前月份更新；也可以固定展示某个月，或改为全年日历。独立展会页面保持全年视图。
          </p>
        </div>
        <el-button
          type="primary"
          :loading="settingsSaving"
          :disabled="settingsLoading || !settingsReady"
          @click="saveSettings"
          >保存显示设置</el-button
        >
      </div>
      <el-alert
        v-if="settingsError"
        :title="settingsError"
        type="error"
        :closable="false"
        show-icon
        class="load-error"
      />
      <el-button v-if="settingsError && !settingsReady" @click="loadSettings"
        >重新加载设置</el-button
      >
      <el-form
        label-position="top"
        :disabled="settingsLoading || settingsSaving || !settingsReady"
        class="settings-fields"
      >
        <el-form-item label="首页展示范围"
          ><el-select v-model="homepage.mode" aria-label="首页展示范围"
            ><el-option label="本月（每月自动更新）" value="current_month" /><el-option
              label="指定月份"
              value="fixed_month" /><el-option label="全年日历" value="year" /></el-select
        ></el-form-item>
        <el-form-item v-if="homepage.mode === 'fixed_month'" label="展示月份"
          ><el-date-picker
            v-model="homepage.month"
            type="month"
            value-format="YYYY-MM"
            placeholder="选择首页展示的月份"
            aria-label="展示月份"
        /></el-form-item>
      </el-form>
    </el-card>
    <CalendarSourceSettings :source="source" @changed="loadSourceMetadata" />
  </div>
</template>

<script setup lang="ts">
import { onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { getErrorMessage } from '@/feedback'
import apiClient from '../api'
import CalendarSourceSettings from '../components/CalendarSourceSettings.vue'
import { todayInChina } from '../../../../src/utils/exhibitions'
import type {
  CalendarSourceMetadata,
  ExhibitionResponse,
  HomepageCalendarSettings,
} from '../../../../src/utils/exhibitions'

const today = todayInChina()
const currentYear = Number(today.slice(0, 4))
const homepage = reactive<HomepageCalendarSettings>({
  mode: 'current_month',
  month: today.slice(0, 7),
})
const settingsLoading = ref(true)
const settingsReady = ref(false)
const settingsSaving = ref(false)
const settingsError = ref('')
const settingsController = new AbortController()
const source = ref<CalendarSourceMetadata>()
let sourceController: AbortController | undefined

async function loadSettings() {
  settingsLoading.value = true
  settingsError.value = ''
  try {
    const { data } = await apiClient.get<HomepageCalendarSettings>('/exhibitions/settings', {
      signal: settingsController.signal,
    })
    Object.assign(homepage, data, { month: data.month || todayInChina().slice(0, 7) })
    settingsReady.value = true
  } catch (err) {
    if (!settingsController.signal.aborted)
      settingsError.value = getErrorMessage(err, '首页显示设置加载失败，请刷新页面后重试')
  } finally {
    settingsLoading.value = false
  }
}

async function saveSettings() {
  if (settingsSaving.value || settingsLoading.value) return
  if (homepage.mode === 'fixed_month' && !homepage.month)
    return ElMessage.error('请选择首页展示的月份')
  settingsSaving.value = true
  settingsError.value = ''
  try {
    await apiClient.put('/exhibitions/settings', {
      mode: homepage.mode,
      month: homepage.mode === 'fixed_month' ? homepage.month : null,
    })
    ElMessage.success('首页显示设置已保存，刷新首页即可查看')
  } catch (err) {
    settingsError.value = getErrorMessage(err, '首页显示设置保存失败，请稍后重试')
  } finally {
    settingsSaving.value = false
  }
}

// The source status is part of the public response; it also reports cache age and warnings.
async function loadSourceMetadata() {
  sourceController?.abort()
  const request = new AbortController()
  sourceController = request
  try {
    const { data } = await apiClient.get<ExhibitionResponse>('/exhibitions/public', {
      params: { year: currentYear },
      signal: request.signal,
    })
    if (!request.signal.aborted) source.value = data.source
  } catch {
    // The settings form remains usable even if the status probe fails.
  }
}

onBeforeUnmount(() => {
  settingsController.abort()
  sourceController?.abort()
})
loadSettings()
loadSourceMetadata()
</script>

<style scoped>
.settings-heading {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  margin-bottom: 16px;
}
.settings-heading h2 {
  margin: 0;
  font-size: 16px;
}
.settings-heading p {
  margin: 8px 0 0;
  font-size: 13px;
  line-height: 1.7;
  color: var(--muted-text);
}
.settings-fields {
  display: flex;
  flex-wrap: wrap;
  gap: 16px;
}
.settings-fields .el-form-item {
  width: 260px;
  margin-bottom: 0;
}
.load-error {
  margin-bottom: 16px;
}
@media (max-width: 640px) {
  .settings-heading {
    flex-direction: column;
  }
  .settings-fields .el-form-item {
    width: 100%;
  }
}
</style>
