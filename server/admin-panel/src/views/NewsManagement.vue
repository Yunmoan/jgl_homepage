<template>
  <div class="admin-page">
    <div class="page-header">
      <div class="page-title">
        <h1>新闻管理</h1>
        <p>管理官网新闻、社团投稿和审核状态，支持封面、标签与正文图片。</p>
      </div>
      <div class="page-actions">
        <el-button :icon="Refresh" :loading="loading" @click="fetchNews">刷新</el-button>
        <el-button type="primary" :icon="Plus" @click="openCreate">新建文章</el-button>
      </div>
    </div>

    <el-card class="table-card" shadow="never">
      <div class="filter-bar">
        <el-input
          v-model="keyword"
          clearable
          :prefix-icon="Search"
          placeholder="搜索标题、作者、摘要、提交人"
          style="width: 280px"
        />
        <el-select v-model="statusFilter" placeholder="状态" style="width: 140px">
          <el-option label="全部状态" value="all" />
          <el-option label="待审" value="pending" />
          <el-option label="已通过" value="approved" />
          <el-option label="已驳回" value="rejected" />
        </el-select>
        <el-select v-model="tagFilter" clearable placeholder="标签" style="width: 160px">
          <el-option label="全部标签" value="all" />
          <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
        </el-select>
        <span class="filter-count">共 {{ filteredData.length }} 条，待审 {{ pendingCount }} 条</span>
      </div>

      <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 320px)">
        <el-table-column prop="id" label="ID" width="76" />
        <el-table-column label="标题" min-width="280">
          <template #default="{ row }">
            <div class="table-title-cell">
              <strong>{{ row.title }}</strong>
              <span>{{ row.summary || '暂无摘要' }}</span>
              <div v-if="row.tags.length" class="tag-row">
                <el-tag v-for="tag in row.tags" :key="tag" size="small" effect="plain">{{ tag }}</el-tag>
              </div>
            </div>
          </template>
        </el-table-column>
        <el-table-column prop="author" label="作者" min-width="120" />
        <el-table-column prop="submitter" label="提交人" min-width="120" />
        <el-table-column prop="date" label="发布时间" min-width="170" />
        <el-table-column prop="status" label="状态" width="110">
          <template #default="{ row }">
            <el-tag :type="statusTag(row.status)" effect="plain">{{ statusLabel(row.status) }}</el-tag>
          </template>
        </el-table-column>
        <el-table-column label="操作" width="340" fixed="right">
          <template #default="{ row }">
            <el-button size="small" :icon="Edit" @click="openEdit(row)">编辑</el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="success"
              plain
              :disabled="row.status === 'approved'"
              @click="updateStatus(row.id, 'approved')"
            >
              通过
            </el-button>
            <el-button
              v-if="isAdmin"
              size="small"
              type="warning"
              plain
              :disabled="row.status === 'rejected'"
              @click="updateStatus(row.id, 'rejected')"
            >
              驳回
            </el-button>
            <el-button v-if="isAdmin" size="small" type="danger" plain :icon="Delete" @click="handleDelete(row.id)">
              删除
            </el-button>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="没有符合条件的文章" />
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

    <el-drawer v-model="dialogVisible" :title="dialogTitle" size="min(1240px, 96vw)" class="article-editor-drawer">
      <el-form :model="form" label-width="92px">
        <div class="editor-grid">
          <div class="editor-main">
            <el-form-item label="标题">
              <el-input v-model="form.title" maxlength="120" show-word-limit />
            </el-form-item>
            <el-form-item label="发布时间">
              <el-date-picker
                v-model="form.date"
                type="datetime"
                placeholder="选择发布时间"
                format="YYYY-MM-DD HH:mm:ss"
                value-format="YYYY-MM-DD HH:mm:ss"
              />
            </el-form-item>
            <el-form-item label="作者">
              <el-input v-model="form.author" maxlength="60" show-word-limit />
            </el-form-item>
            <el-form-item label="标签">
              <el-select
                v-model="form.tags"
                multiple
                :multiple-limit="1"
                filterable
                allow-create
                default-first-option
                placeholder="输入或选择一个标签"
                style="width: 100%"
              >
                <el-option v-for="tag in tagOptions" :key="tag" :label="tag" :value="tag" />
              </el-select>
            </el-form-item>
            <el-form-item label="摘要">
              <el-input v-model="form.summary" type="textarea" :rows="3" maxlength="240" show-word-limit />
            </el-form-item>
            <el-form-item label="正文">
              <div class="editor-toolbar">
                <el-upload
                  action="/api/upload?type=news"
                  name="image"
                  :headers="uploadHeaders"
                  :show-file-list="false"
                  :before-upload="beforeImageUpload"
                  :on-success="handleEditorImageSuccess"
                  multiple
                >
                  <el-button :icon="Upload">上传图片</el-button>
                </el-upload>
                <span class="dialog-tip">支持粘贴、拖拽和按钮上传，保存时会自动处理正文中的 base64 图片。</span>
              </div>
              <v-md-editor
                ref="editorRef"
                v-model="form.content"
                height="480px"
                :on-upload-img="handleEditorUpload"
              />
            </el-form-item>
          </div>

          <div class="editor-side">
            <el-form-item label="封面">
              <el-upload
                class="cover-uploader"
                action="/api/upload?type=news"
                name="image"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleCoverSuccess"
                :before-upload="beforeImageUpload"
              >
                <img v-if="form.image" :src="form.image" class="cover-image" alt="" />
                <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
              </el-upload>
            </el-form-item>

            <el-alert
              title="编辑提示"
              type="info"
              :closable="false"
              show-icon
              description="后台允许管理员直接通过或驳回文章；非管理员只能编辑自己提交的内容。"
            />
          </div>
        </div>
      </el-form>

      <template #footer>
        <el-button @click="dialogVisible = false">取消</el-button>
        <el-button type="primary" :loading="saving" @click="saveArticle">保存</el-button>
      </template>
    </el-drawer>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, reactive, ref, watch } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Delete, Edit, Plus, Refresh, Search, Upload } from '@element-plus/icons-vue'
