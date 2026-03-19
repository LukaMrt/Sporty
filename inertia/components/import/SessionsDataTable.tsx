import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown, X, Undo2, Calendar, RefreshCw } from 'lucide-react'
import { router } from '@inertiajs/react'
import SessionStatusBadge from '~/components/import/SessionStatusBadge'
import StagingSessionCard from '~/components/import/StagingSessionCard'
import { useTranslation } from '~/hooks/use_translation'
import { useDateFormat } from '~/hooks/use_date_format'
import { pushToast } from '~/hooks/use_toast'
import type { StagingSession } from '~/types/staging_session'
import { formatDuration } from '~/lib/format'

interface SessionsDataTableProps {
  sessions: StagingSession[]
  connectorError?: boolean
  initialAfter?: string
  initialBefore?: string
}

function getDefaultDateRange() {
  const before = new Date()
  const after = new Date()
  after.setMonth(after.getMonth() - 1)
  return {
    after: after.toISOString().slice(0, 10),
    before: before.toISOString().slice(0, 10),
  }
}

const columnHelper = createColumnHelper<StagingSession>()

export default function SessionsDataTable({
  sessions,
  connectorError = false,
  initialAfter,
  initialBefore,
}: SessionsDataTableProps) {
  const { t } = useTranslation()
  const { formatDate, formatShortDate } = useDateFormat()
  const defaults = getDefaultDateRange()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [dateFrom, setDateFrom] = useState(initialAfter ?? defaults.after)
  const [dateTo, setDateTo] = useState(initialBefore ?? defaults.before)
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set())
  const [pendingIds, setPendingIds] = useState<Set<number>>(new Set())
  const [localSessions, setLocalSessions] = useState(sessions)
  const [showIgnored, setShowIgnored] = useState(false)

  useEffect(() => {
    setLocalSessions(sessions)
  }, [sessions])

  const isFirstRender = useRef(true)
  useEffect(() => {
    if (isFirstRender.current) {
      isFirstRender.current = false
      return
    }
    const timer = setTimeout(() => {
      router.get(
        '/connectors/strava',
        { after: dateFrom, before: dateTo },
        { preserveState: true, only: ['sessions', 'initialAfter', 'initialBefore'] }
      )
    }, 600)
    return () => clearTimeout(timer)
  }, [dateFrom, dateTo])

  const importOne = useCallback(
    async (id: number) => {
      let prevStatus: StagingSession['status'] = 'new'
      setLocalSessions((cur) => {
        const found = cur.find((s) => s.id === id)
        if (found) prevStatus = found.status
        return cur.map((s) => (s.id === id ? { ...s, status: 'importing' } : s))
      })
      setImportingIds((prev) => new Set(prev).add(id))

      try {
        const raw = document.cookie
          .split('; ')
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.split('=')[1]
        const csrfToken = raw ? decodeURIComponent(raw) : undefined

        const res = await fetch('/import/batch', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
          },
          body: JSON.stringify({ importSessionIds: [id] }),
        })

        if (!res.ok) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: prevStatus } : s))
          )
          pushToast(t('import.batch.error'), 'error')
          return
        }

        const data = (await res.json()) as {
          failed: number
          completed: number
          total: number
          dailyLimitReached?: boolean
        }
        if (data.dailyLimitReached) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: prevStatus } : s))
          )
          pushToast(t('import.rateLimit.daily'), 'error')
        } else if (data.failed > 0) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: prevStatus } : s))
          )
          pushToast(t('import.batch.error'), 'error')
        } else {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s))
          )
          pushToast(t('import.batch.success'), 'success')
        }
      } catch {
        setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: prevStatus } : s)))
        pushToast(t('import.batch.error'), 'error')
      } finally {
        setImportingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [t]
  )

  const reimportOne = useCallback(
    async (id: number) => {
      setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: 'importing' } : s)))
      setImportingIds((prev) => new Set(prev).add(id))

      try {
        const raw = document.cookie
          .split('; ')
          .find((c) => c.startsWith('XSRF-TOKEN='))
          ?.split('=')[1]
        const csrfToken = raw ? decodeURIComponent(raw) : undefined

        const res = await fetch(`/import/sessions/${id}/reimport`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'X-Requested-With': 'XMLHttpRequest',
            ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
          },
        })

        if (!res.ok) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s))
          )
          pushToast(t('import.reimport.error'), 'error')
          return
        }

        const data = (await res.json()) as {
          failed: number
          completed: number
          total: number
          dailyLimitReached?: boolean
        }
        if (data.dailyLimitReached) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s))
          )
          pushToast(t('import.rateLimit.daily'), 'error')
        } else if (data.failed > 0) {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s))
          )
          pushToast(t('import.reimport.error'), 'error')
        } else {
          setLocalSessions((cur) =>
            cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s))
          )
          pushToast(t('import.reimport.success'), 'success')
        }
      } catch {
        setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: 'imported' } : s)))
        pushToast(t('import.reimport.error'), 'error')
      } finally {
        setImportingIds((prev) => {
          const next = new Set(prev)
          next.delete(id)
          return next
        })
      }
    },
    [t]
  )

  const postAction = useCallback(
    async (url: string, successKey: string, errorKey: string): Promise<boolean> => {
      const raw = document.cookie
        .split('; ')
        .find((c) => c.startsWith('XSRF-TOKEN='))
        ?.split('=')[1]
      const csrfToken = raw ? decodeURIComponent(raw) : undefined

      const res = await fetch(url, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-Requested-With': 'XMLHttpRequest',
          ...(csrfToken ? { 'X-XSRF-TOKEN': csrfToken } : {}),
        },
      })

      if (res.ok) {
        pushToast(t(successKey), 'success')
        return true
      } else {
        pushToast(t(errorKey), 'error')
        return false
      }
    },
    [t]
  )

  const ignoreOne = useCallback(
    async (id: number) => {
      let prevStatus: StagingSession['status'] = 'new'
      setLocalSessions((cur) => {
        const found = cur.find((s) => s.id === id)
        if (found) prevStatus = found.status
        return cur.map((s) => (s.id === id ? { ...s, status: 'ignored' } : s))
      })
      setPendingIds((s) => new Set(s).add(id))
      const ok = await postAction(
        `/import/sessions/${id}/ignore`,
        'import.ignore.success',
        'import.ignore.error'
      )
      if (!ok)
        setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: prevStatus } : s)))
      setPendingIds((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    },
    [postAction]
  )

  const restoreOne = useCallback(
    async (id: number) => {
      setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: 'new' } : s)))
      setPendingIds((s) => new Set(s).add(id))
      const ok = await postAction(
        `/import/sessions/${id}/restore`,
        'import.restore.success',
        'import.restore.error'
      )
      if (!ok)
        setLocalSessions((cur) => cur.map((s) => (s.id === id ? { ...s, status: 'ignored' } : s)))
      setPendingIds((s) => {
        const n = new Set(s)
        n.delete(id)
        return n
      })
    },
    [postAction]
  )

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 - 1 : Infinity
    return localSessions.filter((s) => {
      const ts = new Date(s.date).getTime()
      return ts >= from && ts <= to && (showIgnored || s.status !== 'ignored')
    })
  }, [localSessions, dateFrom, dateTo, showIgnored])

  const columns = useMemo(
    () => [
      columnHelper.accessor('date', {
        header: ({ column }) => (
          <SortableHeader
            label={t('import.table.date')}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ getValue }) => formatDate(getValue()),
      }),
      columnHelper.accessor('name', {
        header: t('import.table.name'),
        cell: ({ getValue }) => <span className="max-w-[200px] truncate block">{getValue()}</span>,
        enableSorting: false,
      }),
      columnHelper.accessor('sportType', {
        header: ({ column }) => (
          <SortableHeader
            label={t('import.table.type')}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
      }),
      columnHelper.accessor('durationMinutes', {
        header: t('import.table.duration'),
        cell: ({ getValue }) => formatDuration(getValue()),
        enableSorting: false,
      }),
      columnHelper.accessor('distanceKm', {
        header: ({ column }) => (
          <SortableHeader
            label={t('import.table.distance')}
            sorted={column.getIsSorted()}
            onToggle={() => column.toggleSorting(column.getIsSorted() === 'asc')}
          />
        ),
        cell: ({ getValue }) => {
          const v = getValue()
          return v !== null ? `${v.toFixed(2)} ${t('import.table.distanceUnit')}` : '—'
        },
      }),
      columnHelper.accessor('status', {
        header: t('import.table.status'),
        cell: ({ getValue }) => <SessionStatusBadge status={getValue()} />,
        enableSorting: false,
        size: 120,
        minSize: 120,
        maxSize: 120,
      }),
      columnHelper.display({
        id: 'actions',
        header: t('import.table.actions'),
        cell: ({ row }) => {
          const { id, status } = row.original
          const isImporting = importingIds.has(id)
          const isPending = pendingIds.has(id)

          if (status === 'new' || status === 'failed') {
            return (
              <div className="flex items-center gap-2">
                <button
                  onClick={() => void importOne(id)}
                  disabled={isImporting || isPending || connectorError}
                  className="w-[110px] cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {isImporting ? t('import.batch.importing') : t('import.batch.button')}
                </button>
                <button
                  onClick={() => void ignoreOne(id)}
                  disabled={isPending}
                  className="w-[90px] cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {t('import.ignore.button')}
                </button>
              </div>
            )
          }

          if (status === 'ignored') {
            return (
              <button
                onClick={() => void restoreOne(id)}
                disabled={isPending}
                className="flex items-center gap-1.5 cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <Undo2 className="h-3.5 w-3.5" />
                {t('import.restore.button')}
              </button>
            )
          }

          if (status === 'imported') {
            return (
              <button
                onClick={() => void reimportOne(id)}
                disabled={isImporting || connectorError}
                className="flex items-center gap-1.5 cursor-pointer rounded-md border border-input px-3 py-1.5 text-xs font-medium text-muted-foreground transition hover:bg-muted active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                {isImporting ? t('import.reimport.importing') : t('import.reimport.button')}
              </button>
            )
          }

          return null
        },
        enableSorting: false,
      }),
    ],
    [
      t,
      formatDate,
      importingIds,
      pendingIds,
      importOne,
      reimportOne,
      ignoreOne,
      restoreOne,
      connectorError,
    ]
  )

  const table = useReactTable({
    data: filtered,
    columns,
    state: { sorting },
    onSortingChange: setSorting,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
  })

  return (
    <div className="mt-6 space-y-4">
      {/* Filtres */}
      <div className="flex flex-wrap items-center gap-3">
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t('import.filters.from')}
          <DateFilterInput
            value={dateFrom}
            max={dateTo}
            onChange={setDateFrom}
            formatDate={formatShortDate}
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t('import.filters.to')}
          <DateFilterInput
            value={dateTo}
            min={dateFrom}
            onChange={setDateTo}
            formatDate={formatShortDate}
          />
        </label>
        <button
          onClick={() => setShowIgnored((v) => !v)}
          className={`flex items-center gap-2 rounded-full px-3 py-1.5 text-xs font-medium border transition cursor-pointer select-none ${
            showIgnored
              ? 'bg-muted border-input text-foreground'
              : 'border-transparent bg-transparent text-muted-foreground hover:text-foreground hover:bg-muted/50'
          }`}
        >
          <span
            className={`inline-block h-3.5 w-3.5 rounded-full border-2 transition ${
              showIgnored ? 'bg-foreground border-foreground' : 'border-muted-foreground'
            }`}
          />
          {t('import.filters.showIgnored')}
        </button>
        <span className="text-xs text-muted-foreground">
          {filtered.length} {t('import.filters.results')}
        </span>
      </div>

      {/* Vue desktop */}
      <div className="hidden md:block rounded-lg border">
        <table className="w-full text-sm">
          <thead className="bg-muted/50">
            {table.getHeaderGroups().map((headerGroup) => (
              <tr key={headerGroup.id}>
                {headerGroup.headers.map((header) => (
                  <th
                    key={header.id}
                    className="px-4 py-3 text-left font-medium text-muted-foreground"
                    style={
                      header.column.columnDef.size
                        ? {
                            width: header.column.columnDef.size,
                            minWidth: header.column.columnDef.size,
                          }
                        : undefined
                    }
                  >
                    {header.isPlaceholder
                      ? null
                      : flexRender(header.column.columnDef.header, header.getContext())}
                  </th>
                ))}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length === 0 ? (
              <tr>
                <td
                  colSpan={columns.length}
                  className="px-4 py-8 text-center text-muted-foreground"
                >
                  {t('import.empty')}
                </td>
              </tr>
            ) : (
              table.getRowModel().rows.map((row) => (
                <tr
                  key={row.id}
                  className={`border-t transition-colors hover:bg-muted/30 ${row.original.status === 'ignored' ? 'opacity-50' : ''}`}
                >
                  {row.getVisibleCells().map((cell) => (
                    <td
                      key={cell.id}
                      className="px-4 py-3 h-14 align-middle"
                      style={
                        cell.column.columnDef.size
                          ? {
                              width: cell.column.columnDef.size,
                              minWidth: cell.column.columnDef.size,
                            }
                          : undefined
                      }
                    >
                      {flexRender(cell.column.columnDef.cell, cell.getContext())}
                    </td>
                  ))}
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Vue mobile */}
      <div className="md:hidden space-y-3">
        {filtered.length === 0 ? (
          <p className="py-8 text-center text-sm text-muted-foreground">{t('import.empty')}</p>
        ) : (
          table.getRowModel().rows.map((row) => {
            const { id, status } = row.original
            const isImporting = importingIds.has(id)
            const isPending = pendingIds.has(id)
            return (
              <div key={row.id} className={`space-y-2 ${status === 'ignored' ? 'opacity-50' : ''}`}>
                <StagingSessionCard session={row.original} />
                {(status === 'new' || status === 'failed') && (
                  <div className="flex gap-2">
                    <button
                      onClick={() => void importOne(id)}
                      disabled={isImporting || isPending}
                      className="flex-1 cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      {isImporting ? t('import.batch.importing') : t('import.batch.button')}
                    </button>
                    <button
                      onClick={() => void ignoreOne(id)}
                      disabled={isPending}
                      title={t('import.ignore.button')}
                      className="cursor-pointer rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                    >
                      <X className="h-4 w-4" />
                    </button>
                  </div>
                )}
                {status === 'ignored' && (
                  <button
                    onClick={() => void restoreOne(id)}
                    disabled={isPending}
                    className="w-full cursor-pointer rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <Undo2 className="inline h-4 w-4 mr-1" />
                    {t('import.restore.button')}
                  </button>
                )}
                {status === 'imported' && (
                  <button
                    onClick={() => void reimportOne(id)}
                    disabled={isImporting || connectorError}
                    className="w-full cursor-pointer rounded-md border border-input px-3 py-2 text-sm font-medium text-muted-foreground transition hover:bg-muted disabled:opacity-60 disabled:cursor-not-allowed"
                  >
                    <RefreshCw className="inline h-4 w-4 mr-1" />
                    {isImporting ? t('import.reimport.importing') : t('import.reimport.button')}
                  </button>
                )}
              </div>
            )
          })
        )}
      </div>
    </div>
  )
}

interface DateFilterInputProps {
  value: string
  onChange: (v: string) => void
  formatDate: (d: string) => string
  min?: string
  max?: string
}

function DateFilterInput({ value, onChange, formatDate, min, max }: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="relative rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground min-h-[44px] flex items-center min-w-[120px] cursor-pointer"
      onClick={() => inputRef.current?.showPicker()}
    >
      <span className="pointer-events-none select-none flex items-center gap-1.5">
        {value ? formatDate(value) : '—'}
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  )
}

interface SortableHeaderProps {
  label: string
  sorted: false | 'asc' | 'desc'
  onToggle: () => void
}

function SortableHeader({ label, sorted, onToggle }: SortableHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-1 font-medium text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}
