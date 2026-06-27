<template>
  <el-container class="admin-shell">
    <el-aside v-if="!isMobile" class="admin-sidebar" :width="collapsed ? '72px' : '252px'">
      <div class="brand" @click="goHome">
        <el-icon class="brand-mark"><ElementPlus /></el-icon>
        <div v-if="!collapsed" class="brand-copy">
          <strong>高联管理</strong>
          <span>内容、审核与账号</span>
        </div>
      </div>
      <el-scrollbar class="nav-scroll">
        <el-menu
          router
          class="nav-menu"
          :collapse="collapsed"
          :default-active="activePath"
          :collapse-transition="false"
        >
          <template v-for="item in visibleMenu" :key="item.index">
            <el-menu-item v-if="!item.children" :index="item.index">
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </el-menu-item>
            <el-sub-menu v-else :index="item.index">
              <template #title>
                <el-icon><component :is="item.icon" /></el-icon>
                <span>{{ item.label }}</span>
              </template>
              <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
                <el-icon><component :is="child.icon" /></el-icon>
                <span>{{ child.label }}</span>
              </el-menu-item>
            </el-sub-menu>
          </template>
        </el-menu>
      </el-scrollbar>
    </el-aside>

    <el-drawer v-model="mobileNavOpen" direction="ltr" size="280px" :with-header="false">
      <div class="drawer-brand">
        <el-icon class="brand-mark"><ElementPlus /></el-icon>
        <div class="brand-copy">
          <strong>高联管理</strong>
          <span>内容、审核与账号</span>
        </div>
      </div>
      <el-menu router class="nav-menu" :default-active="activePath" @select="mobileNavOpen = false">
        <template v-for="item in visibleMenu" :key="item.index">
          <el-menu-item v-if="!item.children" :index="item.index">
            <el-icon><component :is="item.icon" /></el-icon>
            <span>{{ item.label }}</span>
          </el-menu-item>
          <el-sub-menu v-else :index="item.index">
            <template #title>
              <el-icon><component :is="item.icon" /></el-icon>
              <span>{{ item.label }}</span>
            </template>
            <el-menu-item v-for="child in item.children" :key="child.index" :index="child.index">
              <el-icon><component :is="child.icon" /></el-icon>
              <span>{{ child.label }}</span>
            </el-menu-item>
          </el-sub-menu>
        </template>
      </el-menu>
    </el-drawer>

    <el-container class="admin-workspace">
      <el-header class="admin-topbar">
        <div class="topbar-left">
          <el-button
            text
            circle
            :icon="isMobile ? Menu : collapsed ? Expand : Fold"
            @click="toggleNavigation"
          />
          <div class="route-title">
            <strong>{{ currentTitle }}</strong>
            <el-breadcrumb separator="/" class="breadcrumb">
              <el-breadcrumb-item v-for="(item, idx) in crumbs" :key="idx">{{ item }}</el-breadcrumb-item>
            </el-breadcrumb>
          </div>
        </div>

        <div class="topbar-right">
          <el-tag v-if="role" effect="plain" round>{{ roleLabel }}</el-tag>
          <el-button text circle :icon="isDark ? Moon : Sunny" @click="toggleTheme" />
          <el-dropdown trigger="click">
            <button class="account-button" type="button">
              <el-icon><User /></el-icon>
              <span>{{ me?.nickname || me?.username || '账号' }}</span>
            </button>
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

      <el-main class="admin-main">
        <router-view />
      </el-main>
    </el-container>

    <el-dialog v-model="profileVisible" title="编辑资料" width="460px">
      <el-form :model="profileForm" label-width="90px">
        <el-form-item label="用户名">
          <el-input v-model="profileForm.username" disabled />
        </el-form-item>
        <el-form-item label="昵称">
          <el-input v-model="profileForm.nickname" maxlength="40" />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="profileVisible = false">取消</el-button>
        <el-button type="primary" @click="submitProfile">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="pwdVisible" title="修改密码" width="460px">
      <el-form :model="pwdForm" label-width="90px">
        <el-form-item label="旧密码">
          <el-input v-model="pwdForm.oldPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="pwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="pwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="pwdVisible = false">取消</el-button>
        <el-button type="primary" @click="submitChangePwd">保存</el-button>
      </template>
    </el-dialog>
  </el-container>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
import apiClient from '@/api'
import {
  ChatDotRound,
  Clock,
  DataBoard,
  Document,
  ElementPlus,
  Expand,
  Fold,
  InfoFilled,
  Link as LinkIcon,
  Menu,
  Moon,
  Notification,
  OfficeBuilding,
  Setting,
  Sunny,
  Tickets,
  Trophy,
  User,
  UserFilled,
} from '@element-plus/icons-vue'

