<template>
  <div ref="calendarRoot" class="exhibition-calendar" :class="{ 'month-view': month !== undefined }">
    <div class="calendar-legend" aria-label="参展状态图例">
      <span v-for="(label, status) in participationLabels" :key="status">
        <i :class="status"></i>{{ label }}
      </span>
      <span v-if="editable" class="legend-tip">点击日期查看或新增展会</span>
      <slot v-else name="legend-append" />
    </div>
    <Transition name="calendar-grid" mode="out-in">
      <div :key="gridKey" class="year-grid">
        <section v-for="monthData in months" :key="monthData.number" class="month-card"
          :aria-label="`${year}年${monthData.number}月`">
          <div class="month-heading">
            <h3>{{ monthData.number }}<small>月</small></h3>
            <span>本月共 {{ monthData.count }} 场展会</span>
          </div>
          <div class="month-grid">
            <span v-for="weekday in weekdays" :key="weekday" class="weekday" aria-hidden="true">{{
              weekday
            }}</span>
            <span v-for="n in monthData.offset" :key="`blank-${n}`" aria-hidden="true"></span>
            <button v-for="day in monthData.days" :key="day.date" type="button" class="calendar-day" :class="{
              today: day.date === today,
              selected: day.date === selectedDate,
              'has-events': day.events.length,
              'has-participating': day.participating,
            }" :disabled="disabled"
              :aria-label="`${day.date}${day.events.length ? '：' + day.events.map((event) => event.title + '，' + participationLabels[displayParticipation(event)]).join('；') : '，无展会'}`"
              :aria-pressed="day.date === selectedDate" :aria-haspopup="day.events.length ? 'dialog' : undefined"
              :aria-expanded="day.events.length ? activeDate === day.date : undefined"
              :aria-controls="day.events.length && activeDate === day.date ? detailsId : undefined"
              @mouseenter="openDetails(day.date, $event)" @mouseleave="scheduleClose"
              @focus="openDetails(day.date, $event)" @blur="scheduleClose" @keydown.esc="dismissDetails"
              @click="selectDay(day.date, $event)">
              <span class="date-number">{{ day.number }}</span>
              <span v-if="month !== undefined && day.participating" class="schedule-tag"
                >有日程</span
              >
              <span v-if="month !== undefined && day.events.length" class="day-events">
                <span v-for="event in day.events" :key="event.id" class="day-event"
                  :class="{ participating: event.participation === 'participating' }">
                  <i :class="displayParticipation(event)"></i><span>{{ event.title }}</span>
                </span>
              </span>
              <span class="day-markers" aria-hidden="true"><i v-for="status in day.statuses" :key="status"
                  :class="status"></i></span>
            </button>
          </div>
        </section>
      </div>
    </Transition>
    <Teleport to="body">
      <Transition name="calendar-pop">
        <div v-if="activeEvents.length" :id="detailsId" ref="detailsPanel" tabindex="-1" class="calendar-details"
          :style="detailsStyle" role="dialog" :aria-label="`${activeDate} 的展会详情`" :aria-modal="false"
          @mouseenter="cancelClose" @mouseleave="scheduleClose" @focusin="cancelClose" @keydown.esc="dismissDetails">
          <div class="details-heading">
            <strong>{{ activeDate.replace(/-/g, '.') }} · {{ activeEvents.length }} 场展会</strong>
            <button type="button" aria-label="关闭展会详情" @click="dismissDetails">×</button>
          </div>
          <article v-for="event in activeEvents" :key="event.id" class="details-event"
            :class="{ participating: event.participation === 'participating' }">
            <div class="details-title-row">
              <h4>{{ event.title }}</h4>
              <span class="status-badge" :class="displayParticipation(event)">{{
                participationLabels[displayParticipation(event)]
              }}</span>
            </div>
            <dl class="details-meta">
              <div>
                <dt>时间</dt>
                <dd>{{ formatExhibitionDates(event) }}</dd>
              </div>
              <div v-if="event.source_status">
                <dt>活动状态</dt>
                <dd :class="{ 'is-cancelled': event.source_status.includes('取消') }">
                  {{ event.source_status }}
                </dd>
              </div>
              <div v-if="event.category">
                <dt>活动类别</dt>
                <dd>{{ event.category }}</dd>
              </div>
              <div>
                <dt>地点</dt>
                <dd>{{ event.location || '暂未公布' }}</dd>
              </div>
            </dl>
            <div v-if="showsAttendance(event)" class="attendance-card">
              <p class="attendance-heading">高联参展信息</p>
              <dl class="details-meta">
                <div>
                  <dt>摊位</dt>
                  <dd>{{ event.booth || '暂未公布' }}</dd>
                </div>
              </dl>
              <p v-if="event.participation_notes" class="details-description">
                <strong>参展安排</strong>{{ event.participation_notes }}
              </p>
            </div>
            <p v-if="event.description" class="details-description">{{ event.description }}</p>
            <p v-if="event.source_label" class="details-source">
              数据源来自 {{ event.source_label }}
            </p>
            <div class="details-actions">
              <button v-if="editable" type="button" class="edit-event-button"
                @click="emit('edit-event', event); closeDetails()">{{ event.source_event_id ? '绑定高联参展信息' : '编辑展会'
                }}</button>
              <a v-if="event.link" :href="event.link" target="_blank" rel="noopener noreferrer">查看展会链接 ↗</a>
            </div>
          </article>
        </div>
      </Transition>
    </Teleport>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, onMounted, ref, useId, watch } from 'vue'