import type { UploadProps } from 'element-plus'
import apiClient from '@/api'

type NewsStatus = 'pending' | 'approved' | 'rejected'
type StatusFilter = NewsStatus | 'all'

interface NewsArticle {
  id: number
  title: string
  date: string
  author: string
  image: string
  summary: string
  content: string
  submitter?: string
  status?: NewsStatus
  tags?: string[] | string | null
}

interface EditorArticle {
  id?: number
  title: string
  date: string
  author: string
  image: string
  summary: string
  content: string
  tags: string[]
}

const tableData = ref<Required<Pick<NewsArticle, 'id' | 'title' | 'date' | 'author' | 'image' | 'summary' | 'content'>> & {
  submitter?: string
  status: NewsStatus
  tags: string[]
}[]>([])
const loading = ref(false)
const saving = ref(false)
const dialogVisible = ref(false)
const isEditMode = ref(false)
const keyword = ref('')
const statusFilter = ref<StatusFilter>('all')
const tagFilter = ref('all')
const currentPage = ref(1)
const pageSize = ref(10)
const me = ref<{ username: string; nickname?: string; role?: string } | null>(null)
const editorRef = ref()

const form = reactive<EditorArticle>({
  id: undefined,
  title: '',
  date: '',
  author: '',
  image: '',
  summary: '',
  content: '',
  tags: [],
})

const isAdmin = computed(() => me.value?.role === 'admin')
const dialogTitle = computed(() => (isEditMode.value ? '编辑文章' : '新建文章'))
const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token')
  return token ? { Authorization: `Bearer ${token}` } : {}
})

const normalizeTags = (value: unknown): string[] => {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean).slice(0, 1)
  }
  if (typeof value === 'string' && value.trim()) {
    try {
      const parsed = JSON.parse(value)
      return normalizeTags(parsed)
    } catch {
      return value
        .split(',')
        .map((item) => item.trim())
        .filter(Boolean)
        .slice(0, 1)
    }
  }
  return []
}