type Role = 'admin' | 'editor' | 'viewer' | 'member' | null
type StrictRole = NonNullable<Role>
const validRoles: StrictRole[] = ['admin', 'editor', 'viewer', 'member']

interface MeInfo {
  id: number
  username: string
  role: string
  nickname?: string
}

interface MenuItem {
  label: string
  index: string
  icon: any
  roles: StrictRole[]
  children?: MenuItem[]
}

const menuItems: MenuItem[] = [
  { label: '概览', index: '/admin/dashboard', icon: DataBoard, roles: ['admin', 'editor', 'member'] },
  { label: '入驻申请', index: '/admin/application', icon: UserFilled, roles: ['viewer'] },
  {
    label: '内容',
    index: 'content',
    icon: Document,
    roles: ['admin', 'editor', 'member'],
    children: [
      { label: '新闻', index: '/admin/news', icon: Notification, roles: ['admin', 'editor', 'member'] },
      { label: '作品', index: '/admin/works', icon: Tickets, roles: ['admin', 'editor', 'member'] },
      { label: '成员', index: '/admin/members', icon: User, roles: ['admin', 'editor'] },
      { label: '历程', index: '/admin/history', icon: Clock, roles: ['admin', 'editor'] },
      { label: '名人堂', index: '/admin/fame-members', icon: Trophy, roles: ['admin', 'editor'] },
      { label: '理事会', index: '/admin/admin-history', icon: OfficeBuilding, roles: ['admin'] },
      { label: '留言', index: '/admin/messages', icon: ChatDotRound, roles: ['admin', 'editor'] },
    ],
  },
  {
    label: '系统',
    index: 'system',
    icon: Setting,
    roles: ['admin', 'editor', 'member'],
    children: [
      { label: '账号审核', index: '/admin/users', icon: UserFilled, roles: ['admin'] },
      { label: '公告', index: '/admin/announcements', icon: Notification, roles: ['admin', 'editor'] },
      { label: '友链', index: '/admin/friend-links', icon: LinkIcon, roles: ['admin', 'editor'] },
      { label: '系统信息', index: '/admin/system-info', icon: InfoFilled, roles: ['admin', 'editor', 'member'] },
    ],
  },
]

const router = useRouter()
const route = useRoute()
const collapsed = ref(false)
const mobileNavOpen = ref(false)
const isMobile = ref(false)
const isDark = ref(document.documentElement.classList.contains('dark'))
const me = ref<MeInfo | null>(null)
const role = ref<Role>(null)

