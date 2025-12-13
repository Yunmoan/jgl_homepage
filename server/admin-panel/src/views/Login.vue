<template>
    <div class="login-container">
        <el-card class="login-card">
            <template #header>
                <div class="card-header">
                    <span>后台管理登录</span>
                </div>
            </template>
            <el-form :model="form" label-width="80px" @submit.prevent="onSubmit">
                <el-form-item label="用户名">
                    <el-input v-model="form.username" />
                </el-form-item>
                <el-form-item label="密码">
                    <el-input v-model="form.password" type="password" show-password />
                </el-form-item>
                <el-form-item>
                    <el-button type="primary" @click="onSubmit" :loading="loading">登录</el-button>
                </el-form-item>
            </el-form>
        </el-card>
    </div>
</template>

<script setup lang="ts">
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { ElMessage } from 'element-plus';
import apiClient from '@/api';

const form = reactive({
    username: '',
    password: '',
});
const loading = ref(false);
const router = useRouter();

const onSubmit = async () => {
    if (!form.username || !form.password) {
        ElMessage.error('请输入用户名和密码');
        return;
    }

    loading.value = true;
    try {
        const response = await apiClient.post('/auth/login', {
            username: form.username,
            password: form.password,
        });

        const { token } = response.data;
        localStorage.setItem('token', token);
        ElMessage.success('登录成功');
        router.push('/admin');

    } catch (error: any) {
        if (error.response && error.response.status === 401) {
            ElMessage.error('用户名或密码错误');
        } else {
            ElMessage.error('登录失败，请稍后再试');
        }
        console.error('Login failed:', error);
    } finally {
        loading.value = false;
    }
};
</script>

<style scoped>
.login-container {
    display: flex;
    justify-content: center;
    align-items: center;
    height: 100vh;
    background-color: #f0f2f5;
}

.login-card {
    width: 400px;
}

.card-header {
    text-align: center;
    font-size: 20px;
}
</style>
