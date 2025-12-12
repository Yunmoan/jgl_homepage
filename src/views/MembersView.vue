<template>
  <div class="members-view">
    <div class="container">
      <h2 class="page-title">成员社团 / MEMBERS</h2><br />
      <span>不分先后，按拼音字母顺序排序</span>
      <transition-group name="card-stagger" tag="div" class="members-grid" appear>
        <component :is="member.link ? 'a' : 'div'" v-for="(member, index) in displayedMembers" :key="member.id"
          :href="member.link || null" :target="member.link ? '_blank' : null"
          :rel="member.link ? 'noopener noreferrer' : null" class="member-card"
          :style="{ '--delay': index * 50 + 'ms' }">
          <img :src="member.logo" :alt="member.name" class="member-logo" @error="onImageError" loading="lazy">
          <span class="member-name">{{ member.name }}</span>
        </component>
      </transition-group>
      <div ref="observerTarget" class="observer-target"></div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue';

interface Member {
  id: number;
  name: string;
  logo: string;
  link?: string; // Add optional link property
}

const allMembers = ref<Member[]>([]);
const displayedMembers = ref<Member[]>([]);
const observerTarget = ref<HTMLElement | null>(null);
const observer = ref<IntersectionObserver | null>(null);
const membersPerPage = 18; // Number of members to load at a time
let page = 1;

const onImageError = (event: Event) => {
  const target = event.target as HTMLImageElement;
  target.src = '/member_logos_circular/placeholder.svg'; // Local placeholder image
};

const loadMoreMembers = () => {
  if (allMembers.value.length === 0) return;

  const start = (page - 1) * membersPerPage;
  const end = start + membersPerPage;
  const newMembers = allMembers.value.slice(start, end);

  if (newMembers.length > 0) {
    displayedMembers.value.push(...newMembers);
    page++;
  } else {
    // No more members to load, disconnect observer
    if (observer.value) {
      observer.value.disconnect();
    }
  }
};

onMounted(async () => {
  try {
    const response = await fetch('/data/members_generated.json');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    allMembers.value = await response.json();
    loadMoreMembers(); // Load initial batch

    await nextTick();

    if (observerTarget.value) {
      const observerOptions = {
        rootMargin: '0px 0px 500px 0px', // Start loading 500px before the target is visible
        threshold: 0.1
      };

      observer.value = new IntersectionObserver((entries) => {
        const [entry] = entries;
        if (entry?.isIntersecting) {
          loadMoreMembers();
        }
      }, observerOptions);
      observer.value.observe(observerTarget.value);
    }

  } catch (error) {
    console.error('Failed to fetch members data:', error);
  }
});

onUnmounted(() => {
  if (observer.value) {
    observer.value.disconnect();
  }
});
</script>

<style scoped>
.members-view {
  padding: 120px 0 4rem;
  background: linear-gradient(#263d6a, #235b72);
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
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
}

.member-card {
  background-color: rgba(30, 41, 59, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 1.1rem;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  backdrop-filter: blur(10px);
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.4);
  transition: transform 0.3s ease, background-color 0.3s ease, box-shadow 0.3s ease;
  min-height: 180px;
  /* Added to prevent layout shift */
  text-decoration: none;
  /* Remove underline from links */
  color: inherit;
  /* Inherit text color */
}

.card-stagger-enter-active,
.card-stagger-leave-active {
  transition: opacity 0.5s ease, transform 0.5s ease;
  transition-delay: var(--delay, 0ms);
}

.card-stagger-enter-from,
.card-stagger-leave-to {
  opacity: 0;
  transform: translateY(20px);
}

.member-card:hover {
  /* background-color: rgba(30, 41, 59, 0.6); */
  box-shadow: 0 8px 10px rgba(0, 0, 0, 0.5);
}

.member-logo {
  width: 100px;
  height: 100px;
  border-radius: 50%;
  object-fit: cover;
  margin-bottom: 1.2rem;
  background-color: #fff;
  border: 2px solid rgba(255, 255, 255, 0.1);
}

.member-name {
  color: #e2e8f0;
  font-size: 1.1rem;
  font-weight: 600;
  text-align: center;
}

.observer-target {
  height: 20px;
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

  .member-card {
    padding: 1rem;
    border-radius: 12px;
    min-height: 160px;
    /* Adjust for mobile */
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
  .page-title {
    font-size: 2rem;
  }

  .member-card {
    min-height: 140px;
    /* Adjust for smaller mobile */
  }

  .member-logo {
    width: 70px;
    height: 70px;
  }
}
</style>
