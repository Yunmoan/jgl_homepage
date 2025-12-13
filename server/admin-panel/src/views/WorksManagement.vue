<template>
    <div>
        <el-card class="page-card" shadow="hover">
            <div class="controls">
                <h1>作品管理</h1>
                <div class="control-actions">
                    <el-input v-model="keyword" placeholder="搜索标题/描述" clearable :prefix-icon="Search" style="width: 240px;" />
                    <el-button type="primary" @click="handleCreate">添加作品</el-button>
                </div>
            </div>

            <el-table :data="pagedData" v-loading="loading" style="width: 100%">
                <el-table-column prop="id" label="ID" width="80" />
                <el-table-column prop="title" label="标题" min-width="160" />
                <el-table-column prop="description" label="描述" min-width="240" show-overflow-tooltip />
                <el-table-column prop="imageUrl" label="图片" width="140">
                    <template #default="scope">
                        <img v-if="scope.row.imageUrl" :src="formatImageUrl(scope.row.imageUrl)" alt="Image" style="width: 100px; height: 64px; object-fit: cover; border-radius: 6px;" />
                    </template>
                </el-table-column>
                <el-table-column prop="link" label="链接" min-width="180" show-overflow-tooltip />
                <el-table-column label="操作" width="200" fixed="right">
                    <template #default="scope">
                        <el-button size="small" :icon="Edit" @click="handleEdit(scope.row)">编辑</el-button>
                        <el-popconfirm title="确定要删除这个作品吗？" confirm-button-text="删除" cancel-button-text="取消" @confirm="handleDelete(scope.row.id)">
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
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 30, 50]"
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="filteredData.length"
                    @size-change="() => (currentPage = 1)"
                />
            </div>
        </el-card>

        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="560px">
            <el-form :model="form" label-width="100px">
                <el-form-item label="标题">
                    <el-input v-model="form.title" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="form.description" type="textarea" :autosize="{ minRows: 3 }" />
                </el-form-item>
                <el-form-item label="图片">
                    <el-upload
                        class="image-uploader"
                        action="/api/upload?type=works"
                        name="image"
                        :headers="uploadHeaders"
                        :show-file-list="false"
                        :on-success="handleImageSuccess"
                        :before-upload="beforeImageUpload"
                    >
                        <img v-if="form.imageUrl" :src="previewImage" class="image" />
                        <el-icon v-else class="image-uploader-icon"><Plus /></el-icon>
                    </el-upload>
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
import { ElMessage, ElMessageBox } from 'element-plus';
import { Plus, Edit, Delete, Search } from '@element-plus/icons-vue';
import type { UploadProps } from 'element-plus';

interface Work {
    id: number;
    title: string;
    description: string;
    imageUrl: string;
    link: string;
}

const tableData = ref<Work[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const keyword = ref('');
const currentPage = ref(1);
const pageSize = ref(10);

const form = reactive<Partial<Work>>({
    id: undefined,
    title: '',
    description: '',
    imageUrl: '',
    link: '',
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑作品' : '添加作品'));

const uploadHeaders = computed(() => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
});

const formatImageUrl = (src?: string) => {
    if (!src) return '';
    if (src.startsWith('http://') || src.startsWith('https://')) return src;
    return src;
};

const previewImage = computed(() => formatImageUrl(form.imageUrl));

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/works');
        tableData.value = response.data;
    } catch (error) {
        ElMessage.error('获取作品列表失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData();
});

const filteredData = computed(() => {
    const kw = keyword.value.trim().toLowerCase();
    if (!kw) return tableData.value;
    return tableData.value.filter((item) =>
        (item.title || '').toLowerCase().includes(kw) || (item.description || '').toLowerCase().includes(kw)
    );
});

const pagedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value;
    return filteredData.value.slice(start, start + pageSize.value);
});

const resetForm = () => {
    Object.assign(form, { id: undefined, title: '', description: '', imageUrl: '', link: '' });
};

const handleCreate = () => {
    resetForm();
    isEditMode.value = false;
    dialogVisible.value = true;
};

const handleEdit = (row: Work) => {
    Object.assign(form, row);
    isEditMode.value = true;
    dialogVisible.value = true;
};

const handleImageSuccess: UploadProps['onSuccess'] = (response) => {
    form.imageUrl = response.filePath;
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

const handleSave = async () => {
    try {
        if (isEditMode.value) {
            await apiClient.put(`/works/${form.id}`, form);
            ElMessage.success('更新成功');
        } else {
            await apiClient.post('/works', form);
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
        await apiClient.delete(`/works/${id}`);
        ElMessage.success('删除成功');
        fetchData();
    } catch (error) {
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
.table-footer { display: flex; justify-content: flex-end; margin-top: 12px; }

.image-uploader .image {
    width: 178px;
    height: 178px;
    display: block;
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
}
</style>
