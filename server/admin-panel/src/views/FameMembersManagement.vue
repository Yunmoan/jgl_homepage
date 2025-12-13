<template>
  <div>
    <el-card class="page-card" shadow="hover">
      <div class="controls">
        <h1>名人堂管理</h1>
        <div class="control-actions">
          <el-input v-model="keyword" placeholder="搜索名称/描述" clearable :prefix-icon="Search" style="width: 220px;" />
          <el-button type="primary" @click="handleCreate">添加成员</el-button>
        </div>
      </div>

      <el-table :data="pagedData" v-loading="loading" style="width: 100%">
        <el-table-column prop="id" label="ID" width="80" />
        <el-table-column prop="name" label="名称" min-width="160" />
        <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
        <el-table-column prop="image" label="图片" width="140">
          <template #default="scope">
            <img v-if="scope.row.image" :src="formatImageUrl(scope.row.image)" alt="Image"
              style="width: 100px; height: 64px; object-fit: cover; border-radius: 6px;" />
          </template>
        </el-table-column>
        <el-table-column label="操作" width="200" fixed="right">
          <template #default="scope">
            <el-button size="small" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
            <el-popconfirm title="确定要删除这个成员吗？" confirm-button-text="删除" cancel-button-text="取消"
              @confirm="handleDelete(scope.row.id)">
              <template #reference>
                <el-button size="small" type="danger" :icon="Delete">删除</el-button>
              </template>
            </el-popconfirm>
          </template>
        </el-table-column>
        <template #empty>
          <el-empty description="暂无数据" />
        </template>
      </el-table>

      <div class="table-footer">
        <el-pagination v-model:current-page="currentPage" v-model:page-size="pageSize" :page-sizes="[10, 20, 30, 50]"
          layout="total, sizes, prev, pager, next, jumper" :total="filteredData.length"
          @size-change="() => (currentPage = 1)" />
      </div>
    </el-card>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="520px">
      <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
        <el-form-item label="名称" prop="name">
          <el-input v-model="form.name" placeholder="请输入名称" />
        </el-form-item>
        <el-form-item label="描述" prop="description">
          <v-md-editor v-model="form.description" height="240px" :on-upload-img="handleEditorUpload" />
          <div class="muted" style="margin-top: 6px;">支持 Ctrl+V 粘贴图片或从工具栏上传，图片将自动上传并插入</div>
        </el-form-item>
        <el-form-item label="图片">
          <el-radio-group v-model="imageInputMode" size="small" style="margin-bottom: 8px;">
            <el-radio-button label="upload">上传</el-radio-button>
            <el-radio-button label="link">链接</el-radio-button>
          </el-radio-group>

          <div v-if="imageInputMode === 'upload'">
            <el-upload class="image-uploader" action="/api/upload?type=fame-members" name="image"
              :headers="uploadHeaders" :show-file-list="false" :on-success="handleImageSuccess"
              :before-upload="beforeImageUpload">
              <img v-if="form.image" :src="previewImage" class="image" />
              <el-icon v-else class="image-uploader-icon">
                <Plus />
              </el-icon>
            </el-upload>
            <div class="muted" v-if="!form.image">支持 JPG/PNG/WEBP，2MB 以内</div>
          </div>
          <div v-else>
            <el-input v-model="form.image" placeholder="请输入图片直链（http(s) 或 /uploads/...）" />
            <div v-if="form.image" style="margin-top: 10px;">
              <img :src="previewImage" alt="预览" class="image" />
            </div>
          </div>
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
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';
import type { UploadProps, FormInstance, FormRules } from 'element-plus';

interface FameMember {
  id: number;
  name: string;
  description: string;
  image: string;
}

const tableData = ref<FameMember[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);
const imageInputMode = ref<'upload' | 'link'>('upload');

const keyword = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const formRef = ref<FormInstance>();
const form = reactive<Partial<FameMember>>({
  id: undefined,
  name: '',
  description: '',
  image: '',
});

const rules: FormRules = {
  name: [{ required: true, message: '请输入名称', trigger: 'blur' }],
  // 允许富文本，无强校验；如需限制长度可改为自定义校验函数
};

const dialogTitle = computed(() => (isEditMode.value ? '编辑成员' : '添加成员'));

const uploadHeaders = computed(() => {
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
});

const formatImageUrl = (src?: string) => {
  if (!src) return '';
  // 兼容外链与相对 /uploads 路径
  if (src.startsWith('http://') || src.startsWith('https://')) return src;
  return src; // 直接返回，例如 /uploads/...
};

const previewImage = computed(() => formatImageUrl(form.image));

const filteredData = computed(() => {
  const kw = keyword.value.trim().toLowerCase();
  if (!kw) return tableData.value;
  return tableData.value.filter((item) =>
    (item.name || '').toLowerCase().includes(kw) || (item.description || '').toLowerCase().includes(kw)
  );
});

const pagedData = computed(() => {
  const start = (currentPage.value - 1) * pageSize.value;
  return filteredData.value.slice(start, start + pageSize.value);
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/fame-members');
    tableData.value = response.data;
  } catch (error) {
    ElMessage.error('获取名人堂列表失败');
    console.error('Failed to fetch fame members:', error);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetForm = () => {
  Object.assign(form, { id: undefined, name: '', description: '', image: '' });
  imageInputMode.value = 'upload';
};

const handleCreate = () => {
  resetForm();
  isEditMode.value = false;
  dialogVisible.value = true;
};

const handleEdit = (row: FameMember) => {
  Object.assign(form, row);
  isEditMode.value = true;
  // 根据现有值判断输入模式
  imageInputMode.value = row.image && (row.image.startsWith('http://') || row.image.startsWith('https://'))
    ? 'link'
    : 'upload';
  dialogVisible.value = true;
};

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

// 富文本编辑器 粘贴/上传图片回调
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
      return apiClient.post('/upload?type=fame-members', fd, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    });

    const responses = await Promise.all(uploads);
    const urls = responses
      .map((res) => res.data?.filePath)
      .filter((u: string | undefined): u is string => Boolean(u));
    if (urls.length) {
      callback(urls);
      ElMessage.success('图片已上传并插入描述');
    }
  } catch (e) {
    console.error('Editor image upload failed:', e);
    ElMessage.error('图片上传失败');
  }
};

const handleSave = async () => {
  try {
    await formRef.value?.validate();
    if (isEditMode.value) {
      await apiClient.put(`/fame-members/${form.id}`, form);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post('/fame-members', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    fetchData();
  } catch (error) {
    // 当表单校验失败时，Element 会抛出异常并阻止提交
    if (error) {
      console.error('Failed to save fame member:', error);
      if (!(error as any).fields) {
        ElMessage.error('保存失败');
      }
    }
  }
};

const handleDelete = async (id: number) => {
  try {
    await apiClient.delete(`/fame-members/${id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error) {
    ElMessage.error('删除失败');
  }
};
</script>

<style scoped>
.page-card {
  background: var(--card-bg);
}

.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 14px;
}

.control-actions {
  display: flex;
  align-items: center;
  gap: 10px;
}

.image-uploader .image {
  width: 178px;
  height: 178px;
  display: block;
  object-fit: cover;
}

.table-footer {
  display: flex;
  justify-content: flex-end;
  margin-top: 12px;
}

.muted {
  color: var(--muted-text);
  font-size: 12px;
  margin-top: 6px;
}
</style>

<style>
.image-uploader .el-upload {
  border: 1px dashed var(--el-border-color);
  border-radius: 8px;
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
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
</style>
