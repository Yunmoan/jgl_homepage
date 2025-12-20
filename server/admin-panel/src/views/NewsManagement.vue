<template>
  <div>
    <div class="controls">
      <h1>新闻管理</h1>
      <el-button type="primary" @click="handleCreate">创建新闻</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="author" label="作者" width="150" />
      <el-table-column prop="date" label="日期" width="200" />
      <el-table-column prop="tags" label="标签" width="220">
        <template #default="scope">
          <el-tag v-for="t in (scope.row.tags || [])" :key="t" type="info" size="small"
            style="margin-right:4px;margin-bottom:4px;">{{ t }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="submitter" label="提交人" width="160" />
      <el-table-column prop="status" label="状态" width="140">
        <template #default="scope">
          <el-tag :type="statusType(scope.row.status)">{{ scope.row.status || '—' }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column label="操作" width="320">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
          <template v-if="isAdmin">
            <el-button size="small" type="success" @click="handleSetStatus(scope.row, 'approved')"
              :disabled="scope.row.status === 'approved'">通过</el-button>
            <el-button size="small" type="warning" @click="handleSetStatus(scope.row, 'rejected')"
              :disabled="scope.row.status === 'rejected'">驳回</el-button>
          </template>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="80%">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="作者">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="日期">
          <el-date-picker v-model="form.date" type="datetime" placeholder="选择日期时间" format="YYYY-MM-DD HH:mm:ss"
            value-format="YYYY-MM-DD HH:mm:ss" />
        </el-form-item>
        <el-form-item label="标签">
          <el-select v-model="form.tags" multiple :multiple-limit="1" filterable allow-create default-first-option
            placeholder="仅允许选择1个标签（输入后回车创建）">
            <el-option v-for="opt in tagOptions" :key="opt" :label="opt" :value="opt" />
          </el-select>
        </el-form-item>
        <el-form-item label="图片">
          <el-upload class="image-uploader" action="/api/upload?type=news" name="image" :headers="uploadHeaders"
            :show-file-list="false" :on-success="handleImageSuccess" :before-upload="beforeImageUpload">
            <img v-if="form.image" :src="form.image" class="image" />
            <el-icon v-else class="image-uploader-icon">
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="摘要">
          <el-input v-model="form.summary" type="textarea" />
        </el-form-item>
        <el-form-item label="内容">
          <div style="margin-bottom: 8px; display:flex; align-items:center; gap:10px;">
            <el-upload action="/api/upload?type=news" name="image" :headers="uploadHeaders" :show-file-list="false"
              :before-upload="beforeImageUpload" :on-success="handleEditorImageSuccess" multiple>
              <el-button type="primary">上传图片</el-button>
            </el-upload>
            <span style="color: var(--muted-text); font-size: 12px;">支持 Ctrl+V 粘贴、拖拽 或 点击上传，图片将自动插入内容；不建议粘贴 data:base64
              链接</span>
          </div>
          <v-md-editor ref="editorRef" v-model="form.content" height="400px"
            :on-upload-img="handleEditorUpload"></v-md-editor>
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
import { ref, onMounted, reactive, computed } from 'vue';
import apiClient from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { UploadProps } from 'element-plus';

function parseJwtRole(): string | null {
  try {
    const token = localStorage.getItem('token');
    if (!token) return null;
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const payload = JSON.parse(atob(parts[1].replace(/-/g, '+').replace(/_/g, '/')));
    return payload?.role ?? null;
  } catch {
    return null;
  }
}

interface NewsArticle {
  id: number;
  title: string;
  date: string;
  author: string;
  image: string;
  summary: string;
  content: string;
  submitter?: string;
  status?: 'pending' | 'approved' | 'rejected';
  tags?: string[];
}

const tableData = ref<NewsArticle[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const isAdmin = computed(() => parseJwtRole() === 'admin');

const editorRef = ref();

const form = reactive<Partial<NewsArticle>>({
  id: undefined,
  title: '',
  date: '',
  author: '',
  image: '',
  summary: '',
  content: '',
  tags: [],
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑新闻' : '创建新闻'));

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
});

const fetchNews = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/news');
    tableData.value = (response.data || []).map((r: any) => ({
      ...r,
      tags: Array.isArray(r.tags) ? r.tags : [],
    }));
  } catch (error) {
    ElMessage.error('获取新闻列表失败');
    console.error('Failed to fetch news:', error);
  } finally {
    loading.value = false;
  }
};

const me = ref<{ id: number; username: string; role: string; nickname?: string } | null>(null);
const fetchMe = async () => {
  try {
    const res = await apiClient.get('/users/me');
    me.value = res.data;
  } catch (e) {
    // 忽略未登录等异常（理论上管理台已登录）
    me.value = null;
  }
};

onMounted(() => {
  fetchMe();
  fetchNews();
});

const tagOptions = computed<string[]>(() => {
  const set = new Set<string>();
  for (const r of tableData.value) {
    (r.tags || []).forEach((t: string) => set.add(t));
  }
  return Array.from(set);
});

const resetForm = () => {
  const authorDefault = me.value?.nickname || me.value?.username || '';
  Object.assign(form, {
    id: undefined,
    title: '',
    date: new Date().toISOString().slice(0, 19).replace('T', ' '),
    author: authorDefault,
    image: '',
    summary: '',
    content: '',
    tags: [],
  });
};

const handleCreate = () => {
  resetForm();
  isEditMode.value = false;
  dialogVisible.value = true;
};

const handleEdit = (row: NewsArticle) => {
  Object.assign(form, row);
  form.tags = Array.isArray(row.tags) ? [...row.tags] : [];
  isEditMode.value = true;
  dialogVisible.value = true;
};

const handleImageSuccess: UploadProps['onSuccess'] = (response, uploadFile) => {
  form.image = response.filePath;
  ElMessage.success('图片上传成功');
};

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
  const isJpgOrPngOrWebp = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type);
  const isLt2M = rawFile.size / 1024 / 1024 < 2;

  if (!isJpgOrPngOrWebp) {
    ElMessage.error('上传的图片只能是 JPG, PNG, 或 WEBP 格式!');
    return false;
  }
  if (!isLt2M) {
    ElMessage.error('上传的图片大小不能超过 2MB!');
    return false;
  }
  return true;
};

