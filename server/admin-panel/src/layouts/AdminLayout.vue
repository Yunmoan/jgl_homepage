<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '240px'" class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header" @click="goHome">
        <el-icon class="brand-icon">
          <ElementPlus />
        </el-icon>
        <h3 v-if="!isCollapsed" class="brand">高联官网管理系统</h3>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <el-menu :default-openeds="['content', 'system']" router :collapse="isCollapsed" :collapse-transition="false">
          <el-sub-menu index="content" v-if="showContentGroup">
            <template #title>
              <el-icon>
                <Document />
              </el-icon>
              <span>内容管理</span>
            </template>
            <el-menu-item index="/admin/news" v-if="can('admin-news')">
              <template #title>
                <el-icon>
                  <Notification />
                </el-icon>
                <span>新闻管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/members" v-if="can('admin-members')">
              <template #title>
                <el-icon>
                  <User />
                </el-icon>
                <span>成员管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/works" v-if="can('admin-works')">
              <template #title>
                <el-icon>
                  <Tickets />
                </el-icon>
                <span>作品管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/history" v-if="can('admin-history-events')">
              <template #title>
                <el-icon>
                  <Clock />
                </el-icon>
                <span>历史事件</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/fame-members" v-if="can('admin-fame-members')">
              <template #title>
                <el-icon>
                  <Trophy />
                </el-icon>
                <span>名人堂</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/admin-history" v-if="can('admin-admin-history')">
              <template #title>
                <el-icon>
                  <OfficeBuilding />
                </el-icon>
                <span>理事会</span>
              </template>
            </el-menu-item>

            <el-menu-item index="/admin/messages" v-if="can('admin-messages')">
              <template #title>
                <el-icon>
                  <ChatDotRound />
                </el-icon>
                <span>留言管理</span>
              </template>
            </el-menu-item>

          </el-sub-menu>
          <el-sub-menu index="system" v-if="showSystemGroup">
            <template #title>
              <el-icon>
                <Setting />
              </el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/admin/users" v-if="can('admin-users')">
              <template #title>
                <el-icon>
                  <UserFilled />
                </el-icon>
                <span>用户管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/announcements" v-if="can('admin-announcements')">
              <template #title>
                <el-icon>
                  <Notification />
                </el-icon>
                <span>公告管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/friend-links" v-if="can('admin-friend-links')">
              <template #title>
                <el-icon>
                  <LinkIcon />
                </el-icon>
                <span>友情链接</span>
              </template>
            </el-menu-item>
          </el-sub-menu>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-container>
      <el-header class="app-header">
        <div class="left">
          <el-button circle text :icon="isCollapsed ? Expand : Fold" @click="toggleCollapse" />
          <el-breadcrumb separator="/" class="breadcrumb">
            <el-breadcrumb-item v-for="(m, idx) in crumbs" :key="idx">{{ m }}</el-breadcrumb-item>
          </el-breadcrumb>
        </div>
        <div class="right">
          <el-switch v-model="isDark" inline-prompt active-text="暗" inactive-text="亮" @change="toggleTheme" />
          <el-dropdown>
            <span class="user">
              <el-icon>
                <User />
              </el-icon>
              <!-- <span class="username">Admin</span> -->
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="openProfile">编辑资料</el-dropdown-item>
                <el-dropdown-item @click="openChangePwd">修改密码</el-dropdown-item>
                <el-dropdown-item divided @click="logout">退出登录</el-dropdown-item>
              </el-dropdown-menu>
            </template>
          </el-dropdown>
        </div>
      </el-header>

      <el-main class="app-main">
        <div class="page-container">
          <router-view />
        </div>
      </el-main>

      <el-dialog v-model="pwdDialogVisible" title="修改密码" width="420px">
        <el-form :model="pwdForm" label-width="100px">
          <el-form-item label="旧密码">
            <el-input v-model="pwdForm.oldPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="新密码">
            <el-input v-model="pwdForm.newPassword" type="password" show-password />
          </el-form-item>
          <el-form-item label="确认新密码">
            <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="pwdDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitChangePwd">提交</el-button>
          </span>
        </template>
      </el-dialog>

      <el-dialog v-model="profileDialogVisible" title="编辑资料" width="420px">
        <el-form :model="profileForm" label-width="100px">
          <el-form-item label="用户名">
            <el-input v-model="profileForm.username" disabled />
          </el-form-item>
          <el-form-item label="角色">
            <el-input v-model="profileForm.role" disabled />
          </el-form-item>
          <el-form-item label="昵称">
            <el-input v-model="profileForm.nickname" placeholder="用于展示与默认作者名，可留空为用户名" />
          </el-form-item>
        </el-form>
        <template #footer>
          <span class="dialog-footer">
            <el-button @click="profileDialogVisible = false">取消</el-button>
            <el-button type="primary" @click="submitProfile">保存</el-button>
          </span>
        </template>
      </el-dialog>
    </el-container>
  </el-container>
</template>

