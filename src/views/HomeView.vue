<template>
  <div class="home-view">
    <section class="hero">
      <div class="hero-content">
        <h1 class="main-title">幻想，在此交汇</h1>
        <h2 class="subtitle">河北东方高校联合 / HEBEI TOUHOU-PROJECT UNIVERSITY ALLIANCE</h2>
        <p class="description">一个为河北地区东方Project爱好者打造的创作与交流社区。</p>
      </div>
      <div class="scroll-indicator">
        <span>SCROLL</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="white" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>
        </svg>
      </div>
    </section>
    <!-- Other content can go here -->
  </div>
</template>

<script setup lang="ts"></script>

<style scoped>
.home-view {
  padding-top: 80px; /* Offset for fixed header */
}

.hero {
  height: calc(100vh - 80px); /* Full viewport height minus header */
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  text-align: center;
  padding: 0 2rem;
  background: linear-gradient(rgba(15, 23, 42, 0.7), rgba(35, 29, 125, 0.8)), url('https://via.placeholder.com/1920x1080.png/0f172a/231d7d?text=BACKGROUND_IMAGE') no-repeat center center/cover; /* Added new #231d7d */
  position: relative;
}

.main-title {
  font-size: 4rem;
  font-weight: 700;
  color: #fff;
  margin: 0;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(130, 81, 0, 0.6); /* New dark gold for shadow */
}

.subtitle {
  font-size: 1.2rem;
  font-weight: 300;
  color: #a0aec0; /* A lighter gray */
  margin: 1rem 0 2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.description {
  font-size: 1.1rem;
  color: #cbd5e1;
  max-width: 600px;
  margin: 0 auto;
}

.scroll-indicator {
  position: absolute;
  bottom: 2rem;
  display: flex;
  flex-direction: column;
  align-items: center;
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
  0%, 20%, 50%, 80%, 100% {
    transform: translateY(0);
  }
  40% {
    transform: translateY(-10px);
  }
  60% {
    transform: translateY(-5px);
  }
}
</style>