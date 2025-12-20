<template>
  <div class="news-section-wrapper">
    <div class="news-section-container">
      <div class="section-header">
        <h2 class="section-title">新闻</h2>
      </div>

      <transition name="list-fade" mode="out-in">
        <div class="news-viewport" :key="currentPage">
          <ul class="news-grid">
            <li v-for="article in paginatedNews" :key="article.id" class="news-card" @click="selectArticle(article)">
              <div class="card-image-wrapper">
                <img v-if="article.image" :src="article.image" :alt="article.title" class="card-image"
                  @load="onItemLoad" />
                <div class="badge">{{ (article.tags && article.tags.length ? article.tags[0] : '新闻') }}</div>
              </div>
              <div class="card-body">
                <h3 class="card-title">{{ article.title }}
                  <span v-if="!article.image" class="badge">{{ (article.tags && article.tags.length ?
                    article.tags[0] : '新闻') }}
                  </span>
                </h3>
                <div v-if="article.tags && article.tags.length" class="tags-row">
                  <span v-for="t in article.tags" :key="t" class="tag-chip">{{ t }}</span>
                </div>
                <p class="card-summary">作者：{{ article.author }}</p>
                <p v-if="article.summary" class="card-summary"> {{ article.summary }}</p>
                <div class="card-footer" @click.stop>
                  <span class="card-date">{{ formatDate(article.date) }}</span>
                  <button class="more-btn" @click="selectArticle(article)">了解更多</button>
                </div>
              </div>
            </li>
          </ul>
          <div class="viewport-mask">
            <router-link to="/news" class="more-btn-primary mask-btn">查看更多新闻</router-link>
          </div>
        </div>
      </transition>
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
const itemsPerPage = 6 // 首页展示 6 条（2 行 x 3 列）

// const totalPages = computed(() => Math.ceil(news.value.length / itemsPerPage))

const paginatedNews = computed(() => {
  const start = (currentPage.value - 1) * itemsPerPage
  const end = start + itemsPerPage
  return news.value.slice(start, end)
})

const selectArticle = (article: Article) => emit('select-article', article)

// function nextPage() {
//   if (currentPage.value < totalPages.value) currentPage.value++
// }

// function prevPage() {
//   if (currentPage.value > 1) currentPage.value--
// }
</script>

<style scoped>
/* 背景与容器 */
.news-section-wrapper {
  background: linear-gradient(#235b72, #263d6a);
}

.news-section-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 40px 20px 56px;
}

/* 标题 */
.section-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 28px;
}

.section-title {
  margin: 0;
  font-size: 2.1rem;
  font-weight: 800;
  letter-spacing: .5px;
  color: #e5e7eb;
}

.section-title .accent {
  color: #ef4444;
}

/* 仅显示两行，第二行显示一半：用视窗 + 渐变遮罩 */
.news-viewport {
  position: relative;
}

.viewport-mask {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: 36%;
  background: linear-gradient(to top, #263d6a 30%, #235c7200 100%);
  display: flex;
  width: 100%;
  align-items: flex-end;
  justify-content: center;
  padding-bottom: 6px;
  pointer-events: auto;
  /* 覆盖并阻止下方交互 */
}

/* 网格 */
.news-grid {
  list-style: none;
  padding: 0;
  margin: 0;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
  align-items: start;
}

/* 卡片 */
.news-card {
  background: #111827;
  border-radius: 8px;
  overflow: hidden;
  cursor: pointer;
  transition: box-shadow .25s ease;
}

.news-card:hover {
  box-shadow: 0 0px 20px rgba(0, 0, 0, .15);
}

/* 封面 */
.card-image-wrapper {
  position: relative;
  width: 100%;
  /* 自适应高度，不固定比例 */
  overflow: hidden;
}

.card-image {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform .35s ease;
}

.news-card:hover .card-image {
  transform: scale(1.05);
}

/* 角标 */
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

/* 内容区 */
.card-body {
  background: #263d6a;
  padding: 12px 14px 14px;
}

.card-title {
  margin: 0 0 8px;
  color: #f1f5f9;
  font-size: 1.3rem;
  line-height: 1.35;
  font-weight: 700;
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
  font-size: .95rem;
}

.card-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 8px;
}

.card-date {
  color: #94a3b8;
  font-size: .9rem;
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

/* 遮罩上的按钮 */
.more-btn-primary {
  display: inline-block;
  text-decoration: none;
  background: #e11d48;
  color: #fff;
  font-weight: 700;
  padding: 10px 18px;
  border-radius: 8px;
  box-shadow: 0 6px 16px rgba(225, 29, 72, .35);
  transition: transform .15s ease, box-shadow .2s ease, background .2s ease;
}

.more-btn-primary:hover {
  background: #ab2c41;
  /* transform: translateY(-1px); */
  /* box-shadow: 0 10px 22px rgba(244, 63, 94, .4); */
}

/* 过渡 */
.list-fade-enter-active,
.list-fade-leave-active {
  transition: opacity .25s ease;
}

.list-fade-enter-from,
.list-fade-leave-to {
  opacity: 0;
}

/* 响应式 */
@media (max-width: 1024px) {
  .news-grid {
    column-count: 2;
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .viewport-mask {
    height: 42%;
  }
}

@media (max-width: 640px) {
  .section-title {
    font-size: 1.6rem;
  }

  .news-grid {
    column-count: 1;
  }

  .viewport-mask {
    height: 48%;
  }
}
</style>
