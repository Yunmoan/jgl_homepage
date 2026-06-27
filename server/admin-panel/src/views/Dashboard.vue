<template>
  <div class="dashboard-page">
    <div class="controls">
      <div>
        <h1>{{ isAdmin ? '概览' : '工作台' }}</h1>
        <p class="subtitle">{{ subtitle }}</p>
      </div>
      <div class="control-actions">
        <el-button :icon="Refresh" @click="loadData" :loading="loading">刷新</el-button>
        <el-button v-if="isAdmin" type="primary" :icon="UserFilled" @click="router.push('/admin/users')">账号审核</el-button>
        <el-button v-else type="primary" :icon="Document" @click="router.push('/admin/news')">发布内容</el-button>
      </div>
    </div>

    <el-row :gutter="16">
      <el-col :xs="24" :sm="12" :lg="6" v-for="item in metrics" :key="item.label">
        <el-card class="metric-card" shadow="never">
          <div class="metric-label">{{ item.label }}</div>
          <div class="metric-value">{{ item.value }}</div>
          <div class="metric-sub">{{ item.sub }}</div>
        </el-card>
      </el-col>
    </el-row>

    <template v-if="isAdmin">
      <el-row :gutter="16" class="panel-row">
        <el-col :xs="24" :lg="14">
          <el-card class="panel" shadow="never">
            <template #header>
              <div class="panel-header">
                <span>待审核账号</span>
                <el-tag type="warning" effect="plain">{{ pendingUsers }}</el-tag>
              </div>
            </template>

            <el-table :data="pendingList" v-loading="loading" border height="360">
              <el-table-column prop="username" label="账号" min-width="140" />
              <el-table-column prop="club_name" label="社团" min-width="140" />
              <el-table-column prop="contact_name" label="联系人" min-width="120" />
              <el-table-column prop="contact_qq" label="QQ" min-width="120" />
              <el-table-column prop="created_at" label="提交时间" min-width="180" />
            </el-table>
          </el-card>
        </el-col>

        <el-col :xs="24" :lg="10">
          <el-card class="panel" shadow="never">
            <template #header>
              <div class="panel-header">
                <span>服务器状态</span>
                <el-tag type="info" effect="plain">实时</el-tag>
              </div>
            </template>

            <div class="health-item">
              <div class="health-label">CPU</div>
              <el-progress :percentage="cpuUsage" :stroke-width="10" />
            </div>
            <div class="health-item">
              <div class="health-label">内存</div>
              <el-progress :percentage="memoryUsage" :stroke-width="10" />
            </div>
            <div class="health-list">
              <div><span>1 分钟负载</span><b>{{ loadAvg[0] ?? 'N/A' }}</b></div>
              <div><span>5 分钟负载</span><b>{{ loadAvg[1] ?? 'N/A' }}</b></div>
              <div><span>15 分钟负载</span><b>{{ loadAvg[2] ?? 'N/A' }}</b></div>
              <div><span>运行时长</span><b>{{ uptimeText }}</b></div>
            </div>
          </el-card>
        </el-col>
      </el-row>
    </template>

    <el-row v-else :gutter="16" class="panel-row">
      <el-col :xs="24" :lg="14">
        <el-card class="panel" shadow="never">
          <template #header>
            <div class="panel-header">
              <span>{{ isMember ? '我的社团' : '内容概况' }}</span>
              <el-tag effect="plain">{{ roleLabel }}</el-tag>
            </div>
          </template>
          <div v-if="isMember && myMembers.length" class="member-list">
            <div v-for="item in myMembers" :key="item.id" class="member-item">
              <img v-if="item.logo" :src="item.logo" alt="" />
              <div v-else class="member-logo">社</div>
              <div>
                <strong>{{ item.name }}</strong>
                <a v-if="item.link" :href="item.link" target="_blank" rel="noreferrer">{{ item.link }}</a>
                <span v-else>未设置社团链接</span>
              </div>
            </div>
          </div>
          <el-empty v-else-if="isMember" description="暂未绑定社团资料" />
          <div v-else class="content-summary">
            <div><span>全部新闻</span><b>{{ formatNumber(totalNews) }}</b></div>
            <div><span>待审新闻</span><b>{{ formatNumber(pendingNews) }}</b></div>
            <div><span>全部作品</span><b>{{ formatNumber(totalWorks) }}</b></div>
            <div><span>精选作品</span><b>{{ formatNumber(featuredWorks) }}</b></div>
          </div>
        </el-card>
      </el-col>

      <el-col :xs="24" :lg="10">
        <el-card class="panel" shadow="never">
          <template #header>
            <div class="panel-header">
              <span>站点访问</span>
              <el-tag type="success" effect="plain">真实统计</el-tag>
            </div>
          </template>
          <div class="traffic-list">
            <div><span>今日访问</span><b>{{ formatNumber(todayViews) }}</b></div>
            <div><span>近 7 天访问</span><b>{{ formatNumber(weekViews) }}</b></div>
            <div><span>近 7 天访客</span><b>{{ formatNumber(uniqueVisitors7d) }}</b></div>
          </div>
        </el-card>
      </el-col>
    </el-row>

    <el-card class="panel" shadow="never">
      <template #header>
        <div class="panel-header">
          <span>{{ isAdmin ? '访问排行' : '快捷入口' }}</span>
        </div>
      </template>
      <div v-if="isAdmin" class="top-pages">
        <div v-for="item in topPages" :key="item.path">
          <span>{{ item.path }}</span>
          <b>{{ formatNumber(item.views) }}</b>
        </div>
        <el-empty v-if="!topPages.length" description="暂无访问数据" />
      </div>
      <div v-else class="shortcut-grid">
        <el-button :icon="Document" @click="router.push('/admin/news')">新闻</el-button>
        <el-button :icon="Tickets" @click="router.push('/admin/works')">作品</el-button>
        <el-button v-if="isMember" :icon="UserFilled" @click="router.push('/admin/system-info')">账号资料</el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'
