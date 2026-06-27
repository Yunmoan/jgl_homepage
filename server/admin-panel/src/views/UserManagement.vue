<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>账号审核</h1>
        <p>统一管理社团申请、内容账号和权限，审核通过后才进入正式成员状态。</p>
      </div>
      <div class="page-actions">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索账号、社团、联系人"
          style="width: 280px"
        />
        <el-button :icon="Plus" type="primary" @click="openCreate">新增账号</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="stat-strip">
        <el-tag effect="plain" type="warning">待审 {{ counts.pending }}</el-tag>
        <el-tag effect="plain" type="success">通过 {{ counts.approved }}</el-tag>
        <el-tag effect="plain" type="danger">驳回 {{ counts.rejected }}</el-tag>
        <el-tag effect="plain" type="info">撤回 {{ counts.withdrawn }}</el-tag>
        <el-tag effect="plain" type="info">禁用 {{ counts.disabled }}</el-tag>
      </div>

      <el-tabs v-model="activeTab" class="tabs" @tab-change="loadData">
        <el-tab-pane label="全部" name="all" />
        <el-tab-pane label="待审" name="pending" />
        <el-tab-pane label="通过" name="approved" />
        <el-tab-pane label="驳回" name="rejected" />
        <el-tab-pane label="撤回" name="withdrawn" />
        <el-tab-pane label="禁用" name="disabled" />
      </el-tabs>

      <el-table :data="filteredData" v-loading="loading" border>
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="username" label="账号" min-width="140" />
        <el-table-column prop="nickname" label="显示名" min-width="120" />
        <el-table-column prop="club_name" label="社团名称" min-width="150" />
        <el-table-column prop="club_logo" label="Logo" min-width="90">
          <template #default="{ row }">
            <img v-if="row.club_logo" :src="row.club_logo" class="club-logo" alt="" />
            <span v-else>-</span>
          </template>
        </el-table-column>
        <el-table-column prop="contact_name" label="联系人" min-width="120" />
        <el-table-column prop="contact_qq" label="联系人QQ" min-width="120" />
        <el-table-column prop="club_group_qq" label="社团群QQ" min-width="120" />
        <el-table-column prop="role" label="角色" min-width="120">
          <template #default="{ row }">
            <el-select v-model="row.role" size="small" style="width: 110px" @change="updateRole(row)">
              <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
            </el-select>
          </template>
        </el-table-column>
        <el-table-column prop="status" label="状态" min-width="110">
          <template #default="{ row }">
            <el-tag :type="statusType(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column prop="created_at" label="创建时间" min-width="180" />
        <el-table-column label="操作" min-width="360" fixed="right">
          <template #default="{ row }">
            <el-button size="small" @click="openEdit(row)">编辑</el-button>
            <el-button size="small" type="warning" @click="openResetPwd(row)">重置密码</el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="success" @click="openReview(row, 'approved')">
              通过
            </el-button>
            <el-button v-if="row.status === 'pending'" size="small" type="danger" @click="openReview(row, 'rejected')">
              驳回
            </el-button>
            <el-button v-if="row.status !== 'disabled'" size="small" type="info" @click="openReview(row, 'disabled')">
              禁用
            </el-button>
            <el-popconfirm title="确认删除该账号吗？" @confirm="remove(row.id)">
              <template #reference>
                <el-button size="small" type="danger" plain>删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
      </el-table>
    </el-card>

    <el-dialog v-model="editorVisible" :title="editorTitle" width="920px">
      <el-form :model="editorForm" label-width="96px">
        <el-form-item label="账号">
          <el-input v-model="editorForm.username" />
        </el-form-item>
        <el-form-item v-if="!editorForm.id" label="密码">
          <el-input v-model="editorForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="显示名">
          <el-input v-model="editorForm.nickname" />
        </el-form-item>
        <ApplicationProfileForm :model-value="editorForm" @update:model-value="Object.assign(editorForm, $event)" />
        <el-form-item label="角色">
          <el-select v-model="editorForm.role" style="width: 100%">
            <el-option v-for="item in roleOptions" :key="item" :label="item" :value="item" />
          </el-select>
        </el-form-item>
        <el-form-item label="状态">
          <el-select v-model="editorForm.status" style="width: 100%">
            <el-option label="pending" value="pending" />
            <el-option label="approved" value="approved" />
            <el-option label="rejected" value="rejected" />
            <el-option label="withdrawn" value="withdrawn" />
            <el-option label="disabled" value="disabled" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveEditor">保存</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="resetVisible" title="重置密码" width="420px">
      <el-form :model="resetForm" label-width="96px">
        <el-form-item label="账号">
          <el-input v-model="resetForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetForm.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认密码">
          <el-input v-model="resetForm.confirm" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="resetVisible = false">取消</el-button>
        <el-button type="primary" @click="submitReset">确定</el-button>
      </template>
    </el-dialog>

    <el-dialog v-model="reviewVisible" :title="reviewTitle" width="460px">
      <el-form :model="reviewForm" label-width="96px">
        <el-form-item label="账号">
          <el-input v-model="reviewForm.username" disabled />
        </el-form-item>
        <el-form-item v-if="reviewForm.status === 'approved'" label="权限组">
          <el-select v-model="reviewForm.role" style="width: 100%">
            <el-option label="成员 member" value="member" />
            <el-option label="编辑 editor" value="editor" />
            <el-option label="管理员 admin" value="admin" />
          </el-select>
        </el-form-item>
        <el-form-item label="审核意见">
          <el-input
            v-model="reviewForm.reviewNote"
            type="textarea"
            :rows="4"
            placeholder="通过可留空；驳回时建议写明原因或修改建议"
          />
        </el-form-item>
      </el-form>
      <template #footer>
        <el-button @click="reviewVisible = false">取消</el-button>
        <el-button :type="reviewButtonType" @click="submitReview">确定</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage } from 'element-plus'
