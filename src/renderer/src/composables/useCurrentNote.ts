import { reactive, type Ref } from 'vue'
import { notesApi, type Settings } from '../services/notesApi'
import { isSafeTitle } from '../utils/validation'
import type { ToastTone } from './useToasts'

type CurrentNote = {
  title: string
  originalTitle?: string
  body: string
  updatedAt?: number
}

/**
 * Current note editing composable
 *
 * Manages the state and operations for the currently open/edited note.
 *
 * @param settings - Settings ref from useSettings
 * @param addToast - Toast notification function from useToasts
 * @param refreshNotesList - Callback to refresh the notes list
 */
export function useCurrentNote(
  settings: Ref<Settings>,
  addToast: (message: string, tone?: ToastTone) => void,
  refreshNotesList: () => Promise<void>,
) {
  const current = reactive<CurrentNote>({
    title: '',
    body: '',
  })

  /**
   * Open an existing note by title
   */
  async function openNote(title: string): Promise<void> {
    if (!settings.value.folderPath) {
      addToast('Pick a folder first', 'warning')
      return
    }

    try {
      const note = await notesApi.readNote(title)
      current.title = note.title
      current.originalTitle = note.title
      current.body = note.body
      current.updatedAt = note.updatedAt
    } catch (err: any) {
      addToast(err?.message || 'Failed to open note', 'error')
    }
  }

  /**
   * Create a new empty note
   */
  function createNewNote(): void {
    current.title = ''
    current.originalTitle = undefined
    current.body = ''
    current.updatedAt = undefined
  }

  /**
   * Save the current note
   *
   * This is called by the auto-save system.
   */
  async function saveNote(): Promise<void> {
    if (!settings.value.folderPath) return
    if (!current.title) return
    if (!isSafeTitle(current.title)) return

    const payload = {
      originalTitle: current.originalTitle,
      title: current.title,
      body: current.body,
    }

    try {
      const saved = await notesApi.saveNote(payload)
      current.originalTitle = saved.title
      current.updatedAt = saved.updatedAt
      await refreshNotesList()
    } catch (err: any) {
      addToast(err?.message || 'Failed to save', 'error')
    }
  }

  /**
   * Delete the current note
   */
  async function deleteNote(): Promise<void> {
    if (!current.title) return

    const confirmed = window.confirm(`Delete "${current.title}"?`)
    if (!confirmed) return

    try {
      await notesApi.deleteNote(current.title)
      addToast('Note deleted', 'success')

      // Clear current note
      current.title = ''
      current.body = ''
      current.originalTitle = undefined
      current.updatedAt = undefined

      await refreshNotesList()
    } catch (err: any) {
      addToast(err?.message || 'Failed to delete', 'error')
    }
  }

  return {
    current,
    openNote,
    createNewNote,
    saveNote,
    deleteNote,
  }
}
