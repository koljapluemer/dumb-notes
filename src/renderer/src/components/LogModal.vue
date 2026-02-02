<script setup lang="ts">
import { computed } from 'vue'
import type { NoteMeta } from '../services/notesApi'

const props = defineProps<{
  visible: boolean
  notes: NoteMeta[]
}>()

const emit = defineEmits<{
  (e: 'close'): void
  (e: 'open-note', title: string): void
}>()

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000

const staleNotes = computed(() => {
  const cutoff = Date.now() - THIRTY_DAYS_MS
  return props.notes
    .filter((note) => note.updatedAt < cutoff)
    .sort((a, b) => a.updatedAt - b.updatedAt)
})

function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString()
}

function handleOpenNote(title: string) {
  emit('open-note', title)
  emit('close')
}
</script>

<template>
  <dialog v-if="visible" class="modal modal-open">
    <div class="modal-box max-w-lg space-y-4">
      <h3 class="font-bold text-lg">Log</h3>
      <p class="text-sm text-base-content/70">Notes not edited in the last 30 days</p>

      <div v-if="staleNotes.length === 0" class="text-base-content/50">
        No old notes found
      </div>

      <div v-else class="space-y-1">
        <button
          v-for="note in staleNotes"
          :key="note.title"
          @click="handleOpenNote(note.title)"
          class="w-full text-left px-2 py-1 rounded hover:bg-base-200"
        >
          <div class="truncate">{{ note.title }}</div>
          <div class="text-xs text-base-content/50">{{ formatDate(note.updatedAt) }}</div>
        </button>
      </div>

      <div class="modal-action">
        <button class="btn" @click="emit('close')">Close</button>
      </div>
    </div>
  </dialog>
</template>
