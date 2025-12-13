import { createRouter, createWebHistory } from 'vue-router'

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
      { path: 'news', name: 'admin-news', component: NewsManagement, meta: { title: '新闻管理' } },
      { path: 'members', name: 'admin-members', component: MembersManagement, meta: { title: '成员管理' } },
      { path: 'works', name: 'admin-works', component: WorksManagement, meta: { title: '作品管理' } },
      { path: 'history', name: 'admin-history-events', component: HistoryManagement, meta: { title: '历史事件' } },
      { path: 'fame-members', name: 'admin-fame-members', component: FameMembersManagement, meta: { title: '名人堂' } },
      { path: 'admin-history', name: 'admin-admin-history', component: AdminHistoryManagement, meta: { title: '理事会' } },
      { path: 'friend-links', name: 'admin-friend-links', component: FriendLinksManagement, meta: { title: '友情链接' } },
      { path: 'messages', name: 'admin-messages', component: MessagesManagement, meta: { title: '留言管理' } },
      { path: 'users', name: 'admin-users', component: UserManagement, meta: { title: '用户管理' } },
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

router.beforeEach((to, _from, next) => {
  const loggedIn = localStorage.getItem('token')

  if (to.matched.some((record) => record.meta.requiresAuth) && !loggedIn) {
    next({ name: 'login' })
  } else if (to.name === 'login' && loggedIn) {
    next({ path: '/admin' })
  } else {
    next()
  }
})

export default router
