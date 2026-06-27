<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>名人堂</h1>
        <p>维护官网名人堂人物资料、图片和简介。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">添加成员</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索名称或描述"
          style="width: 280px"
        />
        <span class="filter-count">共 {{ filteredData.length }} 位成员</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="图片" width="120">
          <template #default="{ row }">
            <img v-if="row.image" :src="formatImageUrl(row.image)" class="table-image-thumb" alt="" />
          </template>
        </el-table-column>
        <el-table-column label="成员" min-width="220">
          <template #default="{ row }">
            <div class="table-title-cell">
              <strong>{{ row.name }}</strong>
              <span>{{ row.image || '未设置图片' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="description" label="描述" min-width="360" show-overflow-tooltip />
        <el-table-column label="操作" width="190" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button size="small" type="danger" plain :icon="Delete" @click="handleDelete(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有名人堂成员" />
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

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="620px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="90px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 3, maxRows: 6 }" />
        </el-form-item>
        <el-form-item label="图片">
          <div class="image-editor">
            <el-radio-group v-model="imageInputMode" size="small">
              <el-radio-button label="upload">上传</el-radio-button>
              <el-radio-button label="link">链接</el-radio-button>
            </el-radio-group>

            <el-upload
              v-if="imageInputMode === 'upload'"
              class="image-uploader"
              action="/api/upload?type=fame_members"
              name="image"
              :headers="uploadHeaders"
              :show-file-list="false"
              :on-success="handleImageSuccess"
              :before-upload="beforeImageUpload"
            >
              <img v-if="form.image" :src="previewImage" class="image" />
              <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
            </el-upload>

            <div v-else class="link-image-editor">
              <el-input v-model="form.image" placeholder="https://... 或 /uploads/..." />
              <img v-if="form.image" :src="previewImage" class="image" alt="" />
            </div>
            <div class="dialog-tip">支持 JPG、PNG、WebP，上传大小不超过 2MB。</div>
          </div>
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
import type { FormInstance, FormRules, UploadProps } from 'element-plus'

interface FameMember {
  id: number
  name: string
  description: string
  image: string
}

const tableData = ref<FameMember[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const imageInputMode = ref<'upload' | 'link'>('upload')
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)
const formRef = ref<FormInstance>()

const form = reactive<Partial<FameMember>>({
  id: undefined,
  name: '',
  description: '',
  image: '',
})

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
}

const dialogTitle = computed(() => (isEditMode.value ? '编辑成员' : '添加成员'))
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})
const previewImage = computed(() => formatImageUrl(form.image))

const formatImageUrl = (src?: string) => src || ''

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  if (!kw) return tableData.value
  return tableData.value.filter((item) =>
    [item.name, item.description].some((value) => String(value || '').toLowerCase().includes(kw)),
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
    const response = await apiClient.get('/fame-members')
    tableData.value = response.data || []
  } catch {
    ElMessage.error('获取名人堂列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(fetchData)

const resetForm = () => {
  Object.assign(form, { id: undefined, name: '', description: '', image: '' })
  imageInputMode.value = 'upload'
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: FameMember) => {
  Object.assign(form, row)
  imageInputMode.value = row.image?.startsWith('http') ? 'link' : 'upload'
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
  try {
    await formRef.value?.validate()
    if (isEditMode.value) {
      await apiClient.put(`/fame-members/${form.id}`, form)
      ElMessage.success('成员已更新')
    } else {
      await apiClient.post('/fame-members', form)
      ElMessage.success('成员已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error: any) {
    if (!error?.fields) ElMessage.error('保存失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这位名人堂成员吗？此操作不可撤销。', '删除成员', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/fame-members/${id}`)
    ElMessage.success('成员已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.image-editor,
.link-image-editor {
  display: grid;
  gap: 10px;
}

.link-image-editor {
  width: 100%;
}

.image-uploader .image,
.link-image-editor .image {
  width: 160px;
  height: 112px;
  display: block;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}
</style>
