<template>
  <div class="home-view-wrapper">
    <section id="home" class="hero">
      <div class="hero-content">
        <h1 class="main-title">幻想，在此交汇</h1>
        <h2 class="subtitle">河北东方高校联合会 / HEBEI COLLEGES AND UNIVERSITIES TOUHOU CLUB UNION</h2>
        <p class="description">这里是一个为河北地区东方Project爱好者打造的创作与交流社区。</p>
      </div>
      <div class="hero-logo">
        <img src="/logo.webp" alt="Logo" />
      </div>
      <div class="scroll-indicator">
        <span>SCROLL</span>
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M12 5V19M12 19L19 12M12 19L5 12" stroke="white" stroke-width="2" stroke-linecap="round"
            stroke-linejoin="round" />
        </svg>
      </div>
    </section>

    <div class="main-sections">
      <section id="about" class="fade-in-section">
        <AboutView />
      </section>
      <section id="works" class="fade-in-section">
        <WorksView />
      </section>
      <section id="history" class="fade-in-section">
        <PictureView />
      </section>
      <section id="news" class="fade-in-section">
        <NewsSection @select-article="onArticleSelected" />
      </section>
      <section id="members" class="fade-in-section">
        <MembersView />
      </section>
      <section id="contact">
        <ContactView />
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted } from 'vue';
import AboutView from '../views/AboutView.vue';
import WorksView from '../views/WorksView.vue';
import ContactView from '../views/ContactView.vue';
import PictureView from '../views/PictureView.vue';
import MembersView from '../views/MembersView.vue';
import NewsSection from '../views/NewsSection.vue';

const emit = defineEmits(['select-article']);

const onArticleSelected = (article: any) => {
  emit('select-article', article);
};

onMounted(() => {
  const sections = document.querySelectorAll('.fade-in-section');

  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target); // Animate only once
        }
      });
    },
    {
      threshold: 0.1, // Start animation when 10% of the section is visible
    }
  );

  sections.forEach((section) => {
    observer.observe(section);
  });
});
</script>

<style scoped>
.hero {
  height: 100vh;
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

.main-sections {
  background-color: #263d6a;
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
