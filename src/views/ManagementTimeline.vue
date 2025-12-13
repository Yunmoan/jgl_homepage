<template>
  <div class="management-timeline">
    <h1>高联管理层时间线</h1>
    <div v-if="loading">正在加载...</div>
    <div v-else-if="error">{{ error }}</div>
    <div v-else class="timeline-wrapper">
      <div v-for="generation in managementData" :key="generation.id" class="timeline-item">
        <h2>{{ generation.title }} ({{ generation.trem }})</h2>
        <span>{{ generation.description }}</span>
        <div class="contributors-list">
          <div v-for="member in generation.members" :key="member.name" class="contributor-item">
            <img :src="member.image" :alt="member.name" class="contributor-avatar" @error="handleImageError">
            <div class="contributor-info">
              <span class="contributor-name">{{ member.name }}</span>
              <span class="contributor-position">{{ member.position }}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';

const handleImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  if (target) {
    target.src = '/placeholder.svg';
  }
};

interface Member {
  name: string;
  position: string;
  image: string;
  description: string;
}

interface Generation {
  id: number;
  title: string;
  description: string;
  trem: string; // Note: Typo from JSON, should probably be 'term'
  members: Member[];
}

const managementData = ref<Generation[]>([]);
const loading = ref(true);
const error = ref<string | null>(null);

onMounted(async () => {
  try {
    const response = await fetch('/api/admin-history');
    if (!response.ok) {
      throw new Error('网络响应错误');
    }
    const data: Generation[] = await response.json();
    managementData.value = data.reverse();
  } catch (e) {
    error.value = '无法加载管理层数据。';
    console.error(e);
  } finally {
    loading.value = false;
  }
});
</script>

<style scoped>
.management-timeline {
  padding: 4rem 8rem;
  max-width: 1400px;
  margin: 0 auto;
  color: #d8e3e7;
}

h1 {
  text-align: left;
  margin-bottom: 2rem;
  color: #fff;
}

.timeline-wrapper {
  position: relative;
  padding-left: 1.5rem;
  /* Space for the timeline line */
}

.timeline-wrapper::before {
  content: '';
  position: absolute;
  top: 5px;
  /* Align with the top of the first dot */
  left: 0;
  bottom: 0;
  width: 3px;
  background-color: #4a5568;
}

.timeline-item {
  /* border-left: 3px solid #4a5568; */
  /* Removed */
  /* padding-left: 1.5rem; */
  /* Moved to wrapper */
  margin-bottom: 2.5rem;
  position: relative;
}

.timeline-item::before {
  content: '';
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #a0aec0;
  border: 2px solid #2d3748;
  position: absolute;
  left: -30px;
  /* Adjusted position to align with the new line */
  top: 5px;
  z-index: 1;
  /* Ensure dot is above the line */
}

h2 {
  margin-top: 0;
  margin-bottom: 1.5rem;
  color: #e2e8f0;
}

.contributors-list {
  margin-top: 1.5rem;
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(250px, 1fr));
  gap: 1.25rem;
}

.contributor-item {
  display: flex;
  align-items: center;
  gap: 1rem;
}

.contributor-avatar {
  width: 48px;
  height: 48px;
  border-radius: 50%;
  object-fit: cover;
}

.contributor-info {
  display: flex;
  flex-direction: column;
}

.contributor-name {
  font-size: 1.1rem;
  font-weight: 500;
  color: #cbd5e1;
}

.contributor-position {
  font-size: 0.9rem;
  color: #a0aec0;
}

/* Hero Section Styles - Unchanged */
.hero {
  height: 40vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  padding: 0 8rem;
  gap: 5rem;
  position: relative;
  background: linear-gradient(rgba(28, 25, 70, 0.3), rgba(125, 29, 74, 0.269)), url('/134678540_p1.webp') no-repeat center bottom/cover;
  background-attachment: fixed;
}

.hero h1 {
  text-align: left;
  margin-bottom: 2rem;
}

.hero-content {
  flex: 1;
}

.main-title {
  font-size: 4rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(130, 81, 0, 0.6);
}

@media (max-width: 868px) {
  .hero {
    padding: 8rem 2rem 0;
  }

  .management-timeline {
    padding: 2rem 1rem;
  }
}
</style>
