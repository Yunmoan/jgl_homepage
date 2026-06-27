<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>历史事件</h1>
        <p>维护官网历程时间线，支持图片、链接和弹窗扩展数据。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">添加事件</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题、日期或描述"
          style="width: 300px"
        />
        <span class="filter-count">共 {{ filteredData.length }} 条事件</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="图片" width="116">
          <template #default="{ row }">
            <img v-if="row.image" :src="row.image" class="table-image-thumb" alt="" />
          </template>
        </el-table-column>
        <el-table-column label="事件" min-width="260">
          <template #default="{ row }">
            <div class="table-title-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.date || '未填写日期' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="320" show-overflow-tooltip />
        <el-table-column label="链接" min-width="220">
          <template #default="{ row }">
            <el-link v-if="row.link" :href="row.link" target="_blank" type="primary" :underline="false">
              {{ row.link }}
            </el-link>
            <span v-else class="muted">未填写</span>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" plain :icon="Delete" @click="handleDelete(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有历史事件" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="680px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="120" show-word-limit />
        </el-form-item>
        <el-form-item label="日期">
          <el-input v-model="form.date" placeholder="例如：2024-05" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
        </el-form-item>
        <el-form-item label="图片">
          <el-upload
            class="image-uploader"
            action="/api/upload?type=history"
            name="image"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
          >
            <img v-if="form.image" :src="form.image" class="image" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="form.link" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="弹窗 JSON">
          <el-input v-model="form.dialog_data" type="textarea" :autosize="{ minRows: 5, maxRows: 10 }" />
          <div class="dialog-tip">必须是合法 JSON；无内容可保留为 {}。</div>
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
import type { UploadProps } from 'element-plus'

interface HistoryEvent {
  id: number
  title: string
  date: string
  description: string
  image: string
  link: string
  dialog_data: string
}

const tableData = ref<HistoryEvent[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const form = reactive<Partial<HistoryEvent>>({
  id: undefined,
  title: '',
  date: '',
  description: '',
  image: '',
  link: '',
  dialog_data: '{}',
})

const dialogTitle = computed(() => (isEditMode.value ? '编辑事件' : '添加事件'))
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter((item) =>
    [item.title, item.date, item.description].some((value) =>
      String(value || '').toLowerCase().includes(kw),
    ),
  )
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch(keyword, () => {
  currentPage.value = 1
})

const normalizeDialogData = (value: unknown) => {
  if (!value) return '{}'
  if (typeof value === 'string') return value
  return JSON.stringify(value, null, 2)
}

const fetchData = async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/history')
    tableData.value = (response.data || []).map((item: any) => ({
      ...item,
      dialog_data: normalizeDialogData(item.dialog_data),
    }))
  } catch {
    ElMessage.error('获取历史事件列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const resetForm = () => {
  Object.assign(form, { id: undefined, title: '', date: '', description: '', image: '', link: '', dialog_data: '{}' })
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: HistoryEvent) => {
  Object.assign(form, row)
  isEditMode.value = true
  dialogVisible.value = true
}

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
  form.image = response.filePath
  ElMessage.success('图片上传成功')
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)) {
    ElMessage.error('图片只能是 JPG、PNG 或 WebP 格式')
    return false
  }
  if (rawFile.size / 1024 / 1024 >= 2) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

const handleSave = async () => {
  if (!form.title) return ElMessage.error('请填写标题')
  let dialogData: unknown
  try {
    dialogData = JSON.parse(form.dialog_data || '{}')
  } catch {
    return ElMessage.error('弹窗 JSON 格式不正确')
  }

  const payload = { ...form, dialog_data: dialogData }
  try {
    if (isEditMode.value) {
      await apiClient.put(`/history/${form.id}`, payload)
      ElMessage.success('事件已更新')
    } else {
      await apiClient.post('/history', payload)
      ElMessage.success('事件已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch {
    ElMessage.error('保存失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个历史事件吗？此操作不可撤销。', '删除事件', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/history/${id}`)
    ElMessage.success('事件已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.muted {
  color: var(--muted-text);
}
</style>
