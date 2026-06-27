<template>
    <div class="admin-page">
        <div class="page-header">
            <div class="page-title">
                <h1>理事会</h1>
                <p>维护历届理事会信息和成员名单。</p>
            </div>
            <div class="page-actions">
                <el-button :loading="loading" @click="fetchData">刷新</el-button>
                <el-button type="primary" @click="handleCreate">添加理事会</el-button>
            </div>
        </div>

        <el-card class="table-card" shadow="never">
            <div class="filter-bar">
                <el-input
                    v-model="keyword"
                    clearable
                    placeholder="搜索标题、届期或描述"
                    style="width: 300px"
                />
                <span class="filter-count">共 {{ filteredData.length }} 届</span>
            </div>

            <el-table :data="pagedData" v-loading="loading" border height="calc(100vh - 310px)">
                <el-table-column prop="id" label="ID" width="76" />
                <el-table-column label="理事会" min-width="260">
                    <template #default="{ row }">
                        <div class="table-title-cell">
                            <strong>{{ row.title }}</strong>
                            <span>{{ row.trem || '未填写届期' }}</span>
                        </div>
                    </template>
                </el-table-column>
                <el-table-column prop="description" label="描述" min-width="300" show-overflow-tooltip />
                <el-table-column label="成员数" width="100">
                    <template #default="{ row }">{{ row.members.length }}</template>
                </el-table-column>
                <el-table-column label="操作" width="190" fixed="right">
                    <template #default="{ row }">
                        <el-button size="small" @click="handleEdit(row)">编辑</el-button>
                        <el-button size="small" type="danger" plain @click="handleDelete(row.id)">删除</el-button>
                    </template>
                </el-table-column>
                <template #empty>
                    <el-empty description="没有理事会数据" />
                </template>
            </el-table>

            <div class="table-footer">
                <el-pagination
                    v-model:current-page="currentPage"
                    v-model:page-size="pageSize"
                    :page-sizes="[10, 20, 30, 50]"
                    layout="total, sizes, prev, pager, next, jumper"
                    :total="filteredData.length"
                    @size-change="currentPage = 1"
                />
            </div>
        </el-card>

        <el-drawer v-model="dialogVisible" :title="dialogTitle" size="min(1180px, 96vw)" class="term-editor-drawer">
            <div class="term-editor">
                <aside class="term-meta">
                    <el-form ref="formRef" :model="form" :rules="rules" label-position="top">
                        <el-form-item label="标题" prop="title">
                            <el-input v-model="form.title" placeholder="例如：第 X 届理事会" />
                        </el-form-item>
                        <el-form-item label="届期" prop="trem">
                            <el-input v-model="form.trem" placeholder="例如：2024-2025" />
                        </el-form-item>
                        <el-form-item label="描述">
                            <el-input
                                v-model="form.description"
                                type="textarea"
                                :autosize="{ minRows: 5, maxRows: 9 }"
                                placeholder="补充本届理事会简介、职责范围或备注"
                            />
                        </el-form-item>
                    </el-form>

                    <div class="term-summary">
                        <div>
                            <span>成员数量</span>
                            <strong>{{ form.members?.length || 0 }}</strong>
                        </div>
                        <div>
                            <span>已填头像</span>
                            <strong>{{ memberImageCount }}</strong>
                        </div>
                    </div>
                </aside>

                <section class="term-members">
                    <div class="member-editor-head">
                        <div>
                            <h3>成员名单</h3>
                            <p>按展示顺序维护姓名、职位和头像。</p>
                        </div>
                        <div class="member-editor-actions">
                            <el-button :icon="DocumentAdd" @click="openBatchDialog">批量导入</el-button>
                            <el-button type="primary" :icon="Plus" @click="addMember">添加成员</el-button>
                        </div>
                    </div>

                    <el-empty v-if="!form.members?.length" description="暂无成员" />

                    <div v-else class="member-editor-list">
                        <div v-for="(member, index) in form.members" :key="index" class="member-editor-row">
                            <div class="member-order">{{ index + 1 }}</div>
                            <div class="member-avatar">
                                <img v-if="member.image" :src="formatImageUrl(member.image)" alt="" />
                                <el-icon v-else><User /></el-icon>
                            </div>
                            <div class="member-fields">
                                <el-form-item
                                    label="姓名"
                                    :prop="`members.${index}.name`"
                                    :rules="[{ required: true, message: '请填写姓名', trigger: 'blur' }]"
                                >
                                    <el-input v-model="member.name" placeholder="姓名" />
                                </el-form-item>
                                <el-form-item label="职位">
                                    <el-input v-model="member.position" placeholder="职位" />
                                </el-form-item>
                                <el-form-item label="头像">
                                    <div class="avatar-actions">
                                        <el-upload
                                            action="/api/upload?type=admins"
                                            name="image"
                                            :headers="uploadHeaders"
                                            :show-file-list="false"
                                            :on-success="(res: any) => onMemberImageSuccess(index, res)"
                                            :before-upload="beforeImageUpload"
                                        >
                                            <el-button :icon="Upload">上传</el-button>
                                        </el-upload>
                                        <el-input v-model="member.image" placeholder="/uploads/admins/..." />
                                    </div>
                                </el-form-item>
                            </div>
                            <div class="member-row-actions">
                                <el-button circle :icon="ArrowUp" :disabled="index === 0" @click="moveMember(index, -1)" />
                                <el-button
                                    circle
                                    :icon="ArrowDown"
                                    :disabled="index === (form.members!.length - 1)"
                                    @click="moveMember(index, 1)"
                                />
                                <el-button circle type="danger" plain :icon="Delete" @click="removeMember(index)" />
                            </div>
                        </div>
                    </div>
                </section>
            </div>

            <template #footer>
                <el-button @click="dialogVisible = false">取消</el-button>
                <el-button type="primary" @click="handleSave">保存</el-button>
            </template>
        </el-drawer>

        <!-- 批量添加成员 -->
        <el-dialog v-model="batchDialogVisible" title="批量导入成员" width="620px">
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
import { ref, onMounted, reactive, computed, watch } from 'vue'
import apiClient from '@/api'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Plus, ArrowUp, ArrowDown, Delete, Upload, DocumentAdd, User } from '@element-plus/icons-vue'
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
const keyword = ref('')
const currentPage = ref(1)
const pageSize = ref(10)

