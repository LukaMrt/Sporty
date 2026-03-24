import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import type { PlannedSession } from '~/types/planning'
import { ZONE_COLORS } from '~/lib/planning_colors'
import PlannedSessionDetail from './PlannedSessionDetail'
import EditSessionSheet from './EditSessionSheet'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

// ── Constantes ────────────────────────────────────────────────────────────────

const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]

function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

// ── Types ─────────────────────────────────────────────────────────────────────

interface DaySlot {
  dow: number
  session: PlannedSession | null
  date: Date
  isToday: boolean
}

interface Props {
  days: DaySlot[]
  planStartDate: string
  selectedWeek: number
  locale: string
  /** Callback optimiste : met à jour la session dans le state parent */
  onSessionUpdated: (updated: PlannedSession) => void
}

// ── Carte draggable ───────────────────────────────────────────────────────────

function DraggableSessionCard({
  session,
  isToday,
  isOpen,
  onClick,
  onEditClick,
}: {
  session: PlannedSession
  isToday: boolean
  isOpen: boolean
  onClick: () => void
  onEditClick: () => void
}) {
  const { t } = useTranslation()
  const { formatSpeed } = useUnitConversion()
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: session.id,
    disabled: session.status === 'completed',
  })

  const style = isDragging ? { visibility: 'hidden' as const } : undefined

  const isCompleted = session.status === 'completed'
  const isSkipped = session.status === 'skipped'

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...(!isCompleted ? listeners : {})}
      {...(!isCompleted ? attributes : {})}
    >
      <button
        onClick={onClick}
        className={[
          'cursor-pointer w-full text-left rounded-lg border p-3 flex items-center gap-3 transition-colors',
          isOpen ? 'rounded-b-none border-b-0' : '',
          isToday ? 'border-primary' : 'border-border',
          'bg-card',
          isSkipped ? 'opacity-50' : '',
        ].join(' ')}
      >
        <span
          className={[
            'flex-shrink-0 w-2 h-2 rounded-full',
            isCompleted ? 'bg-emerald-400' : (ZONE_COLORS[session.intensityZone] ?? 'bg-border'),
          ].join(' ')}
        />
        <div className="flex-1 min-w-0">
          <div className="text-sm font-medium text-foreground leading-tight">
            {t(`planning.sessions.types.${session.sessionType}`)}
            {isCompleted && <span className="ml-1 text-emerald-500">✓</span>}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
            <span>{session.targetDurationMinutes} min</span>
            {session.targetDistanceKm && <span>· {session.targetDistanceKm} km</span>}
            {session.targetPacePerKm && (
              <span>· {formatSpeed(parsePaceString(session.targetPacePerKm))}</span>
            )}
          </div>
        </div>
        <span
          className={[
            'text-muted-foreground text-xs flex-shrink-0 transition-transform',
            isOpen ? 'rotate-90' : '',
          ].join(' ')}
        >
          ›
        </span>
      </button>

      {isOpen && (
        <PlannedSessionDetail
          session={session}
          borderClass={isToday ? 'border-primary' : 'border-border'}
          onEditClick={!isCompleted ? onEditClick : undefined}
        />
      )}
    </div>
  )
}

// ── Carte fantôme (DragOverlay) ───────────────────────────────────────────────

function GhostCard({ session, width }: { session: PlannedSession; width?: number }) {
  const { t } = useTranslation()
  return (
    <div
      style={{ width: width ?? '100%' }}
      className="rounded-lg border border-primary bg-card p-3 flex items-center gap-3 shadow-lg opacity-90"
    >
      <span
        className={`flex-shrink-0 w-2 h-2 rounded-full ${ZONE_COLORS[session.intensityZone] ?? 'bg-border'}`}
      />
      <div className="flex-1 min-w-0">
        <div className="text-sm font-medium text-foreground leading-tight">
          {t(`planning.sessions.types.${session.sessionType}`)}
        </div>
        <div className="text-xs text-muted-foreground">{session.targetDurationMinutes} min</div>
      </div>
    </div>
  )
}

// ── Slot droppable (jour de repos) ────────────────────────────────────────────

