<template>
  <el-container class="layout-container">
    <el-aside :width="isCollapsed ? '64px' : '240px'" class="sidebar" :class="{ collapsed: isCollapsed }">
      <div class="sidebar-header" @click="goHome">
        <el-icon class="brand-icon"><ElementPlus /></el-icon>
        <h3 v-if="!isCollapsed" class="brand">高联官网管理系统</h3>
      </div>
      <el-scrollbar class="sidebar-scroll">
        <el-menu :default-openeds="['content','system']" router :collapse="isCollapsed" :collapse-transition="false">
          <el-sub-menu index="content">
            <template #title>
              <el-icon><Document /></el-icon>
              <span>内容管理</span>
            </template>
            <el-menu-item index="/admin/news">
              <template #title>
                <el-icon><Notification /></el-icon>
                <span>新闻管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/members">
              <template #title>
                <el-icon><User /></el-icon>
                <span>成员管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/works">
              <template #title>
                <el-icon><Tickets /></el-icon>
                <span>作品管理</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/history">
              <template #title>
                <el-icon><Clock /></el-icon>
                <span>历史事件</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/fame-members">
              <template #title>
                <el-icon><Trophy /></el-icon>
                <span>名人堂</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/admin-history">
              <template #title>
                <el-icon><OfficeBuilding /></el-icon>
                <span>理事会</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/friend-links">
              <template #title>
                <el-icon><LinkIcon /></el-icon>
                <span>友情链接</span>
              </template>
            </el-menu-item>
            <el-menu-item index="/admin/messages">
              <template #title>
                <el-icon><ChatDotRound /></el-icon>
                <span>留言管理</span>
              </template>
            </el-menu-item>
          </el-sub-menu>
          <el-sub-menu index="system">
            <template #title>
              <el-icon><Setting /></el-icon>
              <span>系统管理</span>
            </template>
            <el-menu-item index="/admin/users">
              <template #title>
                <el-icon><UserFilled /></el-icon>
                <span>用户管理</span>
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
              <el-icon><User /></el-icon>
              <span class="username">Admin</span>
            </span>
            <template #dropdown>
              <el-dropdown-menu>
                <el-dropdown-item @click="logout">退出登录</el-dropdown-item>
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
    </el-container>
  </el-container>
</template>

<script lang="ts" setup>
import { computed, ref } from 'vue'
import { useRouter, useRoute } from 'vue-router'
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
