<template>
  <div class="works-page page-wrapper">
    <div class="container">
      <h2 class="page-title">社团制品 / WORKS</h2>
      <span>此页面展示了各大高校同好社提交到高联官网的社团制品，此处用作推广作用。</span>

      <div class="toolbar">

        <div class="tags-bar" v-if="clubs.length">
          <button class="tag" :class="{ active: selectedClub === 'all' }" @click="selectClub('all')">全部</button>
          <button v-for="c in clubs" :key="c" class="tag" :class="{ active: selectedClub === c }"
            @click="selectClub(c)">{{ c }}</button>
        </div>
        <div class="right-actions">
          <router-link class="back-home" to="/home#works">返回首页区块</router-link>
        </div>
      </div>

      <div class="grid-transition-wrap">
        <transition name="fade">
          <div :key="transitionKey" class="works-grid" :class="{ 'fixed-height': totalPages > 1 }">
            <a v-for="work in paginatedWorks" :key="work.id" :href="work.link" target="_blank" rel="noopener noreferrer"
              class="work-item-link">
              <div class="work-item">
                <div class="work-image">
                  <img :src="(work.imageUrl && work.imageUrl.trim()) ? work.imageUrl : PLACEHOLDER" @error="onImgError"
                    loading="lazy" decoding="async" alt="作品封面" />
                  <span v-if="Number((work as any).featured) === 1" class="badge featured">精选</span>
                </div>
                <h3 class="work-title">{{ work.title }}</h3>
                <div class="work-meta">
                  <span v-if="work.club" class="club-tag">来自：{{ work.club }}</span>
                </div>
                <p class="work-description">{{ work.description }}</p>
              </div>
            </a>
          </div>
        </transition>
      </div>

      <div class="pagination-controls" v-if="totalPages > 1">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>

      <p v-if="!loading && filteredWorks.length === 0" class="notice">暂无相关作品。</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, onUnmounted } from 'vue';
import { useRoute, useRouter } from 'vue-router';

interface Work {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
  club?: string;
  featured?: number; // 0/1
}

const route = useRoute();
const router = useRouter();
const works = ref<Work[]>([]);
const selectedClub = ref<'all' | string>('all');
const loading = ref(false);

const fetchWorks = async () => {
  loading.value = true;
  try {
    // 始终获取全量数据，在前端做筛选，避免切换标签后标签列表被“过滤”而消失
    const response = await fetch('/api/works');
    if (!response.ok) throw new Error('Failed to fetch works');
    works.value = await response.json();
  } catch (err) {
    console.error(err);
    works.value = [];
  } finally {
    loading.value = false;
  }
};

// Initialize from query
onMounted(() => {
  const qClub = (route.query.club as string) || 'all';
  selectedClub.value = qClub;
  fetchWorks();
});

// Keep query in sync when user selects
const selectClub = (club: 'all' | string) => {
  selectedClub.value = club;
  currentPage.value = 1;
  router.replace({ query: club === 'all' ? {} : { club } });
  fetchWorks();
};

// Also react when query changes externally
watch(() => route.query.club, (newVal) => {
  const club = (newVal as string) || 'all';
  if (club !== selectedClub.value) {
    selectedClub.value = club;
    currentPage.value = 1;
    fetchWorks();
  }
});

const clubs = computed(() => {
  const set = new Set<string>();
  works.value.forEach((w) => { if (w.club) set.add(w.club); });
  return Array.from(set).sort();
});

const filteredWorks = computed(() => {
  // When using API filter, works already filtered; but keep guard if backend returns all
  if (selectedClub.value === 'all') return works.value;
  return works.value.filter((w) => w.club === selectedClub.value);
});

const currentPage = ref(1);
const itemsPerPage = ref(12); // Page view shows more

const updateItemsPerPage = (mql: MediaQueryList | MediaQueryListEvent) => {
  itemsPerPage.value = mql.matches ? 6 : 12; // Mobile : Desktop
  currentPage.value = 1;
};

onMounted(() => {
  const mediaQueryList = window.matchMedia('(max-width: 768px)');
  updateItemsPerPage(mediaQueryList);
  mediaQueryList.addEventListener('change', updateItemsPerPage);
  onUnmounted(() => {
    mediaQueryList.removeEventListener('change', updateItemsPerPage);
  });
});

const totalPages = computed(() => {
  return Math.ceil(filteredWorks.value.length / itemsPerPage.value) || 1;
});

const paginatedWorks = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return filteredWorks.value.slice(startIndex, endIndex);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) currentPage.value++;
};
const prevPage = () => {
  if (currentPage.value > 1) currentPage.value--;
};

// 用于容器级过渡的 key，避免逐项重排动画
const transitionKey = computed(() => `${selectedClub.value}-${currentPage.value}`);

