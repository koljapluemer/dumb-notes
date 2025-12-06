<script setup lang="ts">
import type { Toast } from '../composables/useToasts'

defineProps<{
  toasts: readonly Toast[]
}>()
</script>

<template>
  <div class="toast toast-end toast-top">
    <div
      v-for="t in toasts"
      :key="t.id"
      class="alert"
      :class="{
        'alert-error': t.tone === 'error',
        'alert-success': t.tone === 'success',
        'alert-warning': t.tone === 'warning',
      }"
    >
      <span>{{ t.message }}</span>
    </div>
  </div>
</template>
