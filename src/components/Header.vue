<template>
  <header class="site-header">
    <div class="container">
      <div class="logo">
        <router-link to="/">
          <img src="/logo2.webp" alt="河北东方高校联合 Logo" class="logo-img">
          <div class="logo-text-wrapper">
            <span class="logo-text">河北东方高校联合会</span>
            <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
          </div>
        </router-link>
      </div>
      <nav class="main-nav">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to"
          :class="{ active: activeSection === item.to }">
          <div class="nav-content"><span>{{ item.text }}</span><span class="en">{{ item.en }}</span></div>
        </router-link>
      </nav>
      <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu" :class="{ 'is-open': isMenuOpen }"
        aria-controls="mobile-nav-container" :aria-expanded="isMenuOpen">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
    </div>

    <nav id="mobile-nav-container" class="mobile-nav" :class="{ 'is-open': isMenuOpen }">
      <div class="mobile-nav-header">
        <div class="logo">
          <router-link to="/" @click="closeMenu">
            <div class="logo-text-wrapper">
              <span class="logo-text">河北东方高校联合会</span>
              <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
            </div>
          </router-link>
        </div>
      </div>
      <div class="mobile-nav-links">
        <router-link v-for="item in navItems" :key="item.to" :to="item.to" @click="closeMenu"
          :class="{ active: activeSection === item.to }">
          <span>{{ item.text }}</span><span class="en">{{ item.en }}</span>
        </router-link>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue';
import { useRouter, useRoute } from 'vue-router';

const navItems = ref([
  { to: '/#home', text: '首页', en: 'HOME' },
  { to: '/#about', text: '关于', en: 'ABOUT' },
  { to: '/#works', text: '制品', en: 'WORKS' },
  { to: '/#history', text: '高联足迹', en: 'HISTORY' },
  { to: '/#news', text: '新闻', en: 'NEWS' },
  { to: '/#members', text: '成员社团', en: 'MEMBERS' },
  { to: '/fames', text: '名人堂', en: 'FAMES' },
]);

const isMenuOpen = ref(false);
const activeSection = ref('/#home');
const router = useRouter();
const route = useRoute();
let observer: IntersectionObserver | null = null;
let unregisterGuard: () => void;

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

const setupObserver = () => {
  if (observer) {
    observer.disconnect();
  }

  observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = `/#${entry.target.id}`;
        }
      });
    },
    {
      rootMargin: '-50% 0px -50% 0px',
    }
  );

  setTimeout(() => {
    document.querySelectorAll('main section[id]').forEach((section) => {
      if (observer) observer.observe(section);
    });
  }, 100);
};

const handleRouteChange = (to: any) => {
  if (to.path === '/') {
    setupObserver();
    if (to.hash) {
      activeSection.value = `/${to.hash}`;
    } else {
      activeSection.value = '/#home';
    }
  } else if (to.path === '/fames') {
    activeSection.value = '/#fames';
  } else {
    if (observer) {
      observer.disconnect();
      observer = null;
    }
    activeSection.value = '';
  }
};

onMounted(() => {
  // Run on initial load
  handleRouteChange(route);

  // Register the navigation guard
  unregisterGuard = router.afterEach((to) => {
    handleRouteChange(to);
  });
});

onUnmounted(() => {
  // Clean up the guard and observer when the component is destroyed
  if (unregisterGuard) {
    unregisterGuard();
  }
  if (observer) {
    observer.disconnect();
  }
});

</script>

<style scoped>
/* ... [Existing styles remain the same] ... */

/* Define Custom Font */
@font-face {
  font-family: 'FZXZTFW';
  src: url('/FZXZTFW.TTF') format('truetype');
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
  /* Make items same height */
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
  font-size: 0.75rem;
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
  /* Gold color for active */
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

.mobile-nav {
  display: flex;
  flex-direction: column;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  padding: 1rem;
  padding-left: 1rem;
  background-color: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  transform: translateX(100%);
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), visibility 0.4s;
  z-index: 1000;
  visibility: hidden;
}

.mobile-nav.is-open {
  transform: translateX(0);
  visibility: visible;
}

.mobile-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

.mobile-nav .logo .logo-text {
  font-size: 1.2rem;
}

.mobile-nav .logo .logo-subtitle {
  display: block;
  font-size: 0.5rem;

}

.mobile-nav-links {
  margin-top: 2rem;
  display: flex;
  flex-direction: column;
  width: 100%;
  background-color: rgba(15, 23, 42, 0.85);
  backdrop-filter: blur(10px) !important;
  -webkit-backdrop-filter: blur(10px) !important;
  border-radius: 8px;
  padding: 2rem;
  border: 1px solid rgba(255, 255, 255, 0.1);
  opacity: 0;
  transform: translateX(50%);
  transition: transform 0.3s ease;
  transition-delay: 0s;
}

.mobile-nav a {
  color: #d8e3e7;
  text-decoration: none;
  padding: 1rem 0;
  position: relative;
  display: flex;
  flex-direction: column;
  transition: color 0.3s;
}

.mobile-nav a span {
  font-size: 1.5rem;
  font-weight: 500;
}

.mobile-nav a .en {
  font-size: 0.75rem;
  text-transform: uppercase;
  letter-spacing: 1px;
  color: rgba(216, 227, 231, 0.5);
  margin-top: 0.25rem;
}

.mobile-nav a:hover {
  color: #fff;
}

.mobile-nav a.active {
  color: #fff;
  font-weight: bold;
}

.mobile-nav a.active::before {
  content: '';
  position: absolute;
  left: -1rem;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #e7a33e;
  border-radius: 2px;
}

.mobile-nav.is-open .mobile-nav-links {
  opacity: 1;
  transform: translateX(0);
  transition-delay: 0.1s;
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
