<template>
  <header class="site-header">
    <div class="container">
      <div class="logo">
        <a href="#home">
          <img src="/logo2.png" alt="河北东方高校联合 Logo" class="logo-img">
          <div class="logo-text-wrapper">
            <span class="logo-text">河北东方高校联合 <span style="font-size: 15px;font-family: 'Noto Sans SC', sans-serif;">:
                永夜狂想曲</span></span>
            <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
          </div>
        </a>
      </div>
      <nav class="main-nav">
        <a href="#home" :class="{ active: activeSection === '#home' }">
          <div class="nav-content"><span>首页</span><span class="en">HOME</span></div>
        </a>
        <a href="#about" :class="{ active: activeSection === '#about' }">
          <div class="nav-content"><span>关于我们</span><span class="en">ABOUT</span></div>
        </a>
        <a href="#works" :class="{ active: activeSection === '#works' }">
          <div class="nav-content"><span>社团作品</span><span class="en">WORKS</span></div>
        </a>
        <a href="#contact" :class="{ active: activeSection === '#contact' }">
          <div class="nav-content"><span>联系我们</span><span class="en">CONTACT</span></div>
        </a>
      </nav>
      <button class="menu-toggle" @click="toggleMenu" aria-label="Toggle menu" :class="{ 'is-open': isMenuOpen }">
        <span class="bar"></span>
        <span class="bar"></span>
        <span class="bar"></span>
      </button>
    </div>
    <nav class="mobile-nav" :class="{ 'is-open': isMenuOpen }">
      <div class="mobile-nav-header">
        <div class="logo">
          <a href="#home" @click="closeMenu">
            <img src="/logo2.png" alt="河北东方高校联合 Logo" class="logo-img">
            <div class="logo-text-wrapper">
              <span class="logo-text">河北东方高校联合</span>
              <span class="logo-subtitle">HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</span>
            </div>
          </a>
        </div>
        <button class="close-menu" @click="closeMenu" aria-label="Close menu">&times;</button>
      </div>
      <div class="mobile-nav-links">
        <a href="#home" @click="closeMenu" :class="{ active: activeSection === '#home' }"><span>首页</span><span
            class="en">HOME</span></a>
        <a href="#about" @click="closeMenu" :class="{ active: activeSection === '#about' }"><span>关于我们</span><span
            class="en">ABOUT</span></a>
        <a href="#works" @click="closeMenu" :class="{ active: activeSection === '#works' }"><span>社团作品</span><span
            class="en">WORKS</span></a>
        <a href="#contact" @click="closeMenu" :class="{ active: activeSection === '#contact' }"><span>联系我们</span><span
            class="en">CONTACT</span></a>
      </div>
    </nav>
  </header>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const isMenuOpen = ref(false);
const activeSection = ref('#home'); // Default to home

const toggleMenu = () => {
  isMenuOpen.value = !isMenuOpen.value;
};

const closeMenu = () => {
  isMenuOpen.value = false;
};

onMounted(() => {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          activeSection.value = `#${entry.target.id}`;
        }
      });
    },
    {
      rootMargin: '-50% 0px -50% 0px', // Triggers when the section is centered in the viewport
    }
  );

  document.querySelectorAll('main section[id]').forEach((section) => {
    observer.observe(section);
  });
});
</script>

<style scoped>
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
  background-color: rgba(15, 23, 42, 0.8);
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
  padding: 0 2rem;
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
  padding: 8px 2rem;
  background-color: rgba(255, 255, 255, 0.1);
  transform: skewX(-25deg);
  transition: background-color 0.3s;
  margin-left: -0px;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
  /* Overlap items */
  /* border-left: 1px solid rgba(255, 255, 255, 0.2);
  border-right: 1px solid rgba(255, 255, 255, 0.2); */
}

.main-nav a:first-child {
  margin-left: 0;
}

.nav-content {
  transform: skewX(25deg);
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
  z-index: 1001;
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
  display: none;
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.9);
  backdrop-filter: blur(15px);
  -webkit-backdrop-filter: blur(15px);
  transform: translateX(-100%);
  /* Start off-screen to the left */
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1);
  z-index: 1000;
  padding: 2rem;
  flex-direction: column;
}

.mobile-nav.is-open {
  transform: translateX(0);
}

.mobile-nav-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: 100%;
}

/* Reuse logo styles but adjust for mobile menu context */
.mobile-nav .logo .logo-text {
  font-size: 1.2rem;
}

.mobile-nav .logo .logo-subtitle {
  display: block;
  /* Ensure subtitle is visible */
  font-size: 0.5rem;
}

.close-menu {
  background: none;
  border: none;
  color: #fff;
  font-size: 2.5rem;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}

.mobile-nav-links {
  margin-top: 4rem;
  display: flex;
  flex-direction: column;
  width: 100%;
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
  left: -2rem;
  top: 0;
  bottom: 0;
  width: 4px;
  background-color: #e7a33e;
  /* Gold color indicator */
  border-radius: 2px;
}

@media (max-width: 768px) {
  .main-nav {
    display: none;
  }

  .menu-toggle {
    display: block;
  }

  .mobile-nav {
    display: flex;
  }

  .logo-subtitle {
    display: none;
  }
}
</style>
