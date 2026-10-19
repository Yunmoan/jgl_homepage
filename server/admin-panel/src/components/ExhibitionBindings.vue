<template>
  <el-card shadow="never" class="bindings-card">
    <div class="bindings-heading"><div><h2>高联参展绑定</h2><p>从上方日历或活动列表选择来源活动，填写高联参展计划。来源更新不会覆盖这里的摊位和备注。</p></div><el-button :loading="loading" @click="load">刷新绑定</el-button></div>
    <el-alert v-if="error" :title="error" type="error" :closable="false" show-icon />
    <el-table :data="bindings" v-loading="loading" empty-text="暂无参展绑定，请从日历或活动列表选择来源活动">
      <el-table-column label="已绑定活动" min-width="240"><template #default="{row}"><strong>{{ currentEvent(row)?.title || row.event.title }}</strong><p class="binding-meta">{{ formatExhibitionDates(currentEvent(row) || row.event) }} · {{ row.event.source_label }}</p><el-tag v-if="!currentEvent(row)" type="warning" size="small">当前来源中未找到，原备注已保留</el-tag></template></el-table-column>
      <el-table-column label="参展计划" width="120"><template #default="{row}">{{ participationLabels[displayBindingParticipation(row)] }}</template></el-table-column>
      <el-table-column prop="booth" label="摊位" min-width="100" />
      <el-table-column prop="participation_notes" label="参展信息" min-width="220" show-overflow-tooltip />
      <el-table-column label="操作" width="210"><template #default="{row}"><el-button link type="primary" @click="openBinding(row)">编辑 / 重新绑定</el-button><el-button link type="danger" @click="remove(row)">解除</el-button></template></el-table-column>
    </el-table>
    <el-dialog v-model="visible" :title="editingId ? '编辑高联参展绑定' : '绑定高联参展信息'" width="640px" :close-on-click-modal="false" :close-on-press-escape="!saving" :show-close="!saving">
      <el-form label-position="top" :disabled="saving">
        <el-form-item label="绑定到来源活动"><el-select v-model="target" filterable style="width:100%" placeholder="搜索并选择来源活动" aria-label="绑定到来源活动"><el-option v-for="event in options" :key="eventIdentity(event)" :value="eventIdentity(event)" :label="`${event.title} · ${formatExhibitionDates(event)} · ${event.location || '地点待定'}`" /></el-select></el-form-item>
        <el-alert v-if="selectedEvent" :title="`${selectedEvent.title} · ${formatExhibitionDates(selectedEvent)} · ${selectedEvent.location || '地点待定'}`" :description="selectedEvent.source_status ? `来源活动状态：${selectedEvent.source_status}` : undefined" type="info" :closable="false" />
        <p v-if="orphan" class="orphan-note">当前启用的数据源中未找到原活动。可继续修改原备注，或在上方选择新活动重新绑定。原活动未返回日历前，这条绑定不会生成额外活动。</p>
        <el-form-item label="高联参展计划"><el-select v-model="form.participation" aria-label="高联参展计划"><el-option v-for="(label,status) in selectableParticipationLabels" :key="status" :value="status" :label="label" /></el-select></el-form-item>
        <el-form-item label="高联摊位"><el-input v-model="form.booth" maxlength="100" placeholder="例如 A01，待公布可留空" /></el-form-item>
        <el-form-item label="参展信息（备注）"><el-input v-model="form.participation_notes" type="textarea" :rows="5" maxlength="2000" show-word-limit placeholder="参与社团、出展内容、参展安排等（公开展示，留空不显示）" /></el-form-item>
      </el-form>
      <template #footer><el-button :disabled="saving" @click="visible=false">取消</el-button><el-button type="primary" :loading="saving" @click="save">保存绑定</el-button></template>
    </el-dialog>
  </el-card>
