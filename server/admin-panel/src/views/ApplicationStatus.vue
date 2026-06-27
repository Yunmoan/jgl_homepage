<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>入驻申请</h1>
        <p>这里展示你提交的社团资料。待审、驳回或已撤回时可以修改资料；待审时可以主动撤回。其他设备使用当前账号和密码登录后台即可查询进度。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="loadMe">刷新</el-button>
        <el-button v-if="canEdit" type="primary" @click="openEditor">修改资料</el-button>
        <el-button v-if="me?.status === 'pending'" type="warning" plain @click="withdraw">撤回申请</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never" v-loading="loading">
      <div class="status-head">
        <el-tag :type="statusType(me?.status)" effect="plain">{{ statusLabel(me?.status) }}</el-tag>
        <span v-if="me?.reviewed_at">更新时间：{{ me.reviewed_at }}</span>
      </div>

      <el-alert
        v-if="me?.status === 'pending'"
        title="申请已提交。你可以在后台继续查询审核状态，也可以在管理员处理前撤回或修改资料。"
        type="warning"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="me?.status === 'withdrawn'"
        title="申请已撤回。修改资料并保存后，会重新进入待审核队列。"
        type="info"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="me?.status === 'rejected'"
        :title="me?.review_note ? '申请未通过，请根据审核意见修改资料并重新提交。' : '申请未通过，可以修改资料后重新提交。'"
        type="error"
        :closable="false"
        show-icon
      />
      <el-alert
        v-else-if="me?.status === 'approved'"
        title="申请已通过，你可以继续在 admin.hbutu.cn 登录并使用后台内容管理功能。"
        type="success"
        :closable="false"
        show-icon
      />

      <el-alert
        class="login-note"
        title="后台登录地址：admin.hbutu.cn。换设备查询时，直接使用当前账号和密码登录后台。"
        type="info"
        :closable="false"
        show-icon
      />

      <el-descriptions class="info-block" :column="2" border>
        <el-descriptions-item label="登录账号">{{ me?.username || '-' }}</el-descriptions-item>
        <el-descriptions-item label="社团名称">{{ me?.club_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="社团联系人">{{ me?.contact_name || '-' }}</el-descriptions-item>
        <el-descriptions-item label="联系人 QQ">{{ me?.contact_qq || '-' }}</el-descriptions-item>
        <el-descriptions-item label="社团群 QQ">{{ me?.club_group_qq || '-' }}</el-descriptions-item>
        <el-descriptions-item label="社团链接" :span="2">
          <el-link v-if="me?.club_link" :href="me.club_link" target="_blank" type="primary" :underline="false">
            {{ me.club_link }}
          </el-link>
          <span v-else>-</span>
        </el-descriptions-item>
        <el-descriptions-item label="申请说明" :span="2">
          <div class="pre-line">{{ me?.application_reason || '-' }}</div>
        </el-descriptions-item>
        <el-descriptions-item label="审核意见" :span="2">
          <div class="pre-line">{{ me?.review_note || '-' }}</div>
        </el-descriptions-item>
      </el-descriptions>

      <div v-if="me?.club_logo" class="logo-preview">
        <span>社团 Logo</span>
        <img :src="me.club_logo" alt="" />
      </div>
    </el-card>

    <el-dialog v-model="editorVisible" title="修改申请资料" width="920px">
      <ApplicationProfileForm :model-value="form" @update:model-value="Object.assign(form, $event)" />
      <template #footer>
        <el-button @click="editorVisible = false">取消</el-button>
        <el-button type="primary" @click="saveApplication">保存并提交审核</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Refresh } from '@element-plus/icons-vue'
import apiClient from '@/api'
import ApplicationProfileForm from './ApplicationProfileForm.vue'

interface MeInfo {
  username: string
  status: 'pending' | 'approved' | 'rejected' | 'disabled' | 'withdrawn'
  club_name?: string
  club_logo?: string
  club_link?: string
  club_group_qq?: string
  contact_name?: string
  contact_qq?: string
  application_reason?: string
  review_note?: string
  reviewed_at?: string
}

const loading = ref(false)
const editorVisible = ref(false)
const me = ref<MeInfo | null>(null)
const form = reactive({
  clubName: '',
  clubLogo: '',
  clubLink: '',
  clubGroupQQ: '',
  contactName: '',
  contactQQ: '',
  applicationReason: '',
})

const canEdit = computed(() =>
  me.value?.status === 'pending' || me.value?.status === 'rejected' || me.value?.status === 'withdrawn',
)

const loadMe = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/users/me')
    me.value = data
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '获取申请信息失败')
  } finally {
    loading.value = false
  }
}

onMounted(loadMe)

const openEditor = () => {
  Object.assign(form, {
    clubName: me.value?.club_name || '',
    clubLogo: me.value?.club_logo || '',
    clubLink: me.value?.club_link || '',
    clubGroupQQ: me.value?.club_group_qq || '',
    contactName: me.value?.contact_name || '',
    contactQQ: me.value?.contact_qq || '',
    applicationReason: me.value?.application_reason || '',
  })
  editorVisible.value = true
}

const saveApplication = async () => {
  if (!form.clubName.trim() || !form.contactName.trim()) {
    ElMessage.error('请填写社团名称和联系人')
    return
  }
  try {
    await apiClient.put('/users/me/application', form)
    ElMessage.success('申请资料已保存，当前状态为待审核')
    editorVisible.value = false
    await loadMe()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '保存失败')
  }
}

const withdraw = async () => {
  try {
    await ElMessageBox.confirm('撤回后管理员将不会继续审核；你可以之后修改资料并重新提交。', '撤回申请', {
      confirmButtonText: '撤回',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.put('/users/me/application/withdraw')
    ElMessage.success('申请已撤回')
    await loadMe()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '撤回失败')
    }
  }
}

const statusLabel = (status?: string) => {
  if (status === 'approved') return '已通过'
  if (status === 'rejected') return '已拒绝'
  if (status === 'disabled') return '已禁用'
  if (status === 'withdrawn') return '已撤回'
  return '审核中'
}

const statusType = (status?: string) => {
  if (status === 'approved') return 'success'
  if (status === 'rejected') return 'danger'
  if (status === 'disabled') return 'info'
  if (status === 'withdrawn') return 'info'
  return 'warning'
}
</script>

<style scoped>
.status-head {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 16px;
  color: var(--muted-text);
  font-size: 13px;
}

.info-block {
  margin-top: 16px;
}

.login-note {
  margin-top: 16px;
}

.pre-line {
  white-space: pre-wrap;
  line-height: 1.6;
}

.logo-preview {
  display: flex;
  align-items: center;
  gap: 14px;
  margin-top: 18px;
  color: var(--muted-text);
  font-size: 13px;
}

.logo-preview img {
  width: 88px;
  height: 88px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

</style>
