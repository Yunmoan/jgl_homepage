<template>
  <transition name="dialog-fade">
    <div v-if="show" class="dialog-overlay" @click.self="close">
      <div class="dialog-content">
        <div class="dialog-header">
          <img v-if="article && article.image" :src="article.image" :alt="article.title" class="header-image">
          <div class="badge">{{ (article.tags && article.tags.length ? article.tags[0] : '新闻') }}</div>
          <div class="header-overlay"></div>
          <div class="header-content">
            <h2 v-if="article" class="dialog-title">{{ article.title }}</h2>
            <p v-if="article && article.date" class="dialog-date">{{ formattedDate }} · 作者：{{ article.author }}</p>
          </div>
          <button class="close-button" @click="close" aria-label="Close dialog">&times;</button>
        </div>
        <div class="dialog-body" v-html="articleContent"></div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed, watch, onUnmounted } from 'vue';
import { marked } from 'marked';

interface Article {
  id: number
  title: string
  date: string
  image: string
  summary: string
  content: string
  author: string
  tags?: string[]
}

const props = defineProps<{
  show: boolean;
  article: Article | null;
}>();

const emit = defineEmits(['close']);

const articleContent = computed(() => {
  if (props.article && props.article.content) {
    return marked(props.article.content);
  }
  return '';
});

const formattedDate = computed(() => {
  if (!props.article || !props.article.date) {
    return '';
  }
  const date = new Date(props.article.date);
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = utc8Date.getUTCFullYear();
  const month = (utc8Date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = utc8Date.getUTCDate().toString().padStart(2, '0');
  const hours = utc8Date.getUTCHours().toString().padStart(2, '0');
  const minutes = utc8Date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = utc8Date.getUTCSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
});

function close() {
  emit('close');
}

watch(() => props.show, (newValue) => {
  if (newValue) {
    document.body.style.overflow = 'hidden';
  } else {
    document.body.style.overflow = '';
  }
});

onUnmounted(() => {
  document.body.style.overflow = '';
});

</script>

<style scoped>
.dialog-overlay {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(15, 23, 42, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(10px);
  -webkit-backdrop-filter: blur(10px);
}

.dialog-content {
  background-color: rgba(52, 81, 134, 0.881);
  color: #d8e3e7;
  border-radius: 12px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 960px;
  /* height: 85%; */
  max-height: 90%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  position: relative;
  width: 100%;
  height: 250px;
  flex-shrink: 0;
  overflow: hidden;
  display: flex;
  align-items: flex-end;
}

.header-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  position: absolute;
  top: 0;
  left: 0;
}

.header-overlay {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80%;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  pointer-events: none;
}

.header-content {
  position: relative;
  z-index: 1;
  padding: 1.5rem 2rem;
  width: 100%;
}

.dialog-title {
  margin: 0;
  font-size: 2rem;
  color: #fff;
  font-weight: bold;
  text-shadow: 0 2px 10px rgba(0, 0, 0, 0.5);
  margin-bottom: 0.5rem;
}

.dialog-date {
  margin: 0;
  font-size: 0.9rem;
  color: #cbd5e0;
  text-shadow: 0 1px 5px rgba(0, 0, 0, 0.5);
}

.close-button {
  position: absolute;
  top: 1rem;
  right: 1rem;
  z-index: 2;
  background: rgba(0, 0, 0, 0.5);
  border: none;
  border-radius: 50%;
  width: 40px;
  height: 40px;
  font-size: 1.5rem;
  color: #fff;
  cursor: pointer;
  display: flex;
  justify-content: center;
  align-items: center;
  line-height: 1;
  transition: all 0.3s ease;
}

.close-button:hover {
  background: rgba(0, 0, 0, 0.8);
  transform: rotate(90deg);
}

.dialog-body {
  padding: 1rem 2rem 2rem;
  overflow-y: auto;
  line-height: 1.8;
}

/* Custom Scrollbar Styling */
.dialog-body::-webkit-scrollbar {
  width: 8px;
}

.dialog-body::-webkit-scrollbar-track {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 4px;
}

.dialog-body::-webkit-scrollbar-thumb {
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4px;
}

.dialog-body::-webkit-scrollbar-thumb:hover {
  background: rgba(255, 255, 255, 0.4);
}

.dialog-body :deep(h1),
.dialog-body :deep(h2),
.dialog-body :deep(h3) {
  color: #f4f4f4;
  border-bottom: 0.2px solid rgba(255, 255, 255, 0.1);
  padding-bottom: 0.5em;
  margin-top: 2em;
  margin-bottom: 1em;
}

.dialog-body :deep(p) {
  margin-bottom: 1.2em;
}

.dialog-body :deep(ul),
.dialog-body :deep(ol) {
  padding-left: 1.5em;
}

.dialog-body :deep(li) {
  margin-bottom: 0.8em;
}

.dialog-body :deep(blockquote) {
  border-left: 4px solid #e7a33e;
  padding-left: 1.5em;
  margin-left: 0;
  color: #a0aec0;
  font-style: italic;
  background-color: rgba(15, 23, 42, 0.5);
  padding-top: 0.5rem;
  padding-bottom: 0.5rem;
  border-radius: 0 8px 8px 0;
}

.dialog-body :deep(code) {
  background-color: rgba(15, 23, 42, 0.8);
  padding: 0.2em 0.5em;
  border-radius: 4px;
  font-family: 'Courier New', Courier, monospace;
  font-size: 0.9em;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-body :deep(pre) {
  background-color: rgba(15, 23, 42, 0.8);
  padding: 1.5em;
  border-radius: 8px;
  overflow-x: auto;
  border: 1px solid rgba(255, 255, 255, 0.1);
}

.dialog-body :deep(pre)> :deep(code) {
  background: none;
  padding: 0;
  border: none;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.4s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-active .dialog-content,
.dialog-fade-leave-active .dialog-content {
  transition: transform 0.4s cubic-bezier(0.23, 1, 0.32, 1), opacity 0.4s ease;
}

.dialog-fade-enter-from .dialog-content,
.dialog-fade-leave-to .dialog-content {
  opacity: 0;
  transform: scale(0.9) translateY(-20px);
}

.badge {
  position: absolute;
  right: 2rem;
  bottom: 2rem;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
  z-index: 2;
}
</style>
