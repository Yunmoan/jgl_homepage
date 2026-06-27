<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>成员社团</h1>
        <p>维护官网成员社团列表和 Logo，支持按名称或链接搜索。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchData">刷新</el-button>
        <el-button v-if="canCreate" type="primary" :icon="Plus" @click="handleCreate">添加社团</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索名称或链接"
          style="width: 280px"
        />
        <span class="filter-count">共 {{ total }} 个社团</span>
      </div>

      <el-table :data="tableData" v-loading="loading" border height="calc(100vh - 310px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="Logo" width="116">
          <template #default="{ row }">
            <img v-if="row.logo" :src="formatLogoUrl(row.logo)" class="member-logo" alt="" />
          </template>
        </el-table-column>
        <el-table-column prop="name" label="名称" min-width="220" />
        <el-table-column label="归属账号" min-width="160">
          <template #default="{ row }">
            <el-tag v-if="row.owner_label" effect="plain">{{ row.owner_label }}</el-tag>
            <span v-else class="muted">未分配</span>
          </template>
        </el-table-column>
        <el-table-column label="链接" min-width="260">
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
          <el-empty description="没有符合条件的社团" />
        </template>
      </el-table>

      <div class="table-footer">
        <el-pagination
          v-if="!isMember"
          v-model:current-page="currentPage"
          v-model:page-size="pageSize"
          :page-sizes="[10, 18, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper"
          :total="total"
          @current-change="fetchData"
          @size-change="handleSizeChange"
        />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
      <el-form :model="form" label-width="92px">
        <el-form-item label="名称">
          <el-input v-model="form.name" maxlength="80" show-word-limit />
        </el-form-item>
        <el-form-item label="Logo">
          <div class="logo-field">
            <el-upload
              class="image-uploader"
              action="#"
              :show-file-list="false"
              :http-request="uploadLogo"
              :before-upload="beforeLogoUpload"
            >
              <img v-if="form.logo" :src="formatLogoUrl(form.logo)" class="image" />
              <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
            </el-upload>
            <div class="logo-actions">
              <el-button v-if="form.logo" text type="danger" :icon="Delete" @click="form.logo = ''">
                移除 Logo
              </el-button>
              <div class="dialog-tip">支持 JPG、PNG、WebP，上传后会自动处理为圆形 WebP。</div>
            </div>
          </div>
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="form.link" placeholder="https://..." />
        </el-form-item>
        <el-form-item v-if="isAdmin" label="归属账号">
          <el-select
            v-model="form.ownerUserId"
            filterable
            clearable
            placeholder="选择允许自助维护的社团账号"
            style="width: 100%"
          >
            <el-option
              v-for="user in memberUsers"
              :key="user.id"
              :label="userLabel(user)"
              :value="user.id"
            />
          </el-select>
          <div class="dialog-tip">绑定后，该账号可以自行修改此社团的名称、链接和 Logo。</div>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="uploadLoading" @click="handleSave">保存</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, reactive, ref, watch } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search } from '@element-plus/icons-vue'
import type { UploadProps } from 'element-plus'

interface Member {
  id: number
  name: string
  logo: string
  link: string
  owner_user_id?: number | null
  owner_label?: string
  owner_username?: string
  ownerUserId?: number | null
}

interface UserOption {
  id: number
  username: string
  nickname?: string
  club_name?: string
  role: string
  status: string
}

