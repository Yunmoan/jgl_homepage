<template>
  <div class="home-view-wrapper">
    <section id="hero-404" class="hero">
      <div class="hero-content">
        <h1 class="main-title">页面未找到 · 404</h1>
        <p class="subtitle">抱歉，您访问的页面不存在或已被移动。</p>
        <div class="actions">
          <router-link class="btn" to="/home">返回首页</router-link>
          <router-link class="btn btn-secondary" to="/messages">看看留言板</router-link>
          <router-link class="btn btn-secondary" to="/fames">看看名人堂</router-link>
        </div>
      </div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue'

onMounted(() => {
  const sections = document.querySelectorAll('.fade-in-section')

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible')
          observer.unobserve(entry.target)
        }
      })
    },
    { threshold: 0.1 }
  )

  sections.forEach((section) => observer.observe(section))
})
</script>

<style scoped>
.hero {
  height: 100vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  padding: 0 6rem;
  gap: 3rem;
  position: relative;
  background: linear-gradient(rgba(28, 25, 70, 0.35), rgba(125, 29, 74, 0.28)), url('/134678540_p1.webp') no-repeat center bottom/cover;
  background-attachment: fixed;
}

.main-sections {
  background: linear-gradient(#5493ae, #263d6a);
  padding-bottom: 6rem;
}

.hero-content {
  flex: 1;
}

.main-title {
  font-size: 3.2rem;
  font-weight: 700;
  color: #fff;
  margin-top: 110px;
  letter-spacing: 2px;
  text-shadow: 0 0 20px rgba(130, 81, 0, 0.6);
}

.subtitle {
  font-size: 1.1rem;
  font-weight: 300;
  color: #a0aec0;
  margin: 1rem 0 2rem;
  text-transform: uppercase;
  letter-spacing: 1px;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1rem;
}

.card {
  margin: 0 auto;
  margin-top: 3rem;
  max-width: 760px;
  background: rgba(30, 41, 59, 0.35);
  border: 1px solid rgba(255, 255, 255, 0.08);
  border-radius: 16px;
  padding: 2rem;
  text-align: left;
  backdrop-filter: blur(10px);
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.35);
}

.card-title {
  font-size: 1.8rem;
  color: #fff;
  margin-bottom: 0.5rem;
}

.description {
  font-size: 1rem;
  color: #cbd5e1;
  margin: 0 auto 1.5rem;
}

.actions {
  display: flex;
  gap: 1rem;
  justify-content: left;
}

.btn {
  display: inline-block;
  padding: 0.75rem 1.25rem;
  border-radius: 10px;
  text-decoration: none;
  color: #fff;
  background: #4a5568;
  border: 1px solid rgba(255, 255, 255, 0.12);
  transition: transform .2s ease, background .2s ease, box-shadow .2s ease;
}

.btn:hover {
  background: #2d3748;
  transform: translateY(-1px);
  box-shadow: 0 8px 18px rgba(0, 0, 0, .35);
}

.btn-secondary {
  background: #725a7a;
}

.btn-secondary:hover {
  background: #5b4862;
}

@media (max-width: 868px) {
  .hero {
    flex-direction: column;
    padding: 8rem 2rem 0;
    align-items: flex-start;
    justify-content: flex-start;
    gap: 2rem;
  }

  .main-title {
    font-size: 2.2rem;
    margin-top: 90px;
  }
}
</style>