// 工具栏“上传图片”按钮回调（插入 Markdown 图片到内容）
const handleEditorImageSuccess: UploadProps['onSuccess'] = (response) => {
  const url = response?.filePath;
  if (!url) return;
  const md = `\n\n![](${url})\n\n`;
  form.content = (form.content || '') + md;
  ElMessage.success('图片已上传并插入内容');
};

// 将内容中的 data:image/base64 图片提取上传并替换为 /uploads 链接
const replaceInlineBase64 = async (content: string): Promise<string> => {
  const dataUris: string[] = [];

  // Markdown 语法中的 data URI
  const mdRegex = /!\[[^\]]*\]\((data:image\/[^)]+)\)/g;
  let m: RegExpExecArray | null;
  while ((m = mdRegex.exec(content)) !== null) {
    dataUris.push(m[1]);
  }

  // HTML img 标签中的 data URI
  const htmlRegex = /<img[^>]+src=["'](data:image\/[^"]+)["'][^>]*>/g;
  let h: RegExpExecArray | null;
  while ((h = htmlRegex.exec(content)) !== null) {
    dataUris.push(h[1]);
  }

  if (!dataUris.length) return content;

  const uploads = await Promise.all(
    dataUris.map(async (uri) => {
      try {
        // 将 dataURI 转为 Blob
        const arr = uri.split(',');
        const mime = arr[0].match(/data:(.*?);base64/)?.[1] || 'image/png';
        const bstr = atob(arr[1]);
        let n = bstr.length;
        const u8arr = new Uint8Array(n);
        while (n--) u8arr[n] = bstr.charCodeAt(n);
        const blob = new Blob([u8arr], { type: mime });

        const fd = new FormData();
        fd.append('image', blob, `inline-${Date.now()}.png`);
        const res = await apiClient.post('/upload?type=news', fd, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        return { from: uri, to: res.data?.filePath as string };
      } catch (e) {
        console.error('Upload inline image failed:', e);
        return { from: uri, to: '' };
      }
    })
  );

  let replaced = content;
  for (const u of uploads) {
    if (u.to) {
      const esc = u.from.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
      replaced = replaced.replace(new RegExp(esc, 'g'), u.to);
    }
  }
  return replaced;
};

// v-md-editor 粘贴/拖拽 上传图片回调
const handleEditorUpload = async (files: File[], callback: (urls: string[]) => void) => {
  try {
    const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
    const maxSizeMB = 2;
    const validFiles = files.filter((f) => {
      const okType = validTypes.includes(f.type);
      const okSize = f.size / 1024 / 1024 < maxSizeMB;
      if (!okType) ElMessage.error('粘贴/上传的图片只能是 JPG, PNG, 或 WEBP 格式!');
      if (!okSize) ElMessage.error('粘贴/上传的图片大小不能超过 2MB!');
      return okType && okSize;
    });
    if (!validFiles.length) return;

    const uploads = validFiles.map((file) => {
      const fd = new FormData();
      fd.append('image', file);
      return apiClient.post('/upload?type=news', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    const responses = await Promise.all(uploads);
    const urls = responses
      .map((res) => res.data?.filePath)
      .filter((u: string | undefined): u is string => Boolean(u));
    if (urls.length) {
      callback(urls);
      // 冗余插入：部分版本不会主动插入，做兜底
      const md = urls.map((u) => `\n\n![](${u})\n\n`).join('');
      form.content = (form.content || '') + md;
      ElMessage.success('图片已上传并插入内容');
    }
  } catch (e) {
    console.error('Editor image upload failed:', e);
    ElMessage.error('图片上传失败');
  }
};

const normalizeDateForSave = (input: any) => {
  if (!input) return '';
  // 如果已经是 "YYYY-MM-DD HH:mm:ss" 形式直接返回
  if (typeof input === 'string' && input.includes('-') && input.includes(':') && !input.includes('T')) return input;
  const d = new Date(input);
  if (isNaN(d.getTime())) return typeof input === 'string' ? input : '';
  const pad = (n: number) => String(n).padStart(2, '0');
  const yyyy = d.getFullYear();
  const mm = pad(d.getMonth() + 1);
  const dd = pad(d.getDate());
  const hh = pad(d.getHours());
  const mi = pad(d.getMinutes());
  const ss = pad(d.getSeconds());
  return `${yyyy}-${mm}-${dd} ${hh}:${mi}:${ss}`;
};

const handleSave = async () => {
  try {
    // 提交前，将正文中的 base64 data 图片替换为已上传的 /uploads 链接，避免数据库长度或大小限制导致 500
    if (form.content) {
      form.content = await replaceInlineBase64(form.content as string);
    }
    const payload = { ...form, date: normalizeDateForSave(form.date) };

    if (isEditMode.value) {
      await apiClient.put(`/news/${form.id}`, payload);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post('/news', payload);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    fetchNews();
  } catch (error) {
    ElMessage.error('保存失败');
    console.error('Failed to save news:', error);
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这篇新闻吗？此操作不可撤销。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await apiClient.delete(`/news/${id}`);
    ElMessage.success('删除成功');
    fetchNews();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
      console.error('Failed to delete news:', error);
    }
  }
};

const statusType = (s?: string) => {
  if (s === 'approved') return 'success';
  if (s === 'rejected') return 'danger';
  if (s === 'pending') return 'warning';
  return '';
};

const handleSetStatus = async (row: NewsArticle, status: 'approved' | 'rejected' | 'pending') => {
  try {
    await apiClient.put(`/news/${row.id}/status`, { status });
    row.status = status;
    ElMessage.success('状态已更新');
  } catch (e) {
    ElMessage.error('状态更新失败');
  }
};
</script>

<style scoped>
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.image-uploader .image {
  width: 178px;
  height: 178px;
  display: block;
}
</style>

<style>
.image-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 6px;
  cursor: pointer;
  position: relative;
  overflow: hidden;
  transition: var(--el-transition-duration-fast);
}

.image-uploader .el-upload:hover {
  border-color: var(--el-color-primary);
}

.el-icon.image-uploader-icon {
  font-size: 28px;
  color: #8c939d;
  width: 178px;
  height: 178px;
  text-align: center;
}
</style>
