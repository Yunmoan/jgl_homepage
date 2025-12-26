import { createRouter, createWebHistory } from 'vue-router'
import type { RouteLocationNormalized } from 'vue-router'

// Import components
import Login from '@/views/Login.vue'
import AdminLayout from '@/layouts/AdminLayout.vue'
import NewsManagement from '@/views/NewsManagement.vue'
import MembersManagement from '@/views/MembersManagement.vue'
import WorksManagement from '@/views/WorksManagement.vue'
import HistoryManagement from '@/views/HistoryManagement.vue'
import FameMembersManagement from '@/views/FameMembersManagement.vue'
import AdminHistoryManagement from '@/views/AdminHistoryManagement.vue'
import FriendLinksManagement from '@/views/FriendLinksManagement.vue'
import MessagesManagement from '@/views/MessagesManagement.vue'
import UserManagement from '@/views/UserManagement.vue'
import AnnouncementsManagement from '@/views/AnnouncementsManagement.vue'
import SystemInfo from '@/views/SystemInfo.vue'

function getRole(): string | null {
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
      { path: '', redirect: '/admin/news' },
      {
        path: 'news',
        name: 'admin-news',
        component: NewsManagement,
        meta: { title: '新闻管理', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'members',
        name: 'admin-members',
        component: MembersManagement,
        meta: { title: '成员管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'works',
        name: 'admin-works',
        component: WorksManagement,
        meta: { title: '作品管理', roles: ['admin', 'editor', 'member'] },
      },
      {
        path: 'history',
        name: 'admin-history-events',
        component: HistoryManagement,
        meta: { title: '历史事件', roles: ['admin', 'editor'] },
      },
      {
        path: 'fame-members',
        name: 'admin-fame-members',
        component: FameMembersManagement,
        meta: { title: '名人堂', roles: ['admin', 'editor'] },
      },
      {
        path: 'admin-history',
        name: 'admin-admin-history',
        component: AdminHistoryManagement,
        meta: { title: '理事会', roles: ['admin', 'editor'] },
      },
      {
        path: 'friend-links',
        name: 'admin-friend-links',
        component: FriendLinksManagement,
        meta: { title: '友情链接', roles: ['admin', 'editor'] },
      },
      {
        path: 'messages',
        name: 'admin-messages',
        component: MessagesManagement,
        meta: { title: '留言管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'announcements',
        name: 'admin-announcements',
        component: AnnouncementsManagement,
        meta: { title: '公告管理', roles: ['admin', 'editor'] },
      },
      {
        path: 'users',
        name: 'admin-users',
        component: UserManagement,
        meta: { title: '用户管理', roles: ['admin'] },
      },
      {
        path: 'system-info',
        name: 'admin-system-info',
        component: SystemInfo,
        meta: { title: '系统信息', roles: ['admin', 'editor', 'member'] },
      }
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
  for (const r of children) {
    const roles = (r.meta as any)?.roles as string[] | undefined
    if (!roles || (role && roles.includes(role)))
      return r.path.startsWith('/admin') ? r.path : '/admin/' + r.path
  }
  return '/admin/news'
}

router.beforeEach((to, _from, next) => {
  const token = localStorage.getItem('token')
  const role = getRole()

  if (to.matched.some((record) => (record.meta as any).requiresAuth) && !token) {
    return next({ name: 'login' })
  }
  if (to.name === 'login' && token) {
    return next({ path: '/admin' })
  }

  // 角色路由访问控制
  const requiredRoles = to.matched.find((m) => (m.meta as any)?.roles)?.meta?.roles as
    | string[]
    | undefined
  if (requiredRoles && role && !requiredRoles.includes(role)) {
    // 跳转到当前模块下第一个有权限的子路由
    const target = firstAllowedChild(to, role)
    return next(target)
  }

  next()
})

export default router
