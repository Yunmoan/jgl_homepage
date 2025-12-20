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
                <template #default="scope">{{ scope.row.members.length }}</template>
            </el-table-column>
            <el-table-column label="操作" width="220">
                <template #default="scope">
                    <el-button size="small" @click="handleEdit(scope.row)">编辑</el-button>
                    <el-popconfirm title="确定要删除该理事会及其成员？" @confirm="handleDelete(scope.row.id)">
                        <template #reference>
                            <el-button size="small" type="danger">删除</el-button>
                        </template>
                    </el-popconfirm>
                </template>
            </el-table-column>
        </el-table>

        <el-dialog v-model="dialogVisible" :title="dialogTitle" width="1080px">
            <el-form ref="formRef" :model="form" :rules="rules" label-width="100px">
                <div class="editor-split">
                    <div class="meta-pane">
                        <el-form-item label="标题" prop="title">
                            <el-input v-model="form.title" placeholder="例如：第X届理事会" />
                        </el-form-item>
                        <el-form-item label="届期" prop="trem">
                            <el-input v-model="form.trem" placeholder="例如：2024-2025" />
                        </el-form-item>
                        <el-form-item label="描述">
                            <el-input v-model="form.description" type="textarea"
                                :autosize="{ minRows: 2, maxRows: 4 }" />
                        </el-form-item>

                    </div>
                    <div class="members-pane">
                        <el-divider>成员管理</el-divider>
                        <div class="member-toolbar">
                            <div class="left">
                                <el-button size="small" @click="addMember"><el-icon>
                                        <Plus />
                                    </el-icon> 添加成员</el-button>
                                <el-button size="small" @click="openBatchDialog"><el-icon>
                                        <DocumentAdd />
                                    </el-icon> 批量添加</el-button>
                            </div>
                            <div class="right">
                                <el-button text size="small" @click="toggleAllCollapse(false)">全部展开</el-button>
                                <el-button text size="small" @click="toggleAllCollapse(true)">全部折叠</el-button>
                            </div>
                        </div>

                        <div v-if="(form.members?.length || 0) === 0" class="empty-hint">
                            暂无成员，点击“添加成员”开始维护。
                        </div>

                        <div class="member-list">
                            <el-card v-for="(member, index) in form.members" :key="index" class="member-card"
                                shadow="hover">
                                <template #header>
                                    <div class="card-header" @click="toggleCollapse(index)">
                                        <div class="title">
                                            <strong>{{ member.name || '未命名成员' }}</strong>
                                            <span v-if="member.position" class="muted">（{{ member.position }}）</span>
                                        </div>
                                        <div class="actions">
                                            <el-button circle size="small" :disabled="index === 0"
                                                @click.stop="moveMember(index, -1)">
                                                <el-icon>
                                                    <ArrowUp />
                                                </el-icon>
                                            </el-button>
                                            <el-button circle size="small"
                                                :disabled="index === (form.members!.length - 1)"
                                                @click.stop="moveMember(index, 1)">
                                                <el-icon>
                                                    <ArrowDown />
                                                </el-icon>
                                            </el-button>
                                            <el-popconfirm title="移除此成员？" @confirm="removeMember(index)">
                                                <template #reference>
                                                    <el-button circle size="small" type="danger" @click.stop>
                                                        <el-icon>
                                                            <Delete />
                                                        </el-icon>
                                                    </el-button>
                                                </template>
                                            </el-popconfirm>
                                        </div>
                                    </div>
                                </template>

                                <el-collapse-transition>
                                    <div v-show="!collapsed[index]">
                                        <div class="member-grid">
                                            <el-form-item label="姓名" :prop="`members.${index}.name`"
                                                :rules="[{ required: true, message: '请填写姓名', trigger: 'blur' }]">
                                                <el-input v-model="member.name" placeholder="如：张三" />
                                            </el-form-item>
                                            <el-form-item label="职位">
                                                <el-input v-model="member.position" placeholder="如：会长/副会长/组织" />
                                            </el-form-item>
                                        </div>

                                        <div class="upload-row">
                                            <div class="preview" v-if="member.image">
                                                <img :src="formatImageUrl(member.image)" alt="头像" />
                                            </div>
                                            <div class="uploader">
                                                <el-upload action="/api/upload?type=admins" name="image"
                                                    :headers="uploadHeaders" :show-file-list="false"
                                                    :on-success="(res: any) => onMemberImageSuccess(index, res)"
                                                    :before-upload="beforeImageUpload">
                                                    <el-button type="primary"><el-icon>
                                                            <Upload />
                                                        </el-icon> 上传头像</el-button>
                                                </el-upload>
                                                <el-input v-model="member.image" placeholder="或直接粘贴图片URL" />
                                            </div>
                                        </div>
                                    </div>
                                </el-collapse-transition>
                            </el-card>
                        </div>
                    </div>
                </div>
            </el-form>

            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="dialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="handleSave">保存</el-button>
                </span>
            </template>
        </el-dialog>

        <!-- 批量添加成员 -->
        <el-dialog v-model="batchDialogVisible" title="批量添加成员" width="600px">
            <div class="batch-hint">
                每行一个成员，支持格式：
                <div>姓名,职位,图片URL</div>
                <div>示例：张三, 会长, /uploads/admins/zhangsan.png</div>
            </div>
            <el-input v-model="batchText" type="textarea" :autosize="{ minRows: 6 }" placeholder="粘贴内容..." />
            <template #footer>
                <span class="dialog-footer">
                    <el-button @click="batchDialogVisible = false">取消</el-button>
                    <el-button type="primary" @click="confirmBatchAdd">添加</el-button>
                </span>
            </template>
        </el-dialog>
    </div>