const tagOptions = computed(() => {
  const set = new Set<string>()
  tableData.value.forEach((row) => row.tags.forEach((tag) => set.add(tag)))
  return Array.from(set).sort()
})

const pendingCount = computed(() => tableData.value.filter((item) => item.status === 'pending').length)

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase()
  return tableData.value.filter((item) => {
    const hitKeyword =
      !kw ||
      [item.title, item.author, item.summary, item.submitter]
        .filter(Boolean)
        .some((value) => String(value).toLowerCase().includes(kw))
    const hitStatus = statusFilter.value === 'all' || item.status === statusFilter.value
    const hitTag = tagFilter.value === 'all' || item.tags.includes(tagFilter.value)
    return hitKeyword && hitStatus && hitTag
  })
})

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value
  return filteredData.value.slice(start, start + pageSize.value)
})

watch([keyword, statusFilter, tagFilter], () => {
  currentPage.value = 1
})

const fetchMe = async () => {
  try {
    const { data } = await apiClient.get('/users/me')
    me.value = data
  } catch {
    me.value = null
  }
}

const fetchNews = async () => {
  loading.value = true
  try {
    const { data } = await apiClient.get('/news')
    tableData.value = (data || []).map((row: NewsArticle) => ({
      id: row.id,
      title: row.title,
      date: row.date,
      author: row.author,
      image: row.image,
      summary: row.summary,
      content: row.content,
      submitter: row.submitter,
      status: (row.status || 'approved') as NewsStatus,
      tags: normalizeTags(row.tags),
    }))
  } catch (error) {
    console.error('Failed to fetch news:', error)
    ElMessage.error('获取文章列表失败')
  } finally {
    loading.value = false
  }
}

onMounted(async () => {
  await Promise.all([fetchMe(), fetchNews()])
})

const resetForm = () => {
  Object.assign(form, {
    id: undefined,
    title: '',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    author: me.value?.nickname || me.value?.username || '',
    image: '',
    summary: '',
    content: '',
    tags: [],
  })
}

const openCreate = () => {
  resetForm()
  isEditMode.value = false
  dialogVisible.value = true
}

const openEdit = (row: (typeof tableData.value)[number]) => {
  Object.assign(form, {
    id: row.id,
    title: row.title,
    date: row.date,
    author: row.author,
    image: row.image,
    summary: row.summary,
    content: row.content,
    tags: [...row.tags],
  })
  isEditMode.value = true
  dialogVisible.value = true
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isAllowed = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)
  const isLt2M = rawFile.size / 1024 / 1024 < 2

  if (!isAllowed) {
    ElMessage.error('图片只支持 JPG、PNG、WEBP')
    return false
  }
  if (!isLt2M) {
    ElMessage.error('图片大小不能超过 2MB')
    return false
  }
  return true
}

const handleCoverSuccess: UploadProps['onSuccess'] = (response: any) => {
  form.image = response?.filePath || ''
  ElMessage.success('封面上传成功')
}

const handleEditorImageSuccess: UploadProps['onSuccess'] = (response: any) => {
  const url = response?.filePath
  if (!url) return
  form.content = `${form.content || ''}\n\n![](${url})\n`
  ElMessage.success('图片已插入正文')
}

const handleEditorUpload = async (files: File[], callback: (urls: string[]) => void) => {
  const urls: string[] = []
  for (const file of files) {
    if (!beforeImageUpload(file as any)) continue
    const fd = new FormData()
    fd.append('image', file)
    const res = await apiClient.post('/upload?type=news', fd, {
      headers: { 'Content-Type': 'multipart/form-data' },
    })
    if (res.data?.filePath) {
      urls.push(res.data.filePath)
    }
  }
  callback(urls)
}

