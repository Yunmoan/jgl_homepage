<template>
  <SiteHeader />
  <main class="main-content">
    <router-view v-slot="{ Component }">
      <transition name="fade" mode="out-in">
        <component :is="Component" @select-article="handleSelectArticle" />
      </transition>
    </router-view>
  </main>
  <SiteFooter />
  <ArticleDialog :show="isDialogVisible" :article="selectedArticle" @close="closeDialog" />
</template>

<script setup lang="ts">
import SiteHeader from './components/Header.vue';
import SiteFooter from './components/Footer.vue';
import ArticleDialog from './components/ArticleDialog.vue';
import { ref } from 'vue';

interface Article {
  id: number;
  title: string;
  date: string;
  image: string;
  summary: string;
  content: string;
  author: string;
}

const isDialogVisible = ref(false);
const selectedArticle = ref<Article | null>(null);

// This function might be needed in other views, consider moving to a composable or state fames
const handleSelectArticle = (article: Article) => {
  selectedArticle.value = article;
  isDialogVisible.value = true;
};

const closeDialog = () => {
  isDialogVisible.value = false;
  selectedArticle.value = null;
};
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
  color: #d8e3e7;
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

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.5s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

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
