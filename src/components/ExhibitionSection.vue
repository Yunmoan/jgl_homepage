<template>
  <div class="exhibition-section" :class="{ 'is-page': !preview }">
    <div class="exhibition-container">
      <component :is="preview ? 'h2' : 'h1'" class="page-title">展会日历 / CALENDAR</component>
      <div class="calendar-toolbar">
        <div v-if="isMonthView" class="current-month-label">
          <button type="button" class="month-nav" aria-label="上个月" @click="changeMonth(-1)">
            ‹
          </button>
          <strong>{{ year }} 年 {{ viewMonth }} 月</strong>
          <button type="button" class="month-nav" aria-label="下个月" @click="changeMonth(1)">
            ›
          </button>
          <span>{{ monthSubtitle }}</span>
        </div>
        <div v-else class="year-switcher">
          <button type="button" :disabled="year <= 1900" aria-label="上一年" @click="year--">
            ‹
          </button>
          <label
            ><span class="sr-only">选择年份</span
            ><select v-model="year" aria-label="选择年份">
              <option v-for="y in yearOptions" :key="y" :value="y">{{ y }} 年</option>
            </select></label
          >
          <button type="button" :disabled="year >= 2199" aria-label="下一年" @click="year++">
            ›
          </button>
          <button v-if="year !== currentYear" type="button" @click="year = currentYear">
            今年
          </button>
        </div>
        <router-link :to="preview ? calendarLink : '/home#exhibitions'" class="view-all">
          {{ preview ? '查看全部展会' : '返回首页' }} →
        </router-link>
      </div>
      <div v-if="source" class="source-information" role="status">
        <p class="source-main">
          数据源来自
          <a v-if="source.url" :href="source.url" target="_blank" rel="noopener noreferrer">{{
            source.label
          }}</a>
          <span v-else>{{ source.label }}</span>
          <template v-if="source.kind !== 'local'"> · 高联参展信息由本站维护</template>
          <template
            v-if="source.fetched_at && ['fresh', 'stale', 'offline'].includes(source.cache_state)"
          >
            · 缓存更新于
            {{ new Date(source.fetched_at).toLocaleString('zh-CN', { timeZone: 'Asia/Shanghai' }) }}
          </template>
        </p>
      </div>

      <div v-if="error" class="feedback" role="alert">
        {{ error }} <button type="button" @click="initialize">重新加载</button>
      </div>
      <div :aria-busy="loading" class="calendar-content">
        <p v-if="loading" class="loading-message" role="status">正在加载展会日历…</p>
        <ExhibitionCalendar
          :year="year"
          :month="isMonthView ? viewMonth : undefined"
          :events="filteredEvents"
          :selected-date="selectedDate"
          :disabled="loading"
          @select-date="selectDate"
        >
          <template #legend-append>
            <label class="status-filter">
              <span>参展计划</span>
              <select v-model="participation" aria-label="参展计划">
                <option value="">全部展会</option>
                <option v-for="(label, status) in participationLabels" :key="status" :value="status">
                  {{ label }}
                </option>
              </select>
            </label>
          </template>
        </ExhibitionCalendar>
      </div>

      <div ref="listHeading" class="list-heading" tabindex="-1">
        <h3>
          {{
            selectedDate
              ? `${selectedDate.replace(/-/g, '.')} 的展会`
              : isMonthView
                ? `${viewMonth}月展会`
                : '全年展会'
          }}<span>{{ listedEvents.length }} 场</span>
        </h3>
        <button v-if="selectedDate" type="button" class="text-link" @click="selectedDate = ''">
          {{ isMonthView ? '查看本月' : '查看全年' }}
        </button>
      </div>
      <p v-if="!loading && !error && !listedEvents.length" class="empty-state">
        {{ selectedDate ? '当天无活动。' : isMonthView ? '本月暂无活动。' : '暂无符合条件的活动安排。' }}
      </p>
      <TransitionGroup name="event-list" tag="div" class="event-list" :class="{ compact: preview }">
        <article v-for="event in paginatedEvents" :key="event.id" class="event-card">
          <div v-if="preview" class="compact-row">
            <span class="status-badge" :class="displayParticipation(event)">{{
              participationLabels[displayParticipation(event)]
            }}</span>
            <span class="compact-title">{{ event.title }}</span>
            <span class="compact-meta">
              {{ formatExhibitionDates(event) }} · {{ event.location || '地点待定' }}
            </span>
            <span
              v-if="event.participation === 'participating' && event.booth"
              class="compact-booth"
              >摊位 {{ event.booth }}</span
            >
          </div>
          <template v-else>
            <div class="event-topline">
              <span class="status-badge" :class="displayParticipation(event)">{{
                participationLabels[displayParticipation(event)]
              }}</span
              ><span v-if="event.end_date < today" class="past-label">已结束</span>
            </div>
            <h4>{{ event.title }}</h4>
            <p class="event-date">{{ formatExhibitionDates(event) }}</p>
            <div class="event-meta">
              <p
                v-if="event.source_status"
                :class="{ 'is-cancelled': event.source_status.includes('取消') }"
              >
                <span>活动状态</span>{{ event.source_status }}
              </p>
              <p v-if="event.category"><span>活动类别</span>{{ event.category }}</p>
              <p><span>地点</span>{{ event.location || '暂未公布' }}</p>
            </div>
            <div v-if="event.participation === 'participating'" class="attendance-card">
              <p class="attendance-heading">高联参展信息</p>
              <p><span>摊位</span>{{ event.booth || '暂未公布' }}</p>
              <p v-if="event.participation_notes" class="attendance-notes">
                {{ event.participation_notes }}
              </p>
            </div>
            <p v-if="event.description" class="event-description">{{ event.description }}</p>
            <p v-if="event.source_label" class="event-source">
              数据源来自 {{ event.source_label }}
            </p>
            <a
              v-if="event.link"
              :href="event.link"
              target="_blank"
              rel="noopener noreferrer"
              class="text-link event-link"
              >展会详情 ↗</a
            >
          </template>
        </article>
      </TransitionGroup>
      <nav v-if="totalPages > 1 && !preview" class="pagination" aria-label="展会列表分页">
        <button type="button" :disabled="page === 1" @click="changePage(page - 1)">上一页</button>
        <span aria-live="polite">第 {{ page }} / {{ totalPages }} 页</span>
        <button type="button" :disabled="page === totalPages" @click="changePage(page + 1)">
          下一页
        </button>
      </nav>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ExhibitionCalendar from './ExhibitionCalendar.vue'
