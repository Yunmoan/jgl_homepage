<template>
  <div>
    <div class="controls">
      <h1>用户管理</h1>
      <el-button type="primary" @click="handleCreate">创建用户</el-button>
    </div>

    <el-table :data="tableData" v-loading="loading" style="width: 100%">
      <el-table-column prop="id" label="ID" width="80" />
      <el-table-column prop="username" label="用户名" />
      <el-table-column prop="role" label="角色">
        <template #default="scope">
          <el-tag>{{ scope.row.role }}</el-tag>
        </template>
      </el-table-column>
      <el-table-column prop="created_at" label="创建时间" />
      <el-table-column label="操作" width="300">
        <template #default="scope">
          <el-button size="small" @click="handleEdit(scope.row)">修改角色</el-button>
          <el-button size="small" type="warning" @click="openResetPwd(scope.row)">重置密码</el-button>
          <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%">
      <el-form :model="form" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="form.username" :disabled="isEditMode" />
        </el-form-item>
        <el-form-item v-if="!isEditMode" label="密码">
          <el-input v-model="form.password" type="password" show-password />
        </el-form-item>
        <el-form-item label="角色">
          <el-select v-model="form.role" placeholder="请选择角色">
            <el-option label="Admin" value="admin" />
            <el-option label="Editor" value="editor" />
            <el-option label="Viewer" value="viewer" />
          </el-select>
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="dialogVisible = false">取消</el-button>
          <el-button type="primary" @click="handleSave">保存</el-button>
        </span>
      </template>
    </el-dialog>

    <el-dialog v-model="resetPwdVisible" title="重置密码" width="420px">
      <el-form :model="resetPwdForm" label-width="100px">
        <el-form-item label="用户名">
          <el-input v-model="resetPwdForm.username" disabled />
        </el-form-item>
        <el-form-item label="新密码">
          <el-input v-model="resetPwdForm.newPassword" type="password" show-password />
        </el-form-item>
        <el-form-item label="确认新密码">
          <el-input v-model="resetPwdForm.confirmPassword" type="password" show-password />
        </el-form-item>
      </el-form>
      <template #footer>
        <span class="dialog-footer">
          <el-button @click="resetPwdVisible = false">取消</el-button>
          <el-button type="primary" @click="submitResetPwd">提交</el-button>
        </span>
      </template>
    </el-dialog>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue';
import apiClient from '@/api';
import { ElMessage, ElMessageBox } from 'element-plus';

interface User {
  id: number;
  username: string;
  role: 'admin' | 'editor' | 'viewer';
  created_at: string;
}

const tableData = ref<User[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const form = reactive<Partial<User> & { password?: string }>({
  id: undefined,
  username: '',
  password: '',
  role: 'viewer',
});

// Reset password dialog for admin action
const resetPwdVisible = ref(false);
const resetPwdForm = reactive<{ id?: number; username: string; newPassword: string; confirmPassword: string }>({
  id: undefined,
  username: '',
  newPassword: '',
  confirmPassword: '',
});

const dialogTitle = computed(() => (isEditMode.value ? '修改用户角色' : '创建新用户'));

const fetchData = async () => {
  loading.value = true;
  try {
    const response = await apiClient.get('/users');
    tableData.value = response.data;
  } catch (error) {
    ElMessage.error('获取用户列表失败');
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchData();
});

const resetForm = () => {
  Object.assign(form, { id: undefined, username: '', password: '', role: 'viewer' });
};

const handleCreate = () => {
  resetForm();
  isEditMode.value = false;
  dialogVisible.value = true;
};

const handleEdit = (row: User) => {
  Object.assign(form, { id: row.id, username: row.username, role: row.role, password: '' });
  isEditMode.value = true;
  dialogVisible.value = true;
};

const openResetPwd = (row: User) => {
  resetPwdForm.id = row.id;
  resetPwdForm.username = row.username;
  resetPwdForm.newPassword = '';
  resetPwdForm.confirmPassword = '';
  resetPwdVisible.value = true;
};

const submitResetPwd = async () => {
  if (!resetPwdForm.newPassword) return ElMessage.error('请输入新密码');
  if (resetPwdForm.newPassword.length < 6) return ElMessage.error('新密码至少 6 位');
  if (resetPwdForm.newPassword !== resetPwdForm.confirmPassword) return ElMessage.error('两次输入的新密码不一致');
  try {
    await apiClient.put(`/users/${resetPwdForm.id}/password`, { newPassword: resetPwdForm.newPassword });
    ElMessage.success('密码重置成功');
    resetPwdVisible.value = false;
  } catch (err: any) {
    const msg = err?.response?.data?.error || '密码重置失败';
    ElMessage.error(msg);
  }
};

const handleSave = async () => {
  try {
    if (isEditMode.value) {
      await apiClient.put(`/users/${form.id}/role`, { role: form.role });
      ElMessage.success('用户角色更新成功');
    } else {
      await apiClient.post('/users', { username: form.username, password: form.password, role: form.role });
      ElMessage.success('新用户创建成功');
    }
    dialogVisible.value = false;
    fetchData();
  } catch (error: any) {
    const msg = error?.response?.data?.error || '操作失败';
    ElMessage.error(msg);
  }
};

const handleDelete = async (id: number) => {
  try {
    await ElMessageBox.confirm('确定要删除这个用户吗？此操作不可撤销。', '警告', {
      confirmButtonText: '确定',
      cancelButtonText: '取消',
      type: 'warning',
    });
    await apiClient.delete(`/users/${id}`);
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
</style>

