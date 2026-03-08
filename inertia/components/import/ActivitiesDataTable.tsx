import React, { useCallback, useMemo, useState } from 'react'
import {
  createColumnHelper,
  flexRender,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  useReactTable,
  type SortingState,
} from '@tanstack/react-table'
import { ArrowUpDown, ArrowUp, ArrowDown } from 'lucide-react'
import ActivityStatusBadge from '~/components/import/ActivityStatusBadge'
import ActivityCard from '~/components/import/ActivityCard'
import { useTranslation } from '~/hooks/use_translation'
import { router } from '@inertiajs/react'
import { pushToast } from '~/hooks/use_toast'

interface StagingActivity {
  id: number
  externalId: string
  status: string
  date: string
  name: string
  sportType: string
  durationMinutes: number
  distanceKm: number | null
}

interface ActivitiesDataTableProps {
  activities: StagingActivity[]
}

function formatDuration(minutes: number): string {
  const h = Math.floor(minutes / 60)
  const m = Math.round(minutes % 60)
  return h > 0 ? `${h}h${m.toString().padStart(2, '0')}` : `${m}min`
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

const columnHelper = createColumnHelper<StagingActivity>()

export default function ActivitiesDataTable({ activities }: ActivitiesDataTableProps) {
  const { t } = useTranslation()
  const defaults = getDefaultDateRange()
  const [sorting, setSorting] = useState<SortingState>([{ id: 'date', desc: true }])
  const [dateFrom, setDateFrom] = useState(defaults.after)
  const [dateTo, setDateTo] = useState(defaults.before)
  const [importingIds, setImportingIds] = useState<Set<number>>(new Set())

  const importOne = useCallback(
    async (id: number) => {
      const showToast = (message: string, ok: boolean) =>
        pushToast(message, ok ? 'success' : 'error')
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
          body: JSON.stringify({ importActivityIds: [id] }),
        })

        if (!res.ok) {
          showToast(t('import.batch.error'), false)
          return
        }

        // Poll until done
        await new Promise<void>((resolve) => {
          const interval = setInterval(() => {
            void (async () => {
              try {
                const progRes = await fetch('/import/progress', {
                  headers: { 'X-Requested-With': 'XMLHttpRequest' },
                })
                const data = (await progRes.json()) as {
                  total: number
                  completed: number
                  failed: number
                  errors: string[]
                }
                if (data.completed + data.failed >= data.total && data.total > 0) {
                  clearInterval(interval)
                  if (data.failed > 0) {
                    showToast(t('import.batch.error'), false)
                  } else {
                    showToast(t('import.batch.success'), true)
                    router.reload({ only: ['activities'] })
                  }
                  resolve()
                }
              } catch {
                clearInterval(interval)
                showToast(t('import.batch.error'), false)
                resolve()
              }
            })()
          }, 1500)
        })
      } catch {
        showToast(t('import.batch.error'), false)
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

  const filtered = useMemo(() => {
    const from = dateFrom ? new Date(dateFrom).getTime() : -Infinity
    const to = dateTo ? new Date(dateTo).getTime() + 86_400_000 - 1 : Infinity
    return activities.filter((a) => {
      const ts = new Date(a.date).getTime()
      return ts >= from && ts <= to
    })
  }, [activities, dateFrom, dateTo])

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
        cell: ({ getValue }) =>
          new Date(getValue()).toLocaleDateString('fr-FR', {
            day: '2-digit',
            month: 'short',
            year: 'numeric',
          }),
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
        cell: ({ getValue }) => <ActivityStatusBadge status={getValue()} />,
        enableSorting: false,
      }),
      columnHelper.display({
        id: 'actions',
        header: t('import.table.actions'),
        cell: ({ row }) => {
          if (row.original.status !== 'new') return null
          const id = row.original.id
          const isImporting = importingIds.has(id)
          return (
            <button
              onClick={() => void importOne(id)}
              disabled={isImporting}
              className="w-[110px] cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {isImporting ? t('import.batch.importing') : t('import.batch.button')}
            </button>
          )
        },
        enableSorting: false,
      }),
    ],
    [t, importingIds, importOne]
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
          <input
            type="date"
            value={dateFrom}
            max={dateTo}
            onChange={(e) => setDateFrom(e.target.value)}
            className="rounded-md border cursor-pointer border-input bg-background px-2 py-1 text-sm text-foreground min-h-[44px]"
          />
        </label>
        <label className="flex items-center gap-2 text-sm text-muted-foreground">
          {t('import.filters.to')}
          <input
            type="date"
            value={dateTo}
            min={dateFrom}
            onChange={(e) => setDateTo(e.target.value)}
            className="rounded-md border cursor-pointer border-input bg-background px-2 py-1 text-sm text-foreground min-h-[44px]"
          />
        </label>
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
                <tr key={row.id} className="border-t transition-colors hover:bg-muted/30">
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id} className="px-4 py-3">
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
          table.getRowModel().rows.map((row) => (
            <div key={row.id} className="space-y-2">
              <ActivityCard activity={row.original} />
              {row.original.status === 'new' && (
                <button
                  onClick={() => void importOne(row.original.id)}
                  disabled={importingIds.has(row.original.id)}
                  className="w-full cursor-pointer rounded-md bg-primary px-3 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90 disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  {importingIds.has(row.original.id)
                    ? t('import.batch.importing')
                    : t('import.batch.button')}
                </button>
              )}
            </div>
          ))
        )}
      </div>
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