import {
  displayParticipation,
  formatExhibitionDates,
  indexExhibitionDays,
  participationLabels,
  todayInChina,
} from '../utils/exhibitions'
import type { Exhibition } from '../utils/exhibitions'

const props = withDefaults(
  defineProps<{
    year: number
    month?: number
    events: Exhibition[]
    selectedDate?: string
    editable?: boolean
    disabled?: boolean
  }>(),
  { selectedDate: '', editable: false, disabled: false },
)
const emit = defineEmits<{ 'select-date': [date: string]; 'edit-event': [event: Exhibition] }>()

const weekdays = ['一', '二', '三', '四', '五', '六', '日']
const today = todayInChina()
const calendarRoot = ref<HTMLElement | null>(null)
const detailsPanel = ref<HTMLElement | null>(null)
const detailsId = useId()
const activeDate = ref('')
const detailsStyle = ref<Record<string, string>>({})
const dayIndex = computed(() => indexExhibitionDays(props.events, props.year))
const gridKey = computed(() => `${props.year}-${props.month ?? 'year'}`)
// Confirmed participation floats to the top of the day's detail list.
const activeEvents = computed(() => {
  const events = dayIndex.value.get(activeDate.value) || []
  return [...events].sort(
    (a, b) =>
      Number(b.participation === 'participating') - Number(a.participation === 'participating'),
  )
})
// Public visitors only need complete attendance details when Gaolian is participating.
// Administrators editing the calendar see them for every status so they can prepare a plan.
const showsAttendance = (event: Exhibition) =>
  props.editable || event.participation === 'participating'