const uploadInlineImages = async (content: string): Promise<string> => {
  const matches: string[] = []
  const mdRegex = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g
  const htmlRegex = /<img[^>]+src=["'](data:image\/[^"']+)["'][^>]*>/g

  let match: RegExpExecArray | null
  while ((match = mdRegex.exec(content)) !== null) matches.push(match[1])
  while ((match = htmlRegex.exec(content)) !== null) matches.push(match[1])

  if (!matches.length) return content

  const uploads = await Promise.all(
    matches.map(async (uri) => {
      try {
        const [head, data] = uri.split(',')
        const mime = head.match(/data:(.*?);base64/)?.[1] || 'image/png'
        const bin = atob(data)
        const bytes = new Uint8Array(bin.length)
        for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i)
        const blob = new Blob([bytes], { type: mime })
        const fd = new FormData()
        fd.append('image', blob, `inline-${Date.now()}.png`)
        const res = await apiClient.post('/upload?type=news', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        })
        return { from: uri, to: res.data?.filePath as string }
      } catch {
        return { from: uri, to: '' }
      }
    }),
  )

  let output = content
  uploads.forEach((item) => {
    if (!item.to) return
    const escaped = item.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    output = output.replace(new RegExp(escaped, 'g'), item.to)
  })
  return output
}

const saveArticle = async () => {
  if (!form.title || !form.date || !form.content) {
    ElMessage.error('请填写标题、发布时间和正文')
    return
  }
  saving.value = true
  try {
    const content = await uploadInlineImages(form.content)
    const payload = {
      title: form.title,
      date: form.date,
      author: form.author || me.value?.nickname || me.value?.username || '',
      image: form.image,
      summary: form.summary,
      content,
      tags: form.tags.slice(0, 1),
    }

    if (isEditMode.value && form.id) {
      await apiClient.put(`/news/${form.id}`, payload)
      ElMessage.success('文章已更新')
    } else {
      await apiClient.post('/news', payload)
      ElMessage.success('文章已创建')
    }

    dialogVisible.value = false
    await fetchNews()
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || error?.message || '保存失败')
  } finally {
    saving.value = false
  }
}

const updateStatus = async (id: number, status: NewsStatus) => {
  try {
    await apiClient.put(`/news/${id}/status`, { status })
    const row = tableData.value.find((item) => item.id === id)
    if (row) row.status = status
    ElMessage.success(`文章已${statusLabel(status)}`)
  } catch (error: any) {
    ElMessage.error(error?.response?.data?.error || '更新状态失败')
  }
}

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确认删除这篇文章吗？此操作无法撤销。', '删除文章', {
      confirmButtonText: '删除',
      cancelButtonText: '取消',
      type: 'warning',
    })
    await apiClient.delete(`/news/${id}`)
    ElMessage.success('文章已删除')
    await fetchNews()
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error(error?.response?.data?.error || '删除失败')
    }
  }
}

const statusTag = (status: NewsStatus) =>
  ({
    pending: 'warning',
    approved: 'success',
    rejected: 'danger',
  })[status]

const statusLabel = (status: NewsStatus) =>
  ({
    pending: '待审',
    approved: '已通过',
    rejected: '已驳回',
  })[status]
</script>

<style scoped>
.editor-grid {
  height: calc(100vh - 126px);
  display: grid;
  grid-template-columns: minmax(0, 1fr) 280px;
  gap: 18px;
  min-height: 0;
}

.editor-main {
  min-width: 0;
  overflow: auto;
  padding-right: 4px;
}

.editor-side {
  display: flex;
  flex-direction: column;
  gap: 16px;
  min-width: 0;
}

.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 10px;
}

.table-title-cell {
  display: flex;
  flex-direction: column;
  gap: 4px;
  min-width: 0;
}

.table-title-cell strong {
  font-weight: 600;
}

.table-title-cell span,
.dialog-tip {
  color: var(--muted-text);
  font-size: 12px;
  line-height: 1.5;
}

.tag-row {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
}

.cover-uploader :deep(.el-upload) {
  display: block;
  width: 100%;
}

.cover-image {
  width: 100%;
  height: 220px;
  object-fit: cover;
  border-radius: 6px;
  border: 1px solid var(--el-border-color-lighter);
}

.image-uploader-icon {
  width: 100%;
  height: 220px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  color: var(--muted-text);
  font-size: 28px;
}

@media (max-width: 1100px) {
  .editor-grid {
    height: auto;
    grid-template-columns: 1fr;
  }
}
</style>
