import { useCallback, useEffect, useState } from 'react'
import { pushToast } from '~/hooks/use_toast'
import { useTranslation } from '~/hooks/use_translation'
import { postJson } from '~/lib/http'
import type { StagingSession } from '~/types/staging_session'

type Status = StagingSession['status']

interface ImportResult {
  failed: number
  completed: number
  total: number
  dailyLimitReached?: boolean
}

function withoutId(set: Set<number>, id: number): Set<number> {
  const next = new Set(set)
  next.delete(id)
  return next
}

/**
 * État local de la liste d'import et actions sur une ligne (import, réimport,
 * ignorer, restaurer), avec mise à jour optimiste et retour arrière en cas d'échec.
 */
export function useStagingActions(sessions: StagingSession[]) {
  const { t } = useTranslation()
  const [localSessions, setLocalSessions] = useState(sessions)
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())

  useEffect(() => {
    setLocalSessions(sessions)
  }, [sessions])

  const setStatus = useCallback((id: number, status: Status) => {
    setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status } : s)))
  }, [])

  const statusOf = useCallback(
    (id: number): Status => localSessions.find((s) => s.id === id)?.status ?? 'new',
    [localSessions]
  )

  /** Import ou réimport : l'API renvoie un bilan (échecs, quota quotidien) */
  const runImport = useCallback(
    async (
      id: number,
      url: string,
      body: unknown,
      rollback: Status,
      keys: 'batch' | 'reimport'
    ) => {
      setStatus(id, 'importing')
      setImportingIds((prev) => new Set(prev).add(id))
      try {
        const res = await postJson(url, body)
        const data = res.ok ? ((await res.json()) as ImportResult) : null
        if (!data || data.failed > 0 || data.dailyLimitReached) {
          setStatus(id, rollback)
          pushToast(
            t(data?.dailyLimitReached ? 'import.rateLimit.daily' : `import.${keys}.error`),
            'error'
          )
        } else {
          setStatus(id, 'imported')
          pushToast(t(`import.${keys}.success`), 'success')
        }
      } catch {
        setStatus(id, rollback)
        pushToast(t(`import.${keys}.error`), 'error')
      } finally {
        setImportingIds((prev) => withoutId(prev, id))
      }
    },
    [setStatus, t]
  )

  const importOne = useCallback(
    (id: number) =>
      runImport(id, '/import/batch', { importSessionIds: [id] }, statusOf(id), 'batch'),
    [runImport, statusOf]
  )

  const reimportOne = useCallback(
    (id: number) =>
      runImport(id, `/import/sessions/${id}/reimport`, undefined, 'imported', 'reimport'),
    [runImport]
  )

  /** Ignorer / restaurer : simple bascule de statut */
  const toggle = useCallback(
    async (id: number, action: 'ignore' | 'restore', next: Status, rollback: Status) => {
      setStatus(id, next)
      setPendingIds((prev) => new Set(prev).add(id))
      try {
        const res = await postJson(`/import/sessions/${id}/${action}`)
        if (!res.ok) throw new Error(String(res.status))
        pushToast(t(`import.${action}.success`), 'success')
      } catch {
        setStatus(id, rollback)
        pushToast(t(`import.${action}.error`), 'error')
      } finally {
        setPendingIds((prev) => withoutId(prev, id))
      }
    },
    [setStatus, t]
  )

  const ignoreOne = useCallback(
    (id: number) => toggle(id, 'ignore', 'ignored', statusOf(id)),
    [toggle, statusOf]
  )
  const restoreOne = useCallback((id: number) => toggle(id, 'restore', 'new', 'ignored'), [toggle])

  return { localSessions, importingIds, pendingIds, importOne, reimportOne, ignoreOne, restoreOne }
}