let pinned = false
let lastTrigger: HTMLElement | undefined
let closeTimer: number | undefined
function cancelClose() {
  window.clearTimeout(closeTimer)
}
function closeDetails() {
  cancelClose()
  activeDate.value = ''
  pinned = false
}
function dismissDetails() {
  pinned = true
  lastTrigger?.focus({ preventScroll: true })
  closeDetails()
}
function scheduleClose() {
  cancelClose()
  if (!pinned) closeTimer = window.setTimeout(closeDetails, 180)
}
async function openDetails(date: string, event: Event, pin = false) {
  if (props.disabled || !dayIndex.value.has(date) || (pinned && !pin)) return
  cancelClose()
  pinned = pin
  activeDate.value = date
  const anchor = event.currentTarget as HTMLElement
  lastTrigger = anchor
  const bounds = anchor.getBoundingClientRect()
  const width = Math.min(380, window.innerWidth - 24)
  const colors = calendarRoot.value ? getComputedStyle(calendarRoot.value) : undefined
  detailsStyle.value = {
    width: `${width}px`,
    left: `${Math.max(12, Math.min(bounds.left, window.innerWidth - width - 12))}px`,
    top: `${bounds.bottom + 8}px`,
    '--details-bg': colors?.getPropertyValue('--cal-tooltip').trim() || '#172e50',
    '--details-text': colors?.getPropertyValue('--cal-text').trim() || '#e5edf4',
    '--details-muted': colors?.getPropertyValue('--cal-muted').trim() || '#b1c1d5',
    '--details-border': colors?.getPropertyValue('--cal-border').trim() || 'rgba(216,227,231,.2)',
  }
  await nextTick()
  if (activeDate.value !== date) return
  const height = detailsPanel.value?.offsetHeight || 300
  const top =
    bounds.bottom + 8 + height <= window.innerHeight - 12
      ? bounds.bottom + 8
      : Math.max(12, bounds.top - height - 8)
  detailsStyle.value.top = `${top}px`
}
async function selectDay(date: string, event: MouseEvent) {
  if (!dayIndex.value.has(date) || (pinned && activeDate.value === date)) closeDetails()
  else await openDetails(date, event, true)
  emit('select-date', date)
  if (event.detail === 0 && activeDate.value) detailsPanel.value?.focus({ preventScroll: true })
}
function closeOutside(event: PointerEvent) {
  if (
    event.target instanceof Node &&
    !calendarRoot.value?.contains(event.target) &&
    !detailsPanel.value?.contains(event.target)
  )
    closeDetails()
}
function closeOnScroll(event: Event) {
  if (event.target instanceof Node && detailsPanel.value?.contains(event.target)) return
  closeDetails()
}
watch([() => props.year, () => props.month, () => props.events], closeDetails)
onMounted(() => {
  document.addEventListener('pointerdown', closeOutside)
  window.addEventListener('scroll', closeOnScroll, true)
  window.addEventListener('resize', closeDetails)
})
onBeforeUnmount(() => {
  closeDetails()
  document.removeEventListener('pointerdown', closeOutside)
  window.removeEventListener('scroll', closeOnScroll, true)
  window.removeEventListener('resize', closeDetails)
})
const months = computed(() => {
  const index = dayIndex.value
  const monthNumbers =
    props.month === undefined ? Array.from({ length: 12 }, (_, index) => index) : [props.month - 1]
  return monthNumbers.map((month) => {
    const prefix = `${props.year}-${String(month + 1).padStart(2, '0')}`
    const days = Array.from(
      { length: new Date(Date.UTC(props.year, month + 1, 0)).getUTCDate() },
      (_, i) => {
        const date = `${prefix}-${String(i + 1).padStart(2, '0')}`
        const events = index.get(date) || []
        return {
          date,
          number: i + 1,
          events,
          participating: events.some((event) => event.participation === 'participating'),
          statuses: [...new Set(events.map((event) => displayParticipation(event)))],
        }
      },
    )
    return {
      number: month + 1,
      offset: (new Date(Date.UTC(props.year, month, 1)).getUTCDay() + 6) % 7,
      count: new Set(days.flatMap((day) => day.events.map((event) => event.id))).size,
      days,
    }
  })
})
</script>

<style scoped>
.exhibition-calendar {
  --cal-card: rgba(17, 24, 39, 0.42);
  --cal-text: #e5edf4;
  --cal-muted: #9fb3c8;
  --cal-border: rgba(216, 227, 231, 0.12);
  --cal-hover: rgba(120, 185, 244, 0.1);
  --cal-accent: #e7a33e;
  --cal-tooltip: #111c33;
  color: var(--cal-text);
}

