<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>公告管理</h1>
        <p>维护站点公告，控制展示类型、生效时间和启用状态。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchList">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">新建公告</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题或内容"
          style="width: 280px"
        />
        <el-select v-model="typeFilter" placeholder="类型" style="width: 140px">
          <el-option label="全部类型" value="all" />
          <el-option label="信息" value="info" />
          <el-option label="成功" value="success" />
          <el-option label="警告" value="warning" />
          <el-option label="错误" value="error" />
        </el-select>
        <el-select v-model="enabledFilter" placeholder="启用状态" style="width: 140px">
          <el-option label="全部状态" value="all" />
          <el-option label="已启用" value="enabled" />
          <el-option label="已停用" value="disabled" />
        </el-select>
        <span class="filter-count">共 {{ filteredData.length }} 条，启用 {{ enabledCount }} 条</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="公告" min-width="300">
          <template #default="{ row }">
            <div class="table-title-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.content || '暂无内容' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="type" label="类型" width="110">
          <template #default="{ row }">
            <el-tag :type="tagType(row.type)" effect="plain">{{ typeLabel(row.type) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="启用" width="100">
          <template #default="{ row }">
            <el-switch :model-value="toBool(row.enabled)" @change="(value: boolean) => toggleEnabled(row, value)" />
          </template>
        </el-table-column>
        <el-table-column label="可关闭" width="100">
          <template #default="{ row }">
            <el-tag :type="toBool(row.closeable) ? 'success' : 'info'" effect="plain">
              {{ toBool(row.closeable) ? '是' : '否' }}
            </el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="start_at" label="开始时间" min-width="170" />
        <el-table-column prop="end_at" label="结束时间" min-width="170" />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="danger"
              plain
              :icon="Delete"
              @click="handleDelete(row.id)"
            >
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的公告" />
        </template>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="filteredData.length"
          @size-change="currentPage = 1"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="720px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 180px">
            <el-option label="信息" value="info" />
            <el-option label="成功" value="success" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="开关">
          <el-checkbox v-model="form.enabled">启用</el-checkbox>
          <el-checkbox v-model="form.closeable">允许用户关闭</el-checkbox>
        </el-form-item>
        <el-form-item label="开始时间">
          <el-date-picker
            v-model="form.start_at"
            type="datetime"
            placeholder="不填则立即生效"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="结束时间">
          <el-date-picker
            v-model="form.end_at"
            type="datetime"
            placeholder="不填则长期有效"
            format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss"
          />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" maxlength="1000" show-word-limit />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'

type AnnouncementType = 'info' | 'success' | 'warning' | 'error'
type TypeFilter = AnnouncementType | 'all'
type EnabledFilter = 'all' | 'enabled' | 'disabled'

interface Announcement {
  id: number
  title: string
  content: string
  type: AnnouncementType
  enabled: 0 | 1 | boolean
  closeable: 0 | 1 | boolean
  start_at: string | null
  end_at: string | null
  created_at?: string
  updated_at?: string
}

const tableData = ref<Announcement[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const keyword = ref('')
const typeFilter = ref<TypeFilter>('all')
const enabledFilter = ref<EnabledFilter>('all')
const currentPage = ref(1)
const pageSize = ref(10)

const form = reactive<Partial<Announcement>>({
  id: undefined,
  title: '',
  content: '',
  type: 'info',
  enabled: true,
  closeable: true,
  start_at: null,
  end_at: null,
})

function parseJwtRole(): string | null {
  try {
    const token = localStorage.getItem('token')
    if (!token) return null
    const parts = token.split('.')
    if (parts.length !== 3) return null
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')))
    return payload?.role ?? null
  } catch {
    return null
  }
}

const isAdmin = computed(() => parseJwtRole() === 'admin')
const dialogTitle = computed(() => (isEditMode.value ? '编辑公告' : '新建公告'))
const toBool = (value: unknown) => value === true || value === 1 || value === '1'
const enabledCount = computed(() => tableData.value.filter((item) => toBool(item.enabled)).length)

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tableData.value.filter((item) => {
    const hitKeyword =
      !kw ||
      [item.title, item.content].some((value) => String(value || '').toLowerCase().includes(kw))
    const hitType = typeFilter.value === 'all' || item.type === typeFilter.value
    const enabled = toBool(item.enabled)
    const hitEnabled =
      enabledFilter.value === 'all' ||
      (enabledFilter.value === 'enabled' && enabled) ||
      (enabledFilter.value === 'disabled' && !enabled)
    return hitKeyword && hitType && hitEnabled
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch([keyword, typeFilter, enabledFilter], () => {
  currentPage.value = 1
})

const fetchList = async () => {
  loading.value = true
  try {
    const res = await apiClient.get('/announcements')
    tableData.value = res.data || []
  } catch (error) {
    ElMessage.error('获取公告失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    title: '',
    content: '',
    type: 'info',
    enabled: true,
    closeable: true,
    start_at: null,
    end_at: null,
  })
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: Announcement) => {
  Object.assign(form, row, {
    enabled: toBool(row.enabled),
    closeable: toBool(row.closeable),
  })
  isEditMode.value = true
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.title) return ElMessage.error('请填写标题')
  try {
    const payload = { ...form }
    if (isEditMode.value) {
      await apiClient.put(`/announcements/${form.id}`, payload)
      ElMessage.success('公告已更新')
    } else {
      await apiClient.post('/announcements', payload)
      ElMessage.success('公告已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const toggleEnabled = async (row: Announcement, enabled: boolean) => {
  try {
    await apiClient.put(`/announcements/${row.id}`, { enabled })
    row.enabled = enabled
    ElMessage.success(enabled ? '公告已启用' : '公告已停用')
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这条公告吗？此操作不可撤销。', '删除公告', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await apiClient.delete(`/announcements/${id}`)
    ElMessage.success('公告已删除')
    fetchList()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

const tagType = (type: AnnouncementType) => {
  if (type === 'success') return 'success'
  if (type === 'warning') return 'warning'
  if (type === 'error') return 'danger'
  return 'info'
}

const typeLabel = (type: AnnouncementType) => {
  if (type === 'success') return '成功'
  if (type === 'warning') return '警告'
  if (type === 'error') return '错误'
  return '信息'
}
</script>
