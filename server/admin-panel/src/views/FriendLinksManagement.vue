<template>
  <div>
    <div class="controls">
      <h1>友情链接管理</h1>
      <el-button type="primary" @click="handleCreate">添加链接</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="title" label="标题" />
      <el-table-column prop="logo" label="Logo">
        <template #default="scope">
            <img v-if="scope.row.logo" :src="scope.row.logo" alt="Logo" style="width: 50px; height: 50px; object-fit: cover;" />
        </template>
      </el-table-column>
      <el-table-column prop="url" label="URL" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%">
      <el-form :model="form" label-width="100px">
        <el-form-item label="标题">
          <el-input v-model="form.title" />
        </el-form-item>
        <el-form-item label="Logo">
            <el-upload
                class="image-uploader"
                action="/api/upload?type=friend-links"
                name="image"
                :headers="uploadHeaders"
                :show-file-list="false"
                :on-success="handleImageSuccess"
                :before-upload="beforeImageUpload"
            >
                <img v-if="form.logo" :src="`http://localhost:3000${form.logo}`" class="image" />
                <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
            </el-upload>
        </el-form-item>
        <el-form-item label="URL">
          <el-input v-model="form.url" />
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

interface FriendLink {
  id: number;
  title: string;
  url: string;
  logo?: string;
}

const tableData = ref<FriendLink[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const form = reactive<Partial<FriendLink>>({
  id: undefined,
  title: '',
  url: '',
  logo: '',
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑链接' : '添加链接'));

const uploadHeaders = computed(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
});

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/friend-links');
    tableData.value = response.data;
  } catch (error) {
    ElMessage.error('获取友情链接列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetForm = () => {
  Object.assign(form, { id: undefined, title: '', url: '', logo: '' });
};

const handleCreate = () => {
  resetForm();
  isEditMode.value = false;
  dialogVisible.value = true;
};

const handleEdit = (row: FriendLink) => {
  Object.assign(form, row);
  isEditMode.value = true;
  dialogVisible.value = true;
};

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
    form.logo = response.filePath;
    ElMessage.success('Logo上传成功');
};

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
    const isJpgOrPngOrWebp = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type);
    const isLt2M = rawFile.size / 1024 / 1024 < 2;

    if (!isJpgOrPngOrWebp) {
        ElMessage.error('上传的Logo只能是 JPG, PNG, 或 WEBP 格式!');
        return false;
    }
    if (!isLt2M) {
        ElMessage.error('上传的Logo大小不能超过 2MB!');
        return false;
    }
    return true;
};

const handleSave = async () => {
  try {
    if (isEditMode.value) {
      await apiClient.put(`/friend-links/${form.id}`, form);
      ElMessage.success('更新成功');
    } else {
      await apiClient.post('/friend-links', form);
      ElMessage.success('创建成功');
    }
    dialogVisible.value = false;
    fetchData();
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个链接吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await apiClient.delete(`/friend-links/${id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
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