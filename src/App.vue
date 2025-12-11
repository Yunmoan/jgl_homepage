<template>
  <SiteHeader />
  <main class="main-content">
    <section id="home" class="fade-in-section">
      <HomeView />
    </section>
    <section id="about" class="fade-in-section">
      <AboutView />
    </section>
    <section id="works" class="fade-in-section">
      <WorksView />
    </section>

    <section id="history" class="fade-in-section">
      <PictureView />
    </section>
    <section id="news" class="fade-in-section">
      <NewsSection @select-article="handleSelectArticle" />
    </section>
    <section id="members" class="fade-in-section">
      <MembersView />
    </section>
    <section id="contact">
      <ContactView />
    </section>

  </main>
  <SiteFooter />
  <ArticleDialog :show="isDialogVisible" :article="selectedArticle" @close="closeDialog" />
</template>

<script setup lang="ts">
import SiteHeader from './components/Header.vue';
import SiteFooter from './components/Footer.vue';
import HomeView from './views/HomeView.vue';
import AboutView from './views/AboutView.vue';
import WorksView from './views/WorksView.vue';
import ContactView from './views/ContactView.vue';
import PictureView from './views/PictureView.vue';
import MembersView from './views/MembersView.vue';
import NewsSection from './views/NewsSection.vue';
import ArticleDialog from './components/ArticleDialog.vue';
import { ref, onMounted } from 'vue';

interface Article {
  id: number;
  title: string;
  date: string;
  image: string;
  summary: string;
  content: string;
}

const isDialogVisible = ref(false);
const selectedArticle = ref<Article | null>(null);

const handleSelectArticle = (article: Article) => {
  selectedArticle.value = article;
  isDialogVisible.value = true;
};

const closeDialog = () => {
  isDialogVisible.value = false;
  selectedArticle.value = null;
};

onMounted(() => {
  const sections = document.querySelectorAll('.fade-in-section');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Animate only once
        }
      });
    },
    {
      threshold: 0.1, // Start animation when 10% of the section is visible
    }
  );

  sections.forEach((section) => {
    observer.observe(section);
  });
});
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
  background-color: #263d6a;
  /* background: linear-gradient(rgb(17, 0, 255), rgb(0, 7, 56)); */
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
.fade-in-section {
  opacity: 0;
  transform: translateY(20px);
  transition: opacity 0.6s ease-out, transform 0.6s ease-out;
}

.fade-in-section.is-visible {
  opacity: 1;
  transform: translateY(0);
}

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