.calendar-legend {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px 18px;
  margin-bottom: 20px;
  font-size: 0.78rem;
  color: var(--cal-muted);
}

.calendar-legend>span {
  display: inline-flex;
  align-items: center;
  gap: 7px;
}

.calendar-legend .legend-tip {
  margin-left: auto;
  color: #8198b3;
}

i {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  flex: 0 0 auto;
}

i.participating {
  background: #e7a33e;
}

i.undecided {
  background: #78b9f4;
}

i.not_participated {
  background: #a4adba;
}

.year-grid {
  display: grid;
  grid-template-columns: repeat(4, minmax(0, 1fr));
  gap: 18px;
}

.month-card {
  min-width: 0;
  padding: 20px 16px;
  border: 1px solid var(--cal-border);
  border-radius: 12px;
  background: var(--cal-card);
  box-shadow: 0 16px 40px rgba(8, 15, 30, 0.14);
}

.month-heading {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 8px;
  padding: 0 4px 12px;
}

.month-heading h3 {
  margin: 0;
  font-size: 1.5rem;
  font-weight: 700;
  letter-spacing: -0.01em;
  color: var(--cal-text);
}

.month-heading small {
  font-size: 0.72rem;
  margin-left: 4px;
  font-weight: 400;
  color: var(--cal-muted);
}

.month-heading>span {
  color: var(--cal-muted);
  font-size: 0.7rem;
  white-space: nowrap;
}

.month-grid {
  display: grid;
  grid-template-columns: repeat(7, minmax(0, 1fr));
  gap: 4px;
}

.weekday {
  text-align: center;
  padding: 6px 0;
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  color: #8198b3;
}

.calendar-day {
  position: relative;
  min-width: 0;
  height: 32px;
  padding: 1px 0 6px;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--cal-text);
  font: inherit;
  font-size: 0.75rem;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.calendar-day:disabled {
  cursor: default;
  color: var(--cal-muted);
}

.calendar-day.has-events {
  background: rgba(120, 185, 244, 0.08);
  font-weight: 500;
}

.calendar-day.has-participating {
  background: rgba(231, 163, 62, 0.12);
}

.calendar-day:not(:disabled):hover {
  background: rgba(120, 185, 244, 0.14);
  border-color: rgba(231, 163, 62, 0.55);
}

.calendar-day.today {
  color: #f4c478;
}

.calendar-day.selected {
  border-color: var(--cal-accent);
  background: rgba(231, 163, 62, 0.1);
}

.calendar-day:focus-visible {
  outline: 2px solid var(--cal-accent);
  outline-offset: 2px;
}

.day-markers {
  position: absolute;
  bottom: 3px;
  left: 0;
  right: 0;
  display: flex;
  gap: 2px;
  justify-content: center;
}

.day-markers i {
  width: 4px;
  height: 4px;
}

@media (max-width: 1100px) {
  .year-grid {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .year-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
  }

  .calendar-legend .legend-tip {
    width: 100%;
    margin-left: 0;
  }

  .month-card {
    padding: 14px 8px;
  }
}

@media (max-width: 360px) {
  .year-grid {
    grid-template-columns: 1fr;
  }
}

.month-view .year-grid {
  grid-template-columns: minmax(0, 1fr);
}

.month-view .month-card {
  padding: 24px;
}

.month-view .month-heading h3 {
  font-size: 1.85rem;
}

.month-view .month-heading>span {
  font-size: 0.78rem;
}

.month-view .weekday {
  font-size: 0.78rem;
  padding: 12px 0;
}

.month-view .month-grid {
  gap: 6px;
}

.month-view .calendar-day {
  height: auto;
  min-height: 108px;
  padding: 10px 9px;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  justify-content: flex-start;
  gap: 7px;
  text-align: left;
  border-color: rgba(216, 227, 231, 0.08);
  background: rgba(15, 23, 42, 0.18);
}

