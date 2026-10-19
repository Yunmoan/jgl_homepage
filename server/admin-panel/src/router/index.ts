import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

// Import components
import Login from '@/views/Login.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'

const validRoles = ['admin', 'editor', 'viewer', 'member'] as const

function getRole(): string | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    if (payload?.exp && Date.now() >= payload.exp * 1000) return null
    return validRoles.includes(payload?.role) ? payload.role : null
  } catch {
    return null
  }
}

const routes = [
  {
    path: '/login',
    name: 'login',
    component: Login,
    meta: { title: '登录' },
  },
  {
    path: '/admin',
    component: AdminLayout,
    meta: { requiresAuth: true, title: '控制台' },
    children: [
      { path: '', redirect: '/admin/dashboard' },
      {
        path: 'dashboard',
        name: 'admin-dashboard',
        component: () => import('@/views/Dashboard.vue'),
        meta: { title: '概览', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'application',
        name: 'admin-application',
        component: () => import('@/views/ApplicationStatus.vue'),
        meta: { title: '入驻申请', roles: ['viewer'] },
      },
      {
        path: 'news',
        name: 'admin-news',
        component: () => import('@/views/NewsManagement.vue'),
        meta: { title: '新闻管理', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'members',
        name: 'admin-members',
        component: () => import('@/views/MembersManagement.vue'),
        meta: { title: '成员管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'exhibitions',
        name: 'admin-exhibitions',
        component: () => import('@/views/ExhibitionsManagement.vue'),
        meta: { title: '展会日历', roles: ['admin'] },
      },
      {
        path: 'works',
        name: 'admin-works',
        component: () => import('@/views/WorksManagement.vue'),
        meta: { title: '作品管理', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'history',
        name: 'admin-history-events',
        component: () => import('@/views/HistoryManagement.vue'),
        meta: { title: '历史事件', roles: ['admin', 'editor'] },
      },
      {
        path: 'fame-members',
        name: 'admin-fame-members',
        component: () => import('@/views/FameMembersManagement.vue'),
        meta: { title: '名人堂', roles: ['admin', 'editor'] },
      },
      {
        path: 'admin-history',
        name: 'admin-admin-history',
        component: () => import('@/views/AdminHistoryManagement.vue'),
        meta: { title: '理事会', roles: ['admin'] },
      },
      {
        path: 'friend-links',
        name: 'admin-friend-links',
        component: () => import('@/views/FriendLinksManagement.vue'),
        meta: { title: '友情链接', roles: ['admin', 'editor'] },
      },
      {
        path: 'messages',
        name: 'admin-messages',
        component: () => import('@/views/MessagesManagement.vue'),
        meta: { title: '留言管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'announcements',
        name: 'admin-announcements',
        component: () => import('@/views/AnnouncementsManagement.vue'),
        meta: { title: '公告管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: () => import('@/views/UserManagement.vue'),
        meta: { title: '用户管理', roles: ['admin'] },
      },
      {
        path: 'system-info',
        name: 'admin-system-info',
        component: () => import('@/views/SystemInfo.vue'),
        meta: { title: '系统信息', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'system-settings',
        name: 'admin-system-settings',
        component: () => import('@/views/SystemSettings.vue'),
        meta: { title: '系统设置', roles: ['admin'] },
      },
    ],
  },
  // Redirect root to login
  {
    path: '/',
    redirect: '/login',
  },
]

const router = createRouter({
  history: createWebHistory(),
  routes,
})

function firstAllowedChild(to: RouteLocationNormalized, role: string | null) {
  const children = to.matched[0]?.children ?? []
  const fallback = role === 'viewer' ? '/admin/application' : '/login'
  for (const r of children) {
    const roles = (r.meta as any)?.roles as string[] | undefined
    if (r.path && roles && role && roles.includes(role))
      return r.path.startsWith('/admin') ? r.path : '/admin/' + r.path
  }
  return fallback
}

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  const role = getRole()
  const requiresAuth = to.matched.some((record) => (record.meta as any).requiresAuth)

  if (requiresAuth && (!token || !role)) {
    localStorage.removeItem('token')
    return next({ name: 'login' })
  }
  if (to.name === 'login' && token) {
    if (!role) {
      localStorage.removeItem('token')
      return next()
    }
    return next({ path: role === 'viewer' ? '/admin/application' : '/admin' })
  }

  // 角色路由访问控制
  const requiredRoles = to.matched.find((m) => (m.meta as any)?.roles)?.meta?.roles as
    | string[]
    | undefined
  if (requiredRoles && !role) {
    localStorage.removeItem('token')
    return next({ name: 'login' })
  }
  if (requiredRoles && role && !requiredRoles.includes(role)) {
    // 跳转到当前模块下第一个有权限的子路由
    const target = firstAllowedChild(to, role)
    return next(target)
  }

  next()
})

export default router
