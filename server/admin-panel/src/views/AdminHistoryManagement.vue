<template>
    <div>
        <div class="controls">
            <h1>理事会管理</h1>
            <el-button type="primary" @click="handleCreate">添加理事会</el-button>
        </div>

        <el-table :data="tableData" v-loading="loading" style="width: 100%">
            <el-table-column prop="id" label="ID" width="80" />
            <el-table-column prop="title" label="标题" />
            <el-table-column prop="trem" label="届期" />
            <el-table-column label="成员数" width="100">
                <template #default="scope">
                    {{ scope.row.members.length }}
                </template>
            </el-table-column>
            <el-table-column label="操作" width="200">
                <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-button size="small" type="danger" @click="handleDelete(scope.row.id)">删除</el-button>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="70%">
            <el-form :model="form" label-width="100px">
                <el-form-item label="标题">
                    <el-input v-model="form.title" />
                </el-form-item>
                <el-form-item label="届期">
                    <el-input v-model="form.trem" />
                </el-form-item>
                <el-form-item label="描述">
                    <el-input v-model="form.description" type="textarea" />
                </el-form-item>

                <el-divider />
                <h3>成员管理</h3>
                <div v-for="(member, index) in form.members" :key="index" class="member-item">
                    <el-form-item label="姓名">
                        <el-input v-model="member.name" />
                    </el-form-item>
                    <el-form-item label="职位">
                        <el-input v-model="member.position" />
                    </el-form-item>
                    <el-form-item label="图片URL">
                        <el-input v-model="member.image" />
                    </el-form-item>
                    <el-button type="danger" @click="removeMember(index)" class="remove-btn">移除</el-button>
                </div>
                <el-button @click="addMember">添加成员</el-button>

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

interface TermMember {
    name: string;
    position: string;
    image: string;
}

interface AdminTerm {
    id: number;
    title: string;
    trem: string;
    description: string;
    members: TermMember[];
}

const tableData = ref<AdminTerm[]>([]);
const loading = ref(true);
const dialogVisible = ref(false);
const isEditMode = ref(false);

const form = reactive<Partial<AdminTerm>>({
    id: undefined,
    title: '',
    trem: '',
    description: '',
    members: [],
});

const dialogTitle = computed(() => (isEditMode.value ? '编辑理事会' : '添加理事会'));

const fetchData = async () => {
    loading.value = true;
    try {
        const response = await apiClient.get('/admin-history');
        tableData.value = response.data;
    } catch (error) {
        ElMessage.error('获取理事会列表失败');
    } finally {
        loading.value = false;
    }
};

onMounted(() => {
    fetchData();
});

const resetForm = () => {
    Object.assign(form, { id: undefined, title: '', trem: '', description: '', members: [] });
};

const addMember = () => {
    form.members?.push({ name: '', position: '', image: '' });
};

const removeMember = (index: number) => {
    form.members?.splice(index, 1);
};

const handleCreate = () => {
    resetForm();
    isEditMode.value = false;
    dialogVisible.value = true;
};

const handleEdit = (row: AdminTerm) => {
    // Deep copy to avoid reactive issues
    Object.assign(form, JSON.parse(JSON.stringify(row)));
    isEditMode.value = true;
    dialogVisible.value = true;
};

const handleSave = async () => {
    try {
        if (isEditMode.value) {
            await apiClient.put(`/admin-history/${form.id}`, form);
            ElMessage.success('更新成功');
        } else {
            await apiClient.post('/admin-history', form);
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
        await ElMessageBox.confirm('确定要删除这个理事会及其所有成员吗？', '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        });
        await apiClient.delete(`/admin-history/${id}`);
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

.member-item {
    border: 1px solid #dcdfe6;
    padding: 15px;
    margin-bottom: 15px;
    border-radius: 4px;
    position: relative;
}

.remove-btn {
    position: absolute;
    top: 10px;
    right: 10px;
}
</style>