.month-view .calendar-day.has-events {
  background: rgba(120, 185, 244, 0.06);
}

.month-view .calendar-day.has-participating {
  background: rgba(231, 163, 62, 0.07);
}

.month-view .calendar-day:not(:disabled):hover {
  background: rgba(120, 185, 244, 0.12);
}

.month-view .calendar-day.selected {
  background: rgba(231, 163, 62, 0.09);
  border-color: var(--cal-accent);
}

.month-view .date-number {
  font-size: 0.9rem;
  font-weight: 600;
}

.schedule-tag {
  position: absolute;
  top: 10px;
  right: 10px;
  padding: 1px 7px;
  border: 1px solid rgba(216, 227, 231, 0.28);
  border-radius: 999px;
  background: rgba(216, 227, 231, 0.1);
  color: #c7d3e0;
  font-size: 0.6rem;
  font-weight: 400;
  line-height: 1.6;
  pointer-events: none;
}

.month-view .day-markers {
  display: none;
}

.day-events {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.day-event {
  display: flex;
  align-items: baseline;
  gap: 5px;
  min-width: 0;
  font-size: 0.72rem;
  line-height: 1.5;
  color: var(--cal-text);
}

.day-event>span {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
}

.day-event.participating>span {
  color: #f4c478;
  font-weight: 600;
}

.calendar-details {
  position: fixed;
  z-index: 2100;
  box-sizing: border-box;
  max-height: min(460px, calc(100vh - 24px));
  overflow-y: auto;
  padding: 0;
  border: 1px solid var(--details-border);
  border-radius: 12px;
  background-color: var(--details-bg);
  background-image: linear-gradient(160deg, rgba(255, 255, 255, 0.045), transparent 50%);
  color: var(--details-text);
  box-shadow: 0 24px 60px rgba(0, 0, 0, 0.42);
  backdrop-filter: blur(18px);
  -webkit-backdrop-filter: blur(18px);
  overflow-wrap: anywhere;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: rgba(231, 163, 62, 0.42) transparent;
}

.calendar-details::-webkit-scrollbar {
  width: 8px;
}

.calendar-details::-webkit-scrollbar-track {
  background: transparent;
}

.calendar-details::-webkit-scrollbar-thumb {
  background: rgba(231, 163, 62, 0.32);
  border-radius: 999px;
  border: 2px solid transparent;
  background-clip: padding-box;
}

.calendar-details::-webkit-scrollbar-thumb:hover {
  background: rgba(231, 163, 62, 0.6);
  background-clip: padding-box;
}

.details-heading {
  position: sticky;
  top: 0;
  z-index: 2;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 12px;
  padding: 14px 18px 12px;
  border-bottom: 1px solid var(--details-border);
  background-color: var(--details-bg);
  background-image: linear-gradient(180deg, rgba(255, 255, 255, 0.03), transparent);
}

.details-heading strong {
  min-width: 0;
  font-size: 0.95rem;
  font-weight: 600;
  color: var(--details-text);
}

.details-heading button {
  flex-shrink: 0;
  display: grid;
  place-items: center;
  width: 28px;
  height: 28px;
  border: 1px solid transparent;
  border-radius: 50%;
  background: transparent;
  color: var(--details-muted);
  font-size: 1.35rem;
  line-height: 1;
  cursor: pointer;
  transition: background-color 0.18s ease, color 0.18s ease;
}

.details-heading button:hover {
  background: rgba(255, 255, 255, 0.08);
  color: var(--details-text);
}

.details-event {
  padding: 16px 18px;
}

.details-event+.details-event {
  border-top: 1px solid var(--details-border);
}

.details-event.participating {
  box-shadow: inset 3px 0 0 rgba(231, 163, 62, 0.6);
}

.details-title-row {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
}

.details-title-row h4 {
  margin: 0;
  font-size: 1.05rem;
  line-height: 1.55;
  color: var(--details-text);
}

.status-badge {
  flex-shrink: 0;
  padding: 3px 8px;
  border-radius: 8px;
  font-size: 0.66rem;
  font-weight: 600;
  white-space: nowrap;
}

.status-badge.participating {
  color: #ffd793;
  background: rgba(231, 163, 62, 0.14);
}

.status-badge.undecided {
  color: #b7dbff;
  background: rgba(120, 185, 244, 0.14);
}

.status-badge.not_participated {
  color: #c7cfd9;
  background: rgba(164, 173, 186, 0.14);
}

.details-meta {
  display: grid;
  gap: 7px;
  margin: 12px 0 0;
}

.details-meta>div {
  display: flex;
  gap: 10px;
  font-size: 0.82rem;
  line-height: 1.65;
}

.details-meta dt {
  flex: 0 0 64px;
  color: var(--details-muted);
}

.details-meta dd {
  margin: 0;
  color: var(--details-text);
  overflow-wrap: anywhere;
}

.details-meta dd.is-cancelled {
  color: #f4a3a3;
}

.attendance-card {
  margin-top: 13px;
  padding: 12px 14px;
  border: 1px solid rgba(231, 163, 62, 0.24);
  border-radius: 8px;
  background: rgba(231, 163, 62, 0.06);
}

.attendance-heading {
  margin: 0 0 8px;
  color: #f4c478;
  font-size: 0.68rem;
  font-weight: 700;
  letter-spacing: 0.14em;
}

.attendance-card .details-meta {
  margin-top: 0;
}

.details-description {
  margin: 12px 0 0;
  font-size: 0.82rem;
  line-height: 1.8;
  color: var(--details-muted);
  white-space: pre-wrap;
}

.details-description strong {
  display: block;
  margin-bottom: 4px;
  color: var(--details-text);
  font-weight: 600;
}

.details-source {
  margin: 10px 0 0;
  font-size: 0.72rem;
  color: var(--details-muted);
}

.details-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  margin-top: 12px;
}

