<template>
    <div>
        <el-card class="page-card" shadow="hover">
            <div class="controls">
                <h1>成员管理</h1>
                <div class="control-actions">
                    <el-button type="primary" @click="handleCreate">添加成员</el-button>
                </div>
            </div>

            <el-table :data="tableData" v-loading="loading" style="width: 100%">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="name" label="名称" min-width="160" />
                <el-table-column prop="logo" label="Logo" width="140">
                    <template #default="scope">
                        <img v-if="scope.row.logo" :src="formatLogoUrl(scope.row.logo)" alt="Logo" style="width: 64px; height: 64px; object-fit: cover; border-radius: 6px;" />
                    </template>
                </el-table-column>
                <el-table-column prop="link" label="链接" min-width="200" show-overflow-tooltip />
                <el-table-column label="操作" width="200" fixed="right">
                    <template #default="scope">
                        <el-button size="small" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
                        <el-popconfirm title="确定要删除这个成员吗？" confirm-button-text="删除" cancel-button-text="取消" @confirm="handleDelete(scope.row.id)">
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

            <div style="display: flex; justify-content: flex-end; margin-top: 12px;">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[10, 18, 30, 50]"
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="total"
                    @current-change="fetchData"
                    @size-change="handleSizeChange"
                />
            </div>
        </el-card>

        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="50%">
            <el-form :model="form" label-width="100px">
                <el-form-item label="名称">
                    <el-input v-model="form.name" />
                </el-form-item>
                <el-form-item label="Logo">
                    <div class="logo-upload-row">
                        <div v-if="form.logo" class="logo-preview">
                            <img :src="formatLogoUrl(form.logo)" alt="Logo" />
                            <el-button type="danger" size="small" circle @click="form.logo = ''" class="remove-btn">
                                <el-icon><Delete /></el-icon>
                            </el-button>
                        </div>
                        <div v-else class="image-uploader" @click="triggerFileInput">
                            <el-icon class="image-uploader-icon"><Plus /></el-icon>
                        </div>
                        <div class="upload-hint">支持 JPG/PNG/WebP，将自动转换为圆形 WebP</div>
                    </div>
                    <input ref="fileInputRef" type="file" accept="image/jpeg,image/png,image/webp" style="display:none"
                        @change="handleFileChange" />
                </el-form-item>
                <el-form-item label="链接">
                    <el-input v-model="form.link" />
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
import { Plus, Edit, Delete } from '@element-plus/icons-vue';

interface Member {
    id: number;
    name: string;
    logo: string;
    link: string;
}

const tableData = ref<Member[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);
const fileInputRef = ref<HTMLInputElement | null>(null);
const uploadLoading = ref(false);

// 分页状态
const currentPage = ref(1);
const pageSize = ref(18);
const total = ref(0);

const form = reactive<Partial<Member>>({
    id: undefined,
    name: '',
    logo: '',
    link: '',
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑成员' : '添加成员'));

const formatLogoUrl = (src?: string) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return src;
};

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/members', {
            params: {
                page: currentPage.value,
                limit: pageSize.value,
            },
        });
        // 后端返回 { data: Member[], pagination: {...} }
        tableData.value = response.data?.data ?? [];
        total.value = response.data?.pagination?.total ?? 0;
    } catch (error) {
        ElMessage.error('获取成员列表失败');
        tableData.value = [];
        total.value = 0;
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData();
});

const handleSizeChange = () => {
    // 切换每页大小时重置到第一页
    currentPage.value = 1;
    fetchData();
};

const resetForm = () => {
    Object.assign(form, { id: undefined, name: '', logo: '', link: '' });
};

const handleCreate = () => {
    resetForm();
    isEditMode.value = false;
    dialogVisible.value = true;
};

const handleEdit = (row: Member) => {
    Object.assign(form, row);
    isEditMode.value = true;
    dialogVisible.value = true;
};

const triggerFileInput = () => {
    if (!form.name?.trim()) {
        ElMessage.warning('请先输入成员名称');
        return;
    }
    fileInputRef.value?.click();
};

const handleFileChange = async (e: Event) => {
    const input = e.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type)) {
        ElMessage.error('Logo只能是 JPG, PNG, 或 WEBP 格式');
        return;
    }
    if (file.size / 1024 / 1024 >= 5) {
        ElMessage.error('Logo大小不能超过 5MB');
        return;
    }

    uploadLoading.value = true;
    try {
        const fd = new FormData();
        fd.append('image', file);
        fd.append('memberName', form.name || '未命名');

        const res = await apiClient.post('/members/upload-logo', fd, {
            headers: { 'Content-Type': 'multipart/form-data' },
        });
        form.logo = res.data.filePath;
        ElMessage.success('Logo上传并处理成功');
    } catch (err: any) {
        ElMessage.error(err?.response?.data?.message || 'Logo上传失败');
    } finally {
        uploadLoading.value = false;
        input.value = '';
    }
};

const handleSave = async () => {
    try {
        if (isEditMode.value) {
            await apiClient.put(`/members/${form.id}`, form);
            ElMessage.success('更新成功');
        } else {
            await apiClient.post('/members', form);
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
        await apiClient.delete(`/members/${id}`);
        ElMessage.success('删除成功');
        fetchData();
    } catch (error: any) {
        ElMessage.error('删除失败');
    }
};
</script>

<style scoped>
.page-card { background: var(--card-bg); }
.controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 14px;
}
.control-actions { display: flex; align-items: center; gap: 10px; }

.logo-upload-row {
    display: flex;
    flex-direction: column;
    gap: 8px;
}

.logo-preview {
    position: relative;
    display: inline-block;
    width: 178px;
    height: 178px;
}

.logo-preview img {
    width: 178px;
    height: 178px;
    border-radius: 50%;
    object-fit: cover;
    border: 1px solid var(--el-border-color);
    display: block;
}

.logo-preview .remove-btn {
    position: absolute;
    top: -8px;
    right: -8px;
}

.upload-hint {
    color: var(--el-text-color-secondary);
    font-size: 12px;
}

.image-uploader {
    width: 178px;
    height: 178px;
    border: 1px dashed var(--el-border-color);
    border-radius: 50%;
    cursor: pointer;
    display: flex;
    align-items: center;
    justify-content: center;
    transition: var(--el-transition-duration-fast);
}

.image-uploader:hover {
    border-color: var(--el-color-primary);
}

.el-icon.image-uploader-icon {
    font-size: 28px;
    color: #8c939d;
}
</style>

<style>
</style>
