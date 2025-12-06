<script setup lang="ts">
import type { AttachmentMeta } from '../services/notesApi'
import { computed } from 'vue'
import { ExternalLink, X } from 'lucide-vue-next'

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
  <div class="flex flex-col gap-2 w-full h-full">
    <!-- PDF preview -->
    <embed
      v-if="isPdf && attachmentUrl"
      :src="attachmentUrl"
      type="application/pdf"
      class="w-full flex-1"
    />

    <!-- Image preview -->
    <img
      v-else-if="isImage && attachmentUrl"
      :src="attachmentUrl"
      class="max-w-full max-h-full object-contain object-left-top flex-1"
      :alt="attachment.filename"
    />

    <!-- Other files -->
    <div v-else class="flex flex-col items-center justify-center flex-1">
      <span class="text-light">{{ attachment.filename }}</span>
    </div>

    <!-- Actions -->
    <div class="flex gap-2 shrink-0">
      <button class="btn btn-sm btn-square flex-1" @click="emit('open-external')" title="Open externally">
        <ExternalLink :size="20" />
      </button>
      <button class="btn btn-sm btn-square" @click="emit('remove')" title="Remove attachment">
        <X :size="20" />
      </button>
    </div>
  </div>
</template>
