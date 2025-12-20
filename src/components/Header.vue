<template>
  <header class="site-header">
    <SiteAnnouncements />
    <div class="container">
      <div class="logo">
        <router-link to="/home">
          <img src="/logo2.webp" alt="河北东方高校联合 Logo" class="logo-img" />
          <div class="logo-text-wrapper">
            <span class="logo-text">河北东方高校联合会</span>
            <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
          </div>
        </router-link>
      </div>

      <nav class="main-nav">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          :class="{ active: activeSection === item.to }">
          <div class="nav-content">
            <span>{{ item.text }}</span>
            <span class="en">{{ item.en }}</span>
          </div>
        </router-link>
      </nav>

      <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu" :class="{ 'is-open': isMenuOpen }"
        aria-controls="mobile-nav-container" :aria-expanded="isMenuOpen">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
    </div>
  </header>


  <!-- Mobile Drawer Overlay -->
  <nav id="mobile-nav-container" class="mobile-nav" :class="{ 'is-open': isMenuOpen }" @click.self="closeMenu">
    <div class="mobile-sheet" @click.stop>
      <div class="mobile-sheet-header">
        <div class="logo">
          <router-link to="/" @click="closeMenu">
            <div class="logo-text-wrapper">
              <span class="logo-text">河北东方高校联合会</span>
              <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
            </div>
          </router-link>
        </div>
        <button class="mobile-close" @click="closeMenu" aria-label="关闭菜单">×</button>
      </div>

      <div class="mobile-sheet-body">
        <div class="mobile-nav-links">
          <router-link v-for="item in navItems" :key="item.to" :to="item.to" @click="closeMenu"
            :class="{ active: activeSection === item.to }">
            <span class="cn">{{ item.text }}</span>
            <span class="en">{{ item.en }}</span>
          </router-link>
        </div>
      </div>

      <div class="mobile-safe-area"></div>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick, watch } from 'vue'
import { useRouter, useRoute, type RouteLocationNormalized } from 'vue-router'
import SiteAnnouncements from './SiteAnnouncements.vue'

const navItems = ref([
  { to: '/home#home', text: '首页', en: 'HOME' },
  { to: '/home#about', text: '关于', en: 'ABOUT' },
  { to: '/home#works', text: '制品', en: 'WORKS' },
  { to: '/news', text: '新闻', en: 'NEWS' },
  { to: '/home#history', text: '高联足迹', en: 'HISTORY' },
  { to: '/home#members', text: '成员社团', en: 'MEMBERS' },
  { to: '/fames', text: '名人堂', en: 'FAMES' },
])

const isMenuOpen = ref(false)
const isObserverActive = ref(true)
const activeSection = ref('/home#home')
const router = useRouter()
const route = useRoute()
let observer: IntersectionObserver | null = null
let unregisterGuard: () => void

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value
}

const closeMenu = () => {
  isMenuOpen.value = false
}

// 锁定滚动
watch(isMenuOpen, (open) => {
  if (open) {
    document.documentElement.style.overflow = 'hidden'
    document.body.style.overflow = 'hidden'
  } else {
    document.documentElement.style.overflow = ''
    document.body.style.overflow = ''
  }
})

const setupObserver = () => {
  if (observer) observer.disconnect()

  observer = new IntersectionObserver(
    (entries) => {
      if (!isObserverActive.value) return
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = `/home#${(entry.target as HTMLElement).id}`
        }
      })
    },
    { rootMargin: '-50% 0px -50% 0px' },
  )

  setTimeout(() => {
    document.querySelectorAll('main section[id]').forEach((section) => {
      if (observer) observer.observe(section)
    })
  }, 100)
}

const handleRouteChange = (to: RouteLocationNormalized, from?: RouteLocationNormalized) => {
  if (to.path === '/home') {
    if (to.hash && from && from.path !== '/home') {
      isObserverActive.value = false
      activeSection.value = `/home${to.hash}`
      nextTick(() => {
        setTimeout(() => {
          isObserverActive.value = true
        }, 500)
      })
    }
    setupObserver()
  } else {
    if (observer) {
      observer.disconnect()
      observer = null
    }
    activeSection.value = to.path
  }
}

onMounted(() => {
  handleRouteChange(route, undefined)
  unregisterGuard = router.afterEach((to, from) => {
    handleRouteChange(to, from)
  })
})

onUnmounted(() => {
  if (unregisterGuard) unregisterGuard()
  if (observer) observer.disconnect()
  document.documentElement.style.overflow = ''
  document.body.style.overflow = ''
})
</script>

<style scoped>
/* Define Custom Font */
@font-face {
  font-family: 'FZXZTFW';
  src: url('/FZXZTFW_minified.woff2') format('truetype');
  font-weight: normal;
  font-style: normal;
}

