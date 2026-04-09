<script setup lang="ts">
import { Trash2 } from 'lucide-vue-next'

defineProps<{
  title: string
  body: string
  hasTitle: boolean
}>()

const emit = defineEmits<{
  (e: 'update:title', value: string): void
  (e: 'update:body', value: string): void
  (e: 'delete'): void
}>()
</script>

<template>
  <section class="flex-1 flex flex-col gap-4 min-w-0 w-full h-full min-h-0">
    <div class="flex gap-2 w-full flex-1">
      <input
        id="note-title"
        :value="title"
        @input="emit('update:title', ($event.target as HTMLInputElement).value)"
        type="text"
        name="note-title"
        class="input w-full flex-1"
        placeholder="Untitled"
      />
      <button
        class="btn btn-square"
        :disabled="!hasTitle"
        @click="emit('delete')"
        title="Delete note"
      >
        <Trash2 :size="20" />
      </button>
    </div>

    <textarea
      id="note-body"
      :value="body"
      @input="emit('update:body', ($event.target as HTMLTextAreaElement).value)"
      class="textarea textarea-bordered h-full min-h-[50vh] resize-none w-full"
      placeholder="Start typing..."
    />
  </section>
</template>
