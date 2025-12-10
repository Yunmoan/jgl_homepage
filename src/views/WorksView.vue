<template>
  <div class="works-view page-wrapper">
    <div class="container">
      <h2 class="page-title">社团作品 / WORKS</h2>
      <div class="works-grid">
        <!-- Placeholder for works -->
        <div class="work-item" v-for="n in 6" :key="n">
          <div class="work-placeholder-image"></div>
          <h3 class="work-title">作品标题 {{ n }}</h3>
          <p class="work-description">这里是作品的简短描述。可以是音乐、插画、游戏、文章等。</p>
        </div>
      </div>
      <p class="notice">更多作品正在整理中，敬请期待！</p>
    </div>
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.page-wrapper {
  padding: 120px 0 4rem; /* 80px for header + 40px top padding */
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 3rem;
  text-align: center;
  border-bottom: 2px solid #5698c3;
  padding-bottom: 1rem;
}

.works-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 2rem;
  margin-bottom: 2rem;
}

.work-item {
  background-color: rgba(26, 75, 139, 0.2);
  border: 1px solid rgba(255, 255, 255, 0.1);
  border-radius: 8px;
  overflow: hidden;
  transition: transform 0.3s, box-shadow 0.3s;
}

.work-item:hover {
  transform: translateY(-5px);
  box-shadow: 0 8px 20px rgba(0, 0, 0, 0.3);
}

.work-placeholder-image {
  height: 180px;
  background-color: #1e293b; /* Dark slate for placeholder */
}

.work-title {
  font-size: 1.2rem;
  color: #e2e8f0;
  padding: 1rem 1rem 0.5rem;
  margin: 0;
}

.work-description {
  font-size: 0.9rem;
  color: #94a3b8; /* Lighter gray for description */
  padding: 0 1rem 1rem;
  margin: 0;
  line-height: 1.5;
}

.notice {
  text-align: center;
  color: #94a3b8;
}
</style>