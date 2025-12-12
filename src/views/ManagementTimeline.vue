<template>
  <div>
    <section id="home" class="hero">
      <div class="hero-content">
        <h1 class="main-title">名人堂与冀高联</h1>
        <!-- <p class="description">这里是一个为河北地区东方Project爱好者打造的创作与交流社区。</p> -->
      </div>

    </section>
    <div class="management-timeline">



      <h1>高联管理层时间线</h1>
      <div v-for="generation in managementData" :key="generation.term" class="timeline-item">
        <h2>{{ generation.term }}</h2>
        <ul>
          <li v-for="member in generation.members" :key="member.name">
            <strong>{{ member.position }}:</strong> {{ member.name }}
          </li>
        </ul>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue';

const managementData = ref([
  {
    term: '第一届 (2023-2024)',
    members: [
      { position: '主席', name: '张三' },
      { position: '副主席', name: '李四' },
      { position: '秘书长', name: '王五' },
    ],
  },
  {
    term: '第二届 (2024-2025)',
    members: [
      { position: '主席', name: '赵六' },
      { position: '副主席', name: '孙七' },
      { position: '秘书长', name: '周八' },
    ],
  },
  // 在这里添加更多届的管理层数据
]);
</script>

<style scoped>
.management-timeline {
  padding: 2rem;
  max-width: 800px;
  margin: 0 auto;
}

h1 {
  text-align: center;
  margin-bottom: 2rem;
}

.timeline-item {
  border-left: 3px solid #ccc;
  padding-left: 1.5rem;
  margin-bottom: 2rem;
  position: relative;
}

.timeline-item::before {
  content: '';
  display: block;
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background-color: #ccc;
  border: 2px solid #fff;
  position: absolute;
  left: -8px;
  top: 5px;
}

h2 {
  margin-top: 0;
}

ul {
  list-style-type: none;
  padding: 0;
}

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

.hero-logo {
  flex-shrink: 0;
}

.hero-logo img {
  width: 300px;
  height: 300px;
  border-radius: 50%;
  object-fit: cover;
}

.main-title {
  font-size: 4rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(130, 81, 0, 0.6);
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  color: #a0aec0;
  margin: 1rem 0 2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.description {
  font-size: 1.1rem;
  color: #cbd5e1;
  max-width: 100%;
  margin: 0 auto;
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  left: 8rem;
  display: flex;
  flex-direction: column;
  align-items: left;
  color: white;
  font-size: 0.75rem;
  letter-spacing: 1px;
  opacity: 0.7;
}

.scroll-indicator svg {
  margin-top: 0.5rem;
  animation: bounce 2s infinite;
}

@keyframes bounce {

  0%,
  20%,
  50%,
  80%,
  100% {
    transform: translateY(0);
  }

  40% {
    transform: translateY(-10px);
  }

  60% {
    transform: translateY(-5px);
  }
}

@media (max-width: 868px) {
  .hero {
    flex-direction: column;
    padding: 8rem 2rem 0;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 2rem;
  }

  .hero-content {
    order: 2;
    text-align: left;
  }

  .hero-logo {
    order: 1;
  }

  .hero-logo img {
    width: 150px;
    height: 150px;
  }

  .scroll-indicator {
    left: 2rem;
  }
}
</style>
