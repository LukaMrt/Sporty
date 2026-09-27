import React, { useState } from 'react'
import {
  DndContext,
  DragOverlay,
  useDraggable,
  useDroppable,
  type DragEndEvent,
  type DragStartEvent,
  KeyboardSensor,
  PointerSensor,
  TouchSensor,
  type Announcements,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { useUnitConversion } from '~/hooks/use_unit_conversion'
import { Plus } from 'lucide-react'
import type { PlannedSession, SportOption } from '~/types/planning'
import { ZONE_COLORS } from '~/lib/planning_colors'
import { sportIcon } from '~/lib/sports'
import PlannedSessionDetail from './PlannedSessionDetail'
import SessionEditor, { DAY_ORDER } from './SessionEditor'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'

// ── Constantes ────────────────────────────────────────────────────────────────

function parsePaceString(pace: string): number {
  const [min, sec] = pace.split(':').map(Number)
  return min + (sec ?? 0) / 60
}

// ── Types ─────────────────────────────────────────────────────────────────────

type DaySlot = {
  dow: number
  /** Séances du jour, dans l'ordre de la journée (hors repos) */
  sessions: PlannedSession[]
  date: Date
  isToday: boolean
}

type Props = {
  days: DaySlot[]
  planStartDate: string
  selectedWeek: number
  locale: string
  sports: SportOption[]
  /** Callback optimiste : met à jour la session dans le state parent */
  onSessionUpdated: (updated: PlannedSession) => void
  /** Affiche le badge ⚡ sur les séances (ACWR > 1.3 sur la semaine courante) */
  showAcwrBadge?: boolean
}

// ── Carte draggable ───────────────────────────────────────────────────────────

function DraggableSessionCard({
  session,
  isToday,
  isOpen,
  showAcwrBadge,
  onClick,
  onEditClick,
}: {
  session: PlannedSession
  isToday: boolean
  isOpen: boolean
  showAcwrBadge: boolean
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
          <div className="text-sm font-medium text-foreground leading-tight flex items-center gap-1.5">
            <span aria-hidden="true">{sportIcon(session.sportSlug)}</span>
            {session.title ?? t(`planning.sessions.types.${session.sessionType}`)}
            {isCompleted && <span className="text-emerald-500">✓</span>}
            {showAcwrBadge && !isCompleted && (
              <span className="text-xs text-orange-500" title="Charge élevée">
                ⚡
              </span>
            )}
          </div>
          <div className="text-xs text-muted-foreground mt-0.5 flex gap-2">
            <span>{session.targetDurationMinutes} min</span>
            {session.targetDistanceKm && <span>· {session.targetDistanceKm} km</span>}
            {session.targetPacePerKm && (
              <span>· {formatSpeed(parsePaceString(session.targetPacePerKm))}</span>
            )}
            {session.targetPacePer100m && <span>· {session.targetPacePer100m}/100 m</span>}
            {session.targetPowerWatts && <span>· {session.targetPowerWatts} W</span>}
            {session.title && (
              <span className="truncate">
                · {t(`planning.sessions.types.${session.sessionType}`)}
              </span>
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
          {sportIcon(session.sportSlug)}{' '}
          {session.title ?? t(`planning.sessions.types.${session.sessionType}`)}
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

export default function WeekDndView({
  days,
  selectedWeek,
  sports,
  onSessionUpdated,
  showAcwrBadge = false,
}: Props) {
  const { t, locale } = useTranslation()
  const [openSessionId, setOpenSessionId] = useState<number | null>(null)
  const [draggingSession, setDraggingSession] = useState<PlannedSession | null>(null)
  const [dragWidth, setDragWidth] = useState<number | undefined>()
  /** Éditeur : séance existante, ou création sur un jour donné */
  const [editor, setEditor] = useState<{ session: PlannedSession | null; day: number } | null>(null)

  const allSessions = days.flatMap((d) => d.sessions)

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 200, tolerance: 8 } }),
    // Clavier : Espace/Entrée pour saisir, flèches pour déplacer, Espace pour déposer
    useSensor(KeyboardSensor)
  )

  const dayName = (dow: unknown) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(
      // 2024-01-07 est un dimanche (dow 0)
      new Date(2024, 0, 7 + Number(dow))
    )

  /** Annonces lues par les lecteurs d'écran (région aria-live de dnd-kit) */
  const announcements: Announcements = {
    onDragStart: () => t('planning.dnd.picked'),
    onDragOver: ({ over }) =>
      over ? t('planning.dnd.over', { day: dayName(over.id) }) : t('planning.dnd.outside'),
    onDragEnd: ({ over }) =>
      over ? t('planning.dnd.dropped', { day: dayName(over.id) }) : t('planning.dnd.cancelled'),
    onDragCancel: () => t('planning.dnd.cancelled'),
  }

  function handleDragStart(event: DragStartEvent) {
    setDraggingSession(allSessions.find((s) => s.id === event.active.id) ?? null)
    setDragWidth(event.active.rect.current.translated?.width)
    setOpenSessionId(null)
  }

  function handleDragEnd(event: DragEndEvent) {
    setDraggingSession(null)
    const { active, over } = event
    if (!over) return

    const targetDow = over.id as number
    const session = allSessions.find((s) => s.id === active.id)
    if (!session || session.dayOfWeek === targetDow) return

    // Optimistic update
    onSessionUpdated({ ...session, dayOfWeek: targetDow })

    router.put(
      `/planning/sessions/${session.id}`,
      { day_of_week: targetDow },
      { preserveScroll: true }
    )
  }

  const dayFmt = new Intl.DateTimeFormat(locale, { weekday: 'short' })
  const dateFmt = new Intl.DateTimeFormat(locale, { day: 'numeric', month: 'short' })

  return (
    <>
      <DndContext
        sensors={sensors}
        onDragStart={handleDragStart}
        onDragEnd={handleDragEnd}
        accessibility={{
          announcements,
          screenReaderInstructions: { draggable: t('planning.dnd.instructions') },
        }}
      >
        <div className="space-y-2">
          {DAY_ORDER.map((dow) => {
            const slot = days.find((d) => d.dow === dow)
            if (!slot) return null
            const { sessions, date, isToday } = slot
            const canDrop = draggingSession !== null && draggingSession.dayOfWeek !== dow

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
                  <button
                    type="button"
                    onClick={() => setEditor({ session: null, day: dow })}
                    className="ml-auto inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-xs text-muted-foreground hover:bg-muted hover:text-foreground"
                    aria-label={t('planning.editor.session.addOn', { day: dayName(dow) })}
                  >
                    <Plus className="h-3 w-3" aria-hidden="true" />
                    {t('planning.editor.session.add')}
                  </button>
                </div>

                <div className="space-y-1.5">
                  {sessions.map((session) => (
                    <DraggableSessionCard
                      key={session.id}
                      session={session}
                      isToday={isToday}
                      isOpen={openSessionId === session.id}
                      showAcwrBadge={showAcwrBadge}
                      onClick={() =>
                        setOpenSessionId(openSessionId === session.id ? null : session.id)
                      }
                      onEditClick={() => setEditor({ session, day: session.dayOfWeek })}
                    />
                  ))}
                  {canDrop ? (
                    <DroppableDaySlot dow={dow} isToday={isToday}>
                      <span className="text-xs">{t('planning.overview.dropHere')}</span>
                    </DroppableDaySlot>
                  ) : (
                    sessions.length === 0 && (
                      <div
                        className={[
                          'rounded-lg border px-3 py-2 min-h-[42px] flex items-center text-sm text-muted-foreground',
                          isToday ? 'border-primary/30 bg-primary/5' : 'border-border bg-muted/40',
                        ].join(' ')}
                      >
                        <span className="flex items-center gap-3">
                          <span className="flex-shrink-0 w-2 h-2 rounded-full bg-muted-foreground/40 inline-block" />
                          {t('planning.overview.rest')}
                        </span>
                      </div>
                    )
                  )}
                </div>
              </div>
            )
          })}
        </div>

        <DragOverlay>
          {draggingSession ? <GhostCard session={draggingSession} width={dragWidth} /> : null}
        </DragOverlay>
      </DndContext>

      {/* Éditeur de séance (création ou modification) */}
      <Dialog open={editor !== null} onOpenChange={(open) => !open && setEditor(null)}>
        <DialogContent className="max-w-lg">
          <DialogHeader>
            <DialogTitle>
              {editor?.session
                ? t('planning.overview.editTitle')
                : t('planning.editor.session.newTitle')}
            </DialogTitle>
          </DialogHeader>
          {editor && (
            <SessionEditor
              session={editor.session}
              weekNumber={selectedWeek}
              defaultDay={editor.day}
              sports={sports}
              onClose={() => setEditor(null)}
            />
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