const tableData = ref<Member[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const uploadLoading = ref(false)
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(18)
const total = ref(0)
const memberUsers = ref<UserOption[]>([])
let keywordTimer: number | undefined

const form = reactive<Partial<Member>>({
  id: undefined,
  name: '',
  logo: '',
  link: '',
  ownerUserId: null,
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
const isEditor = computed(() => parseJwtRole() === 'editor')
const isMember = computed(() => parseJwtRole() === 'member')
const canCreate = computed(() => isAdmin.value || isEditor.value)
const dialogTitle = computed(() => (isEditMode.value ? '编辑社团' : '添加社团'))
const formatLogoUrl = (src?: string) => src || ''
const userLabel = (user: UserOption) => {
  const display = user.club_name || user.nickname || user.username
  return `${display}（${user.username}）`
}

const fetchData = async () => {
  loading.value = true
  try {
    if (isMember.value) {
      const response = await apiClient.get('/members/mine')
      const rows = response.data ?? []
      tableData.value = rows
      total.value = rows.length
    } else {
      const response = await apiClient.get('/members', {
        params: {
          page: currentPage.value,
          limit: pageSize.value,
          keyword: keyword.value.trim() || undefined,
        },
      })
      tableData.value = response.data?.data ?? []
      total.value = response.data?.pagination?.total ?? 0
    }
  } catch (error) {
    ElMessage.error('获取社团列表失败')
    tableData.value = []
    total.value = 0
  } finally {
    loading.value = false
  }
}

watch(keyword, () => {
  window.clearTimeout(keywordTimer)
  keywordTimer = window.setTimeout(() => {
    currentPage.value = 1
    fetchData()
  }, 300)
})

const fetchMemberUsers = async () => {
  if (!isAdmin.value) return
  try {
    const { data } = await apiClient.get('/users', { params: { status: 'approved' } })
    memberUsers.value = (data || []).filter((user: UserOption) => user.role === 'member')
  } catch {
    memberUsers.value = []
  }
}

onMounted(() => {
  fetchData()
  fetchMemberUsers()
})
onUnmounted(() => window.clearTimeout(keywordTimer))

const handleSizeChange = () => {
  currentPage.value = 1
  fetchData()
}

const resetForm = () => {
  Object.assign(form, { id: undefined, name: '', logo: '', link: '', ownerUserId: null })
}

const handleCreate = () => {
  if (!canCreate.value) return
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const handleEdit = (row: Member) => {
  Object.assign(form, row, { ownerUserId: row.owner_user_id ?? null })
  isEditMode.value = true
  dialogVisible.value = true
}

const beforeLogoUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (!form.name?.trim()) {
    ElMessage.warning('请先填写社团名称')
    return false
  }
  if (!['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)) {
    ElMessage.error('Logo 只能是 JPG、PNG 或 WebP 格式')
    return false
  }
  if (rawFile.size / 1024 / 1024 >= 5) {
    ElMessage.error('Logo 大小不能超过 5MB')
    return false
  }
  return true
}

const uploadLogo = async (options: any) => {
  uploadLoading.value = true
  try {
    const fd = new FormData()
    fd.append('image', options.file)
    fd.append('memberName', form.name || '未命名')
    const response = await apiClient.post('/members/upload-logo', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    form.logo = response.data.filePath
    options.onSuccess?.(response.data)
    ElMessage.success('Logo 上传成功')
  } catch (error: any) {
    options.onError?.(error)
    ElMessage.error(error?.response?.data?.message || 'Logo 上传失败')
  } finally {
    uploadLoading.value = false
  }
}

const handleSave = async () => {
  if (!form.name) return ElMessage.error('请填写社团名称')

  try {
    if (isEditMode.value) {
      await apiClient.put(`/members/${form.id}`, {
        name: form.name,
        logo: form.logo,
        link: form.link,
        ownerUserId: form.ownerUserId,
      })
      ElMessage.success('社团已更新')
    } else {
      await apiClient.post('/members', {
        name: form.name,
        logo: form.logo,
        link: form.link,
        ownerUserId: form.ownerUserId,
      })
      ElMessage.success('社团已创建')
    }
    dialogVisible.value = false
    fetchData()
  } catch (error) {
    ElMessage.error('保存失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定删除这个社团吗？此操作不可撤销。', '删除社团', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/members/${id}`)
    ElMessage.success('社团已删除')
    fetchData()
  } catch (error: any) {
    if (error !== 'cancel') ElMessage.error('删除失败')
  }
}
</script>

<style scoped>
.member-logo {
  display: block;
  width: 52px;
  height: 52px;
  object-fit: cover;
  border-radius: 50%;
  border: 1px solid var(--el-border-color-lighter);
  background: var(--app-bg);
}

.logo-field {
  display: flex;
  align-items: flex-start;
  gap: 14px;
}

.logo-actions {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding-top: 4px;
}

.image-uploader .image {
  width: 118px;
  height: 118px;
  display: block;
  object-fit: cover;
  border-radius: 50%;
}

.muted {
  color: var(--muted-text);
}
</style>