.site-header {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  padding: 0.5rem 0;
  background-color: rgba(15, 23, 42, 0.349);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  z-index: 1000;
  border-bottom: 1px solid rgba(255, 255, 255, 0.1);
}

.container {
  display: flex;
  justify-content: space-between;
  align-items: center;
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}

.logo a {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  text-decoration: none;
}

.logo-img {
  height: 40px;
  width: 40px;
}

.logo-text-wrapper {
  display: flex;
  flex-direction: column;
}

.logo-text {
  font-family: 'FZXZTFW', 'Noto Sans SC', sans-serif;
  color: #fff;
  font-size: 1.6rem;
  font-weight: bold;
  line-height: 1.2;
}

.logo-subtitle {
  font-family: 'Times New Roman', Times, serif;
  font-size: 0.6rem;
  font-weight: 300;
  color: rgba(216, 227, 231, 0.5);
  letter-spacing: 1px;
  white-space: nowrap;
  margin-top: 0px;
}

.main-nav {
  display: flex;
  align-items: stretch;
  height: 3.5rem;
}

.main-nav a {
  color: #d8e3e7;
  text-decoration: none;
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 8px 1.2rem;
  background-color: rgba(255, 255, 255, 0.1);
  transition: background-color 0.3s;
  margin-left: -0px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.main-nav a:first-child {
  margin-left: 0;
}

.nav-content {
  display: flex;
  flex-direction: column;
  align-items: center;
}

.main-nav a .en {
  font-family: 'Times New Roman', Times, serif;
  font-size: 0.6rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.main-nav a:hover,
.main-nav a.active {
  background-color: rgba(255, 255, 255, 0.3);
  color: #fff;
}

.main-nav a.active {
  background-color: rgba(231, 163, 62, 0.8);
  font-weight: bold;
  z-index: 3;
}

.menu-toggle {
  display: none;
  background: none;
  border: none;
  cursor: pointer;
  padding: 0;
  z-index: 1002;
}

.menu-toggle .bar {
  display: block;
  width: 25px;
  height: 3px;
  background-color: #fff;
  margin: 5px 0;
  transition: all 0.3s ease-in-out;
  border-radius: 3px;
}

.menu-toggle.is-open .bar:nth-child(1) {
  transform: translateY(8px) rotate(45deg);
}

.menu-toggle.is-open .bar:nth-child(2) {
  opacity: 0;
}

.menu-toggle.is-open .bar:nth-child(3) {
  transform: translateY(-8px) rotate(-45deg);
}

/* Mobile Drawer Overlay */
.mobile-nav {
  display: flex;
  align-items: stretch;
  justify-content: flex-end;
  position: fixed;
  top: 0;
  left: 0;
  width: 100vw;
  height: 100vh;
  padding: 0;
  background-color: rgba(15, 23, 42, 0.6);
  backdrop-filter: blur(4px);
  -webkit-backdrop-filter: blur(4px);
  opacity: 0;
  visibility: hidden;
  transition: opacity 0.25s ease, visibility 0.25s ease;
  z-index: 1100;
}

.mobile-nav.is-open {
  opacity: 1;
  visibility: visible;
}

.mobile-sheet {
  width: 86vw;
  max-width: 420px;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.95);
  border-left: 1px solid rgba(255, 255, 255, 0.1);
  padding: 16px;
  display: flex;
  flex-direction: column;
  transform: translateX(100%);
  transition: transform 0.35s cubic-bezier(.2, .8, .2, 1);
}

.mobile-nav.is-open .mobile-sheet {
  transform: translateX(0);
}

.mobile-sheet-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-bottom: 8px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.12);
  position: sticky;
  top: 0;
  background: transparent;
  z-index: 1;
}

.mobile-close {
  appearance: none;
  border: none;
  background: transparent;
  color: #fff;
  font-size: 28px;
  line-height: 1;
  cursor: pointer;
}

.mobile-sheet-body {
  flex: 1;
  overflow: auto;
  padding: 12px 0;
}

.mobile-safe-area {
  height: env(safe-area-inset-bottom, 0);
}

.mobile-nav-links {
  display: flex;
  flex-direction: column;
}

.mobile-nav-links a {
  color: #d8e3e7;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 14px 2px;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
  transition: color 0.2s ease, background 0.2s ease;
}

.mobile-nav-links a:last-child {
  border-bottom: none;
}

.mobile-nav-links a .en {
  font-family: 'Times New Roman', Times, serif;
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(216, 227, 231, 0.5);
}

.mobile-nav-links a.active,
.mobile-nav-links a:hover {
  color: #fff;
  background: rgba(255, 255, 255, 0.06);
}

@media (max-width: 1024px) {
  .main-nav {
    display: none;
  }

  .menu-toggle {
    display: block;
  }

  .logo-subtitle {
    display: none;
  }
}
</style>
