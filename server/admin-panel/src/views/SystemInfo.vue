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
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import apiClient from '@/api'

const info = ref<any>(null)

const loadInfo = async () => {
  try {
    const { data } = await apiClient.get('/system/info')
    info.value = data
  } catch (err) {
    ElMessage.error('无法获取系统信息')
  }
}

onMounted(loadInfo)
</script>
