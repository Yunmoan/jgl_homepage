<template>
  <div class="home-view-wrapper">
    <section id="home" class="hero">
      <div class="hero-content">
        <h1 class="main-title">名人堂与冀高联</h1>
      </div>
    </section>

    <div class="main-sections">
      <!-- <section id="about" class="fade-in-section">
        <AboutView />
      </section> -->
      <section id="hall" class="fade-in-section">
        <FameHall />
      </section>
      <section id="history" class="fade-in-section">
        <ManagementTimeline />
      </section>



    </div>
  </div>
</template>

<script setup lang="ts">
import ManagementTimeline from '../views/ManagementTimeline.vue';
import FameHall from '../views/FameHall.vue';
import { onMounted } from 'vue';

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
  height: 30vh;
  display: flex;
  align-items: center;
  justify-content: center;
  text-align: left;
  padding: 0 6rem;
  gap: 3rem;
  position: relative;
  background: linear-gradient(rgba(28, 25, 70, 0.3), rgba(125, 29, 74, 0.269)), url('/134678540_p1.webp') no-repeat center bottom/cover;
  background-attachment: fixed;
}

.main-sections {
  background: linear-gradient(#5493ae, #263d6a);
}

.hero-content {
  flex: 1;
}

.main-title {
  font-size: 3.5rem;
  font-weight: 700;
  color: #fff;
  margin-top: 100px;
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
