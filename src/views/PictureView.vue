<template>
  <div class="picture-view">
    <div class="background-layer" :class="bgLayer1.animationClass"
      :style="{ backgroundImage: `url(${bgLayer1.url})`, opacity: bgLayer1.opacity }"></div>
    <div class="background-layer" :class="bgLayer2.animationClass"
      :style="{ backgroundImage: `url(${bgLayer2.url})`, opacity: bgLayer2.opacity }"></div>
    <div class="container">
      <h2 class="page-title">高联足迹 / HISTORY</h2>
      <swiper v-if="swiperReady" :modules="[Navigation, Autoplay]" :slides-per-view="1" :space-between="30"
        :navigation="isMultiPage ? { nextEl: '.swiper-button-next', prevEl: '.swiper-button-prev' } : false"
        class="history-swiper" :loop="isMultiPage" :autoplay="isMultiPage ? {
          delay: 10000,
          disableOnInteraction: false,
        } : false" @slideChange="onSlideChange">
        <swiper-slide v-for="(event, index) in history" :key="index">
          <div class="slide-content">
            <h3>{{ event.title }}</h3>
            <p class="date">{{ event.date }}</p>
            <p class="description">{{ event.description }}</p>
            <a :href="event.link" target="_blank" class="action-link">前往活动页面</a>
          </div>
        </swiper-slide>

        <!-- Navigation buttons moved outside the slides loop for correct positioning -->
        <div v-if="isMultiPage" class="swiper-navigation">
          <div class="swiper-button-prev"></div>
          <div class="swiper-button-next"></div>
        </div>
      </swiper>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
// Import Swiper Vue.js components
import { Swiper, SwiperSlide } from 'swiper/vue';
// Import Swiper styles
import 'swiper/css';
import 'swiper/css/navigation';

// import required modules
import { Autoplay, Navigation } from 'swiper/modules';
import type { Swiper as SwiperType } from 'swiper';

interface DialogData {
  title: string;
  description: string;
}

interface HistoryEvent {
  id: number;
  title: string;
  date: string;
  description: string;
  image: string;
  data: DialogData;
  link: string;
}

const history = ref<HistoryEvent[]>([]);
const isMultiPage = ref(false);
const swiperReady = ref(false);
const bgLayer1 = ref({ url: '', opacity: 1, animationClass: '' });
const bgLayer2 = ref({ url: '', opacity: 0, animationClass: '' });
let activeLayer = 1;

const kenBurnsAnimations = ['ken-burns-1', 'ken-burns-2', 'ken-burns-3'];
const getRandomAnimation = () => {
  const randomIndex = Math.floor(Math.random() * kenBurnsAnimations.length);
  return `ken-burns ${kenBurnsAnimations[randomIndex]}`;
};

const onSlideChange = (swiper: SwiperType) => {
  const activeSlideData = history.value[swiper.realIndex];
  if (!activeSlideData) return;

  const newAnimation = getRandomAnimation();

  if (activeLayer === 1) {
    bgLayer2.value.url = activeSlideData.image;
    bgLayer2.value.animationClass = newAnimation;
    bgLayer1.value.opacity = 0;
    bgLayer2.value.opacity = 1;
    activeLayer = 2;
  } else {
    bgLayer1.value.url = activeSlideData.image;
    bgLayer1.value.animationClass = newAnimation;
    bgLayer2.value.opacity = 0;
    bgLayer1.value.opacity = 1;
    activeLayer = 1;
  }
};

onMounted(async () => {
  try {
    const response = await fetch('/api/history');
    if (!response.ok) {
      throw new Error('Network response was not ok');
    }
    const data = await response.json();
    isMultiPage.value = data.length > 1;

    // If there are too few slides for loop mode, duplicate them.
    if (isMultiPage.value && data.length < 5) {
      history.value = [...data, ...data];
    } else {
      history.value = data;
    }

    if (history.value.length > 0 && history.value[0]) {
      bgLayer1.value.url = history.value[0].image;
      bgLayer1.value.animationClass = getRandomAnimation();
    }
    swiperReady.value = true;
  } catch (error) {
    console.error('Failed to fetch history data:', error);
  }
});
</script>

