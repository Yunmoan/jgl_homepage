<template>
  <transition name="dialog-fade">
    <div v-if="show" class="dialog-overlay" @click.self="close">
      <div class="dialog-content">
        <header class="dialog-header">
          <h2 v-if="article" class="dialog-title">{{ article.title }}</h2>
          <button class="close-button" @click="close">&times;</button>
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
  background-color: rgba(0, 0, 0, 0.7);
  display: flex;
  justify-content: center;
  align-items: center;
  z-index: 2000;
  backdrop-filter: blur(5px);
}

.dialog-content {
  background-color: #2c3e50;
  color: #ecf0f1;
  border-radius: 8px;
  box-shadow: 0 5px 15px rgba(0, 0, 0, 0.5);
  width: 90%;
  max-width: 80%;
  max-height: 80%;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 1rem 1.5rem;
  border-bottom: 1px solid #34495e;
}

.dialog-title {
  margin: 0;
  font-size: 1.5rem;
  color: #ecf0f1;
}

.close-button {
  background: none;
  border: none;
  font-size: 2rem;
  font-weight: bold;
  color: #ecf0f1;
  cursor: pointer;
  padding: 0;
  line-height: 1;
}

.dialog-body {
  padding: 1.5rem;
  overflow-y: auto;
  line-height: 1.6;
}

.dialog-body :deep(h1),
.dialog-body :deep(h2),
.dialog-body :deep(h3) {
  color: #1abc9c;
  border-bottom: 1px solid #34495e;
  padding-bottom: 0.3em;
  margin-top: 1.5em;
}

.dialog-body :deep(p) {
  margin-bottom: 1em;
}

.dialog-body :deep(ul),
.dialog-body :deep(ol) {
  padding-left: 1.5em;
}

.dialog-body :deep(li) {
  margin-bottom: 0.5em;
}

.dialog-body :deep(blockquote) {
  border-left: 4px solid #1abc9c;
  padding-left: 1em;
  margin-left: 0;
  color: #bdc3c7;
  font-style: italic;
}

.dialog-body :deep(code) {
  background-color: #34495e;
  padding: 0.2em 0.4em;
  border-radius: 3px;
  font-family: 'Courier New', Courier, monospace;
}

.dialog-body :deep(pre)> :deep(code) {
  display: block;
  padding: 1em;
  overflow-x: auto;
}

.dialog-fade-enter-active,
.dialog-fade-leave-active {
  transition: opacity 0.3s ease;
}

.dialog-fade-enter-from,
.dialog-fade-leave-to {
  opacity: 0;
}

.dialog-fade-enter-active .dialog-content,
.dialog-fade-leave-active .dialog-content {
  transition: transform 0.3s ease, opacity 0.3s ease;
}

.dialog-fade-enter-from .dialog-content,
.dialog-fade-leave-to .dialog-content {
  opacity: 0;
  transform: scale(0.95) translateY(-20px);
}
</style>
