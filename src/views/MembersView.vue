<template>
  <div class="members-view">
    <div class="container">
      <h2 class="page-title">成员社团 / MEMBERS</h2><br />
      <span>不分先后，按拼音字母顺序排序</span>
      <div class="members-grid">
        <MemberCard v-for="member in displayedMembers" :key="member.id" :member="member" @image-error="onImageError" />
      </div>
      <div ref="observerTarget" class="observer-target"></div>
      <!-- Loading indicator -->
      <div v-if="isLoading" class="loading-indicator">
        <div class="spinner"></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, shallowRef } from 'vue';
import MemberCard from '../components/MemberCard.vue';

interface Member {
  id: number;
  name: string;
  logo: string;
  link?: string;
}

interface PaginationInfo {
  page: number;
  limit: number;
  total: number;
  totalPages: number;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

// Use shallowRef to avoid deep reactivity overhead
const displayedMembers = shallowRef<Member[]>([]);
const observerTarget = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);
const membersPerPage = 18;
const currentPage = ref(1);
const paginationInfo = ref<PaginationInfo | null>(null);
const isLoading = ref(false);

const onImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = '/placeholder.svg';
};

const loadMoreMembers = async () => {
  if (isLoading.value) return;

  if (paginationInfo.value && !paginationInfo.value.hasNextPage) {
    if (observer.value) {
      observer.value.disconnect();
    }
    return;
  }

  isLoading.value = true;
  try {
    const response = await fetch(
      `/api/members?page=${currentPage.value}&limit=${membersPerPage}`,
      {
        signal: AbortSignal.timeout(10000) // 10 second timeout
      }
    );

    if (!response.ok) {
      throw new Error('Network response was not ok');
    }

    const result = await response.json();
    const { data, pagination } = result;

    if (data && data.length > 0) {
      // Use shallow update to avoid deep reactivity
      const newMembers = [...displayedMembers.value, ...data];
      displayedMembers.value = newMembers;
      paginationInfo.value = pagination;
      currentPage.value++;
    }
  } catch (error) {
    console.error('Failed to fetch members data:', error);
  } finally {
    isLoading.value = false;
  }
};

onMounted(() => {
  // Use requestIdleCallback for non-critical initialization
  if ('requestIdleCallback' in window) {
    requestIdleCallback(() => {
      initializeMembers();
    }, { timeout: 2000 });
  } else {
    setTimeout(initializeMembers, 100);
  }
});

const initializeMembers = async () => {
  try {
    await loadMoreMembers();

    if (observerTarget.value) {
      const observerOptions = {
        rootMargin: '0px 0px 500px 0px',
        threshold: 0.01 // Reduced threshold for better performance
      };

      observer.value = new IntersectionObserver((entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting && !isLoading.value) {
          loadMoreMembers();
        }
      }, observerOptions);
      observer.value.observe(observerTarget.value);
    }
  } catch (error) {
    console.error('Failed to initialize members view:', error);
  }
};

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect();
  }
});
</script>

<style scoped>
.members-view {
  padding: 120px 10 4rem;
  background: linear-gradient(#263d6a, #235b72);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 2rem 1rem;
  text-align: center;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  text-align: center;
  display: inline-block;
  margin-bottom: 0.5rem;
}

.members-grid {
  padding-top: 2rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(220px, 1fr));
  gap: 1.5rem;
  /* Optimize rendering performance */
  contain: layout style;
  overflow: visible;
  padding: 50px 8px;
}

.observer-target {
  height: 20px;
}

.loading-indicator {
  display: flex;
  justify-content: center;
  align-items: center;
  padding: 2rem;
}

.spinner {
  width: 40px;
  height: 40px;
  border: 4px solid rgba(255, 255, 255, 0.2);
  border-top-color: #fff;
  border-radius: 50%;
  animation: spin 0.8s linear infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

/* PC Styles */
@media (min-width: 1200px) {
  .members-grid {
    grid-template-columns: repeat(6, 1fr);
  }
}

/* Mobile Styles */
@media (max-width: 768px) {
  .container {
    padding: 0 1rem;
  }

  .members-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 1rem;
  }
}

@media (max-width: 480px) {
  .page-title {
    font-size: 2rem;
  }

  .members-grid {
    grid-template-columns: repeat(3, 1fr);
    gap: 0.8rem;
  }
}
</style>
