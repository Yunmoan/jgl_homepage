import { createRouter, createWebHistory } from 'vue-router'
import HomeView from '../pages/HomeView.vue'

const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/home',
    },
    {
      path: '/home',
      name: 'home',
      component: HomeView,
    },
    {
      path: '/fames',
      name: 'fames',
      component: () => import('../pages/FameView.vue'),
    },
  ],
  scrollBehavior(to, from, savedPosition) {
    if (savedPosition) {
      return savedPosition
    }
    if (to.hash) {
      // Use a more robust method than a fixed timeout
      const findEl = async (hash: string, x = 0) => {
        return (
          document.querySelector(hash) ||
          new Promise((resolve) => {
            if (x > 50) {
              return resolve(null)
            }
            setTimeout(() => resolve(findEl(hash, x + 1)), 100)
          })
        )
      }

      return (async () => {
        const el = await findEl(to.hash)
        if (el) {
          return { el, behavior: 'smooth' }
        }
      })()
    }
    return { top: 0 }
  },
})

export default router
