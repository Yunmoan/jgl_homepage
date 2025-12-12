<template>
  <transition name="dialog-fade">
    <div v-if="show" class="dialog-overlay" @click.self="close">
      <div class="dialog-content">
        <header class="dialog-header">
          <h2 v-if="article" class="dialog-title">{{ article.title }}</h2>
          <button class="close-button" @click="close" aria-label="Close dialog">&times;</button>
        </header>
        <div class="dialog-body" v-html="articleContent"></div>
      </div>
    </div>
  </transition>
</template>

<script setup lang="ts">
import { computed } from 'vue';
import { marked } from 'marked';

interface Article {
  id: number;
  title: string;
  date: string;
  image: string;
  summary: string;
  content: string;
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

function close() {
  emit('close');
}
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
  border-radius: 8px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
  border: 1px solid rgba(255, 255, 255, 0.1);
  width: 90%;
  max-width: 960px;
  height: 85%;
  max-height: 80vh;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1.5rem 2rem;
  /* border-bottom: 1px solid rgba(255, 255, 255, 0.1); */
  flex-shrink: 0;
}

.dialog-title {
  margin: 0;
  font-size: 1.8rem;
  color: #fff;
  font-weight: bold;
}

.close-button {
  background: transparent;
  border: none;
  font-size: 2rem;
  font-weight: 50;
  color: #a0aec0;
  cursor: pointer;
  padding: 0;
  line-height: 1;
  transition: color 0.3s ease, transform 0.3s ease;
}

.close-button:hover {
  color: #fff;
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
</style>