</template>

<script setup lang="ts">
import { ref, onMounted, reactive, computed } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowUp, ArrowDown, Delete, Upload, DocumentAdd } from '@element-plus/icons-vue'
import type { FormInstance, FormRules, UploadProps } from 'element-plus'

interface TermMember {
    name: string
    position: string
    image: string
}

interface AdminTerm {
    id: number
    title: string
    trem: string
    description: string
    members: TermMember[]
}

const tableData = ref<AdminTerm[]>([])
const loading = ref(true)
const dialogVisible = ref(false)
const isEditMode = ref(false)

const formRef = ref<FormInstance>()
const form = reactive<Partial<AdminTerm>>({ id: undefined, title: '', trem: '', description: '', members: [] })
const rules: FormRules = {
    title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
    trem: [{ required: true, message: '请填写届期', trigger: 'blur' }],
}

const collapsed = ref<boolean[]>([])
const dialogTitle = computed(() => (isEditMode.value ? '编辑理事会' : '添加理事会'))

const uploadHeaders = computed(() => {
    const token = localStorage.getItem('token')
    return token ? { Authorization: `Bearer ${token}` } : {}
})

const fetchData = async () => {
    loading.value = true
    try {
        const response = await apiClient.get('/admin-history')
        tableData.value = response.data
    } catch (error) {
        ElMessage.error('获取理事会列表失败')
    } finally {
        loading.value = false
    }
}

onMounted(() => {
    fetchData()
})

const resetForm = () => {
    Object.assign(form, { id: undefined, title: '', trem: '', description: '', members: [] as TermMember[] })
    collapsed.value = []
}

const addMember = () => {
    form.members?.push({ name: '', position: '', image: '' })
    collapsed.value.push(false)
}

const removeMember = (index: number) => {
    form.members?.splice(index, 1)
    collapsed.value.splice(index, 1)
}

const moveMember = (index: number, dir: -1 | 1) => {
    if (!form.members) return
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= form.members.length) return
    const tmp = form.members[index]
    form.members[index] = form.members[newIndex]
    form.members[newIndex] = tmp
    const ctmp = collapsed.value[index]
    collapsed.value[index] = collapsed.value[newIndex]
    collapsed.value[newIndex] = ctmp
}

const toggleCollapse = (index: number) => {
    collapsed.value[index] = !collapsed.value[index]
}

const toggleAllCollapse = (val: boolean) => {
    collapsed.value = (form.members || []).map(() => val)
}

const formatImageUrl = (src?: string) => {
    if (!src) return ''
    if (src.startsWith('http://') || src.startsWith('https://')) return src
    return src
}

const beforeImageUpload: UploadProps['beforeUpload'] = (rawFile) => {
    const isJpgOrPngOrWebp = ['image/jpeg', 'image/png', 'image/webp'].includes(rawFile.type)
    const isLt2M = rawFile.size / 1024 / 1024 < 2
    if (!isJpgOrPngOrWebp) {
        ElMessage.error('仅支持 JPG/PNG/WEBP 图片')
        return false
    }
    if (!isLt2M) {
        ElMessage.error('图片大小不能超过 2MB')
        return false
    }
    return true
}

