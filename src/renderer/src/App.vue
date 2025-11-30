<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { Trash2 } from 'lucide-vue-next'

type Settings = {
  folderPath: string
}

type NoteMeta = {
  title: string
  updatedAt: number
  createdAt: number
}

type NoteRead = {
  title: string
  body: string
  updatedAt: number
}

type Toast = { id: number; message: string; tone?: 'error' | 'success' | 'info' | 'warning' }

const api = window.notesApi

const settings = ref<Settings>({ folderPath: '' })
const notes = ref<NoteMeta[]>([])
const loadingNotes = ref(false)

const current = reactive<{
  title: string
  originalTitle?: string
  body: string
  updatedAt?: number
}>({
  title: '',
  body: '',
})

const search = ref('')

const showSettings = ref(false)

const toasts = ref<Toast[]>([])
let toastId = 1

let saveTimer: number | undefined

const filteredNotes = computed(() => {
  const term = search.value.trim().toLowerCase()
  const sorted = [...notes.value].sort((a, b) => a.title.localeCompare(b.title))
  if (!term) return sorted
  return sorted.filter((n) => n.title.toLowerCase().includes(term))
})

const safeTitle = (title: string) =>
  title &&
  !title.endsWith(' ') &&
  !title.endsWith('.') &&
  !title.includes('..') &&
  !/[<>:"/\\|?*\x00-\x1F]/.test(title) &&
  !['CON', 'PRN', 'AUX', 'NUL', 'COM1', 'COM2', 'COM3', 'COM4', 'COM5', 'COM6', 'COM7', 'COM8', 'COM9', 'LPT1', 'LPT2', 'LPT3', 'LPT4', 'LPT5', 'LPT6', 'LPT7', 'LPT8', 'LPT9'].includes(
    title.toUpperCase(),
  )

function addToast(message: string, tone: Toast['tone'] = 'info') {
  const id = toastId++
  toasts.value.push({ id, message, tone })
  setTimeout(() => {
    toasts.value = toasts.value.filter((t) => t.id !== id)
  }, 4000)
}

async function loadSettings() {
  const s: Settings = await api.getSettings()
  settings.value = {
    folderPath: s.folderPath || '',
  }
  if (!settings.value.folderPath) {
    showSettings.value = true
    addToast('Select a notes folder to start', 'warning')
  }
}

async function refreshNotes() {
  if (!settings.value.folderPath) return
  loadingNotes.value = true
  try {
    notes.value = await api.listNotes()
  } catch (err: any) {
    addToast(err?.message || 'Failed to list notes', 'error')
  } finally {
    loadingNotes.value = false
  }
}

async function openNote(title: string) {
  if (!settings.value.folderPath) {
    addToast('Pick a folder first', 'warning')
    showSettings.value = true
    return
  }
  try {
    const note: NoteRead = await api.readNote(title)
    current.title = note.title
    current.originalTitle = note.title
    current.body = note.body
    current.updatedAt = note.updatedAt
  } catch (err: any) {
    addToast(err?.message || 'Failed to open note', 'error')
  }
}

function createNewNote() {
  current.title = ''
  current.originalTitle = undefined
  current.body = ''
  current.updatedAt = undefined
}

async function deleteCurrent() {
  if (!current.title) return
  const confirmed = window.confirm(`Delete "${current.title}"?`)
  if (!confirmed) return
  try {
    await api.deleteNote(current.title)
    addToast('Note deleted', 'success')
    current.title = ''
    current.body = ''
    current.originalTitle = undefined
    await refreshNotes()
  } catch (err: any) {
    addToast(err?.message || 'Failed to delete', 'error')
  }
}

async function saveNow() {
  if (!settings.value.folderPath) return
  if (!current.title) return
  if (!safeTitle(current.title)) return

  const payload = {
    originalTitle: current.originalTitle,
    title: current.title,
    body: current.body,
  }
  try {
    const saved = await api.saveNote(payload)
    current.originalTitle = saved.title
    current.updatedAt = saved.updatedAt
    await refreshNotes()
  } catch (err: any) {
    addToast(err?.message || 'Failed to save', 'error')
  }
}

function scheduleSave() {
  if (saveTimer) window.clearTimeout(saveTimer)
  saveTimer = window.setTimeout(() => {
    void saveNow()
  }, 650)
}

watch(
  () => [current.title, current.body],
  () => {
    scheduleSave()
  },
)

async function selectFolder() {
  const picked = await api.selectFolder()
  if (picked) {
    settings.value = await api.setSettings({ folderPath: picked })
    addToast('Folder selected', 'success')
    await refreshNotes()
  }
}

onMounted(async () => {
  await loadSettings()
  await refreshNotes()
})

onBeforeUnmount(() => {
  if (saveTimer) window.clearTimeout(saveTimer)
})
</script>

<template>
  <main class="h-screen flex flex-col gap-4 p-4">
    <div class="flex-1 flex gap-4 overflow-hidden">
      <aside class="w-80 flex flex-col gap-4 h-full">


        <div class="flex-1 overflow-auto bg-base-100 rounded-box border border-base-200">
          <ul class="menu w-full">
            <li v-if="loadingNotes"><span>Loading…</span></li>
            <li v-else-if="filteredNotes.length === 0"><span>No notes</span></li>
            <li v-for="note in filteredNotes" :key="note.title" class="w-full">
              <a @click.prevent="openNote(note.title)" :class="{ 'bg-black/50': note.title === current.originalTitle }">
                {{ note.title }}
              </a>
            </li>
          </ul>
        </div>

        <input id="search" v-model="search" type="text" name="search" class="input" placeholder="Find note" />

        <div class="flex flex-col gap-2">
          <button class="btn  btn-sm" @click="createNewNote">New note</button>
          <button class="btn  btn-sm" @click="showSettings = true">Settings</button>
        </div>

      </aside>

      <section class="flex-1 flex flex-col gap-4 min-w-0 w-full h-full min-h-0">
        <div class="flex gap-2 w-full flex-1">
          <input id="note-title " v-model="current.title" type="text" name="note-title" class="input w-full flex-1"
            placeholder="Untitled" />
          <button class="btn btn-square " :disabled="!current.title" @click="deleteCurrent" title="Delete note">
            <Trash2 :size="20" />
          </button>
        </div>

        <textarea id="note-body" v-model="current.body"
          class="textarea textarea-bordered h-full min-h-[50vh] resize-none w-full" placeholder="Start typing..." />
      </section>
    </div>

    <!-- Settings -->
    <dialog v-if="showSettings" class="modal modal-open">
      <div class="modal-box max-w-lg space-y-4">
        <h3 class="font-bold text-lg">Settings</h3>

        <div class="space-y-2">
          <p class="text-light">Notes folder</p>
          <div class="flex items-center gap-2">
            <span class="truncate text-sm">{{ settings?.folderPath || 'Not set' }}</span>
            <button class="btn btn-primary btn-sm" @click="selectFolder">Choose…</button>
          </div>
        </div>

        <div class="modal-action">
          <button class="btn" @click="showSettings = false">Close</button>
        </div>
      </div>
    </dialog>

    <!-- Toasts -->
    <div class="toast toast-end toast-top">
      <div v-for="t in toasts" :key="t.id" class="alert" :class="{
        'alert-error': t.tone === 'error',
        'alert-success': t.tone === 'success',
        'alert-warning': t.tone === 'warning',
      }">
        <span>{{ t.message }}</span>
      </div>
    </div>
  </main>
</template>