<script lang="ts" setup>
import { computed, ref, reactive } from 'vue'
import { useRouter, useRoute } from 'vue-router'
import { ElMessage } from 'element-plus'
import apiClient from '@/api'
import {
  Setting,
  Document,
  User,
  UserFilled,
  Notification,
  Tickets,
  Clock,
  Trophy,
  OfficeBuilding,
  Link as LinkIcon,
  ChatDotRound,
  ElementPlus,
  Fold,
  Expand,
} from '@element-plus/icons-vue'

function getRole(): 'admin' | 'editor' | 'viewer' | 'member' | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role ?? null
  } catch {
    return null
  }
}

const currentRole = computed(() => getRole())

const routeRoleMap: Record<string, Array<'admin' | 'editor' | 'member'>> = {
  'admin-news': ['admin', 'editor', 'member'],
  'admin-members': ['admin', 'editor'],
  'admin-works': ['admin', 'editor', 'member'],
  'admin-history-events': ['admin', 'editor'],
  'admin-fame-members': ['admin', 'editor'],
  'admin-admin-history': ['admin', 'editor'],
  'admin-friend-links': ['admin', 'editor'],
  'admin-messages': ['admin', 'editor'],
  'admin-users': ['admin'],
  'admin-announcements': ['admin', 'editor'],
}

const can = (name: string) => {
  const r = currentRole.value
  if (!r) return false
  const roles = routeRoleMap[name]
  return roles ? roles.includes(r as any) : false
}

const showContentGroup = computed(() => {
  const r = currentRole.value
  return r === 'admin' || r === 'editor' || r === 'member'
})

const showSystemGroup = computed(() => currentRole.value === 'admin')

const router = useRouter()
const route = useRoute()

const isCollapsed = ref(false)
const isDark = ref<boolean>(document.documentElement.classList.contains('dark'))

const toggleCollapse = () => {
  isCollapsed.value = !isCollapsed.value
}

const toggleTheme = () => {
  if (isDark.value) {
    document.documentElement.classList.add('dark')
    localStorage.setItem('theme', 'dark')
  } else {
    document.documentElement.classList.remove('dark')
    localStorage.setItem('theme', 'light')
  }
}

const crumbs = computed(() => {
  const list: string[] = []
  route.matched.forEach((m) => {
    if (m.meta && (m.meta as any).title) list.push((m.meta as any).title as string)
  })
  return list.length ? list : ['控制台']
})

const goHome = () => {
  router.push('/admin')
}

// Change password dialog state
const pwdDialogVisible = ref(false)
const pwdForm = reactive<{ oldPassword: string; newPassword: string; confirmPassword: string }>({
  oldPassword: '',
  newPassword: '',
  confirmPassword: '',
})

const openChangePwd = () => {
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdDialogVisible.value = true
}

const submitChangePwd = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    return ElMessage.error('请填写完整')
  }
  if (pwdForm.newPassword.length < 6) {
    return ElMessage.error('新密码至少 6 位')
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    return ElMessage.error('两次输入的新密码不一致')
  }
  try {
    await apiClient.put('/users/me/password', {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    ElMessage.success('密码修改成功')
    pwdDialogVisible.value = false
  } catch (err: any) {
    const msg = err?.response?.data?.error || '密码修改失败'
    ElMessage.error(msg)
  }
}

// Profile edit dialog state
const profileDialogVisible = ref(false)
const profileForm = reactive<{ username: string; role: string; nickname: string }>({
  username: '',
  role: '',
  nickname: '',
})

const openProfile = async () => {
  try {
    const res = await apiClient.get('/users/me')
    const { username, role, nickname } = res.data || {}
    profileForm.username = username || ''
    profileForm.role = role || ''
    profileForm.nickname = nickname || ''
    profileDialogVisible.value = true
  } catch (e) {
    ElMessage.error('获取个人资料失败')
  }
}

const submitProfile = async () => {
  try {
    await apiClient.put('/users/me/profile', { nickname: profileForm.nickname || null })
    ElMessage.success('资料已更新')
    profileDialogVisible.value = false
  } catch (e: any) {
    const msg = e?.response?.data?.error || '资料更新失败'
    ElMessage.error(msg)
  }
}

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<style scoped>
.layout-container {
  height: 100vh;
  background: var(--app-bg);
}

.sidebar {
  background: var(--sidebar-bg);
  border-right: 1px solid var(--el-border-color-lighter);
  transition: width 0.2s ease;
}

.sidebar-header {
  height: 56px;
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 16px;
  cursor: pointer;
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.brand {
  font-size: 14px;
  font-weight: 600;
  margin: 0;
}

.brand-icon {
  font-size: 20px;
}

.sidebar-scroll {
  height: calc(100% - 56px);
}

.app-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: var(--header-bg);
  border-bottom: 1px solid var(--el-border-color-lighter);
}

.app-header .left {
  display: flex;
  align-items: center;
  gap: 12px;
}

.app-header .breadcrumb :deep(.el-breadcrumb__inner) {
  font-weight: 500;
}

.right {
  display: flex;
  align-items: center;
  gap: 16px;
}

.user {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  cursor: pointer;
}

.username {
  font-weight: 500;
}

.app-main {
  background: var(--app-bg);
}

.page-container {
  padding: 20px;
}
</style>
