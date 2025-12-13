<template>
  <div class="messages-view">
    <h2 class="section-title">留言板</h2>
    <div class="danmaku-container" ref="containerRef">
      <div v-for="item in visibleItems" :key="item.instanceId" class="danmaku-item" :style="item.style"
        @animationend="onAnimationEnd(item.instanceId)">
        <strong>{{ item.author }}:</strong> {{ item.content }}
      </div>
    </div>
    <div class="actions">
      <router-link to="/messages" class="view-all-button">查看全部 & 留言</router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, nextTick } from 'vue'

interface Message {
  id: number
  author: string
  content: string
}

interface DanmakuItem extends Message {
  instanceId: number // Use a unique ID for each visible instance
  style: {
    top: string
    animationDuration: string
    animationDelay: string
  }
  track: number
}

const messageQueue = ref<Message[]>([])
const currentQueueIndex = ref(0)
const visibleItems = ref<DanmakuItem[]>([])
const containerRef = ref<HTMLElement | null>(null)

const numTracks = 5 // Number of horizontal tracks
const trackAvailability = ref<number[]>(Array(numTracks).fill(0))
let instanceCounter = 0

// Track recently displayed messages to avoid repetition
const recentlyDisplayed = ref<Map<number, number>>(new Map()) // messageId -> timestamp
const RECENT_DISPLAY_WINDOW = 30 // Number of messages to track
const MIN_REPEAT_INTERVAL = 60000 // Minimum 60 seconds between same message repeats

const loadMessages = async () => {
  try {
    const response = await fetch('/api/messages')
    if (!response.ok) throw new Error('Network response was not ok')
    const data: Message[] = await response.json()
    // Shuffle the array once to create a playback queue
    messageQueue.value = data.sort(() => 0.5 - Math.random())
  } catch (error) {
    console.error('Failed to fetch messages:', error)
  }
}

const getNextMessage = (): Message | null => {
  if (messageQueue.value.length === 0) return null

  let attempts = 0
  const maxAttempts = messageQueue.value.length
  const now = Date.now()

  // Try to find a message that hasn't been recently displayed
  while (attempts < maxAttempts) {
    const msg = messageQueue.value[currentQueueIndex.value]
    currentQueueIndex.value = (currentQueueIndex.value + 1) % messageQueue.value.length
    attempts++

    if (!msg) continue

    const lastDisplayTime = recentlyDisplayed.value.get(msg.id)

    // Check if message can be displayed:
    // 1. Never displayed before, OR
    // 2. Enough time has passed since last display
    if (lastDisplayTime === undefined || now - lastDisplayTime >= MIN_REPEAT_INTERVAL) {
      // Mark this message as recently displayed with current timestamp
      recentlyDisplayed.value.set(msg.id, now)

      // Keep the map size limited to avoid memory issues
      // Remove oldest entries when exceeding window size
      if (recentlyDisplayed.value.size > RECENT_DISPLAY_WINDOW) {
        let oldestId = -1
        let oldestTime = Infinity

        for (const [id, time] of recentlyDisplayed.value.entries()) {
          if (time < oldestTime) {
            oldestTime = time
            oldestId = id
          }
        }

        if (oldestId !== -1) {
          recentlyDisplayed.value.delete(oldestId)
        }
      }

      return msg
    }
  }

  // If all messages have been recently displayed within MIN_REPEAT_INTERVAL,
  // find the one with the oldest display time
  let oldestId = -1
  let oldestTime = Infinity

  for (const [id, time] of recentlyDisplayed.value.entries()) {
    if (time < oldestTime) {
      oldestTime = time
      oldestId = id
    }
  }

  if (oldestId !== -1) {
    const message = messageQueue.value.find(m => m.id === oldestId)
    if (message) {
      recentlyDisplayed.value.set(message.id, now)
      return message
    }
  }

  // Fallback: return current message if exists
  const fallback = messageQueue.value[currentQueueIndex.value]
  if (fallback) {
    recentlyDisplayed.value.set(fallback.id, now)
    return fallback
  }
  return null
}

const addDanmaku = async () => {
  if (messageQueue.value.length === 0) return

  const availableTrack = trackAvailability.value.findIndex(time => time <= performance.now())
  if (availableTrack === -1) return

  // Get the next message that hasn't been recently displayed
  const message = getNextMessage()

  if (message && containerRef.value) {
    const containerWidth = containerRef.value.offsetWidth
    const messageLength = message.author.length + message.content.length

    const baseDuration = 8
    const duration = baseDuration + messageLength * 0.1

    const newItem: DanmakuItem = {
      ...message,
      instanceId: instanceCounter++,
      track: availableTrack,
      style: {
        top: `${(availableTrack / numTracks) * 90 + 5}%`,
        animationDuration: `${duration}s`,
        animationDelay: '0s',
      },
    }

    const itemWidth = messageLength * 18
    const entryTime = (itemWidth / (containerWidth + itemWidth)) * (duration * 1000)

    trackAvailability.value[availableTrack] = performance.now() + entryTime + 700

    visibleItems.value.push(newItem)
  }
}

const onAnimationEnd = (instanceId: number) => {
  const index = visibleItems.value.findIndex(i => i.instanceId === instanceId)
  if (index !== -1) {
    visibleItems.value.splice(index, 1)
  }
}

let intervalId: number

onMounted(async () => {
  await loadMessages()
  await nextTick()
  if (messageQueue.value.length > 0) {
    // Dynamically adjust interval based on message count
    // More messages = faster interval, fewer messages = slower interval to reduce repetition
    const messageCount = messageQueue.value.length
    const interval = Math.max(800, Math.min(2000, 1500 - (messageCount * 10)))
    intervalId = window.setInterval(addDanmaku, interval)
  }
})

onUnmounted(() => {
  clearInterval(intervalId)
})
</script>

<style scoped>
.messages-view {
  padding: 4rem 0;
  text-align: center;
  background-color: #263d6a;
  position: relative;
}

.section-title {
  font-size: 2.5rem;
  color: #fff;
  margin-bottom: 2rem;
  text-shadow: 0 0 10px rgba(130, 81, 0, 0.5);
}

.danmaku-container {
  position: relative;
  width: 100%;
  height: 400px;
  max-width: 100vw;
  margin: 0 auto;
  overflow: hidden;
}

.danmaku-item {
  position: absolute;
  right: 0;
  transform: translateX(100%);
  white-space: nowrap;
  color: #e2e8f0;
  background: linear-gradient(90deg, rgba(45, 55, 72, 0.7), rgba(26, 32, 44, 0.8));
  padding: 10px 20px;
  border-radius: 50px;
  font-size: 1.1rem;
  animation: scroll linear forwards;
  box-shadow: 0 4px 15px rgba(0, 0, 0, 0.3);
  border: 1px solid rgba(255, 255, 255, 0.1);
  transition: background 0.3s;
}

/* .danmaku-item:hover {
  background: linear-gradient(90deg, rgba(55, 65, 82, 0.8), rgba(36, 42, 54, 0.9));
} */

.danmaku-item strong {
  font-weight: 600;
  margin-right: 10px;
  color: #63b3ed;
}

.actions {
  margin-top: 2rem;
}

.view-all-button {
  display: inline-block;
  padding: 12px 24px;
  font-size: 1rem;
  color: #fff;
  background-color: #4a5568;
  border: none;
  border-radius: 8px;
  text-decoration: none;
  transition: background-color 0.3s ease;
}

.view-all-button:hover {
  background-color: #2d3748;
}

@keyframes scroll {
  from {
    transform: translateX(100%);
  }

  to {
    transform: translateX(-110vw);
  }
}
</style>
