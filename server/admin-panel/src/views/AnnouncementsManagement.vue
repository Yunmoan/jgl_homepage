<template>
  <div>
    <div class="controls">
      <h1>公告管理</h1>
      <el-button type="primary" @click="handleCreate">新建公告</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" min-width="200" />
      <el-table-column prop="type" label="类型" width="120">
        <template #default="{ row }">
          <el-tag :type="tagType(row.type)">{{ row.type }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="enabled" label="启用" width="120">
        <template #default="{ row }">
          <el-tag :type="row.enabled ? 'success' : 'info'">{{ row.enabled ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="closeable" label="可关闭" width="120">
        <template #default="{ row }">
          <el-tag :type="row.closeable ? 'success' : 'info'">{{ row.closeable ? '是' : '否' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="start_at" label="开始时间" width="180" />
      <el-table-column prop="end_at" label="结束时间" width="180" />
      <el-table-column label="操作" width="220">
        <template #default="{ row }">
          <el-button size="small" @click="handleEdit(row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="760px">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" placeholder="请输入标题" />
        </el-form-item>
        <el-form-item label="类型">
          <el-select v-model="form.type" style="width: 200px">
            <el-option label="信息" value="info" />
            <el-option label="成功" value="success" />
            <el-option label="警告" value="warning" />
            <el-option label="错误" value="error" />
          </el-select>
        </el-form-item>
        <el-form-item label="启用">
          <el-switch v-model="form.enabled" />
        </el-form-item>
        <el-form-item label="可关闭">
          <el-switch v-model="form.closeable" />
        </el-form-item>
        <el-form-item label="生效时间">
          <el-date-picker v-model="form.start_at" type="datetime" placeholder="开始时间" style="width: 300px"
            format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="失效时间">
          <el-date-picker v-model="form.end_at" type="datetime" placeholder="结束时间" style="width: 300px"
            format="YYYY-MM-DD HH:mm:ss" value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" :rows="6" placeholder="支持简单 HTML，例如 <a> 链接" />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, reactive, computed, onMounted } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'

interface Announcement {
  id: number
  title: string
  content: string
  type: 'info' | 'success' | 'warning' | 'error'
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

const dialogTitle = computed(() => (isEditMode.value ? '编辑公告' : '新建公告'))

const fetchList = async () => {
  loading.value = true
  try {
    const res = await apiClient.get('/announcements')
    tableData.value = res.data || []
  } catch (e) {
    ElMessage.error('获取公告失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchList)

const handleCreate = () => {
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
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: Announcement) => {
  Object.assign(form, row, {
    enabled: !!row.enabled,
    closeable: !!row.closeable,
  })
  isEditMode.value = true
  dialogVisible.value = true
}

const handleSave = async () => {
  if (!form.title) return ElMessage.error('请填写标题')
  try {
    const payload = { ...form }
    if (isEditMode.value) {
      await apiClient.put(`/announcements/${form.id}` as string, payload)
      ElMessage.success('已更新')
    } else {
      await apiClient.post('/announcements', payload)
      ElMessage.success('已创建')
    }
    dialogVisible.value = false
    fetchList()
  } catch (e) {
    ElMessage.error('保存失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除该公告？', '提示', {
      type: 'warning',
      confirmButtonText: '删除',
      cancelButtonText: '取消',
    })
    await apiClient.delete(`/announcements/${id}`)
    ElMessage.success('已删除')
    fetchList()
  } catch (e) {
    // cancelled or error
  }
}

const tagType = (t: string) => {
  if (t === 'success') return 'success'
  if (t === 'warning') return 'warning'
  if (t === 'error') return 'danger'
  return 'info'
}
</script>

<style scoped>
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>

