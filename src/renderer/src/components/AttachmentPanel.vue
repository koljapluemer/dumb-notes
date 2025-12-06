<script setup lang="ts">
import type { AttachmentMeta } from '../services/notesApi'
import { computed } from 'vue'

const props = defineProps<{
  attachment: AttachmentMeta
  attachmentUrl: string | null
}>()

const emit = defineEmits<{
  (e: 'open-external'): void
  (e: 'remove'): void
}>()

const isImage = computed(() => props.attachment.mimeType.startsWith('image/'))
const isPdf = computed(() => props.attachment.mimeType === 'application/pdf')
</script>

<template>
  <div class="flex-1 flex flex-col gap-2 border-l border-base-200 pl-4 min-w-0">
    <!-- PDF preview -->
    <embed
      v-if="isPdf && attachmentUrl"
      :src="attachmentUrl"
      type="application/pdf"
      class="flex-1 min-h-0"
    />

    <!-- Image preview -->
    <img
      v-else-if="isImage && attachmentUrl"
      :src="attachmentUrl"
      class="flex-1 object-contain min-h-0"
      :alt="attachment.filename"
    />

    <!-- Other files -->
    <div v-else class="flex flex-col items-center justify-center flex-1">
      <span class="text-light">{{ attachment.filename }}</span>
    </div>

    <!-- Actions -->
    <div class="flex gap-2">
      <button class="btn btn-sm flex-1" @click="emit('open-external')">Open</button>
      <button class="btn btn-sm" @click="emit('remove')">Remove</button>
    </div>
  </div>
</template>
