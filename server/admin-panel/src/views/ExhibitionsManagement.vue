<template>
  <div class="admin-page exhibitions-management">
    <div class="page-header">
      <div class="page-title">
        <h1>展会日历</h1>
        <p>维护全年展会时间与高联参展计划，保存后同步展示在首页和展会日历页面。</p>
      </div>
      <div class="page-actions">
        <el-button @click="$router.push('/admin/system-settings')">数据源与首页设置</el-button
        ><el-button :loading="loading" @click="loadEvents">刷新</el-button
        ><el-button type="primary" :disabled="saving" @click="openCreate()">新增展会</el-button>
      </div>
    </div>
    <el-card shadow="never">
      <div class="filter-bar">
        <el-button :disabled="year <= 1900 || loading" aria-label="上一年" @click="year--"
          >上一年</el-button
        >
        <el-select v-model="year" aria-label="选择年份" style="width: 130px"
          ><el-option v-for="y in yearOptions" :key="y" :label="`${y} 年`" :value="y"
        /></el-select>
        <el-button :disabled="year >= 2199 || loading" aria-label="下一年" @click="year++"
          >下一年</el-button
        >
        <el-button v-if="year !== currentYear" @click="year = currentYear">回到今年</el-button>
        <el-select v-model="selectedMonth" aria-label="选择月份" style="width: 130px">
          <el-option label="全年概览" :value="0" />
          <el-option v-for="m in 12" :key="m" :label="`${m} 月`" :value="m" />
        </el-select>
        <el-button
          v-if="year !== currentYear || selectedMonth !== currentMonth"
          @click="goToCurrentMonth"
          >回到本月</el-button
        >
        <span class="filter-count"
          >{{ selectedMonth ? '本月' : '全年' }} {{ displayedEventCount }} 场展会</span
        >
      </div>
      <el-alert
        v-if="error"
        :title="error"
        type="error"
        :closable="false"
        show-icon
        class="load-error"
      />
      <ExhibitionCalendar
        v-loading="loading"
        class="admin-calendar"
        :year="year"
        :month="selectedMonth || undefined"
        :events="events"
        :selected-date="selectedDate"
        :disabled="loading"
        editable
        @select-date="selectDate"
        @edit-event="openEdit"
      />
    </el-card>

    <el-card shadow="never" class="table-card">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          placeholder="搜索展会、地点、摊位或参展信息"
          style="width: 260px"
        />
        <el-select v-model="participation" clearable placeholder="全部参展状态" style="width: 160px"
          ><el-option
            v-for="(label, status) in participationLabels"
            :key="status"
            :label="label"
            :value="status"
        /></el-select>
        <el-tag v-if="selectedDate" closable @close="selectedDate = ''">{{ selectedDate }}</el-tag>
        <el-button v-if="selectedDate" @click="openCreate(selectedDate)">在此日期新增</el-button>
        <span class="filter-count">共 {{ filteredEvents.length }} 场</span>
      </div>
      <el-table
        v-loading="loading"
        :data="paginatedEvents"
        row-key="id"
        empty-text="暂无符合条件的展会"
      >
        <el-table-column label="展会" min-width="200"
          ><template #default="{ row }"
            ><div class="table-title-cell">
              <strong>{{ row.title }}</strong
              ><span>{{ row.location || '地点待定' }}</span>
              <span>{{ row.source_label || '本站维护' }}<template v-if="row.source_status"> · {{ row.source_status }}</template></span>
            </div></template
          ></el-table-column
        >
        <el-table-column label="展会时间" min-width="220"
          ><template #default="{ row }">{{ formatExhibitionDates(row) }}</template></el-table-column
        >
        <el-table-column label="参展计划" width="120"
          ><template #default="{ row }"
            ><el-tag :type="participationTag(row)"
              >{{ participationLabels[displayParticipation(row)] }}</el-tag
            ></template
          ></el-table-column
        >
        <el-table-column prop="booth" label="摊位" min-width="110" />
        <el-table-column
          prop="participation_notes"
          label="参展信息"
          min-width="200"
          show-overflow-tooltip
        />
        <el-table-column label="操作" width="170" fixed="right"
          ><template #default="{ row }"
            ><el-button link type="primary" :disabled="saving" @click="openEdit(row)"
              >{{ row.source_event_id ? '绑定参展信息' : '编辑' }}</el-button
            ><el-button v-if="!row.source_event_id" link type="danger" :disabled="saving" @click="deleteEvent(row)"
              >删除</el-button
            ></template
          ></el-table-column
        >
      </el-table>
      <div class="table-footer">
        <el-pagination
          v-model:current-page="page"
          :page-size="pageSize"
          :total="filteredEvents.length"
          layout="total, prev, pager, next"
        />
      </div>
    </el-card>
    <ExhibitionBindings ref="bindingEditor" :events="events" @changed="loadEvents" />

    <el-dialog
      v-model="dialogVisible"
      :title="editingId ? '编辑展会' : '新增展会'"
      width="640px"
      :close-on-click-modal="false"
      :close-on-press-escape="!saving"
      :show-close="!saving"
    >
      <el-form ref="formRef" :model="form" :rules="rules" label-position="top" :disabled="saving">
        <el-form-item label="展会名称" prop="title"
          ><el-input v-model="form.title" maxlength="120" show-word-limit
        /></el-form-item>
        <div class="date-fields">
          <el-form-item label="开始日期" prop="start_date"
            ><el-date-picker
              v-model="form.start_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择开始日期"
              style="width: 100%"
          /></el-form-item>
          <el-form-item label="结束日期" prop="end_date"
            ><el-date-picker
              v-model="form.end_date"
              type="date"
              value-format="YYYY-MM-DD"
              placeholder="选择结束日期"
              style="width: 100%"
          /></el-form-item>
        </div>
        <el-form-item label="参展计划" prop="participation"
          ><el-select v-model="form.participation" style="width: 100%"
            ><el-option
              v-for="(label, status) in selectableParticipationLabels"
              :key="status"
              :label="label"
              :value="status" /></el-select
        ></el-form-item>
        <el-form-item label="参展信息（备注）" prop="participation_notes">
          <el-input
            v-model="form.participation_notes"
            type="textarea"
            :rows="4"
            maxlength="2000"
            show-word-limit
            placeholder="例如参与社团、出展内容、参展安排等（公开展示，留空不显示）"
          />
        </el-form-item>
        <el-form-item label="展会地点"
          ><el-input v-model="form.location" maxlength="255" placeholder="城市、场馆或详细地址"
        /></el-form-item>
        <el-form-item label="高联摊位"
          ><el-input v-model="form.booth" maxlength="100" placeholder="例如 A01，待公布可留空"
        /></el-form-item>
        <el-form-item label="展会链接"
          ><el-input v-model="form.link" maxlength="500" placeholder="https://…（可选）"
        /></el-form-item>
        <el-form-item label="展会简介"
          ><el-input
            v-model="form.description"
            type="textarea"
            :rows="4"
            maxlength="5000"
            show-word-limit
            placeholder="展会活动介绍等（可选）"
        /></el-form-item>
        <p class="dialog-tip">
          日期包含开始日与结束日，支持多日及跨年展会。所有展会及参展计划均会公开展示。
        </p>
      </el-form>
      <template #footer
        ><el-button :disabled="saving" @click="dialogVisible = false">取消</el-button
        ><el-button type="primary" :loading="saving" @click="saveEvent"
          >保存展会</el-button
        ></template
      >
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, nextTick, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import type { FormInstance, FormRules } from 'element-plus'
import { getErrorMessage } from '@/feedback'
import apiClient from '../api'
import ExhibitionCalendar from '../../../../src/components/ExhibitionCalendar.vue'
import ExhibitionBindings from '../components/ExhibitionBindings.vue'
import {
  displayParticipation,
  exhibitionsInMonth,
  formatExhibitionDates,
  participationLabels,
  selectableParticipationLabels,
  todayInChina,
} from '../../../../src/utils/exhibitions'
import type {
  Exhibition,
  ExhibitionResponse,
  Participation,
} from '../../../../src/utils/exhibitions'

