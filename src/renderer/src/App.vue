<script setup lang="ts">
import { onMounted, onBeforeUnmount, ref, computed, watch, toRef } from 'vue'
import { Paperclip, Trash2, Maximize2, ExternalLink, X } from 'lucide-vue-next'
import { useToasts } from './composables/useToasts'
import { useSettings } from './composables/useSettings'
import { useNotes } from './composables/useNotes'
import { useCurrentNote } from './composables/useCurrentNote'
import { useAutoSave } from './composables/useAutoSave'
import { useAttachment } from './composables/useAttachment'
import { useNoteSearch } from './composables/useNoteSearch'
import NotesList from './components/NotesList.vue'
import SearchBar from './components/SearchBar.vue'
import SettingsModal from './components/SettingsModal.vue'
import LogModal from './components/LogModal.vue'
import ToastContainer from './components/ToastContainer.vue'

// Initialize composables in dependency order
const { toasts, addToast } = useToasts()
const { settings, showSettings, loadSettings, selectFolder } = useSettings(addToast)
const { notes, search, showLoadingMessage, filteredNotes, refreshNotes } = useNotes(
  settings,
  addToast,
)
const { current, openNote, createNewNote, saveNote, deleteNote } = useCurrentNote(
  settings,
  addToast,
  refreshNotes,
)
const showLog = ref(false)

// Auto-save with hybrid throttle + debounce
useAutoSave(current, saveNote, () => {})

// Attachment management
const { attachment, attachmentUrl, isShowable, isFullscreen, toggleFullscreen, selectAndAddFile, removeAttachment, openExternal } = useAttachment(
  toRef(current, 'originalTitle'),
  addToast,
)

// Search within note
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const overlayRef = ref<HTMLDivElement | null>(null)

const {
  isOpen: searchIsOpen,
  searchQuery,
  matches,
  currentMatchIndex,
  currentMatch,
  matchCountText,
  nextMatch,
  previousMatch,
  openSearch,
  closeSearch,
} = useNoteSearch(toRef(current, 'body'))

function escapeHtml(text: string): string {
  return text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

const highlightedHtml = computed(() => {
  const text = current.body
  if (!searchIsOpen.value || matches.value.length === 0) return escapeHtml(text)
  let result = ''
  let lastEnd = 0
  matches.value.forEach((match, index) => {
    result += escapeHtml(text.slice(lastEnd, match.start))
    const matchText = escapeHtml(text.slice(match.start, match.end))
    const cls = index === currentMatchIndex.value ? 'bg-orange-400/80' : 'bg-yellow-200/70'
    result += `<mark class="${cls}">${matchText}</mark>`
    lastEnd = match.end
  })
  result += escapeHtml(text.slice(lastEnd))
  return result
})

function syncOverlayScroll() {
  if (overlayRef.value && textareaRef.value) {
    overlayRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

function scrollToCurrentMatch() {
  const match = currentMatch.value
  const ta = textareaRef.value
  if (!match || !ta) return
  const textBefore = ta.value.substring(0, match.start)
  const linesBefore = textBefore.split('\n').length - 1
  const style = window.getComputedStyle(ta)
  const lineHeight = parseFloat(style.lineHeight)
  const paddingTop = parseFloat(style.paddingTop)
  ta.scrollTop = Math.max(0, linesBefore * lineHeight + paddingTop - ta.clientHeight / 3)
  syncOverlayScroll()
}

watch(currentMatch, scrollToCurrentMatch)

function handleGlobalKeydown(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key === 'f') {
    event.preventDefault()
    openSearch()
  }
}

// Lifecycle: Load settings and notes on mount
onMounted(async () => {
  await loadSettings()
  await refreshNotes()
  window.addEventListener('keydown', handleGlobalKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleGlobalKeydown)
})
</script>

<template>
  <main class="h-screen flex flex-col gap-4 p-4 relative">
    <div class="flex-1 flex gap-4 overflow-hidden">
      <NotesList
        :notes="filteredNotes"
        :show-loading="showLoadingMessage"
        :current-title="current.originalTitle"
        :search="search"
        @open-note="openNote"
        @create="createNewNote"
        @settings="showSettings = true"
        @log="showLog = true"
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
        <div class="relative shrink-0" style="height: 15vh;">
          <div
            v-if="searchIsOpen"
            ref="overlayRef"
            class="textarea textarea-bordered absolute inset-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-transparent z-0"
            v-html="highlightedHtml"
          />
          <textarea
            ref="textareaRef"
            id="note-body"
            :value="current.body"
            @input="current.body = ($event.target as HTMLTextAreaElement).value"
            @scroll="syncOverlayScroll"
            class="textarea textarea-bordered resize-none w-full h-full absolute inset-0 z-[1]"
            :class="{ 'bg-transparent': searchIsOpen }"
            placeholder="Start typing..."
          />
        </div>
      </div>

      <!-- When no showable attachment OR no attachment at all -->
      <div v-else class="flex-1 flex flex-col gap-4 min-w-0" style="overflow: hidden;">
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
            v-if="attachment"
            class="btn btn-square"
            @click="openExternal"
            title="Open externally"
          >
            <ExternalLink :size="20" />
          </button>
          <button
            v-if="attachment"
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

        <!-- Non-showable attachment card -->
        <div
          v-if="attachment && !isShowable"
          class="flex items-center gap-2 p-2 border border-base-200 rounded shrink-0"
        >
          <span class="text-sm flex-1">{{ attachment.filename }}</span>
        </div>

        <!-- Note body -->
        <div class="relative flex-1">
          <div
            v-if="searchIsOpen"
            ref="overlayRef"
            class="textarea textarea-bordered absolute inset-0 overflow-hidden pointer-events-none whitespace-pre-wrap break-words text-transparent z-0"
            v-html="highlightedHtml"
          />
          <textarea
            ref="textareaRef"
            id="note-body"
            :value="current.body"
            @input="current.body = ($event.target as HTMLTextAreaElement).value"
            @scroll="syncOverlayScroll"
            class="textarea textarea-bordered resize-none w-full h-full absolute inset-0 z-[1]"
            :class="{ 'bg-transparent': searchIsOpen }"
            placeholder="Start typing..."
          />
        </div>
      </div>
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

    <SearchBar
      :visible="searchIsOpen"
      :match-count-text="matchCountText"
      @update:query="searchQuery = $event"
      @next="nextMatch"
      @previous="previousMatch"
      @close="closeSearch"
    />

    <SettingsModal
      :visible="showSettings"
      :folder-path="settings.folderPath"
      @close="showSettings = false"
      @select-folder="selectFolder().then(() => refreshNotes())"
    />

    <LogModal
      :visible="showLog"
      :notes="notes"
      @close="showLog = false"
      @open-note="(title) => { openNote(title); showLog = false }"
    />

    <ToastContainer :toasts="toasts" />
  </main>
</template>