<style scoped>
.picture-view {
  padding: 120px 0 4rem;
  background-color: #0a101f;
  position: relative;
  overflow: hidden;
  min-height: 100vh;
  box-sizing: border-box;
}

.background-layer {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background-size: cover;
  background-position: center;
  /* Smoother cubic-bezier for transition */
  transition: opacity 1.2s cubic-bezier(0.4, 0, 0.2, 1);
  z-index: 0;
  /* Will be used to apply Ken Burns effect */
  transform-origin: center center;
}

/* Keyframes for Ken Burns Effect */
@keyframes ken-burns-1 {
  0% {
    transform: scale(1) translate(0, 0);
  }

  100% {
    transform: scale(1.05) translate(-1%, -1%);
  }
}

@keyframes ken-burns-2 {
  0% {
    transform: scale(1.05) translate(-1%, -1%);
  }

  100% {
    transform: scale(1) translate(0, 0);
  }
}

@keyframes ken-burns-3 {
  0% {
    transform: scale(1) translate(0, 0);
  }

  100% {
    transform: scale(1.05) translate(1%, 1%);
  }
}

/* Animation classes */
.ken-burns {
  animation-duration: 20s;
  /* Longer duration for a subtle effect */
  animation-timing-function: ease-in-out;
  animation-iteration-count: 1;
  animation-fill-mode: forwards;
}

.ken-burns-1 {
  animation-name: ken-burns-1;
}

.ken-burns-2 {
  animation-name: ken-burns-2;
}

.ken-burns-3 {
  animation-name: ken-burns-3;
}

.picture-view::before {
  content: '';
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: linear-gradient(rgba(10, 16, 31, 0.7), rgba(0, 0, 0, 0.39), rgba(10, 16, 31, 0.7));
  z-index: 1;
}

.page-title {
  font-size: 2.5rem;
  font-weight: 700;
  color: #fff;
  margin-bottom: 3rem;
  text-align: center;
  border-bottom: 1px solid #5698c3;
  padding-bottom: 1rem;
  display: inline-block;
}

.container {
  text-align: left;
  position: relative;
  z-index: 2;
}

.history-swiper {
  width: 100%;
  height: 60vh;
  border-radius: 8px;
  overflow: hidden;
  position: relative;
  background: transparent;
}

.swiper-slide {
  position: relative;
  color: #fff;
  background: transparent;
}

.slide-content {
  position: absolute;
  bottom: 2rem;
  left: 2rem;
  z-index: 2;
  text-align: left;
  max-width: 60%;
}

.slide-content h3 {
  font-size: 2rem;
  font-weight: bold;
  margin-bottom: 0.5rem;
  text-shadow: 0 1px 3px rgba(0, 0, 0, 0.7);
}

.slide-content .date {
  font-size: 0.9rem;
  color: #a0aec0;
  margin-bottom: 1rem;
}

.slide-content .description {
  font-size: 1rem;
  line-height: 1.6;
  margin-bottom: 1.5rem;
  /* Add margin to separate from the link */
}

.action-link {
  display: inline-block;
  background-color: rgba(231, 163, 62, 0.3);
  /* Gold color from header */
  color: #fff;
  padding: 0.5rem 1.3rem;
  border-radius: 8px;
  text-decoration: none;
  font-weight: 500;
  transition: background-color 0.3s, transform 0.3s;
}

.action-link:hover {
  background-color: rgba(231, 163, 62, 0.6);
}

.action-link::after {
  content: ' →';
  /* Simple arrow icon */
  margin-left: 0.5rem;
}

.swiper-navigation {
  position: absolute;
  bottom: 2rem;
  right: 3rem;
  z-index: 10;
  display: flex;
  gap: 1rem;
}

.swiper-button-next,
.swiper-button-prev {
  position: static;
  /* Let the flex container handle positioning */
  width: 30px;
  height: 30px;
  margin: 0;
  color: #fff;
  transition: color 0.3s;
}

.swiper-button-next::after,
.swiper-button-prev::after {
  font-size: 1.5rem;
}

.swiper-button-next:hover,
.swiper-button-prev:hover {
  color: #825100;
}
</style>
