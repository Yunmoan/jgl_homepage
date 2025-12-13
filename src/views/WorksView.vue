<template>
  <div class="works-view page-wrapper">
    <div class="container">
      <h2 class="page-title">社团制品 / WORKS</h2>
      <div class="works-grid" :class="{ 'fixed-height': totalPages > 1 }">
        <a v-for="work in paginatedWorks" :key="work.id" :href="work.link" target="_blank" rel="noopener noreferrer"
          class="work-item-link">
          <div class="work-item">
            <div class="work-image" :style="{ backgroundImage: `url(${work.imageUrl})` }"></div>
            <h3 class="work-title">{{ work.title }}</h3>
            <p class="work-description">{{ work.description }}</p>
          </div>
        </a>
      </div>
      <div class="pagination-controls" v-if="totalPages > 1">
        <button @click="prevPage" :disabled="currentPage === 1">上一页</button>
        <span>第 {{ currentPage }} / {{ totalPages }} 页</span>
        <button @click="nextPage" :disabled="currentPage === totalPages">下一页</button>
      </div>
      <p class="notice" v-else>更多作品正在整理中，敬请期待！</p>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue';

interface Work {
  id: number;
  title: string;
  description: string;
  imageUrl: string;
  link: string;
}

// Load data from JSON file
const works = ref<Work[]>([]);

onMounted(async () => {
  try {
    const response = await fetch('/api/works');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    works.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch works data:', error);
  }
});

const currentPage = ref(1);
const itemsPerPage = ref(8); // Default for desktop

const updateItemsPerPage = (mql: MediaQueryList | MediaQueryListEvent) => {
  if (mql.matches) {
    // Mobile view
    itemsPerPage.value = 4;
  } else {
    // Desktop view
    itemsPerPage.value = 8;
  }
  // Reset to first page to avoid being on a non-existent page
  currentPage.value = 1;
};

onMounted(() => {
  const mediaQueryList = window.matchMedia('(max-width: 768px)');
  updateItemsPerPage(mediaQueryList); // Initial check
  mediaQueryList.addEventListener('change', updateItemsPerPage);

  onUnmounted(() => {
    mediaQueryList.removeEventListener('change', updateItemsPerPage);
  });
});

const totalPages = computed(() => {
  return Math.ceil(works.value.length / itemsPerPage.value);
});

const paginatedWorks = computed(() => {
  const startIndex = (currentPage.value - 1) * itemsPerPage.value;
  const endIndex = startIndex + itemsPerPage.value;
  return works.value.slice(startIndex, endIndex);
});

const nextPage = () => {
  if (currentPage.value < totalPages.value) {
    currentPage.value++;
  }
};

const prevPage = () => {
  if (currentPage.value > 1) {
    currentPage.value--;
  }
};
</script>

<style scoped>
.page-wrapper {
  padding: 120px 0 4rem;
  /* 80px for header + 40px top padding */
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 3rem;
  text-align: left;
  border-bottom: 2px solid #5698c3;
  padding-bottom: 1rem;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 3rem;
}

.works-grid.fixed-height {
  /* Set a min-height to hold 2 rows of items to prevent layout shifts */
  /* (330px item height * 2) + 2rem gap */
  min-height: calc(330px * 2 + 2rem);
}

.work-item-link {
  text-decoration: none;
  color: inherit;
  display: block;
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.work-item-link:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.work-item {
  background-color: rgba(26, 75, 139, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  height: 330px;
  /* Fixed height for consistency */
  display: flex;
  flex-direction: column;
}

.work-image {
  height: 180px;
  background-color: #1e293b;
  /* Dark slate for placeholder */
  background-size: cover;
  background-position: center;
}

.work-title {
  font-size: 1.2rem;
  color: #e2e8f0;
  padding: 1rem 1rem 0.5rem;
  margin: 0;
}

.work-description {
  font-size: 0.9rem;
  color: #94a3b8;
  /* Lighter gray for description */
  padding: 0 1rem 1rem;
  margin: 0;
  line-height: 1.5;
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
  transition: background-color 0.3s;
}

.pagination-controls button:hover:not(:disabled) {
  background-color: #73b3df;
}

.pagination-controls button:disabled {
  background-color: #3a5a7e;
  cursor: not-allowed;
  opacity: 0.6;
}

.notice {
  text-align: center;
  color: #94a3b8;
}

/* Mobile Optimizations */
@media (max-width: 768px) {
  .page-wrapper {
    padding-top: 100px;
    /* 80px header + 20px padding */
  }

  .page-title {
    font-size: 2rem;
    margin-bottom: 2rem;
  }

  .works-grid {
    gap: 1rem;
    grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  }

  .works-grid.fixed-height {
    /* Adjust min-height for mobile with smaller gap */
    /* (330px item height * 2) + 1rem gap */
    min-height: calc(330px * 2 + 1rem);
  }

  .pagination-controls button {
    padding: 0.75rem 1.25rem;
  }
}

@media (max-width: 480px) {
  .works-grid {
    /* On very small screens, force 2 columns */
    grid-template-columns: repeat(2, 1fr);
  }
}
</style>
