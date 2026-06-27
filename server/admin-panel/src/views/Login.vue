<template>
  <div class="login-shell">
    <el-card class="panel" shadow="never">
      <div class="panel-head">
        <div>
          <h1>管理后台</h1>
          <p>社团账号请使用申请时填写的账号登录。</p>
        </div>
      </div>

      <el-form :model="loginForm" label-position="top" @submit.prevent>
        <el-form-item label="账号">
          <el-input v-model="loginForm.username" autocomplete="username" />
        </el-form-item>
        <el-form-item label="密码">
          <el-input v-model="loginForm.password" type="password" show-password autocomplete="current-password" />
        </el-form-item>
        <div class="actions">
          <el-button type="primary" :loading="loading" @click="onLogin">登录</el-button>
        </div>
      </el-form>

      <div class="apply-entry">
        <div>
          <strong>还没有社团账号？</strong>
          <span>请先在前台填写完整申请表。提交后可回到 admin.hbutu.cn 查看审核状态。</span>
        </div>
        <el-button @click="openApplyPage">申请注册社团</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import apiClient from '@/api'

const router = useRouter()
const loading = ref(false)

const loginForm = reactive({
  username: '',
  password: '',
})

const onLogin = async () => {
  if (!loginForm.username || !loginForm.password) {
    ElMessage.error('请填写账号和密码')
    return
  }
  loading.value = true
  try {
    const response = await apiClient.post('/auth/login', loginForm)
    localStorage.setItem('token', response.data.token)
    ElMessage.success('登录成功')
    router.push('/admin')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '登录失败')
  } finally {
    loading.value = false
  }
}

const openApplyPage = () => {
  window.location.href = '/club-apply'
}
</script>

<style scoped>
.login-shell {
  min-height: 100vh;
  display: grid;
  place-items: center;
  padding: 24px;
}

.panel {
  width: min(760px, 100%);
}

.panel-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 8px;
}

.panel-head h1 {
  margin: 0;
  font-size: 20px;
}

.panel-head p {
  margin: 6px 0 0;
  color: var(--muted-text);
  font-size: 13px;
}

.actions {
  display: flex;
  justify-content: flex-end;
  margin-top: 10px;
}

.apply-entry {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  margin-top: 20px;
  padding: 14px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 6px;
  background: var(--app-bg);
}

.apply-entry div {
  display: flex;
  flex-direction: column;
  gap: 4px;
}

.apply-entry strong {
  color: var(--el-text-color-primary);
  font-size: 14px;
}

.apply-entry span {
  color: var(--muted-text);
  font-size: 12px;
  line-height: 1.6;
}

@media (max-width: 720px) {
  .apply-entry {
    align-items: stretch;
    flex-direction: column;
  }
}
</style>
