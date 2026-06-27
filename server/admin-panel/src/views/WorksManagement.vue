<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>作品管理</h1>
        <p>维护社团作品展示，管理员可控制精选状态。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="handleCreate">添加作品</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题、描述、社团"
          style="width: 280px"
        />
        <el-select v-model="clubFilter" placeholder="社团" clearable style="width: 180px">
          <el-option label="全部社团" value="all" />
          <el-option v-for="club in clubOptions" :key="club" :label="club" :value="club" />
        </el-select>
        <el-select v-model="statusFilter" placeholder="状态" style="width: 140px">
          <el-option label="全部状态" value="all" />
          <el-option label="待审" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-select v-model="featuredFilter" placeholder="精选" style="width: 140px">
          <el-option label="全部作品" value="all" />
          <el-option label="仅精选" value="featured" />
          <el-option label="未精选" value="normal" />
        </el-select>
        <span class="filter-count">共 {{ filteredData.length }} 条，待审 {{ pendingCount }} 条，精选 {{ featuredCount }} 条</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="封面" width="108">
          <template #default="{ row }">
            <img v-if="row.imageUrl" :src="formatImageUrl(row.imageUrl)" class="table-image-thumb" alt="" />
          </template>
        </el-table-column>
        <el-table-column label="作品" min-width="280">
          <template #default="{ row }">
            <div class="table-title-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.description || '暂无描述' }}</span>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="club" label="社团" min-width="140" />
        <el-table-column prop="submitter" label="提交人" min-width="120" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="链接" min-width="180">
          <template #default="{ row }">
            <el-link v-if="row.link" :href="row.link" target="_blank" type="primary" :underline="false">
              打开
            </el-link>
            <span v-else class="muted">未填写</span>
          </template>
        </el-table-column>
        <el-table-column label="精选" width="110">
          <template #default="{ row }">
            <el-switch
              :model-value="isFeatured(row.featured)"
              :disabled="!isAdmin"
              @change="(value: boolean) => handleToggleFeatured(row, value)"
            />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="handleEdit(row)">编辑</el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="success"
              plain
              :disabled="row.status === 'approved'"
              @click="updateStatus(row, 'approved')"
            >
              通过
            </el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="warning"
              plain
              :disabled="row.status === 'rejected'"
              @click="updateStatus(row, 'rejected')"
            >
              驳回
            </el-button>
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
          <el-empty description="没有符合条件的作品" />
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

    <el-drawer v-model="dialogVisible" :title="dialogTitle" size="min(760px, 96vw)" class="work-editor-drawer">
      <el-form :model="form" label-width="92px">
        <el-form-item label="标题">
          <el-input v-model="form.title" maxlength="100" show-word-limit />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" type="textarea" :rows="4" maxlength="300" show-word-limit />
        </el-form-item>
        <el-form-item label="封面">
          <el-upload
            class="image-uploader"
            action="/api/upload?type=works"
            name="image"
            :headers="uploadHeaders"
            :show-file-list="false"
            :on-success="handleImageSuccess"
            :before-upload="beforeImageUpload"
          >
            <img v-if="form.imageUrl" :src="previewImage" class="image" />
            <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="form.link" placeholder="https://..." />
        </el-form-item>
        <el-form-item label="社团">
          <el-select
            v-if="isMember"
            v-model="form.club"
            placeholder="选择绑定社团或输入社团"
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
          >
            <el-option v-for="club in ownedClubs" :key="club.id" :label="club.name" :value="club.name" />
          </el-select>
          <el-select
            v-else
            v-model="form.club"
            placeholder="选择或输入社团"
            filterable
            allow-create
            default-first-option
            clearable
            style="width: 100%"
          >
            <el-option v-for="club in clubOptions" :key="club" :label="club" :value="club" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isAdmin" label="审核状态">
          <el-select v-model="form.status" style="width: 100%">
            <el-option label="待审" value="pending" />
            <el-option label="已通过" value="approved" />
            <el-option label="已驳回" value="rejected" />
          </el-select>
        </el-form-item>
        <el-form-item v-if="isAdmin" label="精选">
          <el-switch v-model="form.featured" />
        </el-form-item>
        <el-alert
          v-else
          title="作品保存后需要管理员审核，通过后才会展示在前台。"
          type="info"
          :closable="false"
          show-icon
        />
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" @click="handleSave">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { UploadProps } from 'element-plus'

type FeaturedFilter = 'all' | 'featured' | 'normal'
type WorkStatus = 'pending' | 'approved' | 'rejected'
type StatusFilter = 'all' | WorkStatus

interface Work {
  id: number
  title: string
  description: string
  imageUrl: string
  link: string
  club?: string
  featured?: number | boolean | string
  status?: WorkStatus
  submitter?: string
}

interface OwnedClub {
  id: number
  name: string
}

