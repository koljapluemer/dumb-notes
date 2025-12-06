import { ref } from 'vue'
import { notesApi, type Settings } from '../services/notesApi'
import type { ToastTone } from './useToasts'

/**
 * Settings management composable
 *
 * Manages application settings (folder path) and settings modal visibility.
 *
 * @param addToast - Toast notification function from useToasts
 */
export function useSettings(addToast: (message: string, tone?: ToastTone) => void) {
  const settings = ref<Settings>({ folderPath: '' })
  const showSettings = ref(false)

  /**
   * Load settings from storage
   */
  async function loadSettings(): Promise<void> {
    const loaded = await notesApi.getSettings()
    settings.value = {
      folderPath: loaded.folderPath || '',
    }

    if (!settings.value.folderPath) {
      showSettings.value = true
      addToast('Select a notes folder to start', 'warning')
    }
  }

  /**
   * Open folder picker and update settings
   */
  async function selectFolder(): Promise<void> {
    const picked = await notesApi.selectFolder()
    if (picked) {
      settings.value = await notesApi.setSettings({ folderPath: picked })
      addToast('Folder selected', 'success')
    }
  }

  return {
    settings,
    showSettings,
    loadSettings,
    selectFolder,
  }
}