function DroppableDaySlot({
  dow,
  isToday,
  children,
}: {
  dow: number
  isToday: boolean
  children: React.ReactNode
}) {
  const { t } = useTranslation()
  const { setNodeRef, isOver } = useDroppable({ id: dow })

  return (
    <div
      ref={setNodeRef}
      className={[
        'rounded-lg border px-3 py-2 text-sm transition-colors min-h-[42px] flex items-center',
        isOver
          ? 'border-primary bg-primary/10 border-dashed'
          : isToday
            ? 'border-primary/30 bg-primary/5 text-muted-foreground'
            : 'border-border border-dashed bg-card text-muted-foreground',
      ].join(' ')}
    >
      {isOver ? (
        <span className="text-primary font-medium text-xs">{t('planning.overview.dropHere')}</span>
      ) : (
        children
      )}
    </div>
  )
}

// ── Composant principal ───────────────────────────────────────────────────────

export default function WeekDndView({ days, onSessionUpdated }: Props) {
  const { t } = useTranslation()
  const [openSessionId, setOpenSessionId] = useState<number | null>(null)
  const [draggingSession, setDraggingSession] = useState<PlannedSession | null>(null)
  const [dragWidth, setDragWidth] = useState<number | undefined>()
  const [editingSession, setEditingSession] = useState<PlannedSession | null>(null)

  // Jours qui ont déjà une séance — ne doivent pas être droppables
  const occupiedDows = new Set(
    days.filter((d) => d.session && d.session.sessionType !== 'rest').map((d) => d.dow)
  )

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } })
  )

  function handleDragStart(event: DragStartEvent) {
    const session = days.find((d) => d.session?.id === event.active.id)?.session ?? null
    setDraggingSession(session)
    setDragWidth(event.active.rect.current.translated?.width)
    setOpenSessionId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingSession(null)
    const { active, over } = event
    if (!over) return

    const targetDow = over.id as number
    const session = days.find((d) => d.session?.id === active.id)?.session
    if (!session || session.dayOfWeek === targetDow) return

    // Optimistic update
    onSessionUpdated({ ...session, dayOfWeek: targetDow })

    router.put(
      `/planning/sessions/${session.id}`,
      { day_of_week: targetDow },
      {
        preserveScroll: true,
      }
    )
  }

  const dayFmt = new Intl.DateTimeFormat('fr', { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat('fr', { day: 'numeric', month: 'short' })

  return (
    <>
      <DndContext sensors={sensors} onDragStart={handleDragStart} onDragEnd={handleDragEnd}>
        <div className="space-y-2">
          {DAY_ORDER.map((dow) => {
            const slot = days.find((d) => d.dow === dow)
            if (!slot) return null
            const { session, date, isToday } = slot
            const hasRealSession = session && session.sessionType !== 'rest'
            const isRestSlot = !hasRealSession

            return (
              <div key={dow}>
                {/* En-tête du jour */}
                <div
                  className={[
                    'flex items-center gap-2 mb-1 px-1',
                    isToday ? 'text-primary' : 'text-muted-foreground',
                  ].join(' ')}
                >
                  <span className="text-xs font-medium capitalize">{dayFmt.format(date)}</span>
                  <span className="text-xs">{dateFmt.format(date)}</span>
                  {isToday && (
                    <span className="text-xs bg-primary text-primary-foreground px-1.5 py-0.5 rounded-full font-medium leading-none">
                      {t('planning.overview.today')}
                    </span>
                  )}
                </div>

                {/* Slot : draggable si séance, droppable si repos */}
                {hasRealSession ? (
                  <DraggableSessionCard
                    session={session}
                    isToday={isToday}
                    isOpen={openSessionId === session.id}
                    onClick={() =>
                      setOpenSessionId(openSessionId === session.id ? null : session.id)
                    }
                    onEditClick={() => setEditingSession(session)}
                  />
                ) : draggingSession && !occupiedDows.has(dow) ? (
                  <DroppableDaySlot dow={dow} isToday={isToday}>
                    <span className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                      {t('planning.overview.rest')}
                    </span>
                  </DroppableDaySlot>
                ) : (
                  <div
                    className={[
                      'rounded-lg border px-3 py-2 min-h-[42px] flex items-center text-sm text-muted-foreground',
                      isToday ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/40',
                    ].join(' ')}
                  >
                    <span className="flex items-center gap-3">
                      <span className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                      {isRestSlot ? t('planning.overview.rest') : null}
                    </span>
                  </div>
                )}
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {draggingSession ? <GhostCard session={draggingSession} width={dragWidth} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Dialog "Modifier" */}
      <Dialog open={!!editingSession} onOpenChange={(open) => !open && setEditingSession(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('planning.overview.editTitle')}</DialogTitle>
          </DialogHeader>
          {editingSession && (
            <EditSessionSheet session={editingSession} onClose={() => setEditingSession(null)} />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
