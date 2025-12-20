<template>
  <section class="announcements" v-if="visibleAnnouncements.length">
    <div v-for="a in visibleAnnouncements" :key="a.id" class="alert" :class="`alert--${a.type || 'info'}`">
      <div class="alert__content">
        <strong class="alert__title" v-if="a.title">{{ a.title }}</strong>
        <span class="alert__text" v-html="a.content || ''"></span>
      </div>
      <button v-if="a.closeable" class="alert__close" aria-label="关闭公告" @click="dismiss(a)">×</button>
    </div>
  </section>
</template>

<script setup lang="ts">
import { onMounted, ref, computed } from 'vue'

interface Announcement {
  id: number
  title?: string
  content?: string
  type?: 'info' | 'success' | 'warning' | 'error'
  enabled?: number | boolean
  closeable?: number | boolean
  start_at?: string | null
  end_at?: string | null
  updated_at?: string
}

const announcements = ref<Announcement[]>([])

function readDismissed(): Record<string, string> {
  try {
    return JSON.parse(localStorage.getItem('dismissed_announcements') || '{}')
  } catch {
    return {}
  }
}

function writeDismissed(map: Record<string, string>) {
  localStorage.setItem('dismissed_announcements', JSON.stringify(map))
}

const visibleAnnouncements = computed(() => {
  const dismissed = readDismissed()
  return announcements.value.filter((a) => {
    const key = String(a.id)
    const last = dismissed[key]
    if (last && a.updated_at && last === a.updated_at) return false
    return true
  })
})

function dismiss(a: Announcement) {
  const map = readDismissed()
  map[String(a.id)] = a.updated_at || new Date().toISOString()
  writeDismissed(map)
  announcements.value = announcements.value.filter((x) => x.id !== a.id)
}

onMounted(async () => {
  try {
    const res = await fetch('/api/announcements/public')
    if (res.ok) {
      announcements.value = await res.json()
    }
  } catch (e) {
    // 静默失败
    console.error('fetch announcements failed', e)
  }
})
</script>

<style scoped>
/* .announcements {} */

.alert {
  position: relative;
  margin: -0.5rem 0 1rem 0;
  padding: 0.75rem 0.75rem 0.75rem 2.25rem;
  border-radius: 0 0 8px 8px;
  line-height: 1.5;
  /* max-width: 1200px; */
  box-shadow: 0 2px 10px rgba(0, 0, 0, 0.08);
}

.alert__content {
  color: #e9eef5;
}

.alert__title {
  margin-right: .5rem;
}

.alert__text :deep(a) {
  color: inherit;
  text-decoration: underline;
}

.alert__close {
  position: absolute;
  right: 8px;
  top: 8px;
  background: transparent;
  border: none;
  color: inherit;
  font-size: 18px;
  cursor: pointer;
}

.alert--info {
  background: rgba(59, 130, 246, .15);
  color: #cfe3ff;
  border: 1px solid rgba(59, 130, 246, .35);
}

.alert--success {
  background: rgba(34, 197, 94, .15);
  color: #d0f5df;
  border: 1px solid rgba(34, 197, 94, .35);
}

.alert--warning {
  background: rgba(234, 179, 8, .18);
  color: #fff0cd;
  border: 1px solid rgba(234, 179, 8, .4);
}

.alert--error {
  background: rgba(239, 68, 68, .15);
  color: #ffd7d7;
  border: 1px solid rgba(239, 68, 68, .35);
}
</style>
