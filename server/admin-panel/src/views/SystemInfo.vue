<template>
  <div>
    <h2>系统信息</h2>
    <el-descriptions :column="1" border v-if="info">
      <el-descriptions-item label="信息">冀高联官网综合信息系统</el-descriptions-item>
      <el-descriptions-item label="后端版本">{{ info.backendVersion || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="管理面板前端版本">{{ info.frontendVersion || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="Node 版本">{{ info.node }}</el-descriptions-item>
      <el-descriptions-item label="平台">{{ info.platform }}</el-descriptions-item>
      <el-descriptions-item label="运行时长">{{ (info.uptime / 3600).toFixed(2) }} h</el-descriptions-item>
      <el-descriptions-item label="Github"><el-link href="https://github.com/Yunmoan/jgl_homepage"
          target="_blank">https://github.com/Yunmoan/jgl_homepage</el-link></el-descriptions-item>
    </el-descriptions>

    <h2 style="margin-top: 32px">系统负载</h2>
    <el-descriptions :column="1" border v-if="info">
      <el-descriptions-item label="1 分钟负载">{{ info.loadavg?.[0]?.toFixed(2) || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="5 分钟负载">{{ info.loadavg?.[1]?.toFixed(2) || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="15 分钟负载">{{ info.loadavg?.[2]?.toFixed(2) || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="CPU 核心数">{{ info.cpus || 'N/A' }}</el-descriptions-item>
      <el-descriptions-item label="CPU 占用率">
        <el-progress
          :percentage="cpuPercent"
          :color="cpuColor"
          style="max-width: 300px"
        />
      </el-descriptions-item>
      <el-descriptions-item label="总内存">{{ formatBytes(info.totalmem) }}</el-descriptions-item>
      <el-descriptions-item label="可用内存">{{ formatBytes(info.freemem) }}</el-descriptions-item>
      <el-descriptions-item label="内存使用率">
        <el-progress
          :percentage="memoryPercent"
          :color="memoryColor"
          style="max-width: 300px"
        />
      </el-descriptions-item>
    </el-descriptions>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed } from 'vue'
import { ElMessage } from 'element-plus'
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

const loadInfo = async () => {
  try {
    const { data } = await apiClient.get<SystemInfo>('/system/info')
    info.value = data
  } catch {
    ElMessage.error('无法获取系统信息')
  }
}

const formatBytes = (bytes?: number) => {
  if (!bytes) return 'N/A'
  const gb = bytes / (1024 ** 3)
  return `${gb.toFixed(2)} GB`
}

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

const cpuPercent = computed(() => {
  return info.value?.cpu_usage ?? 0
})

const cpuColor = computed(() => {
  const p = cpuPercent.value
  if (p < 60) return '#67c23a'
  if (p < 80) return '#e6a23c'
  return '#f56c6c'
})

onMounted(() => {
  loadInfo()
  const timer = setInterval(loadInfo, 5000)
  onUnmounted(() => clearInterval(timer))
})
</script>
