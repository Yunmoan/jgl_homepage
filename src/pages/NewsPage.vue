<template>
  <div class="news-page">
    <div class="news-page-container">
      <div class="section-header page">
        <h1 class="section-title">新闻资讯</h1>
        <router-link class="back-home" to="/home#news">返回首页</router-link>
      </div>

      <transition name="list-fade" mode="out-in">
        <ul class="news-grid" :key="currentPage">
          <li v-for="article in paginatedNews" :key="article.id" class="news-card" @click="selectArticle(article)">
            <div class="card-image-wrapper">
              <img v-if="article.image" :src="article.image" :alt="article.title" class="card-image" />
              <div class="badge">{{ (article.tags && article.tags.length ? article.tags[0] : '新闻') }}</div>
            </div>
            <div class="card-body">

              <h3 class="card-title">{{ article.title }} </h3>
              <div v-if="article.tags && article.tags.length" class="tags-row">
                <span v-for="t in article.tags" :key="t" class="tag-chip">{{ t }}</span>
              </div>
              <p v-if="article.summary" class="card-summary">{{ article.summary }}</p>
              <div class="card-footer" @click.stop>
                <span class="card-date">{{ formatDate(article.date) }}</span>
                <button class="more-btn" @click="selectArticle(article)">了解更多</button>
              </div>
            </div>
          </li>
        </ul>
      </transition>

      <div v-if="totalPages > 1" class="pagination">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

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

const emit = defineEmits(['select-article'])

const formatDate = (dateString: string) => {
  if (!dateString) return ''
  const d = new Date(dateString)
  const utc8 = new Date(d.getTime() + 8 * 60 * 60 * 1000)
  const y = utc8.getUTCFullYear()
  const m = (utc8.getUTCMonth() + 1).toString().padStart(2, '0')
  const day = utc8.getUTCDate().toString().padStart(2, '0')
  return `${y}年${m}月${day}日`
}

const news = ref<Article[]>([])

onMounted(async () => {
  try {
    const res = await fetch('/api/news')
    if (!res.ok) throw new Error('Network Error')
    news.value = await res.json()
  } catch (e) {
    console.error('Failed to fetch news data:', e)
  }
})

const currentPage = ref(1)
const itemsPerPage = 9 // 每页 9 条

const totalPages = computed(() => Math.ceil(news.value.length / itemsPerPage))

const paginatedNews = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return news.value.slice(start, end)
})

const selectArticle = (article: Article) => emit('select-article', article)

function nextPage() {
  if (currentPage.value < totalPages.value) currentPage.value++
}

function prevPage() {
  if (currentPage.value > 1) currentPage.value--
}
</script>

<style scoped>
.news-page {
  background: linear-gradient(#235b72, #263d6a);
  min-height: 100vh;
}

.news-page-container {
  max-width: 1280px;
  margin: 0 auto;
  padding: 96px 20px 56px;
  /* 留出 Header 高度 */
}

.section-header.page {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 24px;
}

.section-title {
  font-size: 2rem;
  color: #f8fafc;
  margin: 0;
}

.back-home {
  color: #93c5fd;
  text-decoration: none;
}

.back-home:hover {
  color: #bfdbfe;
}

.news-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
  /* column-gap: 24px; */
}

.news-card {
  background: #111827;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow .25s ease;
  display: inline-block;
  width: 100%;
  break-inside: avoid;
  /* margin-bottom: 24px; */
}

.news-card:hover {
  box-shadow: 0 0px 20px rgba(0, 0, 0, .15);
}

.news-card:hover .card-image {
  transform: scale(1.05);
}

.card-image-wrapper {
  position: relative;
  width: 100%;
  /* aspect-ratio: 3 / 4; */
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .35s ease;
}

.badge {
  position: absolute;
  right: 10px;
  top: 10px;
  background: #ef4444;
  color: #fff;
  font-weight: 700;
  font-size: 12px;
  padding: 4px 8px;
  border-radius: 8px;
}


.card-body {
  background: #263d6a;
  padding: 12px 14px 14px;
}

.card-title {
  margin: 0 0 8px;
  color: #f1f5f9;
  font-size: 1.1rem;
  line-height: 1.35;
  font-weight: 600;
}

.tags-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  margin: 4px 0 8px;
}

.tag-chip {
  background: rgba(255, 255, 255, 0.12);
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.15);
  padding: 2px 8px;
  border-radius: 999px;
  font-size: .75rem;
  line-height: 1.6;
}

.card-summary {
  color: #cbd5e1;
  margin: 0 0 10px;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  font-size: 0.95rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 10px;
}

.card-date {
  color: #94a3b8;
  font-size: 0.9rem;
}

.more-btn {
  appearance: none;
  border: none;
  background: transparent;
  color: #60a5fa;
  cursor: pointer;
  padding: 6px 0;
}

.more-btn:hover {
  color: #93c5fd;
}

.pagination {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 12px;
  margin-top: 28px;
}

.pagination button {
  background: transparent;
  color: #e5e7eb;
  border: 1px solid rgba(255, 255, 255, 0.2);
  padding: 8px 14px;
  border-radius: 8px;
  cursor: pointer;
  transition: background .2s ease, color .2s ease;
}

.pagination button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.12);
}

.pagination button:disabled {
  opacity: .5;
  cursor: not-allowed;
}

.pagination span {
  color: #cbd5e1;
  font-size: 0.95rem;
}

.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity .25s ease;
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
}

@media (max-width: 1024px) {
  .news-grid {
    column-count: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 640px) {
  .news-grid {
    column-count: 2;
  }
}
</style>
