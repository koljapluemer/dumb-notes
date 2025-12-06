<script setup lang="ts">
import { onMounted } from 'vue'
import { useToasts } from './composables/useToasts'
import { useSettings } from './composables/useSettings'
import { useNotes } from './composables/useNotes'
import { useCurrentNote } from './composables/useCurrentNote'
import { useAutoSave } from './composables/useAutoSave'
import NotesList from './components/NotesList.vue'
import NoteEditor from './components/NoteEditor.vue'
import SettingsModal from './components/SettingsModal.vue'
import ToastContainer from './components/ToastContainer.vue'

// Initialize composables in dependency order
const { toasts, addToast } = useToasts()
const { settings, showSettings, loadSettings, selectFolder } = useSettings(addToast)
const { notes, search, loadingNotes, filteredNotes, refreshNotes } = useNotes(settings, addToast)
const { current, openNote, createNewNote, saveNote, deleteNote } = useCurrentNote(
  settings,
  addToast,
  refreshNotes,
)

// Track last save time for auto-save throttling
let lastSaveTime = 0
function updateLastSaveTime() {
  lastSaveTime = Date.now()
}

// Auto-save with hybrid throttle + debounce
useAutoSave(current, saveNote, updateLastSaveTime)

// Lifecycle: Load settings and notes on mount
onMounted(async () => {
  await loadSettings()
  await refreshNotes()
})
</script>

<template>
  <main class="h-screen flex flex-col gap-4 p-4">
    <div class="flex-1 flex gap-4 overflow-hidden">
      <NotesList
        :notes="filteredNotes"
        :loading="loadingNotes"
        :current-title="current.originalTitle"
        :search="search"
        @open-note="openNote"
        @create="createNewNote"
        @settings="showSettings = true"
        @update:search="search = $event"
      />

      <NoteEditor
        :title="current.title"
        :body="current.body"
        :has-title="!!current.title"
        @update:title="current.title = $event"
        @update:body="current.body = $event"
        @delete="deleteNote"
      />
    </div>

    <SettingsModal
      :visible="showSettings"
      :folder-path="settings.folderPath"
      @close="showSettings = false"
      @select-folder="selectFolder().then(() => refreshNotes())"
    />

    <ToastContainer :toasts="toasts" />
  </main>
</template>
