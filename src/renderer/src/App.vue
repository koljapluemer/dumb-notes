<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'

type Settings = {
  folderPath: string
  shortcuts: Record<string, string>
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

const defaultShortcuts = {
  openPalette: 'Ctrl+O',
  commandPalette: 'Ctrl+P',
  deleteNote: '',
  settings: '',
}

const settings = ref<Settings>({ folderPath: '', shortcuts: { ...defaultShortcuts } })
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
const sortMode = ref<'updated' | 'created' | 'alpha'>('updated')

const showOpenPalette = ref(false)
const showCommandPalette = ref(false)
const showSettings = ref(false)

const toasts = ref<Toast[]>([])
let toastId = 1

let saveTimer: number | undefined

const shortcuts = computed(() => {
  const base = settings.value?.shortcuts ?? {}
  return {
    openPalette: base.openPalette || defaultShortcuts.openPalette,
    commandPalette: base.commandPalette || defaultShortcuts.commandPalette,
    deleteNote: base.deleteNote || defaultShortcuts.deleteNote,
    settings: base.settings || defaultShortcuts.settings,
  }
})

const filteredNotes = computed(() => {
  const term = search.value.trim().toLowerCase()
  const sorted = [...notes.value].sort((a, b) => {
    if (sortMode.value === 'alpha') return a.title.localeCompare(b.title)
    if (sortMode.value === 'created') return b.createdAt - a.createdAt
    return b.updatedAt - a.updatedAt
  })
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
    shortcuts: { ...defaultShortcuts, ...(s.shortcuts || {}) },
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

function newNoteWithTitle(title: string) {
  current.title = title
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
  if (!current.title) {
    addToast('Title required', 'warning')
    return
  }
  if (!safeTitle(current.title)) {
    addToast('Unsafe or invalid title', 'warning')
    return
  }
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

function handleKeydown(e: KeyboardEvent) {
  const combo = (e.ctrlKey ? 'Ctrl+' : '') + (e.metaKey ? 'Meta+' : '') + e.key.toUpperCase()
  const match = (expected: string) => expected && combo === expected.toUpperCase()
  if (match(shortcuts.value.openPalette)) {
    e.preventDefault()
    showOpenPalette.value = true
  } else if (match(shortcuts.value.commandPalette)) {
    e.preventDefault()
    showCommandPalette.value = true
  } else if (match(shortcuts.value.deleteNote)) {
    e.preventDefault()
    void deleteCurrent()
  } else if (match(shortcuts.value.settings)) {
    e.preventDefault()
    showSettings.value = true
  }
}

function confirmOpenPalette() {
  if (filteredNotes.value.length === 0 && search.value) {
    newNoteWithTitle(search.value)
    showOpenPalette.value = false
    return
  }
  const first = filteredNotes.value[0]
  if (first) {
    void openNote(first.title)
    showOpenPalette.value = false
  }
}

async function saveShortcuts() {
  await api.setSettings({ shortcuts: settings.value.shortcuts })
  addToast('Shortcuts saved', 'success')
}

onMounted(async () => {
  await loadSettings()
  await refreshNotes()
  window.addEventListener('keydown', handleKeydown)
})

onBeforeUnmount(() => {
  window.removeEventListener('keydown', handleKeydown)
  if (saveTimer) window.clearTimeout(saveTimer)
})
</script>

<template>
  <main class="h-screen flex flex-col gap-4 p-4">
    <div class="flex-1 flex gap-4 overflow-hidden">
      <aside class="w-80 flex flex-col gap-4 h-full">
        <fieldset class="fieldset">
          <label for="search" class="label">Search</label>
          <input id="search" v-model="search" type="text" name="search" class="input" placeholder="Find note" />
        </fieldset>

        <fieldset class="fieldset">
          <select id="sort" v-model="sortMode" class="select select-bordered w-full">
            <option value="updated">↓ Updated (newest)</option>
            <option value="created">↓ Created (newest)</option>
            <option value="alpha">↓ Alphabetical</option>
          </select>
        </fieldset>


        <div class="flex-1 overflow-auto bg-base-100 rounded-box border border-base-200">
          <ul class="menu">
            <li v-if="loadingNotes"><span>Loading…</span></li>
            <li v-else-if="filteredNotes.length === 0"><span>No notes</span></li>
            <li v-for="note in filteredNotes" :key="note.title">
              <a @click.prevent="openNote(note.title)">{{ note.title }}</a>
            </li>
          </ul>
        </div>

        <button class="btn btn-outline btn-sm" @click="showSettings = true">Settings</button>

      </aside>

      <section class="flex-1 flex flex-col gap-4 min-w-0 w-full h-full min-h-0">
        <fieldset class="fieldset">
          <label for="note-title" class="label">Title</label>
          <input id="note-title" v-model="current.title" type="text" name="note-title" class="input"
            placeholder="Untitled" />
        </fieldset>

        <textarea id="note-body" v-model="current.body"
          class="textarea textarea-bordered h-full min-h-[50vh] resize-none w-full" placeholder="Start typing..." />
      </section>
    </div>

    <!-- Open palette -->
    <dialog v-if="showOpenPalette" class="modal modal-open">
      <div class="modal-box max-w-xl">
        <h3 class="font-bold text-lg">Open note</h3>
        <div class="mt-2 space-y-2">
          <input v-model="search" type="text" class="input input-bordered w-full" placeholder="Type to search or create"
            @keyup.enter="confirmOpenPalette" />
          <ul class="menu bg-base-100 rounded-box border border-base-200 max-h-64 overflow-auto">
            <li v-for="note in filteredNotes.slice(0, 8)" :key="note.title" @click="
              openNote(note.title);
            showOpenPalette = false;
            ">
              <a>{{ note.title }}</a>
            </li>
            <li v-if="filteredNotes.length === 0 && search">
              <a class="text-primary" @click="
                newNoteWithTitle(search);
              showOpenPalette = false;
              ">
                Create "{{ search }}"
              </a>
            </li>
          </ul>
        </div>
        <div class="modal-action">
          <button class="btn" @click="showOpenPalette = false">Close</button>
        </div>
      </div>
    </dialog>

    <!-- Command palette -->
    <dialog v-if="showCommandPalette" class="modal modal-open">
      <div class="modal-box max-w-md">
        <h3 class="font-bold text-lg">Commands</h3>
        <ul class="menu bg-base-100 rounded-box border border-base-200 mt-3">
          <li>
            <a @click="
              deleteCurrent();
            showCommandPalette = false;
            ">
              Delete current note
            </a>
          </li>
        </ul>
        <div class="modal-action">
          <button class="btn" @click="showCommandPalette = false">Close</button>
        </div>
      </div>
    </dialog>

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

        <div class="space-y-2">
          <p class="text-light">Shortcuts</p>
          <div class="grid grid-cols-2 gap-2">
            <label class="label">Open palette</label>
            <input v-model="settings.shortcuts.openPalette" class="input input-bordered" />

            <label class="label">Command palette</label>
            <input v-model="settings.shortcuts.commandPalette" class="input input-bordered" />

            <label class="label">Delete note</label>
            <input v-model="settings.shortcuts.deleteNote" class="input input-bordered" />

            <label class="label">Settings</label>
            <input v-model="settings.shortcuts.settings" class="input input-bordered" />
          </div>
          <p class="text-light text-sm">
            Use strings like "Ctrl+O" or "Ctrl+Shift+K". Defaults: Ctrl+O (open), Ctrl+P (command).
          </p>
          <button class="btn btn-outline btn-sm" @click="saveShortcuts">
            Save shortcuts
          </button>
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