import {
  defaultHomepageCalendarSettings,
  displayParticipation,
  exhibitionsInMonth,
  formatExhibitionDates,
  participationLabels,
  todayInChina,
} from '../utils/exhibitions'
import type {
  Exhibition,
  ExhibitionResponse,
  HomepageCalendarSettings,
  Participation,
  CalendarSourceMetadata,
} from '../utils/exhibitions'
import { getErrorMessage, readApiResponse } from '../utils/feedback'

const props = withDefaults(defineProps<{ preview?: boolean }>(), { preview: false })
const route = useRoute()
const today = todayInChina()
const currentYear = Number(today.slice(0, 4))
const homepage = ref(defaultHomepageCalendarSettings())
const isMonthView = computed(() => props.preview && homepage.value.mode !== 'year')
const displayMonth = computed(() =>
  Number(
    homepage.value.mode === 'fixed_month' && homepage.value.month
      ? homepage.value.month.slice(5, 7)
      : today.slice(5, 7),
  ),
)
// The homepage calendar can page across months; it follows the configured month until the
// visitor navigates, and follows the configuration again whenever it changes.
const viewMonth = ref(displayMonth.value)
watch(displayMonth, (month) => {
  viewMonth.value = month
})
const monthSubtitle = computed(() =>
  viewMonth.value === displayMonth.value
    ? homepage.value.mode === 'fixed_month'
      ? '展会安排'
      : '本月展会'
    : '展会安排',
)
function changeMonth(step: number) {
  if ((step < 0 && year.value <= 1900) || (step > 0 && year.value >= 2199)) {
    viewMonth.value = step < 0 ? 1 : 12
    return
  }
  const next = viewMonth.value + step
  if (next < 1) {
    year.value -= 1
    viewMonth.value = 12
  } else if (next > 12) {
    year.value += 1
    viewMonth.value = 1
  } else {
    viewMonth.value = next
  }
}
const queryYear = Number(route.query.year)
const year = ref(
  !props.preview && Number.isInteger(queryYear) && queryYear >= 1900 && queryYear <= 2199
    ? queryYear
    : currentYear,
)
const selectedDate = ref(
  !props.preview &&
    typeof route.query.date === 'string' &&
    route.query.date.startsWith(`${year.value}-`)
    ? route.query.date
    : '',
)
const queryParticipation = route.query.participation
const participation = ref<Participation | ''>(
  !props.preview &&
    typeof queryParticipation === 'string' &&
    Object.prototype.hasOwnProperty.call(participationLabels, queryParticipation)
    ? (queryParticipation as Participation)
    : '',
)
const events = ref<Exhibition[]>([])
const source = ref<CalendarSourceMetadata>()
const availableYears = ref<number[]>([])
const loading = ref(true)
const error = ref('')
const page = ref(1)
const pageSize = 6
const listHeading = ref<HTMLElement | null>(null)
let controller: AbortController | undefined
const yearOptions = computed(() =>
  [...new Set([currentYear, year.value, ...availableYears.value])].sort((a, b) => b - a),
)
const calendarLink = computed(() => ({
  path: '/exhibitions',
  query: {
    year: year.value,
    ...(selectedDate.value ? { date: selectedDate.value } : {}),
    ...(participation.value ? { participation: participation.value } : {}),
  },
}))
const filteredEvents = computed(() =>
  (isMonthView.value
    ? exhibitionsInMonth(events.value, year.value, viewMonth.value)
    : events.value
  ).filter(
    (event) => !participation.value || displayParticipation(event) === participation.value,
  ),
)
const listedEvents = computed(() => {
  const selected = filteredEvents.value.filter(
    (event) =>
      !selectedDate.value ||
      (event.start_date <= selectedDate.value && event.end_date >= selectedDate.value),
  )
  // On the homepage, keep upcoming exhibitions visible before past exhibitions.
  return props.preview
    ? [...selected].sort(
        (a, b) =>
          Number(a.end_date < today) - Number(b.end_date < today) ||
          a.start_date.localeCompare(b.start_date),
      )
    : selected
})
const totalPages = computed(() => Math.max(1, Math.ceil(listedEvents.value.length / pageSize)))
const paginatedEvents = computed(() =>
  listedEvents.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

async function loadEvents() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = ''
  events.value = []
  try {
    const response = await fetch(`/api/exhibitions/public?year=${year.value}`, {
      signal: request.signal,
    })
    const data = await readApiResponse<ExhibitionResponse>(response, '展会日历加载失败，请稍后重试')
    if (!request.signal.aborted) {
      events.value = data.items
      source.value = data.source
      availableYears.value = data.years
    }
  } catch (err) {
    if (!request.signal.aborted) error.value = getErrorMessage(err, '展会日历加载失败，请稍后重试')
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
function selectDate(date: string) {
  selectedDate.value = selectedDate.value === date ? '' : date
}
function changePage(next: number) {
  page.value = Math.min(totalPages.value, Math.max(1, next))
  listHeading.value?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
watch(year, () => {
  selectedDate.value = ''
  loadEvents()
})
watch([selectedDate, participation, events], () => {
  page.value = 1
})
onBeforeUnmount(() => controller?.abort())
async function initialize() {
  loading.value = true
  error.value = ''
  if (props.preview) {
    const request = new AbortController()
    controller = request
    try {
      const response = await fetch('/api/exhibitions/settings', { signal: request.signal })
      const settings = await readApiResponse<HomepageCalendarSettings>(
        response,
        '首页展会设置加载失败，请稍后重试',
      )
      if (request.signal.aborted) return
      homepage.value = settings
      if (settings.mode === 'fixed_month' && settings.month) {
        const configuredYear = Number(settings.month.slice(0, 4))
        if (configuredYear !== year.value) {
          year.value = configuredYear
          return
        }
      }
    } catch (err) {
      if (!request.signal.aborted) {
        error.value = getErrorMessage(err, '首页展会设置加载失败，请稍后重试')
        loading.value = false
      }
      return
    }
  }
  loadEvents()
}
initialize()
</script>

<style scoped>
.exhibition-section {
  background: linear-gradient(180deg, #263d6a 0%, #235b72 48%, #263d6a 100%);
  color: #d8e3e7;
}
.exhibition-container {
  max-width: 1400px;
  margin: 0 auto;
  padding: 56px 16px;
}
.is-page {
  min-height: 100vh;
}
.is-page .exhibition-container {
  padding-top: 120px;
}
.page-title {
  margin: 0 0 1rem;
  padding-bottom: 1rem;
  border-bottom: 2px solid #5698c3;
  color: #fff;
  font-size: 2.5rem;
  font-weight: 700;
  line-height: 1.3;
}
.calendar-toolbar {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 10px 16px;
  margin: 1rem 0 1.25rem;
}
.year-switcher,
.status-filter {
  display: flex;
  align-items: center;
  gap: 10px;
}
.current-month-label {
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.current-month-label strong {
  color: #f1f5f9;
  font-size: 1.35rem;
}
.current-month-label span {
  color: #b9c9da;
  font-size: 0.8rem;
}
.current-month-label .month-nav {
  align-self: center;
  min-width: 32px;
  padding: 0.2rem 0.6rem;
  font-size: 1rem;
  line-height: 1.4;
}
button,
select {
  border: 1px solid rgba(255, 255, 255, 0.25);
  border-radius: 8px;
  background: rgba(255, 255, 255, 0.08);
  color: #e2e8f0;
  font: inherit;
  font-size: 0.84rem;
  padding: 0.4rem 0.8rem;
  cursor: pointer;
  transition: background-color 0.18s ease, border-color 0.18s ease;
}
select option {
  background: #263d6a;
  color: #e5edf4;
}
button:disabled {
  opacity: 0.4;
  cursor: default;
}
button:not(:disabled):hover {
  background: rgba(255, 255, 255, 0.14);
}
button:focus-visible,
select:focus-visible,
a:focus-visible {
  outline: 2px solid #e7a33e;
  outline-offset: 3px;
}
.year-switcher > button {
  min-width: 34px;
}
.status-filter {
  margin-left: auto;
  color: #b9c9da;
  font-size: 0.82rem;
}
.view-all {
  margin-left: auto;
  color: #ffdba6;
  font-size: 0.95rem;
  text-decoration: none;
}
.view-all:hover {
  color: #ffe7c2;
}
.source-information {
  display: flex;
  flex-direction: column;
  gap: 4px;
  margin: -6px 0 20px;
  color: #a9bed2;
  font-size: 0.78rem;
  line-height: 1.7;
}
.source-information p {
  margin: 0;
}
.source-information a {
  color: #9bd0ff;
  text-decoration: none;
}
.source-information a:hover {
  text-decoration: underline;
}
.text-link {
  color: #93c5fd;
  text-decoration: none;
  font-size: 0.86rem;
}
button.text-link {
  border: 0;
  background: transparent;
  padding: 6px 0;
}
.text-link:hover {
  color: #d6e8ff;
}
.calendar-content {
  position: relative;
}
.loading-message {
  color: #b9c9da;
}
.feedback {
  padding: 16px;
  border: 1px solid #e7a33e;
  border-radius: 8px;
  margin-bottom: 18px;
  line-height: 2;
}
.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin: 32px 0 16px;
  scroll-margin-top: 112px;
}
.list-heading h3 {
  margin: 0;
  font-size: 1.2rem;
  color: #f1f5f9;
}
.list-heading h3 span {
  font-size: 0.8rem;
  color: #b9c9da;
  font-weight: 400;
  margin-left: 12px;
}
.event-list {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 16px;
}
.event-list-enter-active {
  transition: opacity 0.3s ease, transform 0.3s ease;
}
.event-list-enter-from {
  opacity: 0;
  transform: translateY(12px);
}
.event-list-move {
  transition: transform 0.3s ease;
}
.event-list.compact {
  grid-template-columns: 1fr;
  gap: 10px;
}
.compact .event-card {
  padding: 12px 16px;
}
.compact-row {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}
.compact-row .status-badge {
  flex-shrink: 0;
}
.compact-title {
  flex: 0 1 auto;
  min-width: 0;
  max-width: 40%;
  overflow: hidden;
  color: #f8fafc;
  font-size: 0.95rem;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compact-meta {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  color: #b9c9da;
  font-size: 0.82rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.compact-booth {
  flex-shrink: 0;
  padding: 2px 8px;
  border: 1px solid rgba(231, 163, 62, 0.3);
  border-radius: 8px;
  background: rgba(231, 163, 62, 0.08);
  color: #f4c478;
  font-size: 0.76rem;
  white-space: nowrap;
}
.event-card {
  min-width: 0;
  background: #111827;
  border-radius: 12px;
  padding: 22px;
  overflow-wrap: anywhere;
  transition: box-shadow 0.25s ease;
}
.event-card:hover {
  box-shadow: 0 0 30px rgba(0, 0, 0, 0.15);
}
.event-topline {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
}
.status-badge {
  font-size: 0.72rem;
  border-radius: 8px;
  padding: 4px 8px;
  color: #b7dbff;
  background: rgba(120, 185, 244, 0.15);
}
.status-badge.participating {
  color: #ffd793;
  background: rgba(231, 163, 62, 0.15);
}
.status-badge.not_participating,
.status-badge.not_participated {
  color: #c7cfd9;
  background: rgba(164, 173, 186, 0.15);
}
.past-label {
  color: #b9c9da;
  font-size: 0.75rem;
}
.event-card h4 {
  margin: 16px 0 10px;
  color: #f8fafc;
  font-size: 1.2rem;
  line-height: 1.5;
}
.event-date {
  margin: 0 0 12px;
  color: #e1e9f3;
  font-size: 0.84rem;
}
.event-meta {
  display: grid;
  gap: 5px;
  padding: 12px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.08);
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);
}
.event-meta p,
.attendance-card p {
  margin: 0;
  color: #c1cede;
  font-size: 0.84rem;
  line-height: 1.7;
}
.event-meta p span,
.attendance-card p span {
  display: inline-block;
  min-width: 64px;
  margin-right: 8px;
  color: #8198b3;
}
.is-cancelled {
  color: #f4a3a3 !important;
}
.attendance-card {
  margin-top: 12px;
  padding: 12px 14px;
  border: 1px solid rgba(231, 163, 62, 0.22);
  border-radius: 8px;
  background: rgba(231, 163, 62, 0.06);
}
.attendance-heading {
  margin: 0 0 6px !important;
  color: #f4c478 !important;
  font-size: 0.7rem !important;
  font-weight: 700;
  letter-spacing: 0.12em;
}
.attendance-notes {
  margin-top: 7px !important;
  padding-top: 7px;
  border-top: 1px dashed rgba(231, 163, 62, 0.18);
  color: #d9c7a6 !important;
  white-space: pre-wrap;
}
.event-description {
  margin: 12px 0 0;
  color: #b7c8db;
  font-size: 0.84rem;
  line-height: 1.8;
  white-space: pre-wrap;
}
.event-source {
  margin: 12px 0 0;
  color: #8198b3;
  font-size: 0.72rem;
}
.event-card .event-link {
  display: inline-block;
  margin-top: 12px;
  color: #9bd0ff;
  font-size: 0.82rem;
  text-decoration: none;
}
.event-card .event-link:hover {
  color: #d6e8ff;
  text-decoration: underline;
}
.empty-state {
  padding: 28px 16px;
  color: #b9c9da;
  text-align: center;
  border: 1px dashed rgba(216, 227, 231, 0.2);
  border-radius: 8px;
}
.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
  color: #b9c9da;
  font-size: 0.82rem;
}
@media (max-width: 1100px) {
  .event-list {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}
@media (max-width: 760px) {
  .event-list {
    grid-template-columns: 1fr;
  }
  .exhibition-container {
    padding: 40px 16px;
  }
  .is-page .exhibition-container {
    padding-top: 104px;
  }
  .page-title {
    font-size: 1.8rem;
  }
  .calendar-toolbar {
    gap: 10px;
  }
  .current-month-label strong {
    font-size: 1.2rem;
  }
  .view-all {
    margin-left: 0;
  }
  .compact-row {
    flex-wrap: wrap;
    row-gap: 4px;
  }
  .compact-title {
    max-width: 100%;
  }
  .compact-meta {
    flex-basis: 100%;
  }
}
</style>
