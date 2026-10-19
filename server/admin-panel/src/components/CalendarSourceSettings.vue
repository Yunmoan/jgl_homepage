<template>
  <el-card shadow="never" class="source-settings">
    <div class="settings-heading">
      <div><h2>日历数据源与缓存</h2><p>来源活动与本站维护的活动共同展示；高联参展信息独立保存。</p></div>
      <el-button type="primary" :loading="saving" :disabled="!ready || loading" @click="save">保存数据源设置</el-button>
    </div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-button v-if="!ready && !loading" @click="load">重新加载数据源设置</el-button>
    <el-form label-position="top" :disabled="!ready || loading || saving">
      <div class="source-fields">
        <el-form-item label="启用的数据源"><el-select v-model="form.kind" aria-label="启用的数据源"><el-option value="thonly" label="thonly.cc 东方活动日历" /><el-option value="json" label="自定义 JSON 日历" /><el-option value="local" label="仅本站维护" /></el-select></el-form-item>
        <el-form-item v-if="form.kind !== 'local'" label="缓存方式"><el-select v-model="form.cache_mode" aria-label="缓存方式"><el-option value="ttl" label="定时缓存，失败回退旧缓存" /><el-option value="offline" label="仅离线（不联网）" /><el-option value="none" label="不缓存（每次实时读取）" /></el-select></el-form-item>
        <el-form-item v-if="form.kind !== 'local' && form.cache_mode === 'ttl'" label="缓存有效时间"><div class="duration-field"><el-input-number v-model="duration" :min="1" :max="31536000" :precision="0" aria-label="缓存时长" /><el-select v-model="unit" aria-label="缓存时间单位"><el-option :value="1" label="秒" /><el-option :value="60" label="分钟" /><el-option :value="3600" label="小时" /><el-option :value="86400" label="天" /></el-select></div></el-form-item>
      </div>
      <el-form-item v-if="form.kind === 'json'" label="公开显示的数据源名称"><el-input v-model="form.label" maxlength="80" placeholder="例如 example.com" /></el-form-item>
      <el-form-item v-if="form.kind !== 'local'" label="数据接口地址（每行一个）"><el-input v-model="urlsText" type="textarea" :rows="4" placeholder="https://…" /></el-form-item>
      <p v-if="form.kind === 'json'" class="source-hint">JSON 可返回活动数组或 { items: [...] }。字段：id、title、start_date、end_date、location、description、link；日期使用 YYYY-MM-DD，建议提供稳定的 id。</p>
      <p v-if="form.kind === 'thonly'" class="source-hint">thonly.cc 的年度表格列表会由服务器定期自动发现并同步，通常无需手动修改。服务器优先读取 Google 表格公开接口，失败时再尝试 thonly.cc 代理，最后通过只读渲染镜像读取同一公开接口；全部不可用时保留最近一次成功缓存或内置离线种子。</p>
      <p v-if="form.kind !== 'local'" class="source-hint">定时缓存会在后台自动刷新，来源不可用时保留上次成功数据；仅离线不会发起外部请求。不缓存模式不读写缓存，每次访问都实时读取。切换仅离线前，请先完成一次缓存更新。</p>
    </el-form>
    <div class="source-status">
      <p v-if="source">当前数据源：{{ source.label }}<span v-if="source.fetched_at"> · 最近读取 {{ new Date(source.fetched_at).toLocaleString('zh-CN', {timeZone:'Asia/Shanghai'}) }}</span></p>
      <p v-if="source?.warning">{{ source.warning }}</p>
      <p v-if="source?.skipped">已跳过 {{ source.skipped }} 条日期待定或格式无效的来源记录。</p>
      <el-button :loading="refreshing" :disabled="!ready || dirty || form.kind === 'local' || form.cache_mode === 'offline' || saving" @click="refresh">{{ form.cache_mode === 'none' ? '立即检查来源' : '立即更新缓存' }}</el-button>
      <span v-if="dirty" class="source-hint">请先保存设置</span>
    </div>
  </el-card>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { ElMessage } from 'element-plus'
