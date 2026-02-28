import { useEffect, useRef, useState } from 'react'
import { usePage, router } from '@inertiajs/react'
import { CheckCircle, AlertCircle, X } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

interface Toast {
  id: number
  type: 'success' | 'error' | 'undo'
  message: string
  sessionId?: number
  visible: boolean
}

interface FlashProps {
  flash: Record<string, string>
  [key: string]: unknown
}

let nextId = 0

const DISMISS_DELAY = 5000
const TRANSITION_DURATION = 300

export default function FlashMessages() {
  const { flash } = usePage<FlashProps>().props
  const { t } = useTranslation()
  const [toasts, setToasts] = useState<Toast[]>([])
  const timersRef = useRef<Map<number, ReturnType<typeof setTimeout>>>(new Map())

  useEffect(() => {
    function scheduleAutoDismiss(id: number) {
      const timer = setTimeout(() => dismiss([id]), DISMISS_DELAY)
      timersRef.current.set(id, timer)
    }

    const incoming: Toast[] = []
    if (flash?.success)
      incoming.push({ id: nextId++, type: 'success', message: flash.success, visible: false })
    if (flash?.error)
      incoming.push({ id: nextId++, type: 'error', message: flash.error, visible: false })
    if (flash?.deleted_session_id) {
      incoming.push({
        id: nextId++,
        type: 'undo',
        message: t('sessions.flash.deleted'),
        sessionId: Number(flash.deleted_session_id),
        visible: false,
      })
    }
    if (incoming.length === 0) return

    setToasts((prev) => [...prev, ...incoming])

    requestAnimationFrame(() => {
      setToasts((prev) =>
        prev.map((toast) =>
          incoming.find((i) => i.id === toast.id) ? { ...toast, visible: true } : toast
        )
      )
      incoming.forEach((toast) => scheduleAutoDismiss(toast.id))
    })
  }, [flash, t])

  function dismiss(ids: number[]) {
    ids.forEach((id) => {
      clearTimeout(timersRef.current.get(id))
      timersRef.current.delete(id)
    })
    setToasts((prev) =>
      prev.map((toast) => (ids.includes(toast.id) ? { ...toast, visible: false } : toast))
    )
    setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => !ids.includes(toast.id)))
    }, TRANSITION_DURATION)
  }

  function handleUndo(toast: Toast) {
    dismiss([toast.id])
    router.post(`/sessions/${toast.sessionId}/restore`)
  }

  if (toasts.length === 0) return null

  return (
    <div className="fixed top-4 right-4 z-50 flex flex-col gap-2">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          style={{ transitionDuration: `${TRANSITION_DURATION}ms` }}
          className={`flex items-center gap-3 rounded-lg border px-4 py-3 text-sm shadow-lg transition-all ${
            toast.visible ? 'translate-x-0 opacity-100' : 'translate-x-4 opacity-0'
          } ${
            toast.type === 'error'
              ? 'border-red-200 bg-red-50 text-red-800'
              : 'border-green-200 bg-green-50 text-green-800'
          }`}
        >
          {toast.type === 'error' ? (
            <AlertCircle className="h-4 w-4 shrink-0" />
          ) : (
            <CheckCircle className="h-4 w-4 shrink-0" />
          )}
          <span>{toast.message}</span>
          {toast.type === 'undo' && (
            <button
              onClick={() => handleUndo(toast)}
              className="ml-1 cursor-pointer font-semibold underline opacity-80 transition hover:opacity-100"
            >
              {t('common.actions.undo')}
            </button>
          )}
          <button
            onClick={() => dismiss([toast.id])}
            className="ml-2 cursor-pointer opacity-60 transition hover:opacity-100"
            aria-label={t('common.actions.close')}
          >
            <X className="h-3.5 w-3.5" />
          </button>
        </div>
      ))}
    </div>
  )
}
