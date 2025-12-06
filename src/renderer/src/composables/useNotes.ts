import { ref, computed, type Ref } from 'vue'
import { notesApi, type NoteMeta, type Settings } from '../services/notesApi'
import type { ToastTone } from './useToasts'

/**
 * Notes list management composable
 *
 * Manages the list of notes, search/filtering, and smart refresh logic.
 * Uses an optimized merge strategy to prevent unnecessary re-renders.
 *
 * @param settings - Settings ref from useSettings
 * @param addToast - Toast notification function from useToasts
 */
export function useNotes(
  settings: Ref<Settings>,
  addToast: (message: string, tone?: ToastTone) => void,
) {
  const notes = ref<NoteMeta[]>([])
  const search = ref('')
  const loadingNotes = ref(false)

  /**
   * Computed filtered and sorted notes list
   */
  const filteredNotes = computed(() => {
    const term = search.value.trim().toLowerCase()
    const sorted = [...notes.value].sort((a, b) => a.title.localeCompare(b.title))
    if (!term) return sorted
    return sorted.filter((n) => n.title.toLowerCase().includes(term))
  })

  /**
   * Refresh notes list with smart merge strategy
   *
   * Uses object reference reuse to prevent unnecessary Vue re-renders.
   * Only creates new objects for notes that have actually changed.
   */
  async function refreshNotes(): Promise<void> {
    if (!settings.value.folderPath) return

    loadingNotes.value = true
    try {
      const fetched = await notesApi.listNotes()

      // Create map of existing notes for efficient lookup
      const existingMap = new Map(notes.value.map((n) => [n.title, n]))

      // Merge strategy: reuse existing objects when data hasn't changed
      notes.value = fetched.map((fetchedNote) => {
        const existing = existingMap.get(fetchedNote.title)

        // Reuse existing object if title matches and metadata is identical
        if (
          existing &&
          existing.updatedAt === fetchedNote.updatedAt &&
          existing.createdAt === fetchedNote.createdAt
        ) {
          return existing // Same reference = no re-render
        }

        // Return new object for new or modified notes
        return fetchedNote
      })
    } catch (err: any) {
      addToast(err?.message || 'Failed to list notes', 'error')
    } finally {
      loadingNotes.value = false
    }
  }

  return {
    notes,
    search,
    loadingNotes,
    filteredNotes,
    refreshNotes,
  }
}
