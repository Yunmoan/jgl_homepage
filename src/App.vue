<template>
  <div id="app">
    <SiteHeader />
    <main class="main-content">
      <section id="home">
        <HomeView />
      </section>
      <section id="about">
        <AboutView />
      </section>
      <section id="works">
        <WorksView />
      </section>
      <section id="contact">
        <ContactView />
      </section>
    </main>
    <SiteFooter />
  </div>
</template>

<script setup lang="ts">
import SiteHeader from './components/Header.vue';
import SiteFooter from './components/Footer.vue';
import HomeView from './views/HomeView.vue';
import AboutView from './views/AboutView.vue';
import WorksView from './views/WorksView.vue';
import ContactView from './views/ContactView.vue';
</script>

<style>
/* Global Styles */
@import url('https://fonts.googleapis.com/css2?family=Noto+Sans+SC:wght@300;400;700&display=swap');

html {
  scroll-behavior: smooth;
}

body {
  margin: 0;
  font-family: 'Noto Sans SC', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
  background-color: #0f172a;
  color: #d8e3e7;
  /* New light grayish blue for text */
}

#app {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
}

.main-content {
  flex: 1;
}

.container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 0 1rem;
}

/* SEO-friendly class to hide content visually but keep it accessible to screen readers */
.sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border-width: 0;
}
</style>