const formRef = ref<FormInstance>()
const form = reactive<Partial<AdminTerm>>({ id: undefined, title: '', trem: '', description: '', members: [] })
const rules: FormRules = {
    title: [{ required: true, message: '请填写标题', trigger: 'blur' }],
    trem: [{ required: true, message: '请填写届期', trigger: 'blur' }],
}

const dialogTitle = computed(() => (isEditMode.value ? '编辑理事会' : '添加理事会'))
const memberImageCount = computed(() => (form.members || []).filter((member) => Boolean(member.image)).length)
const filteredData = computed(() => {
    const kw = keyword.value.trim().toLowerCase()
    if (!kw) return tableData.value
    return tableData.value.filter((item) =>
        [item.title, item.trem, item.description].some((value) =>
            String(value || '').toLowerCase().includes(kw),
        ),
    )
})

const pagedData = computed(() => {
    const start = (currentPage.value - 1) * pageSize.value
    return filteredData.value.slice(start, start + pageSize.value)
})

watch(keyword, () => {
    currentPage.value = 1
})

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
}

const addMember = () => {
    form.members?.push({ name: '', position: '', image: '' })
}

const removeMember = (index: number) => {
    form.members?.splice(index, 1)
}

const moveMember = (index: number, dir: -1 | 1) => {
    if (!form.members) return
    const newIndex = index + dir
    if (newIndex < 0 || newIndex >= form.members.length) return
    const tmp = form.members[index]
    form.members[index] = form.members[newIndex]
    form.members[newIndex] = tmp
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
.term-editor {
    height: calc(100vh - 126px);
    display: grid;
    grid-template-columns: 320px minmax(0, 1fr);
    gap: 18px;
    min-height: 0;
}

.term-meta,
.term-members {
    min-width: 0;
    min-height: 0;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--card-bg);
}

.term-meta {
    padding: 16px;
    overflow: auto;
}

.term-summary {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 10px;
    margin-top: 8px;
}

.term-summary div {
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 6px;
    background: var(--app-bg);
}

.term-summary span {
    display: block;
    color: var(--muted-text);
    font-size: 12px;
}

.term-summary strong {
    display: block;
    margin-top: 6px;
    color: var(--text-color);
    font-size: 22px;
}

.term-members {
    display: flex;
    flex-direction: column;
    overflow: hidden;
}

.member-editor-head {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 12px;
    padding: 16px;
    border-bottom: 1px solid var(--el-border-color-lighter);
}

.member-editor-head h3 {
    margin: 0;
    font-size: 16px;
}

.member-editor-head p {
    margin: 6px 0 0;
    color: var(--muted-text);
    font-size: 13px;
}

.member-editor-actions,
.avatar-actions,
.member-row-actions {
    display: flex;
    align-items: center;
    gap: 8px;
}

.member-editor-list {
    display: grid;
    gap: 10px;
    padding: 14px;
    overflow: auto;
}

.member-editor-row {
    display: grid;
    grid-template-columns: 36px 72px minmax(0, 1fr) 42px;
    gap: 12px;
    align-items: start;
    padding: 12px;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--app-bg);
}

.member-order {
    height: 32px;
    display: grid;
    place-items: center;
    border-radius: 6px;
    background: var(--card-bg);
    color: var(--muted-text);
    font-weight: 650;
}

.member-avatar {
    width: 72px;
    height: 72px;
    display: grid;
    place-items: center;
    overflow: hidden;
    border: 1px solid var(--el-border-color-lighter);
    border-radius: 8px;
    background: var(--card-bg);
    color: var(--muted-text);
}

.member-avatar img {
    width: 100%;
    height: 100%;
    object-fit: cover;
}

.member-fields {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 0 12px;
}

.member-fields :deep(.el-form-item:nth-child(3)) {
    grid-column: 1 / -1;
    margin-bottom: 0;
}

.avatar-actions .el-input {
    min-width: 0;
}

.member-row-actions {
    flex-direction: column;
}

.batch-hint {
    margin-bottom: 10px;
    color: var(--muted-text);
    font-size: 13px;
    line-height: 1.6;
}

@media (max-width: 980px) {
    .term-editor {
        height: auto;
        grid-template-columns: 1fr;
    }

    .term-members {
        min-height: 520px;
    }

    .member-editor-head {
        flex-direction: column;
    }

    .member-editor-row {
        grid-template-columns: 32px 64px minmax(0, 1fr);
    }

    .member-row-actions {
        grid-column: 1 / -1;
        flex-direction: row;
        justify-content: flex-end;
    }
}

@media (max-width: 680px) {
    .member-editor-row,
    .member-fields {
        grid-template-columns: 1fr;
    }

    .member-order,
    .member-avatar {
        justify-self: start;
    }

    .avatar-actions {
        align-items: stretch;
        flex-direction: column;
    }
}
</style>