</template>
<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import apiClient from '../api'
import { getErrorMessage } from '../feedback'
import {
  displayBindingParticipation,
  formatExhibitionDates,
  participationLabels,
  selectableParticipationLabels,
} from '../../../../src/utils/exhibitions'
import type { Exhibition, ExhibitionBinding, Participation } from '../../../../src/utils/exhibitions'
const props=defineProps<{events:Exhibition[]}>()
const emit=defineEmits<{changed:[]}>()
const bindings=ref<ExhibitionBinding[]>([]), loading=ref(false), error=ref(''), saving=ref(false), visible=ref(false)
const editingId=ref<number|null>(null), originalEvent=ref<Exhibition>(), target=ref('')
const form=reactive({participation:'participating' as Participation,booth:'',participation_notes:''})
const controller=new AbortController()
const eventIdentity=(event: Exhibition) => `${event.source_key}|${event.source_event_id}`
const externalEvents=computed(()=>props.events.filter(event=>event.source_event_id))
const options=computed(()=>{
  const events=[...externalEvents.value]
  if(originalEvent.value && !events.some(event=>eventIdentity(event)===eventIdentity(originalEvent.value!))) events.unshift(originalEvent.value)
  return events
})
const selectedEvent=computed(()=>options.value.find(event=>eventIdentity(event)===target.value))
const orphan=computed(()=>!!selectedEvent.value && !externalEvents.value.some(event=>eventIdentity(event)===target.value))
function currentEvent(binding: ExhibitionBinding){return externalEvents.value.find(event=>event.source_key===binding.source_key && event.source_event_id===binding.source_event_id)}
async function load(){
  loading.value=true;error.value=''
  try{const {data}=await apiClient.get<ExhibitionBinding[]>('/exhibitions/bindings',{signal:controller.signal});bindings.value=data}
  catch(err){if(!controller.signal.aborted)error.value=getErrorMessage(err,'参展绑定加载失败')}
  finally{loading.value=false}
}
function openEvent(event:Exhibition){
  const binding=bindings.value.find(row=>row.source_key===event.source_key && row.source_event_id===event.source_event_id)
  editingId.value=binding?.id || event.binding_id || null
  originalEvent.value=event;target.value=eventIdentity(event)
  Object.assign(form,{participation:binding?.participation || (event.binding_id ? event.participation : 'participating'),booth:binding?.booth || event.booth || '',participation_notes:binding?.participation_notes || event.participation_notes || ''})
  visible.value=true
}
function openBinding(binding:ExhibitionBinding){
  editingId.value=binding.id;originalEvent.value=currentEvent(binding)||binding.event;target.value=eventIdentity(originalEvent.value)
  Object.assign(form,{participation:binding.participation,booth:binding.booth,participation_notes:binding.participation_notes});visible.value=true
}
async function save(){
  if(saving.value)return
  const event=selectedEvent.value
  if(!event)return ElMessage.error('请先选择来源活动')
  saving.value=true
  try{
    const body={source_key:event.source_key,source_event_id:event.source_event_id,...form}
    if(editingId.value)await apiClient.put(`/exhibitions/bindings/${editingId.value}`,body)
    else await apiClient.post('/exhibitions/bindings',body)
    ElMessage.success('高联参展信息已保存');visible.value=false;await load();emit('changed')
  }catch(err){ElMessage.error(getErrorMessage(err,'保存参展绑定失败'))}
  finally{saving.value=false}
}
async function remove(binding:ExhibitionBinding){
  if(saving.value)return
  try{await ElMessageBox.confirm(`解除「${binding.event.title}」的高联参展绑定？来源活动仍会保留。`,'解除参展绑定',{confirmButtonText:'解除绑定',cancelButtonText:'取消',type:'warning'})}catch{return}
  saving.value=true
  try{await apiClient.delete(`/exhibitions/bindings/${binding.id}`);ElMessage.success('参展绑定已解除');await load();emit('changed')}
  catch(err){ElMessage.error(getErrorMessage(err,'解除参展绑定失败'))}
  finally{saving.value=false}
}
defineExpose({openEvent,reload:load})
onBeforeUnmount(()=>controller.abort())
load()
</script>
<style scoped>
.bindings-card{margin-top:20px}.bindings-heading{display:flex;justify-content:space-between;gap:16px;margin-bottom:16px}h2{font-size:16px;margin:0}.bindings-heading p,.binding-meta{font-size:13px;line-height:1.7;color:var(--muted-text)}.binding-meta{margin:6px 0}.orphan-note{color:var(--el-color-warning);line-height:1.7;font-size:13px}.el-alert{margin-bottom:16px}
</style>
