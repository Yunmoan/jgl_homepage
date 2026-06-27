<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>友情链接</h1>
        <p>维护官网底部或合作入口的外部链接。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">添加链接</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题或 URL"
          style="width: 280px"
        />
        <span class="filter-count">共 {{ filteredData.length }} 条链接</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="Logo" width="108">
          <template #default="{ row }">
            <img v-if="row.logo" :src="formatLogoUrl(row.logo)" class="table-image-thumb" alt="" />
          </template>
        </el-table-column>
        <el-table-column prop="title" label="标题" min-width="220" />
        <el-table-column label="URL" min-width="300">
          <template #default="{ row }">
            <el-link v-if="row.url" :href="row.url" target="_blank" type="primary" :underline="false">
              {{ row.url }}
            </el-link>
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
          <el-empty description="没有符合条件的链接" />
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
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="Logo">
          <el-upload
            class="image-uploader"
            action="/api/upload?type=friend_links"
            name="image"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
          >
            <img v-if="form.logo" :src="formatLogoUrl(form.logo)" class="image" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="form.url" placeholder="https://..." />
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

interface FriendLink {
  id: number
  title: string
  url: string
  logo?: string
}

const tableData = ref<FriendLink[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const form = reactive<Partial<FriendLink>>({
  id: undefined,
  title: '',
  url: '',
  logo: '',
})

const dialogTitle = computed(() => (isEditMode.value ? '编辑链接' : '添加链接'))
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const formatLogoUrl = (src?: string) => src || ''

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter((item) =>
    [item.title, item.url].some((value) => String(value || '').toLowerCase().includes(kw)),
  )
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch(keyword, () => {
  currentPage.value = 1
})

const fetchData = async () => {
  loading.value = true
  try {
    const response = await apiClient.get('/friend-links')
    tableData.value = response.data || []
  } catch (error) {
    ElMessage.error('获取友情链接失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const resetForm = () => {
  Object.assign(form, { id: undefined, title: '', url: '', logo: '' })
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: FriendLink) => {
  Object.assign(form, row)
  isEditMode.value = true
  dialogVisible.value = true
}

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
  form.logo = response.filePath
  ElMessage.success('Logo 上传成功')
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isAllowedType = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)
  const isLt2M = rawFile.size / 1024 / 1024 < 2

  if (!isAllowedType) {
    ElMessage.error('Logo 只能是 JPG、PNG 或 WEBP 格式')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('Logo 大小不能超过 2MB')
    return false
  }
  return true
}

const handleSave = async () => {
  if (!form.title || !form.url) return ElMessage.error('请填写标题和 URL')
  try {
    if (isEditMode.value) {
      await apiClient.put(`/friend-links/${form.id}`, form)
      ElMessage.success('链接已更新')
    } else {
      await apiClient.post('/friend-links', form)
      ElMessage.success('链接已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个链接吗？此操作不可撤销。', '删除链接', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/friend-links/${id}`)
    ElMessage.success('链接已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.image-uploader .image {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}
</style>
