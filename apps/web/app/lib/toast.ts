import { toastManager } from '@/components/ui/toast'

// Thin wrapper over the coss toast manager with the call shape the pages use.
export const toast = {
  success: (title: string, description?: string) => toastManager.add({ type: 'success', title, description }),
  error: (title: string, description?: string) => toastManager.add({ type: 'error', title, description }),
  info: (title: string, description?: string) => toastManager.add({ type: 'info', title, description }),
  /** A success toast with an Undo button that closes it. */
  undoable: (title: string, onUndo: () => void) => {
    const id = toastManager.add({
      type: 'success',
      title,
      timeout: 6000,
      actionProps: { children: 'Undo', onClick: () => { toastManager.close(id); onUndo() } },
    })
    return id
  },
}