import apiClient from '@/api'
import { Refresh, UserFilled, Document, Tickets } from '@element-plus/icons-vue'

interface DashboardPayload {
  role?: 'admin' | 'editor' | 'member'
  users?: { total_users?: number; pending_users?: number }
  news?: { total_news?: number; pending_news?: number; approved_news?: number }
  messages?: { pending_messages?: number; total_messages?: number }
  works?: { total_works?: number; featured_works?: number }
  members?: { total_members?: number }
  analytics?: { total_views?: number; today_views?: number; week_views?: number; unique_visitors_7d?: number }
  pendingUsers?: Array<Record<string, any>>
  topPages?: Array<{ path: string; views: number }>
  mine?: {
    news?: { total_news?: number; pending_news?: number; approved_news?: number; rejected_news?: number }
    works?: { total_works?: number; featured_works?: number }
    members?: Array<{ id: number; name: string; logo?: string; link?: string }>
  }
  server?: { uptime?: number; loadavg?: number[]; totalmem?: number; freemem?: number; cpu_usage?: number }
}

const router = useRouter()
const loading = ref(false)
const data = reactive<DashboardPayload>({})

const loadData = async () => {
  loading.value = true
  try {
    const { data: payload } = await apiClient.get<DashboardPayload>('/system/dashboard')
    Object.assign(data, payload)
  } finally {
    loading.value = false
  }
}

onMounted(loadData)

const role = computed(() => data.role || 'member')
const isAdmin = computed(() => role.value === 'admin')
const isMember = computed(() => role.value === 'member')
const roleLabel = computed(() => ({ admin: '管理员', editor: '编辑', member: '成员' })[role.value] || role.value)
const subtitle = computed(() =>
  isAdmin.value ? '先看审核队列，再看站点访问、内容和机器状态。' : '查看自己的内容、社团资料和站点访问概况。',
)

