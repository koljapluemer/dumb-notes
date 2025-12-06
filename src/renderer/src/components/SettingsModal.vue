<script setup lang="ts">
defineProps<{
  visible: boolean
  folderPath: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'select-folder'): void
}>()
</script>

<template>
  <dialog v-if="visible" class="modal modal-open">
    <div class="modal-box max-w-lg space-y-4">
      <h3 class="font-bold text-lg">Settings</h3>

      <div class="space-y-2">
        <p class="text-light">Notes folder</p>
        <div class="flex items-center gap-2">
          <span class="truncate text-sm">{{ folderPath || 'Not set' }}</span>
          <button class="btn btn-primary btn-sm" @click="emit('select-folder')">Choose…</button>
        </div>
      </div>

      <div class="modal-action">
        <button class="btn" @click="emit('close')">Close</button>
      </div>
    </div>
  </dialog>
</template>