import { Plus, Search } from '@element-plus/icons-vue'
import apiClient from '@/api'
import ApplicationProfileForm from './ApplicationProfileForm.vue'

type Status = 'pending' | 'approved' | 'rejected' | 'disabled' | 'withdrawn'
type Role = 'admin' | 'editor' | 'viewer' | 'member'
type ApplicationProfileFormModel = {
  clubName: string
  clubLogo: string
  clubLink: string
  clubGroupQQ: string
  contactName: string
  contactQQ: string
  applicationReason: string
}

interface UserRow {
  id: number
  username: string
  role: Role
  nickname?: string
  club_name?: string
  club_logo?: string
  club_link?: string
  contact_name?: string
  contact_qq?: string
  club_group_qq?: string
  application_reason?: string
  status: Status
  review_note?: string
  reviewed_by?: number
  reviewed_at?: string
  created_at?: string
  password?: string
}

const roleOptions: Role[] = ['admin', 'editor', 'viewer', 'member']
const loading = ref(false)
const allData = ref<UserRow[]>([])
const activeTab = ref<'all' | Status>('pending')
const keyword = ref('')

const counts = computed(() => {
  const result = { pending: 0, approved: 0, rejected: 0, disabled: 0, withdrawn: 0 }
  allData.value.forEach((item) => {
    result[item.status]++
  })
  return result
})

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return allData.value.filter((item) => {
    if (activeTab.value !== 'all' && item.status !== activeTab.value) return false
    if (!kw) return true
    return [item.username, item.nickname, item.club_name, item.contact_name, item.contact_qq, item.club_group_qq]
      .filter(Boolean)
      .some((value) => String(value).toLowerCase().includes(kw))
  })
})

const loadData = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get<UserRow[]>('/users')
    allData.value = data || []
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '加载账号列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const statusLabel = (status: Status) =>
  ({
    pending: '待审',
    approved: '通过',
    rejected: '驳回',
    disabled: '禁用',
    withdrawn: '撤回',
  })[status]

const statusType = (status: Status) =>
  ({
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
    disabled: 'info',
    withdrawn: 'info',
  })[status] as 'warning' | 'success' | 'danger' | 'info'

const reviewVisible = ref(false)
const reviewForm = reactive({
  id: 0,
  username: '',
  status: 'approved' as 'approved' | 'rejected' | 'disabled',
  role: 'member' as Exclude<Role, 'viewer'>,
  reviewNote: '',
})

const reviewTitle = computed(() => `账号审核 - ${statusLabel(reviewForm.status)}`)
const reviewButtonType = computed(() => {
  if (reviewForm.status === 'approved') return 'success'
  if (reviewForm.status === 'rejected') return 'danger'
  return 'info'
})

const openReview = (row: UserRow, status: 'approved' | 'rejected' | 'disabled') => {
  Object.assign(reviewForm, {
    id: row.id,
    username: row.username,
    status,
    role: status === 'approved' ? ((row.role === 'viewer' ? 'member' : row.role) as Exclude<Role, 'viewer'>) : 'member',
    reviewNote: row.review_note || '',
  })
  reviewVisible.value = true
}

const submitReview = async () => {
  try {
    await apiClient.put(`/users/${reviewForm.id}/review`, {
      status: reviewForm.status,
      role: reviewForm.status === 'approved' ? reviewForm.role : undefined,
      reviewNote: reviewForm.reviewNote,
    })
    ElMessage.success('审核已更新')
    reviewVisible.value = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '更新审核失败')
  }
}

