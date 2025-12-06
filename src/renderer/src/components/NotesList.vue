<script setup lang="ts">
import type { NoteMeta } from '../services/notesApi'

defineProps<{
  notes: NoteMeta[]
  showLoading: boolean
  currentTitle?: string
  search: string
}>()

const emit = defineEmits<{
  (e: 'open-note', title: string): void
  (e: 'create'): void
  (e: 'settings'): void
  (e: 'update:search', value: string): void
}>()
</script>

<template>
  <aside class="w-80 flex flex-col gap-4 h-full">
    <div class="flex-1 overflow-auto bg-base-100 rounded-box border border-base-200">
      <ul class="menu w-full">
        <li v-if="showLoading"><span>Loading…</span></li>
        <li v-else-if="notes.length === 0"><span>No notes</span></li>
        <li v-else v-for="note in notes" :key="note.title" class="w-full">
          <a
            @click.prevent="emit('open-note', note.title)"
            :class="{ 'bg-black/50': note.title === currentTitle }"
          >
            {{ note.title }}
          </a>
        </li>
      </ul>
    </div>

    <input
      id="search"
      :value="search"
      @input="emit('update:search', ($event.target as HTMLInputElement).value)"
      type="text"
      name="search"
      class="input"
      placeholder="Find note"
    />

    <div class="flex flex-col gap-2">
      <button class="btn btn-sm" @click="emit('create')">New note</button>
      <button class="btn btn-sm" @click="emit('settings')">Settings</button>
    </div>
  </aside>
</template>
