<template>
  <component :is="member.link ? 'a' : 'div'" :href="member.link || null" :target="member.link ? '_blank' : null"
    :rel="member.link ? 'noopener noreferrer' : null" class="member-card" :class="{ 'is-link': !!member.link }">
    <img :src="member.logo" :alt="member.name" class="member-logo" @error="handleImageError" loading="lazy"
      decoding="async">
    <span class="member-name">{{ member.name }}</span>
  </component>
</template>

<script setup lang="ts">


interface Member {
  id: number;
  name: string;
  logo: string;
  link?: string;
}

defineProps<{
  member: Member;
}>();

const emit = defineEmits<{
  'image-error': [event: Event];
}>();

const handleImageError = (event: Event) => {
  emit('image-error', event);
};
</script>

<style scoped>
.member-card {
  background-color: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 8px;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
  min-height: 180px;
  text-decoration: none;
  color: inherit;
  /* Optimize rendering: 避免 paint 裁剪阴影/圆角 */
  will-change: auto;
  contain: layout style;
  overflow: visible;
}

.member-card.is-link {
  cursor: pointer;
}

.member-card:hover {
  box-shadow: 0 8px 10px rgba(0, 0, 0, 0.5);
  /* transform: translateY(-2px); */
}

.member-logo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1.2rem;
  background-color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.1);
  /* Optimize image rendering */
  contain: strict;
}

.member-name {
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
  /* Prevent text reflow */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-word;
}

/* Mobile Styles */
@media (max-width: 768px) {
  .member-card {
    padding: 1rem;
    border-radius: 8px;
    min-height: 160px;
  }

  .member-logo {
    width: 100px;
    height: 100px;
    margin-bottom: 0.8rem;
  }

  .member-name {
    font-size: 0.8rem;
  }
}

@media (max-width: 480px) {
  .member-card {
    min-height: 140px;
  }

  .member-logo {
    width: 70px;
    height: 70px;
  }
}
</style>
