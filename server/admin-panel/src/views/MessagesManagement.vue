<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>留言管理</h1>
        <p>查看、审核和维护留言内容，支持批量导入和手动新增。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">新增留言</el-button>
        <el-upload
          action="/api/messages/import"
          :headers="{ Authorization: `Bearer ${token}` }"
          :show-file-list="false"
          :on-success="handleSuccess"
          :on-error="handleError"
          :before-upload="beforeUpload"
        >
          <el-button :icon="Upload">导入 JSON</el-button>
        </el-upload>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索作者、内容、QQ"
          style="width: 280px"
        />
        <el-select v-model="statusFilter" placeholder="状态" style="width: 140px">
          <el-option label="全部状态" value="all" />
          <el-option label="待审核" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <span class="filter-count">共 {{ filteredData.length }} 条，待审 {{ pendingCount }} 条</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column prop="author" label="作者" min-width="140" />
        <el-table-column prop="content" label="内容" min-width="320" show-overflow-tooltip />
        <el-table-column prop="qq" label="QQ" min-width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="180" />
        <el-table-column label="操作" width="320" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button
              size="small"
              type="success"
              plain
              :disabled="row.status === 'approved'"
              @click="updateStatus(row.id, 'approved')"
            >
              通过
            </el-button>
            <el-button
              size="small"
              type="warning"
              plain
              :disabled="row.status === 'rejected'"
              @click="updateStatus(row.id, 'rejected')"
            >
              驳回
            </el-button>
            <el-button size="small" type="danger" plain :icon="Delete" @click="handleDelete(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的留言" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="作者">
          <el-input v-model="form.author" maxlength="60" show-word-limit />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="5" maxlength="500" show-word-limit />
        </el-form-item>
        <el-form-item label="QQ">
          <el-input v-model="form.qq" maxlength="20" show-word-limit />
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
import { Delete, Edit, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import type { UploadProps } from 'element-plus'

type MessageStatus = 'pending' | 'approved' | 'rejected'
type StatusFilter = MessageStatus | 'all'

interface Message {
  id: number
  author: string
  content: string
  qq: string
  status: MessageStatus
  created_at: string
}

const tableData = ref<Message[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const token = localStorage.getItem('token') || ''
const keyword = ref('')
const statusFilter = ref<StatusFilter>('all')
const currentPage = ref(1)
const pageSize = ref(10)

const form = reactive<Partial<Message>>({
  id: undefined,
  author: '',
  content: '',
  qq: '',
})

const dialogTitle = computed(() => (isEditMode.value ? '编辑留言' : '新增留言'))
const pendingCount = computed(() => tableData.value.filter((item) => item.status === 'pending').length)

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tableData.value.filter((item) => {
    const hitKeyword =
      !kw ||
      [item.author, item.content, item.qq].some((value) => String(value || '').toLowerCase().includes(kw))
    const hitStatus = statusFilter.value === 'all' || item.status === statusFilter.value
    return hitKeyword && hitStatus
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch([keyword, statusFilter], () => {
  currentPage.value = 1
})

const fetchData = async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/messages/all')
    tableData.value = response.data || []
  } catch (error) {
    ElMessage.error('获取留言列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const resetForm = () => {
  Object.assign(form, { id: undefined, author: '', content: '', qq: '' })
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: Message) => {
  Object.assign(form, row)
  isEditMode.value = true
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.author || !form.content) {
    return ElMessage.error('请填写作者和内容')
  }
  try {
    if (isEditMode.value && form.id) {
      await apiClient.put(`/messages/${form.id}`, {
        author: form.author,
        content: form.content,
        qq: form.qq || '',
      })
      ElMessage.success('留言已更新')
    } else {
      await apiClient.post('/messages/add', {
        author: form.author,
        content: form.content,
        qq: form.qq || '',
      })
      ElMessage.success('留言已新增')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const updateStatus = async (id: number, status: MessageStatus) => {
  try {
    await apiClient.put(`/messages/${id}/status`, { status })
    const row = tableData.value.find((item) => item.id === id)
    if (row) row.status = status
    ElMessage.success(`留言已更新为${statusLabel(status)}`)
  } catch (error) {
    ElMessage.error('状态更新失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这条留言吗？此操作不可撤销。', '删除留言', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/messages/${id}`)
    ElMessage.success('留言已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败')
    }
  }
}

const statusTag = (status: MessageStatus) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  return 'warning'
}

const statusLabel = (status: MessageStatus) => {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已驳回'
  return '待审核'
}

const handleSuccess: UploadProps['onSuccess'] = (response) => {
  ElMessage.success(response.message || '导入成功')
  fetchData()
}

const handleError: UploadProps['onError'] = (error) => {
  try {
    const response = JSON.parse(error.message)
    ElMessage.error(response.error || '导入失败')
  } catch {
    ElMessage.error('导入失败，请检查文件格式')
  }
}

const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.type !== 'application/json') {
    ElMessage.error('文件必须是 JSON 格式')
    return false
  }
  return true
}
</script>
