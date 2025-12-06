import { ref, readonly } from 'vue'

export type ToastTone = 'error' | 'success' | 'info' | 'warning'

export type Toast = {
  id: number
  message: string
  tone?: ToastTone
}

/**
 * Toast notification system composable
 *
 * Manages a queue of toast notifications with auto-dismiss functionality.
 * Toasts automatically disappear after 4 seconds.
 *
 * @example
 * ```ts
 * const { toasts, addToast } = useToasts()
 * addToast('Note saved!', 'success')
 * addToast('Failed to load', 'error')
 * ```
 */
export function useToasts() {
  const toasts = ref<Toast[]>([])
  let toastId = 1

  /**
   * Add a new toast notification
   * @param message - The message to display
   * @param tone - The visual tone/severity (default: 'info')
   */
  function addToast(message: string, tone: ToastTone = 'info'): void {
    const id = toastId++
    toasts.value.push({ id, message, tone })

    // Auto-dismiss after 4 seconds
    setTimeout(() => {
      toasts.value = toasts.value.filter((t) => t.id !== id)
    }, 4000)
  }

  return {
    toasts: readonly(toasts),
    addToast,
  }
}