const parseRole = (): Role => {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const payload = JSON.parse(atob(token.split('.')[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload?.exp && Date.now() >= payload.exp * 1000) return null
    return validRoles.includes(payload?.role) ? payload.role : null
  } catch {
    return null
  }
}

const hasRole = (allowed: StrictRole[]) => {
  return Boolean(role.value && allowed.includes(role.value))
}

const visibleMenu = computed(() =>
  menuItems
    .map((item) => ({
      ...item,
      children: item.children?.filter((child) => hasRole(child.roles)),
    }))
    .filter((item) => hasRole(item.roles) && (!item.children || item.children.length > 0)),
)

const roleLabel = computed(() => {
  const labels: Record<StrictRole, string> = {
    admin: '管理员',
    editor: '编辑员',
    member: '成员',
    viewer: '待审核',
  }
  return role.value ? labels[role.value] : ''
})

const activePath = computed(() => route.path)
const crumbs = computed(() =>
  route.matched
    .map((item) => item.meta?.title as string | undefined)
    .filter((item): item is string => Boolean(item)),
)
const currentTitle = computed(() => crumbs.value.at(-1) || '控制台')

const updateViewport = () => {
  isMobile.value = window.matchMedia('(max-width: 900px)').matches
  if (!isMobile.value) mobileNavOpen.value = false
}

const loadMe = async () => {
  try {
    const { data } = await apiClient.get('/users/me')
    me.value = data
    role.value = validRoles.includes(data?.role) ? data.role : parseRole()
  } catch {
    me.value = null
    role.value = null
    localStorage.removeItem('token')
    router.push('/login')
  }
}

onMounted(() => {
  updateViewport()
  window.addEventListener('resize', updateViewport)
  loadMe()
})

onBeforeUnmount(() => {
  window.removeEventListener('resize', updateViewport)
})

const toggleNavigation = () => {
  if (isMobile.value) {
    mobileNavOpen.value = true
    return
  }
  collapsed.value = !collapsed.value
}

const goHome = () => {
  router.push(role.value === 'viewer' ? '/admin/application' : '/admin/dashboard')
}

const toggleTheme = () => {
  isDark.value = !isDark.value
  document.documentElement.classList.toggle('dark', isDark.value)
  localStorage.setItem('theme', isDark.value ? 'dark' : 'light')
}

const profileVisible = ref(false)
const profileForm = reactive({ username: '', nickname: '' })

const openProfile = async () => {
  await loadMe()
  profileForm.username = me.value?.username || ''
  profileForm.nickname = me.value?.nickname || ''
  profileVisible.value = true
}

const submitProfile = async () => {
  try {
    await apiClient.put('/users/me/profile', { nickname: profileForm.nickname || null })
    ElMessage.success('资料已保存')
    profileVisible.value = false
    await loadMe()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

const pwdVisible = ref(false)
const pwdForm = reactive({ oldPassword: '', newPassword: '', confirmPassword: '' })

const openChangePwd = () => {
  pwdForm.oldPassword = ''
  pwdForm.newPassword = ''
  pwdForm.confirmPassword = ''
  pwdVisible.value = true
}

const submitChangePwd = async () => {
  if (!pwdForm.oldPassword || !pwdForm.newPassword) {
    return ElMessage.error('请填写完整')
  }
  if (pwdForm.newPassword.length < 6) {
    return ElMessage.error('新密码至少 6 位')
  }
  if (pwdForm.newPassword !== pwdForm.confirmPassword) {
    return ElMessage.error('两次输入的密码不一致')
  }
  try {
    await apiClient.put('/users/me/password', {
      oldPassword: pwdForm.oldPassword,
      newPassword: pwdForm.newPassword,
    })
    ElMessage.success('密码已修改')
    pwdVisible.value = false
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '修改失败')
  }
}

const logout = () => {
  localStorage.removeItem('token')
  router.push('/login')
}
</script>

<style scoped>
.admin-shell {
  height: 100vh;
  min-width: 0;
  background: var(--app-bg);
}

.admin-sidebar {
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--el-border-color-lighter);
  background: var(--sidebar-bg);
  transition: width 0.18s ease;
}

.brand,
.drawer-brand {
  min-height: 64px;
  display: flex;
  align-items: center;
  gap: 10px;
  padding: 0 16px;
}

.brand {
  border-bottom: 1px solid var(--el-border-color-lighter);
  cursor: pointer;
}

.brand-mark {
  width: 36px;
  height: 36px;
  flex: 0 0 36px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border-radius: 8px;
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-size: 18px;
}

.brand-copy {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.2;
}

.brand-copy strong {
  color: var(--text-color);
  font-size: 15px;
}

.brand-copy span {
  margin-top: 4px;
  color: var(--muted-text);
  font-size: 12px;
}

.nav-scroll {
  flex: 1;
}

.nav-menu {
  border-right: 0;
  padding: 10px 8px;
}

.nav-menu :deep(.el-menu-item),
.nav-menu :deep(.el-sub-menu__title) {
  height: 40px;
  border-radius: 6px;
  margin: 2px 0;
}

.nav-menu :deep(.el-menu-item.is-active) {
  background: var(--el-color-primary-light-9);
  color: var(--el-color-primary);
  font-weight: 650;
}

.admin-workspace {
  min-width: 0;
}

.admin-topbar {
  height: 60px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 18px;
  border-bottom: 1px solid var(--el-border-color-lighter);
  background: var(--header-bg);
}

.topbar-left,
.topbar-right {
  display: flex;
  align-items: center;
  min-width: 0;
  gap: 10px;
}

.route-title {
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 3px;
}

.route-title strong {
  color: var(--text-color);
  font-size: 15px;
  line-height: 1.2;
}

.breadcrumb {
  line-height: 1;
}

.breadcrumb :deep(.el-breadcrumb__inner) {
  color: var(--muted-text);
  font-size: 12px;
  font-weight: 400;
}

.account-button {
  max-width: 220px;
  min-height: 34px;
  display: inline-flex;
  align-items: center;
  gap: 7px;
  border: 1px solid var(--el-border-color-lighter);
  border-radius: 999px;
  padding: 0 12px;
  background: var(--card-bg);
  color: var(--text-color);
  font: inherit;
  cursor: pointer;
}

.account-button span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-main {
  min-width: 0;
  padding: 18px;
  overflow: auto;
}

@media (max-width: 900px) {
  .admin-topbar {
    padding: 0 12px;
  }

  .breadcrumb {
    display: none;
  }

  .admin-main {
    padding: 12px;
  }

  .topbar-right {
    gap: 6px;
  }

  .account-button {
    max-width: 128px;
    padding: 0 10px;
  }
}
</style>