import apiClient from '../api'
import { getErrorMessage } from '../feedback'
import type { CalendarSourceConfig, CalendarSourceMetadata } from '../../../../src/utils/exhibitions'
defineProps<{source?: CalendarSourceMetadata}>()
const emit = defineEmits<{changed: []}>()
const form = reactive<CalendarSourceConfig>({kind:'thonly',label:'thonly.cc',urls:[],cache_mode:'ttl',cache_ttl_seconds:86400})
const urlsText = ref(''), duration = ref<number | undefined>(1), unit = ref(86400)
const ready=ref(false), loading=ref(false), saving=ref(false), refreshing=ref(false), error=ref(''), saved=ref('')
let presets: string[] = [], initializing = false
const controller = new AbortController()
const payload = computed(() => ({...form, urls: form.kind === 'local' ? [] : urlsText.value.split(/\r?\n/).map(value => value.trim()).filter(Boolean), cache_ttl_seconds: (duration.value || 0) * unit.value}))
const dirty = computed(() => JSON.stringify(payload.value) !== saved.value)
watch(() => form.kind, kind => {
  if (initializing) return
  if (kind === 'thonly') {urlsText.value = presets.join('\n'); form.label='thonly.cc'}
  else if (kind === 'json') {urlsText.value=''; form.label=''}
})
async function load() {
  loading.value=true; error.value=''
  try {
    const {data} = await apiClient.get<CalendarSourceConfig>('/exhibitions/sources',{signal:controller.signal})
    initializing=true
    Object.assign(form,{kind:data.kind,label:data.label,urls:data.urls,cache_mode:data.cache_mode,cache_ttl_seconds:data.cache_ttl_seconds})
    presets=data.thonly_urls || []; urlsText.value=data.urls.join('\n')
    unit.value=[86400,3600,60,1].find(value => data.cache_ttl_seconds % value === 0) || 1
    duration.value=data.cache_ttl_seconds / unit.value
    await Promise.resolve(); initializing=false
    saved.value=JSON.stringify(payload.value); ready.value=true
  } catch (err) {if (!controller.signal.aborted) error.value=getErrorMessage(err,'日历数据源设置加载失败')}
  finally {loading.value=false}
}
async function save() {
  if (!ready.value || saving.value) return
  if (!duration.value || payload.value.cache_ttl_seconds > 31536000) return ElMessage.error('缓存时间应为 1 秒至 365 天')
  saving.value=true; error.value=''
  try {
    await apiClient.put('/exhibitions/sources',payload.value)
    saved.value=JSON.stringify(payload.value)
    ElMessage.success('数据源设置已保存'); emit('changed')
  } catch (err) {error.value=getErrorMessage(err,'日历数据源设置保存失败')}
  finally {saving.value=false}
}
async function refresh() {
  if (refreshing.value || dirty.value) return
  refreshing.value=true; error.value=''
  try {
    const {data} = await apiClient.post('/exhibitions/sources/refresh')
    ElMessage.success(data.message); emit('changed')
    // Discovery may have added a newly published spreadsheet; show the updated feed list.
    await load()
  } catch (err) {error.value=getErrorMessage(err,'刷新日历源失败'); emit('changed')}
  finally {refreshing.value=false}
}
onBeforeUnmount(() => controller.abort())
load()
</script>
<style scoped>
.source-settings {margin-bottom:20px}
.settings-heading {display:flex;align-items:flex-start;justify-content:space-between;gap:16px;margin-bottom:16px}
h2 {margin:0;font-size:16px}
.settings-heading p,.source-hint,.source-status {font-size:13px;line-height:1.7;color:var(--muted-text)}
.source-fields {display:flex;flex-wrap:wrap;gap:16px;margin-top:16px}
.source-fields .el-select {width:240px}
.duration-field {display:flex;gap:8px}
.duration-field .el-select {width:90px}
.source-status {border-top:1px solid var(--el-border-color-lighter);padding-top:12px;margin-top:12px}
.source-status .source-hint {margin-left:12px}
@media(max-width:600px){.settings-heading{flex-direction:column}.source-fields,.source-fields .el-form-item{width:100%}}
</style>
