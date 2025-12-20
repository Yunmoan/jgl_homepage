<template>
  <div>
    <div class="controls">
      <h1>历史事件管理</h1>
      <el-button type="primary" @click="handleCreate">添加事件</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="date" label="日期" />
      <el-table-column prop="description" label="描述" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-popconfirm title="确定要删除这个事件吗？" confirm-button-text="删除" cancel-button-text="取消"
            @confirm="handleDelete(scope.row.id)">
            <template #reference>
              <el-button size="small" type="danger">删除</el-button>
            </template>
          </el-popconfirm>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="日期">
          <el-input v-model="form.date" />
        </el-form-item>
        <el-form-item label="描述">
          <el-input v-model="form.description" placeholder="请输入描述" />
          <!-- <v-md-editor v-model="form.description" height="300px" :on-upload-img="handleEditorUpload"></v-md-editor>
          <div style="margin-top: 6px; color: var(--muted-text); font-size: 12px;">支持 Ctrl+V 粘贴图片或从工具栏上传，图片将自动上传并插入</div> -->
        </el-form-item>
        <el-form-item label="图片">
          <el-upload class="image-uploader" action="/api/upload?type=pictures" name="image" :headers="uploadHeaders"
            :show-file-list="false" :on-success="handleImageSuccess" :before-upload="beforeImageUpload">
            <img v-if="form.image" :src="form.image" class="image" />
            <el-icon v-else class="image-uploader-icon">
              <Plus />
            </el-icon>
          </el-upload>
        </el-form-item>
        <el-form-item label="链接">
          <el-input v-model="form.link" />
        </el-form-item>
        <el-form-item label="弹窗数据 (JSON)">
          <el-input v-model="form.dialog_data" type="textarea" />
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
import { ElMessage } from 'element-plus';
import { Plus } from '@element-plus/icons-vue';
import type { UploadProps } from 'element-plus';

interface HistoryEvent {
  id: number;
  title: string;
  date: string;
  description: string;
  image: string;
  link: string;
  dialog_data: any;
}

const tableData = ref<HistoryEvent[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const form = reactive<Partial<HistoryEvent>>({
  id: undefined,
  title: '',
  date: '',
  description: '',
  image: '',
  link: '',
  dialog_data: '{}',
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑事件' : '添加事件'));

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
});

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
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

// v-md-editor 粘贴/工具栏上传图片回调
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
      return apiClient.post('/upload?type=history', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    const responses = await Promise.all(uploads);
    const urls = responses
      .map((res) => res.data?.filePath)
      .filter((u: string | undefined): u is string => Boolean(u));
    if (urls.length) {
      callback(urls);
      ElMessage.success('图片已上传并插入内容');
    }
  } catch (e) {
    console.error('Editor image upload failed:', e);
    ElMessage.error('图片上传失败');
  }
};

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/history');
    tableData.value = response.data.map(item => ({
      ...item,
      dialog_data: JSON.stringify(item.dialog_data, null, 2) // Pretty print JSON for editing
    }));
  } catch (error) {
    ElMessage.error('获取历史事件列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetForm = () => {
  Object.assign(form, { id: undefined, title: '', date: '', description: '', image: '', link: '', dialog_data: '{}' });
};

const handleCreate = () => {
  resetForm();
  isEditMode.value = false;
  dialogVisible.value = true;
};

const handleEdit = (row: HistoryEvent) => {
  Object.assign(form, row);
  isEditMode.value = true;
  dialogVisible.value = true;
};

const handleSave = async () => {
  try {
    const payload = { ...form, dialog_data: JSON.parse(form.dialog_data as string) };
    if (isEditMode.value) {
      await apiClient.put(`/history/${form.id}`, payload);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post('/history', payload);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    fetchData();
  } catch (error) {
    ElMessage.error('保存失败，请检查弹窗数据是否为有效的JSON');
  }
};

const handleDelete = async (id: number) => {
  try {
    await apiClient.delete(`/history/${id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    ElMessage.error('删除失败');
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