const onMemberImageSuccess = (index: number, response: any) => {
    const filePath = response?.filePath
    if (!filePath) return
    if (!form.members) return
    form.members[index].image = filePath
}

const openBatchDialog = () => {
    batchText.value = ''
    batchDialogVisible.value = true
}

const confirmBatchAdd = () => {
    const lines = batchText.value.split(/\r?\n/).map((l) => l.trim()).filter(Boolean)
    for (const line of lines) {
        const [name, position, image] = line.split(',').map((s) => (s ?? '').trim())
        if (!name) continue
        form.members?.push({ name, position: position || '', image: image || '' })
        collapsed.value.push(false)
    }
    batchDialogVisible.value = false
}

const handleCreate = () => {
    resetForm()
    isEditMode.value = false
    dialogVisible.value = true
}

const handleEdit = (row: AdminTerm) => {
    const copied = JSON.parse(JSON.stringify(row)) as AdminTerm
    Object.assign(form, copied)
    collapsed.value = (form.members || []).map(() => true)
    isEditMode.value = true
    dialogVisible.value = true
}

const sanitizeForm = () => {
    if (!form.members) return
    // 去除空成员
    form.members = form.members.filter((m) => (m.name || '').trim().length > 0)
}

const handleSave = async () => {
    await formRef.value?.validate().catch(() => Promise.reject('invalid'))
    sanitizeForm()
    try {
        if (isEditMode.value) {
            await apiClient.put(`/admin-history/${form.id}` as string, form)
            ElMessage.success('更新成功')
        } else {
            await apiClient.post('/admin-history', form)
            ElMessage.success('创建成功')
        }
        dialogVisible.value = false
        fetchData()
    } catch (error) {
        ElMessage.error('保存失败')
    }
}

const handleDelete = async (id: number) => {
    try {
        await ElMessageBox.confirm('确定要删除这个理事会及其所有成员吗？', '警告', {
            confirmButtonText: '确定',
            cancelButtonText: '取消',
            type: 'warning',
        })
        await apiClient.delete(`/admin-history/${id}`)
        ElMessage.success('删除成功')
        fetchData()
    } catch (error: any) {
        if (error !== 'cancel') {
            ElMessage.error('删除失败')
        }
    }
}

// for batch add dialog
const batchDialogVisible = ref(false)
const batchText = ref('')
</script>

<style scoped>
.controls {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 16px;
}

.member-toolbar {
    display: flex;
    justify-content: space-between;
    align-items: center;
    margin-bottom: 8px;
}

.member-list {
    display: grid;
    grid-template-columns: 1fr;
    gap: 12px;
}

.member-card {
    border: 1px solid var(--el-border-color);
}

.card-header {
    display: flex;
    align-items: center;
    justify-content: space-between;
    cursor: pointer;
}

.card-header .title {
    display: flex;
    align-items: center;
    gap: 6px;
}

.card-header .muted {
    color: var(--el-text-color-secondary);
    font-weight: 400;
}

.card-header .actions {
    display: flex;
    gap: 6px;
}

.member-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 12px;
}

.upload-row {
    display: grid;
    grid-template-columns: 160px 1fr;
    gap: 12px;
    align-items: center;
}

.preview img {
    width: 160px;
    height: 100px;
    object-fit: cover;
    border-radius: 6px;
    border: 1px solid var(--el-border-color);
}

.empty-hint {
    color: var(--el-text-color-secondary);
    margin: 8px 0;
}

/* 新增左右布局样式 */
.editor-split {
    display: flex;
    gap: 16px;
    align-items: flex-start;
}

.meta-pane {
    width: 360px;
    flex: 0 0 360px;
}

.members-pane {
    flex: 1 1 auto;
    min-width: 0;
    max-height: 65vh;
    /* 限制高度，出现滚动 */
    overflow: auto;
    padding-left: 4px;
}

@media (max-width: 1024px) {
    .editor-split {
        flex-direction: column;
    }

    .meta-pane {
        width: 100%;
        flex: 1 1 auto;
    }

    .members-pane {
        max-height: none;
    }
}
</style>