const currentYear = Number(todayInChina().slice(0, 4))
const currentMonth = Number(todayInChina().slice(5, 7))
const year = ref(currentYear)
const selectedMonth = ref(currentMonth)
const availableYears = ref<number[]>([])
const events = ref<Exhibition[]>([])
const bindingEditor = ref<InstanceType<typeof ExhibitionBindings>>()
const selectedDate = ref('')
const keyword = ref('')
const participation = ref<Participation | ''>('')
const loading = ref(false)
const error = ref('')
const saving = ref(false)
const page = ref(1)
const pageSize = 10
const dialogVisible = ref(false)
const editingId = ref<number | null>(null)
const formRef = ref<FormInstance>()
const emptyForm = () => ({
  title: '',
  start_date: '',
  end_date: '',
  location: '',
  booth: '',
  participation: 'undecided' as Participation,
  participation_notes: '',
  description: '',
  link: '',
})
const form = reactive(emptyForm())
const rules: FormRules = {
  title: [{ required: true, whitespace: true, message: '请填写展会名称', trigger: 'blur' }],
  start_date: [{ required: true, message: '请选择开始日期', trigger: 'change' }],
  end_date: [{ required: true, message: '请选择结束日期', trigger: 'change' }],
}
let controller: AbortController | undefined
const yearOptions = computed(() =>
  [...new Set([currentYear, year.value, ...availableYears.value])].sort((a, b) => b - a),
)
const displayedEventCount = computed(() =>
  selectedMonth.value
    ? exhibitionsInMonth(events.value, year.value, selectedMonth.value).length
    : events.value.length,
)
function goToCurrentMonth() {
  year.value = currentYear
  selectedMonth.value = currentMonth
}
function participationTag(event: Exhibition) {
  const status = displayParticipation(event)
  return status === 'participating' ? 'success' : status === 'undecided' ? 'warning' : 'info'
}
const filteredEvents = computed(() => {
  const query = keyword.value.trim().toLowerCase()
  return events.value.filter(
    (event) =>
      (!selectedDate.value ||
        (event.start_date <= selectedDate.value && event.end_date >= selectedDate.value)) &&
      (!participation.value || displayParticipation(event) === participation.value) &&
      (!query ||
        [event.title, event.location, event.booth, event.participation_notes || ''].some((value) =>
          value.toLowerCase().includes(query),
        )),
  )
})
const paginatedEvents = computed(() =>
  filteredEvents.value.slice((page.value - 1) * pageSize, page.value * pageSize),
)

