<template>
  <div>
    <div class="controls">
      <h1>留言管理</h1>
      <div>
        <el-button type="primary" @click="handleCreate">新增留言</el-button>
        <el-upload action="/api/messages/import" :headers="{ Authorization: `Bearer ${token}` }"
          :show-file-list="false" :on-success="handleSuccess" :on-error="handleError" :before-upload="beforeUpload"
          style="display: inline-block; margin-left: 10px;">
          <el-button type="info">从 JSON 导入</el-button>
        </el-upload>
      </div>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="author" label="作者" />
      <el-table-column prop="content" label="内容" />
      <el-table-column prop="qq" label="QQ" />
      <el-table-column prop="status" label="状态" width="120">
        <template #default="scope">
          <el-tag :type="statusTag(scope.row.status)">{{ scope.row.status }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" />
      <el-table-column label="操作" width="250">
        <template #default="scope">
          <el-button size="small" type="success" @click="updateStatus(scope.row.id, 'approved')"
            :disabled="scope.row.status === 'approved'">批准</el-button>
          <el-button size="small" type="warning" @click="updateStatus(scope.row.id, 'rejected')"
            :disabled="scope.row.status === 'rejected'">拒绝</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" title="新增留言" width="50%">
      <el-form :model="form" label-width="100px">
        <el-form-item label="作者">
          <el-input v-model="form.author" />
        </el-form-item>
        <el-form-item label="内容">
          <el-input v-model="form.content" type="textarea" />
        </el-form-item>
        <el-form-item label="QQ">
          <el-input v-model="form.qq" />
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
import { ref, onMounted, reactive } from 'vue';
import apiClient from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';
import type { UploadProps } from 'element-plus';

interface Message {
  id: number;
  author: string;
  content: string;
  qq: string;
  status: 'pending' | 'approved' | 'rejected';
  created_at: string;
}

const tableData = ref<Message[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const token = localStorage.getItem('token');

const form = reactive<Partial<Message>>({
  author: '',
  content: '',
  qq: '',
});

const statusTag = (status: Message['status']) => {
  if (status === 'approved') return 'success';
  if (status === 'rejected') return 'danger';
  return 'info';
};

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/messages/all');
    tableData.value = response.data;
  } catch (error) {
    ElMessage.error('获取留言列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetForm = () => {
  Object.assign(form, { author: '', content: '', qq: '' });
};

const handleCreate = () => {
  resetForm();
  dialogVisible.value = true;
};

const handleSave = async () => {
  try {
    await apiClient.post('/messages/add', form);
    ElMessage.success('新增留言成功');
    dialogVisible.value = false;
    fetchData();
  } catch (error) {
    ElMessage.error('保存失败');
  }
};

const updateStatus = async (id: number, status: Message['status']) => {
  try {
    await apiClient.put(`/messages/${id}/status`, { status });
    ElMessage.success(`留言状态已更新为 ${status}`);
    fetchData();
  } catch (error) {
    ElMessage.error('状态更新失败');
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要永久删除这条留言吗？', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await apiClient.delete(`/messages/${id}`);
    ElMessage.success('删除成功');
    fetchData();
  } catch (error: any) {
    if (error !== 'cancel') {
      ElMessage.error('删除失败');
    }
  }
};

// Upload handlers
const handleSuccess: UploadProps['onSuccess'] = (response) => {
  ElMessage.success(response.message || '导入成功');
  fetchData();
};

const handleError: UploadProps['onError'] = (error) => {
  try {
    const response = JSON.parse(error.message);
    ElMessage.error(response.error || '导入失败');
  } catch (e) {
    ElMessage.error('导入失败，请检查文件格式或联系管理员');
  }
};

const beforeUpload: UploadProps['beforeUpload'] = (rawFile) => {
  if (rawFile.type !== 'application/json') {
    ElMessage.error('文件必须是 JSON 格式!');
    return false;
  }
  return true;
};

</script>

<style scoped>
.controls {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}
</style>