const editorVisible = ref(false)
const editorTitle = computed(() => (editorForm.id ? '编辑账号' : '新增账号'))
const editorForm = reactive<Partial<UserRow> &
  ApplicationProfileFormModel & {
    password: string
    username: string
    nickname: string
    role: Role
    status: Status
  }>({
  id: undefined,
  username: '',
  password: '',
  nickname: '',
  clubName: '',
  clubLogo: '',
  clubLink: '',
  clubGroupQQ: '',
  contactName: '',
  contactQQ: '',
  applicationReason: '',
  role: 'member',
  status: 'pending',
})

const openCreate = () => {
  Object.assign(editorForm, {
    id: undefined,
    username: '',
    password: '',
    nickname: '',
    clubName: '',
    clubLogo: '',
    clubLink: '',
    clubGroupQQ: '',
    contactName: '',
    contactQQ: '',
    applicationReason: '',
    role: 'member',
    status: 'pending',
  })
  editorVisible.value = true
}

const openEdit = (row: UserRow) => {
  Object.assign(editorForm, {
    id: row.id,
    username: row.username,
    password: '',
    nickname: row.nickname || '',
    clubName: row.club_name || '',
    clubLogo: row.club_logo || '',
    clubLink: row.club_link || '',
    clubGroupQQ: row.club_group_qq || '',
    contactName: row.contact_name || '',
    contactQQ: row.contact_qq || '',
    applicationReason: row.application_reason || '',
    role: row.role,
    status: row.status,
  })
  editorVisible.value = true
}

const saveEditor = async () => {
  try {
    if (editorForm.id) {
      await apiClient.put(`/users/${editorForm.id}/profile`, {
        username: editorForm.username,
        nickname: editorForm.nickname,
        clubName: editorForm.clubName,
        clubLogo: editorForm.clubLogo,
        clubLink: editorForm.clubLink,
        clubGroupQQ: editorForm.clubGroupQQ,
        contactName: editorForm.contactName,
        contactQQ: editorForm.contactQQ,
        applicationReason: editorForm.applicationReason,
      })
      await apiClient.put(`/users/${editorForm.id}/role`, { role: editorForm.role })
      if (editorForm.status && editorForm.status !== 'pending') {
        await apiClient.put(`/users/${editorForm.id}/review`, {
          status: editorForm.status,
          role: editorForm.status === 'approved' ? editorForm.role : undefined,
          reviewNote: '管理员手动修改状态',
        })
      }
    } else {
      if (!editorForm.password) {
        ElMessage.error('请填写初始密码')
        return
      }
      await apiClient.post('/users', {
        username: editorForm.username,
        password: editorForm.password,
        role: editorForm.role,
        nickname: editorForm.nickname,
        clubName: editorForm.clubName,
        clubLogo: editorForm.clubLogo,
        clubLink: editorForm.clubLink,
        clubGroupQQ: editorForm.clubGroupQQ,
        contactName: editorForm.contactName,
        contactQQ: editorForm.contactQQ,
        applicationReason: editorForm.applicationReason,
        status: editorForm.status,
      })
    }
    ElMessage.success('保存成功')
    editorVisible.value = false
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

const resetVisible = ref(false)
const resetForm = reactive({ id: 0, username: '', password: '', confirm: '' })

const openResetPwd = (row: UserRow) => {
  resetForm.id = row.id
  resetForm.username = row.username
  resetForm.password = ''
  resetForm.confirm = ''
  resetVisible.value = true
}

const submitReset = async () => {
  if (!resetForm.password) {
    ElMessage.error('请输入新密码')
    return
  }
  if (resetForm.password.length < 6) {
    ElMessage.error('密码至少 6 位')
    return
  }
  if (resetForm.password !== resetForm.confirm) {
    ElMessage.error('两次输入的密码不一致')
    return
  }
  try {
    await apiClient.put(`/users/${resetForm.id}/password`, { newPassword: resetForm.password })
    ElMessage.success('密码已重置')
    resetVisible.value = false
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '重置失败')
  }
}

const updateRole = async (row: UserRow) => {
  try {
    await apiClient.put(`/users/${row.id}/role`, { role: row.role })
    ElMessage.success('角色已更新')
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '角色更新失败')
    await loadData()
  }
}

const remove = async (id: number) => {
  try {
    await apiClient.delete(`/users/${id}`)
    ElMessage.success('已删除')
    await loadData()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '删除失败')
  }
}
</script>

<style scoped>
.page-header {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  align-items: flex-start;
}

.page-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.stat-strip {
  display: flex;
  flex-wrap: wrap;
  gap: 10px;
  margin-bottom: 12px;
}

.tabs {
  margin-bottom: 14px;
}

.club-logo {
  width: 40px;
  height: 40px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}
</style>
