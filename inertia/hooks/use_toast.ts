type ToastType = 'success' | 'error'
type ToastHandler = (message: string, type: ToastType) => void

let handler: ToastHandler | null = null

export function registerToastHandler(fn: ToastHandler): () => void {
  handler = fn
  return () => {
    handler = null
  }
}

export function pushToast(message: string, type: ToastType = 'success'): void {
  handler?.(message, type)
}
