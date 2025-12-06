<script setup lang="ts">
import { onMounted, toRef } from 'vue'
import { Paperclip, Trash2, Maximize2, ExternalLink, X } from 'lucide-vue-next'
import { useToasts } from './composables/useToasts'
import { useSettings } from './composables/useSettings'
import { useNotes } from './composables/useNotes'
import { useCurrentNote } from './composables/useCurrentNote'
import { useAutoSave } from './composables/useAutoSave'
import { useAttachment } from './composables/useAttachment'
import NotesList from './components/NotesList.vue'
import NoteEditor from './components/NoteEditor.vue'
import SettingsModal from './components/SettingsModal.vue'
import ToastContainer from './components/ToastContainer.vue'
import AttachmentPanel from './components/AttachmentPanel.vue'

// Initialize composables in dependency order
const { toasts, addToast } = useToasts()
const { settings, showSettings, loadSettings, selectFolder } = useSettings(addToast)
const { notes, search, loadingNotes, showLoadingMessage, filteredNotes, refreshNotes } = useNotes(
  settings,
  addToast,
)
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

// Attachment management
const { attachment, attachmentUrl, isShowable, isFullscreen, toggleFullscreen, selectAndAddFile, removeAttachment, openExternal } = useAttachment(
  toRef(current, 'originalTitle'),
  addToast,
)

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
        :show-loading="showLoadingMessage"
        :current-title="current.originalTitle"
        :search="search"
        @open-note="openNote"
        @create="createNewNote"
        @settings="showSettings = true"
        @update:search="search = $event"
      />

      <!-- When showable attachment exists: vertical layout with attachment on top -->
      <div v-if="isShowable" class="flex-1 flex flex-col gap-4 min-w-0" style="overflow: hidden;">
        <!-- Title and buttons (fixed height) -->
        <div class="flex gap-2 shrink-0">
          <input
            id="note-title"
            :value="current.title"
            @input="current.title = ($event.target as HTMLInputElement).value"
            type="text"
            class="input w-full flex-1"
            placeholder="Untitled"
          />
          <button
            class="btn btn-square"
            @click="toggleFullscreen"
            title="Fullscreen"
          >
            <Maximize2 :size="20" />
          </button>
          <button
            class="btn btn-square"
            @click="openExternal"
            title="Open externally"
          >
            <ExternalLink :size="20" />
          </button>
          <button
            class="btn btn-square"
            @click="removeAttachment"
            title="Remove attachment"
          >
            <X :size="20" />
          </button>
          <button
            class="btn btn-square"
            :disabled="!current.title || !!attachment"
            @click="selectAndAddFile"
            title="Add attachment"
          >
            <Paperclip :size="20" />
          </button>
          <button
            class="btn btn-square"
            :disabled="!current.title"
            @click="deleteNote"
            title="Delete note"
          >
            <Trash2 :size="20" />
          </button>
        </div>

        <!-- Attachment preview (takes remaining space minus 15vh for textarea) -->
        <div class="flex-1 min-h-0 flex items-start justify-start overflow-hidden">
          <img
            v-if="attachment && attachmentUrl"
            :src="attachmentUrl"
            class="max-w-full max-h-full object-contain object-left-top"
            :alt="attachment.filename"
          />
        </div>

        <!-- Note body below attachment (fixed 15vh) -->
        <textarea
          id="note-body"
          :value="current.body"
          @input="current.body = ($event.target as HTMLTextAreaElement).value"
          class="textarea textarea-bordered resize-none w-full shrink-0"
          style="height: 15vh;"
          placeholder="Start typing..."
        />
      </div>

      <!-- When no showable attachment: horizontal layout -->
      <NoteEditor
        v-else
        :title="current.title"
        :body="current.body"
        :has-title="!!current.title"
        :has-attachment="!!attachment"
        @update:title="current.title = $event"
        @update:body="current.body = $event"
        @delete="deleteNote"
        @add-attachment="selectAndAddFile"
      />

      <!-- Non-showable attachment panel (side-by-side) -->
      <AttachmentPanel
        v-if="attachment && attachmentUrl && !isShowable"
        :attachment="attachment"
        :attachment-url="attachmentUrl"
        @toggle-fullscreen="toggleFullscreen"
        @open-external="openExternal"
        @remove="removeAttachment"
      />
    </div>

    <!-- Fullscreen overlay -->
    <div
      v-if="isFullscreen && attachment && attachmentUrl"
      class="fixed inset-0 bg-black z-50 flex items-center justify-center p-4 cursor-pointer"
      @click="toggleFullscreen"
    >
      <img
        v-if="isShowable && attachmentUrl"
        :src="attachmentUrl"
        class="max-w-full max-h-full object-contain"
        :alt="attachment.filename"
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
