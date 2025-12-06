import { watch, onBeforeUnmount, toRef, type Reactive } from 'vue'

type CurrentNote = {
  title: string
  body: string
}

/**
 * Auto-save composable with hybrid throttle + debounce strategy
 *
 * Implements intelligent auto-saving that:
 * - Saves immediately when title changes (for renames)
 * - Saves every 2 seconds max while typing (throttle, like Obsidian)
 * - Saves 500ms after pausing (debounce)
 *
 * This prevents editor lag during fast operations while ensuring data safety.
 *
 * @param current - The reactive note object to watch
 * @param saveCallback - Function to call when saving
 * @param updateLastSaveTime - Function to call after successful save
 */
export function useAutoSave(
  current: Reactive<CurrentNote>,
  saveCallback: () => Promise<void>,
  updateLastSaveTime: () => void,
) {
  let debounceTimer: number | undefined
  let throttleTimer: number | undefined
  let lastSaveTime = 0

  const THROTTLE_INTERVAL = 2000 // Max 2s between saves (Obsidian-like)
  const DEBOUNCE_DELAY = 500 // Save 500ms after pause

  /**
   * Schedule a save with hybrid throttle + debounce logic
   * @param isTitle - Whether this change is from the title field
   */
  async function scheduleSave(isTitle: boolean): Promise<void> {
    const now = Date.now()

    // Title changes: immediate save (for renames)
    if (isTitle) {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      if (throttleTimer) window.clearTimeout(throttleTimer)
      await saveCallback()
      lastSaveTime = now
      updateLastSaveTime()
      return
    }

    // Clear existing debounce
    if (debounceTimer) window.clearTimeout(debounceTimer)

    // Debounce: save after pause
    debounceTimer = window.setTimeout(() => {
      void saveCallback().then(() => {
        lastSaveTime = Date.now()
        updateLastSaveTime()
      })
    }, DEBOUNCE_DELAY)

    // Throttle: ensure save at least every 2s
    const timeSinceLastSave = now - lastSaveTime
    if (!throttleTimer && timeSinceLastSave >= THROTTLE_INTERVAL) {
      if (debounceTimer) window.clearTimeout(debounceTimer)
      await saveCallback()
      lastSaveTime = now
      updateLastSaveTime()
    } else if (!throttleTimer) {
      throttleTimer = window.setTimeout(() => {
        throttleTimer = undefined
        void saveCallback().then(() => {
          lastSaveTime = Date.now()
          updateLastSaveTime()
        })
      }, THROTTLE_INTERVAL - timeSinceLastSave)
    }
  }

  // Watch title changes (immediate save)
  watch(toRef(current, 'title'), () => {
    void scheduleSave(true)
  })

  // Watch body changes (throttle + debounce)
  watch(toRef(current, 'body'), () => {
    void scheduleSave(false)
  })

  // Cleanup timers on unmount
  function cleanup() {
    if (debounceTimer) window.clearTimeout(debounceTimer)
    if (throttleTimer) window.clearTimeout(throttleTimer)
  }

  onBeforeUnmount(cleanup)

  return {
    cleanup,
  }
}