.edit-event-button {
  display: inline-flex;
  align-items: center;
  border: 1px solid rgba(231, 163, 62, 0.38);
  border-radius: 8px;
  padding: 6px 12px;
  background: rgba(231, 163, 62, 0.08);
  color: #f4c478;
  font: inherit;
  font-size: 0.76rem;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}

.edit-event-button:hover {
  background: rgba(231, 163, 62, 0.16);
  border-color: #e7a33e;
}

.details-actions a {
  color: #9bd0ff;
  font-size: 0.78rem;
  text-decoration: none;
}

.details-actions a:hover {
  text-decoration: underline;
}

.calendar-grid-enter-active,
.calendar-grid-leave-active {
  transition: opacity 0.22s ease, transform 0.22s ease;
}

.calendar-grid-enter-from {
  opacity: 0;
  transform: translateY(8px);
}

.calendar-grid-leave-to {
  opacity: 0;
  transform: translateY(-8px);
}

.calendar-pop-enter-active,
.calendar-pop-leave-active {
  transition: opacity 0.18s ease, transform 0.18s ease;
}

.calendar-pop-enter-from,
.calendar-pop-leave-to {
  opacity: 0;
  transform: translateY(6px) scale(0.98);
}

@media (max-width: 640px) {
  .month-view .month-card {
    padding: 12px 8px;
  }

  .month-view .month-grid {
    gap: 3px;
  }

  .month-view .calendar-day {
    min-height: 70px;
    padding: 6px 4px;
    gap: 4px;
  }

  .month-view .date-number {
    font-size: 0.75rem;
  }

  .day-event {
    font-size: 0.65rem;
    gap: 3px;
  }

  .day-event i {
    width: 4px;
    height: 4px;
  }

  .calendar-details {
    max-height: min(72vh, calc(100vh - 24px));
  }

  .details-heading {
    padding: 14px 14px 10px;
  }

  .details-event {
    padding: 14px;
  }
}
</style>
