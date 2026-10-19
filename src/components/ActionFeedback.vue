<template>
  <div
    v-if="message"
    class="action-feedback"
    :class="kind"
    :role="kind === 'error' ? 'alert' : 'status'"
  >
    <span>{{ message }}</span>
    <button type="button" aria-label="关闭提示" @click="$emit('close')">×</button>
  </div>
</template>

<script setup lang="ts">
withDefaults(defineProps<{ message: string; kind?: 'error' | 'success' }>(), { kind: 'error' })
defineEmits<{ close: [] }>()
</script>

<style scoped>
.action-feedback {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  margin: 16px 0;
  padding: 12px 14px;
  border: 1px solid rgba(248, 113, 113, 0.45);
  border-radius: 8px;
  background: rgba(127, 29, 29, 0.2);
  color: #ffd7d3;
  font-size: 0.9rem;
  line-height: 1.7;
  overflow-wrap: anywhere;
}
.success {
  border-color: rgba(74, 222, 128, 0.45);
  background: rgba(20, 83, 45, 0.2);
  color: #bbf7d0;
}
button {
  flex-shrink: 0;
  border: 0;
  padding: 0 5px;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 1.2rem;
  cursor: pointer;
}
button:focus-visible {
  outline: 2px solid currentColor;
  outline-offset: 2px;
}
</style>