const formatNumber = (value: unknown) => Number(value || 0).toLocaleString('zh-CN')
const totalUsers = computed(() => Number(data.users?.total_users ?? 0))
const pendingUsers = computed(() => Number(data.users?.pending_users ?? 0))
const pendingContent = computed(() => Number(data.news?.pending_news ?? 0) + Number(data.messages?.pending_messages ?? 0))
const totalNews = computed(() => Number((isAdmin.value ? data.news : data.mine?.news)?.total_news ?? 0))
const pendingNews = computed(() => Number((isAdmin.value ? data.news : data.mine?.news)?.pending_news ?? 0))
const totalWorks = computed(() => Number((isAdmin.value ? data.works : data.mine?.works)?.total_works ?? 0))
const featuredWorks = computed(() => Number((isAdmin.value ? data.works : data.mine?.works)?.featured_works ?? 0))
const totalMembers = computed(() => Number(data.members?.total_members ?? 0))
const totalViews = computed(() => Number(data.analytics?.total_views ?? 0))
const todayViews = computed(() => Number(data.analytics?.today_views ?? 0))
const weekViews = computed(() => Number(data.analytics?.week_views ?? 0))
const uniqueVisitors7d = computed(() => Number(data.analytics?.unique_visitors_7d ?? 0))
const pendingList = computed(() => data.pendingUsers ?? [])
const topPages = computed(() => data.topPages ?? [])
const myMembers = computed(() => data.mine?.members ?? [])
const loadAvg = computed(() => data.server?.loadavg ?? [])
const cpuUsage = computed(() => data.server?.cpu_usage ?? 0)
const memoryUsage = computed(() => {
  const total = data.server?.totalmem ?? 0
  const free = data.server?.freemem ?? 0
  return total ? Math.round(((total - free) / total) * 100) : 0
})
const uptimeText = computed(() => {
  const sec = Math.floor(data.server?.uptime ?? 0)
  const h = Math.floor(sec / 3600)
  const m = Math.floor((sec % 3600) / 60)
  return `${h}h ${m}m`
})

const metrics = computed(() => {
  if (isAdmin.value) {
    return [
      { label: '待审核账号', value: formatNumber(pendingUsers.value), sub: '申请中的社团/成员' },
      { label: '今日访问', value: formatNumber(todayViews.value), sub: '来自前台页面埋点' },
      { label: '待审内容', value: formatNumber(pendingContent.value), sub: '新闻与留言待处理' },
      { label: '精选作品', value: formatNumber(featuredWorks.value), sub: '当前精选数量' },
    ]
  }
  return [
    { label: isMember.value ? '我的社团' : '成员社团', value: formatNumber(isMember.value ? myMembers.value.length : totalMembers.value), sub: isMember.value ? '已绑定资料' : '当前展示数量' },
    { label: '我的新闻', value: formatNumber(totalNews.value), sub: `${formatNumber(pendingNews.value)} 条待审` },
    { label: '我的作品', value: formatNumber(totalWorks.value), sub: `${formatNumber(featuredWorks.value)} 条精选` },
    { label: '近 7 天访问', value: formatNumber(weekViews.value), sub: `总访问 ${formatNumber(totalViews.value)}` },
  ]
})
</script>

<style scoped>
.dashboard-page {
  display: flex;
  flex-direction: column;
  gap: 16px;
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 16px;
}

.controls h1 {
  margin: 0;
  font-size: 18px;
}

.subtitle {
  margin: 6px 0 0;
  font-size: 13px;
  color: var(--muted-text);
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.metric-card,
.panel {
  border: 1px solid var(--el-border-color-lighter);
  background: var(--card-bg);
}

.metric-card {
  min-height: 128px;
  margin-bottom: 16px;
}

.metric-label {
  color: var(--muted-text);
  font-size: 13px;
}

.metric-value {
  margin-top: 10px;
  font-size: 30px;
  font-weight: 700;
  line-height: 1;
}

.metric-sub {
  margin-top: 8px;
  color: var(--muted-text);
  font-size: 12px;
}

.panel-row {
  margin-top: 0;
}

.panel-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.health-item {
  margin-bottom: 16px;
}

.health-label {
  margin-bottom: 8px;
  font-size: 13px;
  color: var(--muted-text);
}

.health-list,
.traffic-list,
.content-summary,
.top-pages {
  display: grid;
  gap: 10px;
}

.health-list div,
.traffic-list div,
.content-summary div,
.top-pages div {
  display: flex;
  justify-content: space-between;
  gap: 16px;
  font-size: 13px;
}

.top-pages span {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.member-list {
  display: grid;
  gap: 12px;
}

.member-item {
  display: grid;
  grid-template-columns: 44px 1fr;
  gap: 12px;
  align-items: center;
}

.member-item img,
.member-logo {
  width: 44px;
  height: 44px;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.member-item img {
  object-fit: cover;
}

.member-logo {
  display: grid;
  place-items: center;
  color: var(--muted-text);
  background: var(--el-fill-color-light);
}

.member-item strong,
.member-item span,
.member-item a {
  display: block;
  min-width: 0;
}

.member-item a,
.member-item span {
  margin-top: 4px;
  color: var(--muted-text);
  font-size: 12px;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.shortcut-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}
</style>
