<template>
  <div class="fame-hall-wrapper">
    <h2>名人堂</h2>
    <div class="members-grid">
      <div v-for="member in members" :key="member.id" class="member-card">
        <img :src="member.image" :alt="member.name" class="avatar" @error="handleImageError" />
        <div class="member-info">
          <h3 class="name">{{ member.name }}</h3>
          <p class="description" v-html="member.description"></p>
        </div>
      </div>
    </div>
    <div class="explanation">
      <h4>什么是名人堂？</h4>
      <p>名人堂是一个大展厅，展示的是我们见证做出过或正在做出贡献的东方Project爱好者，是一种荣誉的象征。</p>
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
  id: number;
  name: string;
  description: string;
  image: string;
}

const members = ref<Member[]>([]);

onMounted(async () => {
  try {
    const response = await fetch('/data/fames_member.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    members.value = await response.json();
  } catch (error) {
    console.error('Failed to fetch fame members:', error);
  }
});
</script>

<style scoped>
.fame-hall-wrapper {
  padding: 4rem 8rem;
  margin: 0 auto;
}

h2 {
  font-size: 1.5rem;
  font-weight: 600;
  margin-bottom: 1.5rem;
  text-align: left;
  color: #ffffff;
}

.members-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(300px, 1fr));
  gap: 1rem;
  margin-bottom: 2rem;
}

.member-card {
  background-color: #0d4f95d6;
  border-radius: 6px;
  padding: 1rem;
  display: flex;
  align-items: center;
  gap: 1rem;
  /* border: 1px solid #e8e8e8; */
  box-shadow: 0 8px 12px rgba(0, 0, 0, 0.1);
  transition: transform 0.2s ease, box-shadow 0.2s ease;
}

.avatar {
  width: 50px;
  height: 50px;
  border-radius: 50%;
  object-fit: cover;
  flex-shrink: 0;
}

.member-info {
  text-align: left;
  overflow: hidden;
}

.name {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.25rem;
  color: #c3c3c3;
  white-space: nowrap;
}

.description {
  font-size: 0.85rem;
  color: #e7e7e7;
  margin: 0;
  line-height: 1.4;
}

.explanation {
  margin-top: 2rem;
  text-align: left;
}

.explanation h4 {
  font-size: 1rem;
  font-weight: 600;
  margin: 0 0 0.5rem;
  color: #e4e4e4;
}

.explanation p {
  font-size: 0.9rem;
  color: #c9c9c9;
  margin: 0;
}

@media (max-width: 868px) {
  .fame-hall-wrapper {
    padding: 2rem 1rem;
  }
}
</style>
