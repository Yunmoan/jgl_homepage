<template>
  <div class="news-section-wrapper">
    <div class="news-section-container">
      <h2 class="section-title">新闻速递</h2>
      <transition name="list-fade" mode="out-in">
        <ul class="news-list" :key="currentPage">
          <li v-for="article in paginatedNews" :key="article.id" @click="selectArticle(article)" class="news-list-item">
            <span class="news-date">{{ formatDate(article.date) }}</span>
            <span class="news-title">{{ article.title }}</span>
          </li>
        </ul>
      </transition>
      <div v-if="totalPages > 1" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <span>第 {{ currentPage }} 页 / 共 {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue';

interface Article {
  id: number;
  title: string;
  date: string;
  image: string;
  summary: string;
  content: string;
  author: string;
}

const emit = defineEmits(['select-article']);

const formatDate = (dateString: string) => {
  if (!dateString) {
    return '';
  }
  const date = new Date(dateString);
  const utc8Date = new Date(date.getTime() + 8 * 60 * 60 * 1000);

  const year = utc8Date.getUTCFullYear();
  const month = (utc8Date.getUTCMonth() + 1).toString().padStart(2, '0');
  const day = utc8Date.getUTCDate().toString().padStart(2, '0');
  const hours = utc8Date.getUTCHours().toString().padStart(2, '0');
  const minutes = utc8Date.getUTCMinutes().toString().padStart(2, '0');
  const seconds = utc8Date.getUTCSeconds().toString().padStart(2, '0');

  return `${year}-${month}-${day} ${hours}:${minutes}:${seconds}`;
};

const news = ref<Article[]>([]);

onMounted(async () => {
  try {
    const response = await fetch('/api/news');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    news.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch news data:', error);
  }
});

const currentPage = ref(1);
const itemsPerPage = 5; // 每页显示5条新闻

const totalPages = computed(() => {
  return Math.ceil(news.value.length / itemsPerPage);
});

const paginatedNews = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage;
  const endIndex = startIndex + itemsPerPage;
  return news.value.slice(startIndex, endIndex);
});

const selectArticle = (article: Article) => {
  emit('select-article', article);
};

function nextPage() {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
}

function prevPage() {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
}
</script>

<style scoped>
.news-section-wrapper {
  background: linear-gradient(#235b72, #263d6a);
}

.news-section-container {
  max-width: 960px;
  margin: 0 auto;
  padding: 40px 20px;
}

.section-title {
  text-align: center;
  font-size: 2.5rem;
  margin-bottom: 40px;
  color: #ecf0f1;
}

.news-list {
  list-style: none;
  padding: 0;
  margin: 0;
  border-top: 1px solid #34495e;
}

.news-list-item {
  display: flex;
  align-items: center;
  padding: 1.5rem 1rem;
  border-bottom: 1px solid #34495e;
  cursor: pointer;
  transition: background-color 0.3s ease;
}

.news-list-item:hover {
  background-color: #34495e;
}

.news-date {
  font-size: 1rem;
  color: #95a5a6;
  margin-right: 2rem;
  min-width: 100px;
}

.news-title {
  font-size: 1.1rem;
  color: #ecf0f1;
  font-weight: 500;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  margin-top: 40px;
}

.pagination button {
  background-color: transparent;
  color: #ecf0f1;
  border: 1px solid #34495e;
  padding: 8px 16px;
  margin: 0 10px;
  border-radius: 5px;
  cursor: pointer;
  transition: background-color 0.3s ease, color 0.3s ease;
}

.pagination button:disabled {
  color: #7f8c8d;
  border-color: #7f8c8d;
  cursor: not-allowed;
  background-color: transparent;
}

.pagination button:not(:disabled):hover {
  background-color: #34495e;
  color: #fff;
}

.pagination span {
  font-size: 1rem;
  color: #bdc3c7;
}

.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity 0.3s ease;
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
}

@media (max-width: 768px) {
  .news-list-item {
    flex-direction: column;
    align-items: flex-start;
    gap: 0.5rem;
  }

  .news-date {
    font-size: 0.9rem;
    margin-right: 0;
  }
}
</style>