// 图片占位处理（找不到图片时使用 @public/placeholder.svg）
const PLACEHOLDER = '/placeholder.svg';
const getImgSrc = (url?: string) => {
  return url && url.trim() ? url : PLACEHOLDER;
};
const onImgError = (e: Event) => {
  const img = e.target as HTMLImageElement;
  if (!img) return;
  if (!img.src.endsWith('placeholder.svg')) {
    img.src = PLACEHOLDER;
  }
};
</script>

<style scoped>
.page-wrapper {
  padding: 120px 0 4rem;
  background: linear-gradient(#235b72, #1e293b);
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 1rem;
  text-align: left;
  border-bottom: 2px solid #5698c3;
  padding-bottom: 1rem;
}

.toolbar {
  display: flex;
  align-items: center;
  gap: 1rem;
  margin: 1rem 0 1.5rem;
}

.tags-bar {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  align-items: center;
}

.tag {
  padding: 0.4rem 0.8rem;
  border-radius: 8px;
  border: 1px solid rgba(255, 255, 255, 0.25);
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  cursor: pointer;
}

.tag.active {
  background: #e7a33e;
  color: #1e293b;
  border-color: #e7a33e;
  font-weight: 600;
}

.right-actions {
  margin-left: auto;
}

.back-home {
  color: #ffdba6;
  text-decoration: none;
}

.grid-transition-wrap {
  position: relative;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(260px, 1fr));
  gap: 1.25rem;
  margin-bottom: 2rem;
  padding: 30px 0px;
  /* 避免 paint 裁剪导致圆角/阴影“截断” */
  contain: layout style;
  overflow: visible;
  content-visibility: auto;
  contain-intrinsic-size: 720px;
}

.works-grid.fixed-height {
  min-height: calc(330px * 2 + 1.25rem);
}

/* 容器交叠淡入淡出，减少重排抖动 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.15s ease;
  will-change: opacity;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}

.fade-leave-active {
  position: absolute;
  inset: 0;
}

.work-item-link {
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: 8px;
  overflow: hidden;
  /* 将边框与背景移到外层，避免双重圆角造成边界“断裂” */
  background-color: rgba(26, 75, 139, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: transform .25s, box-shadow .25s;
  will-change: transform;
}

.work-item-link:hover {
  /* transform: translateY(-5px); */
  box-shadow: 0 8px 20px rgba(0, 0, 0, .3);
}

.work-item {
  /* 移除内层的圆角与边框，防止与外层叠加导致缝隙 */
  height: 330px;
  display: flex;
  flex-direction: column;
}

.work-image {
  height: 180px;
  background-color: #1e293b;
  position: relative;
}

.work-image img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}

/* badge */
.badge {
  position: absolute;
  top: 10px;
  left: 10px;
  padding: 0.2rem 0.5rem;
  border-radius: 6px;
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 1px;
  color: #1e293b;
  background: #ffdba6;
  border: 1px solid rgba(0, 0, 0, 0.15);
  box-shadow: 0 2px 6px rgba(0, 0, 0, 0.2);
}

.badge.featured {
  background: linear-gradient(135deg, #ffdba6 0%, #e7a33e 100%);
  color: #1e293b;
}

.work-title {
  font-size: 1.2rem;
  color: #e2e8f0;
  padding: 1rem 1rem 0.25rem;
  margin: 0;
}

.work-meta {
  padding: 0 1rem 0.5rem;
}

.club-tag {
  display: inline-block;
  font-size: 0.8rem;
  color: #cbd5e1;
  background: rgba(255, 255, 255, 0.06);
  border: 1px solid rgba(255, 255, 255, 0.18);
  padding: 0.15rem 0.5rem;
  border-radius: 8px;
}

.work-description {
  font-size: .9rem;
  color: #94a3b8;
  padding: 0 1rem 1rem;
  margin: 0;
  line-height: 1.5;
}

/* 旧样式保留兼容但不再使用 */
.work-club {
  font-size: .85rem;
  color: #cbd5e1;
  padding: 0 1rem 1rem;
  margin: 0;
}

.pagination-controls {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 1rem;
  color: #94a3b8;
}

.pagination-controls button {
  background-color: #5698c3;
  color: white;
  border: none;
  padding: 0.5rem 1rem;
  border-radius: 4px;
  cursor: pointer;
  transition: background-color .3s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #73b3df;
}

.pagination-controls button:disabled {
  background-color: #3a5a7e;
  cursor: not-allowed;
  opacity: .6;
}

@media (max-width: 768px) {
  .page-wrapper {
    padding-top: 100px;
  }

  .page-title {
    font-size: 2rem;
    margin-bottom: 0.75rem;
  }
}

/* 减少动画以照顾 prefers-reduced-motion */
@media (prefers-reduced-motion: reduce) {

  .fade-enter-active,
  .fade-leave-active {
    transition: none !important;
  }

  .work-item-link {
    transition: none !important;
  }
}
</style>
