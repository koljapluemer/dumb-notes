import { ref, computed, watch, type Ref } from 'vue'
import { notesApi, type AttachmentMeta } from '../services/notesApi'
import type { ToastTone } from './useToasts'

/**
 * Attachment management composable
 *
 * Manages file attachments for notes - loading, adding, removing, and previewing.
 *
 * @param currentNoteTitle - Ref to the current note's title
 * @param addToast - Toast notification function from useToasts
 */
export function useAttachment(
  currentNoteTitle: Ref<string | undefined>,
  addToast: (message: string, tone?: ToastTone) => void,
) {
  const attachment = ref<AttachmentMeta | null>(null)
  const attachmentUrl = ref<string | null>(null)

  /**
   * Check if attachment is an image
   */
  const isImage = computed(() => {
    if (!attachment.value) return false
    return attachment.value.mimeType.startsWith('image/')
  })

  /**
   * Check if attachment is a PDF
   */
  const isPdf = computed(() => {
    if (!attachment.value) return false
    return attachment.value.mimeType === 'application/pdf'
  })

  /**
   * Check if attachment can be previewed (image or PDF)
   */
  const isShowable = computed(() => {
    return isImage.value || isPdf.value
  })

  /**
   * Load attachment metadata and URL for current note
   */
  async function loadAttachment(): Promise<void> {
    if (!currentNoteTitle.value) {
      attachment.value = null
      attachmentUrl.value = null
      return
    }

    try {
      const meta = await notesApi.getAttachment(currentNoteTitle.value)
      attachment.value = meta

      if (meta) {
        const url = await notesApi.getAttachmentUrl(currentNoteTitle.value)
        attachmentUrl.value = url
      } else {
        attachmentUrl.value = null
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to load attachment', 'error')
      attachment.value = null
      attachmentUrl.value = null
    }
  }

  /**
   * Open file picker and add selected file as attachment
   */
  async function selectAndAddFile(): Promise<void> {
    if (!currentNoteTitle.value) {
      addToast('Save the note first before adding an attachment', 'warning')
      return
    }

    try {
      const meta = await notesApi.selectAndAddAttachment(currentNoteTitle.value)
      if (meta) {
        await loadAttachment()
        addToast('Attachment added', 'success')
      }
    } catch (err: any) {
      addToast(err?.message || 'Failed to add attachment', 'error')
    }
  }

  /**
   * Remove current attachment
   */
  async function removeAttachment(): Promise<void> {
    if (!currentNoteTitle.value || !attachment.value) return

    try {
      await notesApi.removeAttachment(currentNoteTitle.value)
      attachment.value = null
      attachmentUrl.value = null
      addToast('Attachment removed', 'success')
    } catch (err: any) {
      addToast(err?.message || 'Failed to remove attachment', 'error')
    }
  }

  /**
   * Open attachment with system default app
   */
  async function openExternal(): Promise<void> {
    if (!currentNoteTitle.value || !attachment.value) return

    try {
      await notesApi.openAttachment(currentNoteTitle.value)
    } catch (err: any) {
      addToast(err?.message || 'Failed to open attachment', 'error')
    }
  }

  // Watch for note changes and reload attachment
  watch(currentNoteTitle, () => {
    void loadAttachment()
  }, { immediate: true })

  return {
    attachment,
    attachmentUrl,
    isImage,
    isPdf,
    isShowable,
    selectAndAddFile,
    removeAttachment,
    openExternal,
  }
}
