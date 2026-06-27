<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>系统信息</h1>
        <p>查看管理面板、后端版本和服务器运行状态。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadInfo">刷新</el-button>
      </div>
    </div>

    <div class="system-grid" v-loading="loading && !info">
      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="card-header">版本信息</div>
        </template>
        <el-descriptions :column="1" border v-if="info">
          <el-descriptions-item label="系统">冀高联官网综合信息系统</el-descriptions-item>
          <el-descriptions-item label="后端版本">{{ info.backendVersion || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="管理面板版本">{{ info.frontendVersion || 'N/A' }}</el-descriptions-item>
          <el-descriptions-item label="Node 版本">{{ info.node }}</el-descriptions-item>
          <el-descriptions-item label="平台">{{ info.platform }}</el-descriptions-item>
          <el-descriptions-item label="运行时长">{{ uptimeText }}</el-descriptions-item>
          <el-descriptions-item label="Github">
            <el-link href="https://github.com/Yunmoan/jgl_homepage" target="_blank" type="primary" :underline="false">
              Yunmoan/jgl_homepage
            </el-link>
          </el-descriptions-item>
        </el-descriptions>
      </el-card>

      <el-card class="table-card" shadow="never">
        <template #header>
          <div class="card-header">系统负载</div>
        </template>
        <div v-if="info" class="health-stack">
          <div class="health-item">
            <div class="health-title">
              <span>CPU 占用率</span>
              <strong>{{ cpuPercent }}%</strong>
            </div>
            <el-progress :percentage="cpuPercent" :color="cpuColor" :stroke-width="10" />
          </div>
          <div class="health-item">
            <div class="health-title">
              <span>内存使用率</span>
              <strong>{{ memoryPercent }}%</strong>
            </div>
            <el-progress :percentage="memoryPercent" :color="memoryColor" :stroke-width="10" />
          </div>
          <div class="metric-list">
            <div><span>1 分钟负载</span><b>{{ formatLoad(info.loadavg?.[0]) }}</b></div>
            <div><span>5 分钟负载</span><b>{{ formatLoad(info.loadavg?.[1]) }}</b></div>
            <div><span>15 分钟负载</span><b>{{ formatLoad(info.loadavg?.[2]) }}</b></div>
            <div><span>CPU 核心数</span><b>{{ info.cpus || 'N/A' }}</b></div>
            <div><span>总内存</span><b>{{ formatBytes(info.totalmem) }}</b></div>
            <div><span>可用内存</span><b>{{ formatBytes(info.freemem) }}</b></div>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import apiClient from '@/api'

interface SystemInfo {
  backendVersion?: string
  frontendVersion?: string
  node: string
  platform: string
  uptime: number
  loadavg?: number[]
  totalmem?: number
  freemem?: number
  cpus?: number
  cpu_usage?: number
}

const info = ref<SystemInfo | null>(null)
const loading = ref(false)
let timer: number | undefined

const loadInfo = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get<SystemInfo>('/system/info')
    info.value = data
  } catch {
    ElMessage.error('无法获取系统信息')
  } finally {
    loading.value = false
  }
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return 'N/A'
  return `${(bytes / 1024 ** 3).toFixed(2)} GB`
}

const formatLoad = (value?: number) => (typeof value === 'number' ? value.toFixed(2) : 'N/A')

const uptimeText = computed(() => {
  const seconds = Math.floor(info.value?.uptime ?? 0)
  const hours = Math.floor(seconds / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${minutes}m`
})

const memoryPercent = computed(() => {
  if (!info.value?.totalmem || !info.value?.freemem) return 0
  return Math.round(((info.value.totalmem - info.value.freemem) / info.value.totalmem) * 100)
})

const memoryColor = computed(() => {
  const p = memoryPercent.value
  if (p < 60) return '#67c23a'
  if (p < 80) return '#e6a23c'
  return '#f56c6c'
})

const cpuPercent = computed(() => info.value?.cpu_usage ?? 0)
const cpuColor = computed(() => {
  const p = cpuPercent.value
  if (p < 60) return '#67c23a'
  if (p < 80) return '#e6a23c'
  return '#f56c6c'
})

onMounted(() => {
  loadInfo()
  timer = window.setInterval(loadInfo, 5000)
})

onUnmounted(() => {
  window.clearInterval(timer)
})
</script>

<style scoped>
.system-grid {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(340px, 0.8fr);
  gap: 16px;
}

.card-header {
  font-weight: 650;
}

.health-stack {
  display: grid;
  gap: 18px;
}

.health-title,
.metric-list div {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.health-title {
  margin-bottom: 8px;
}

.health-title span,
.metric-list span {
  color: var(--muted-text);
  font-size: 13px;
}

.metric-list {
  display: grid;
  gap: 10px;
}

.metric-list b {
  color: var(--text-color);
  font-weight: 650;
}

@media (max-width: 960px) {
  .system-grid {
    grid-template-columns: 1fr;
  }
}
</style>