const tableData = ref<Work[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const keyword = ref('')
const clubFilter = ref('all')
const statusFilter = ref<StatusFilter>('all')
const featuredFilter = ref<FeaturedFilter>('all')
const currentPage = ref(1)
const pageSize = ref(10)
const ownedClubs = ref<OwnedClub[]>([])

const form = reactive<Partial<Work>>({
  id: undefined,
  title: '',
  description: '',
  imageUrl: '',
  link: '',
  club: '',
  featured: false,
  status: 'pending',
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

const currentRole = computed(() => parseJwtRole())
const isAdmin = computed(() => currentRole.value === 'admin')
const isMember = computed(() => currentRole.value === 'member')
const dialogTitle = computed(() => (isEditMode.value ? '编辑作品' : '添加作品'))
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const isFeatured = (value: Work['featured']) => value === true || value === 1 || value === '1'
const formatImageUrl = (src?: string) => src || ''
const previewImage = computed(() => formatImageUrl(form.imageUrl))
const defaultOwnedClubName = computed(() => ownedClubs.value[0]?.name || '')

const clubOptions = computed(() => {
  const set = new Set<string>()
  ownedClubs.value.forEach((club) => {
    if (club.name) set.add(club.name)
  })
  tableData.value.forEach((work) => {
    if (work.club) set.add(work.club)
  })
  return Array.from(set).sort()
})

const featuredCount = computed(() => tableData.value.filter((item) => isFeatured(item.featured)).length)
const pendingCount = computed(() => tableData.value.filter((item) => item.status === 'pending').length)

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tableData.value.filter((item) => {
    const hitKeyword =
      !kw ||
      [item.title, item.description, item.club, item.submitter]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(kw))
    const hitClub = clubFilter.value === 'all' || item.club === clubFilter.value
    const hitStatus = statusFilter.value === 'all' || item.status === statusFilter.value
    const featured = isFeatured(item.featured)
    const hitFeatured =
      featuredFilter.value === 'all' ||
      (featuredFilter.value === 'featured' && featured) ||
      (featuredFilter.value === 'normal' && !featured)
    return hitKeyword && hitClub && hitStatus && hitFeatured
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch([keyword, clubFilter, statusFilter, featuredFilter], () => {
  currentPage.value = 1
})

const fetchData = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/works')
    tableData.value = data || []
  } catch (error) {
    ElMessage.error('获取作品列表失败')
  } finally {
    loading.value = false
  }
}

const fetchOwnedClubs = async () => {
  if (!isMember.value) return
  try {
    const { data } = await apiClient.get('/members/mine')
    ownedClubs.value = Array.isArray(data) ? data : []
  } catch (error) {
    ownedClubs.value = []
  }
}

onMounted(async () => {
  await Promise.all([fetchOwnedClubs(), fetchData()])
})

const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    title: '',
    description: '',
    imageUrl: '',
    link: '',
    club: isMember.value ? defaultOwnedClubName.value : '',
    featured: false,
    status: isAdmin.value ? 'approved' : 'pending',
  })
}

const handleCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: Work) => {
  Object.assign(form, row, {
    club: row.club || (isMember.value ? defaultOwnedClubName.value : ''),
    featured: isFeatured(row.featured),
    status: row.status || 'pending',
  })
  isEditMode.value = true
  dialogVisible.value = true
}

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
  form.imageUrl = response.filePath
  ElMessage.success('封面上传成功')
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isAllowedType = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)
  const isLt2M = rawFile.size / 1024 / 1024 < 2

  if (!isAllowedType) {
    ElMessage.error('封面只能是 JPG、PNG 或 WEBP 格式')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('封面大小不能超过 2MB')
    return false
  }
  return true
}

const handleSave = async () => {
  if (!form.title) return ElMessage.error('请填写作品标题')
  if (!form.club) return ElMessage.error('请选择或填写社团')

  try {
    const payload = {
      ...form,
      club: form.club,
      featured: form.featured ? 1 : 0,
    }
    if (isEditMode.value) {
      await apiClient.put(`/works/${form.id}`, payload)
      ElMessage.success(isAdmin.value ? '作品已更新' : '作品已更新，等待审核')
    } else {
      await apiClient.post('/works', payload)
      ElMessage.success(isAdmin.value ? '作品已创建' : '作品已提交审核')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const updateStatus = async (row: Work, status: WorkStatus) => {
  try {
    await apiClient.put(`/works/${row.id}/status`, { status })
    row.status = status
    ElMessage.success(`作品已${statusLabel(status)}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '审核状态更新失败')
  }
}

const handleToggleFeatured = async (row: Work, value: boolean) => {
  try {
    await apiClient.put(`/works/${row.id}/featured`, { featured: value })
    row.featured = value
    ElMessage.success(value ? '已设为精选' : '已取消精选')
  } catch (error) {
    ElMessage.error('精选状态更新失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个作品吗？此操作不可撤销。', '删除作品', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/works/${id}`)
    ElMessage.success('作品已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}

const statusTag = (status?: WorkStatus) =>
  ({
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  })[status || 'pending']

const statusLabel = (status?: WorkStatus) =>
  ({
    pending: '待审',
    approved: '已通过',
    rejected: '已驳回',
  })[status || 'pending']
</script>

<style scoped>
.image-uploader .image {
  width: 220px;
  height: 146px;
  display: block;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--el-border-color-lighter);
}

.muted {
  color: var(--muted-text);
}
</style>