async function loadEvents() {
  controller?.abort()
  const request = new AbortController()
  controller = request
  loading.value = true
  error.value = ''
  events.value = []
  try {
    const { data } = await apiClient.get<ExhibitionResponse>('/exhibitions/public', {
      params: { year: year.value },
      signal: request.signal,
    })
    if (!request.signal.aborted) {
      events.value = data.items
      availableYears.value = data.years
    }
  } catch (err) {
    if (!request.signal.aborted) error.value = getErrorMessage(err, '展会加载失败，请点击刷新重试')
  } finally {
    if (!request.signal.aborted) loading.value = false
  }
}
async function openCreate(date?: string) {
  editingId.value = null
  const defaultDate =
    date ||
    (year.value === currentYear && (!selectedMonth.value || selectedMonth.value === currentMonth)
      ? todayInChina()
      : `${year.value}-${String(selectedMonth.value || 1).padStart(2, '0')}-01`)
  Object.assign(form, emptyForm(), { start_date: defaultDate, end_date: defaultDate })
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}
async function openEdit(event: Exhibition) {
  if (event.source_event_id) {bindingEditor.value?.openEvent(event);return}
  editingId.value = Number(event.id)
  Object.assign(form, emptyForm(), event)
  dialogVisible.value = true
  await nextTick()
  formRef.value?.clearValidate()
}
function selectDate(date: string) {
  selectedDate.value = selectedDate.value === date ? '' : date
  if (!events.value.some((event) => event.start_date <= date && event.end_date >= date))
    openCreate(date)
}
async function saveEvent() {
  if (saving.value || !(await formRef.value?.validate().catch(() => false))) return
  if (form.end_date < form.start_date) return ElMessage.error('结束日期不能早于开始日期')
  saving.value = true
  try {
    if (editingId.value) await apiClient.put(`/exhibitions/${editingId.value}`, form)
    else await apiClient.post('/exhibitions', form)
    ElMessage.success('展会已保存')
    dialogVisible.value = false
    selectedDate.value = ''
    if (form.start_date > `${year.value}-12-31` || form.end_date < `${year.value}-01-01`)
      year.value = Number(form.start_date.slice(0, 4))
    else await loadEvents()
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '展会保存失败，请稍后重试'))
  } finally {
    saving.value = false
  }
}
async function deleteEvent(event: Exhibition) {
  try {
    await ElMessageBox.confirm(`确认删除「${event.title}」？`, '删除展会', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
  } catch {
    return
  }
  saving.value = true
  try {
    await apiClient.delete(`/exhibitions/${event.id}`)
    ElMessage.success('展会已删除')
    await loadEvents()
  } catch (err) {
    ElMessage.error(getErrorMessage(err, '展会删除失败，请稍后重试'))
  } finally {
    saving.value = false
  }
}
watch(year, () => {
  selectedDate.value = ''
  loadEvents()
})
watch(selectedMonth, () => {
  selectedDate.value = ''
  page.value = 1
})
watch([keyword, participation, selectedDate, events], () => {
  page.value = 1
})
onBeforeUnmount(() => {
  controller?.abort()
})
loadEvents()
</script>

<style scoped>
.admin-calendar {
  --cal-card: var(--card-bg);
  --cal-text: var(--text-color);
  --cal-muted: var(--muted-text);
  --cal-border: var(--el-border-color-lighter);
  --cal-hover: var(--el-fill-color-light);
  --cal-accent: var(--el-color-primary);
  --cal-tooltip: var(--card-bg);
}
.date-fields {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 16px;
}
.load-error {
  margin-bottom: 16px;
}
@media (max-width: 640px) {
  .date-fields {
    grid-template-columns: 1fr;
    gap: 0;
  }
}
</style>
