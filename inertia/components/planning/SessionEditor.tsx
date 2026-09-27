import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { ArrowDown, ArrowUp, Plus, Trash2 } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { sportIcon } from '~/lib/sports'
import type {
  IntensityZone,
  IntervalBlock,
  PlannedSession,
  SessionType,
  SportOption,
  StrengthExercise,
} from '~/types/planning'

export const SESSION_TYPES: SessionType[] = [
  'easy',
  'long_run',
  'tempo',
  'marathon_pace',
  'interval',
  'repetition',
  'recovery',
  'race',
  'strength',
  'mobility',
  'technique',
  'cross_training',
]
const ZONES: IntensityZone[] = ['z1', 'z2', 'z3', 'z4', 'z5']
/** Lundi → dimanche, convention JS (0 = dimanche) */
export const DAY_ORDER = [1, 2, 3, 4, 5, 6, 0]
const PACE = /^\d{1,2}:[0-5]\d$/

/** Sports où l'allure au km a du sens ; natation : /100 m ; vélo : puissance */
const PACE_SPORTS = ['running', 'walking', 'hiking']

type Fields = {
  dayOfWeek: number
  sportSlug: string
  sessionType: SessionType
  title: string
  description: string
  targetDurationMinutes: string
  targetDistanceKm: string
  intensityZone: IntensityZone
  targetPacePerKm: string
  targetPacePer100m: string
  targetPowerWatts: string
  targetRpe: string
  intervals: IntervalBlock[]
  exercises: StrengthExercise[]
}

function initialFields(session: PlannedSession | null, dayOfWeek: number): Fields {
  return {
    dayOfWeek: session?.dayOfWeek ?? dayOfWeek,
    sportSlug: session?.sportSlug ?? 'running',
    sessionType: session?.sessionType ?? 'easy',
    title: session?.title ?? '',
    description: session?.description ?? '',
    targetDurationMinutes: String(session?.targetDurationMinutes ?? 45),
    targetDistanceKm: session?.targetDistanceKm?.toString() ?? '',
    intensityZone: session?.intensityZone ?? 'z2',
    targetPacePerKm: session?.targetPacePerKm ?? '',
    targetPacePer100m: session?.targetPacePer100m ?? '',
    targetPowerWatts: session?.targetPowerWatts?.toString() ?? '',
    targetRpe: session?.targetRpe?.toString() ?? '',
    intervals: session?.intervals ?? [],
    exercises: session?.exercises ?? [],
  }
}

const num = (v: string) => (v.trim() === '' ? null : Number(v.replace(',', '.')))

const NEW_BLOCK: IntervalBlock = {
  type: 'work',
  durationMinutes: 5,
  distanceMeters: null,
  targetPace: null,
  intensityZone: 'z4',
  repetitions: 1,
  recoveryDurationMinutes: null,
  recoveryType: null,
  targetPowerWatts: null,
  notes: null,
}

const NEW_EXERCISE: StrengthExercise = {
  name: '',
  sets: 3,
  reps: '10',
  load: null,
  restSeconds: 60,
  notes: null,
}

type Props = {
  /** Séance à modifier ; null pour en créer une */
  session: PlannedSession | null
  weekNumber: number
  /** Jour proposé à la création */
  defaultDay?: number
  sports: SportOption[]
  onClose: () => void
}

/**
 * Création et édition complète d'une séance planifiée, tous sports :
 * cibles adaptées au sport, structure en blocs, exercices de renfo.
 */
export default function SessionEditor({
  session,
  weekNumber,
  defaultDay = 1,
  sports,
  onClose,
}: Props) {
  const { t, locale } = useTranslation()
  const [f, setF] = useState<Fields>(() => initialFields(session, defaultDay))
  const [error, setError] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const set = <K extends keyof Fields>(key: K, value: Fields[K]) =>
    setF((prev) => ({ ...prev, [key]: value }))

  const showPace = PACE_SPORTS.includes(f.sportSlug)
  const showSwimPace = f.sportSlug === 'swimming'
  const showPower = f.sportSlug === 'cycling'
  const showExercises =
    f.sportSlug === 'strength' ||
    f.sessionType === 'strength' ||
    f.sessionType === 'mobility' ||
    f.exercises.length > 0

  const dayName = (dow: number) =>
    new Intl.DateTimeFormat(locale, { weekday: 'long' }).format(new Date(2024, 0, 7 + dow))

  function validate(): string | null {
    const duration = num(f.targetDurationMinutes)
    if (!duration || duration < 1) return t('planning.editor.session.errors.duration')
    for (const pace of [f.targetPacePerKm, f.targetPacePer100m]) {
      if (pace.trim() && !PACE.test(pace.trim())) return t('planning.editor.session.errors.pace')
    }
    if (f.intervals.some((b) => b.targetPace && !PACE.test(b.targetPace))) {
      return t('planning.editor.session.errors.pace')
    }
    if (f.intervals.some((b) => !b.durationMinutes && !b.distanceMeters)) {
      return t('planning.editor.session.errors.blockLength')
    }
    if (f.exercises.some((e) => !e.name.trim()))
      return t('planning.editor.session.errors.exerciseName')
    return null
  }

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    const problem = validate()
    if (problem) return setError(problem)
    setError(null)
    const payload = {
      dayOfWeek: f.dayOfWeek,
      sportSlug: f.sportSlug,
      sessionType: f.sessionType,
      title: f.title.trim() || null,
      description: f.description.trim(),
      targetDurationMinutes: Math.round(num(f.targetDurationMinutes)!),
      targetDistanceKm: num(f.targetDistanceKm),
      intensityZone: f.intensityZone,
      targetPacePerKm: showPace && f.targetPacePerKm.trim() ? f.targetPacePerKm.trim() : null,
      targetPacePer100m:
        showSwimPace && f.targetPacePer100m.trim() ? f.targetPacePer100m.trim() : null,
      targetPowerWatts: showPower ? num(f.targetPowerWatts) : null,
      targetRpe: num(f.targetRpe),
      intervals: f.intervals.length > 0 ? f.intervals : null,
      exercises:
        f.exercises.length > 0 ? f.exercises.map((x) => ({ ...x, name: x.name.trim() })) : null,
    }
    setSaving(true)
    const options = {
      preserveScroll: true,
      onSuccess: () => onClose(),
      onError: () => setError(t('planning.editor.session.errors.server')),
      onFinish: () => setSaving(false),
    }
    if (session) router.put(`/planning/sessions/${session.id}/details`, payload, options)
    else router.post(`/planning/weeks/${weekNumber}/sessions`, payload, options)
  }

  const select =
    'w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus:ring-2 focus:ring-ring focus:outline-none'

  return (
    <form onSubmit={submit} className="mt-2 max-h-[70vh] space-y-4 overflow-y-auto pr-1">
      <div className="grid grid-cols-2 gap-3">
        <div className="space-y-1.5">
          <Label htmlFor="se-day">{t('planning.editor.session.day')}</Label>
          <select
            id="se-day"
            className={`${select} capitalize`}
            value={f.dayOfWeek}
            onChange={(e) => set('dayOfWeek', Number(e.target.value))}
          >
            {DAY_ORDER.map((dow) => (
              <option key={dow} value={dow}>
                {dayName(dow)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-sport">{t('planning.editor.session.sport')}</Label>
          <select
            id="se-sport"
            className={select}
            value={f.sportSlug}
            onChange={(e) => set('sportSlug', e.target.value)}
          >
            {sports.map((s) => (
              <option key={s.slug} value={s.slug}>
                {sportIcon(s.slug)} {s.name}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-type">{t('planning.editor.session.type')}</Label>
          <select
            id="se-type"
            className={select}
            value={f.sessionType}
            onChange={(e) => set('sessionType', e.target.value as SessionType)}
          >
            {SESSION_TYPES.map((type) => (
              <option key={type} value={type}>
                {t(`planning.sessions.types.${type}`)}
              </option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-zone">{t('planning.editor.session.zone')}</Label>
          <select
            id="se-zone"
            className={select}
            value={f.intensityZone}
            onChange={(e) => set('intensityZone', e.target.value as IntensityZone)}
          >
            {ZONES.map((z) => (
              <option key={z} value={z}>
                {t(`planning.editor.zones.${z}`)}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="se-title">{t('planning.editor.session.title')}</Label>
        <Input
          id="se-title"
          value={f.title}
          maxLength={200}
          placeholder={t('planning.editor.session.titlePlaceholder')}
          onChange={(e) => set('title', e.target.value)}
        />
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <div className="space-y-1.5">
          <Label htmlFor="se-duration">{t('planning.editor.session.duration')}</Label>
          <Input
            id="se-duration"
            type="number"
            min={1}
            value={f.targetDurationMinutes}
            onChange={(e) => set('targetDurationMinutes', e.target.value)}
          />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="se-distance">{t('planning.editor.session.distance')}</Label>
          <Input
            id="se-distance"
            inputMode="decimal"
            value={f.targetDistanceKm}
            onChange={(e) => set('targetDistanceKm', e.target.value)}
          />
        </div>
        {showPace && (
          <div className="space-y-1.5">
            <Label htmlFor="se-pace">{t('planning.editor.session.pacePerKm')}</Label>
            <Input
              id="se-pace"
              placeholder="5:30"
              value={f.targetPacePerKm}
              onChange={(e) => set('targetPacePerKm', e.target.value)}
            />
          </div>
        )}
        {showSwimPace && (
          <div className="space-y-1.5">
            <Label htmlFor="se-swim">{t('planning.editor.session.pacePer100m')}</Label>
            <Input
              id="se-swim"
              placeholder="1:55"
              value={f.targetPacePer100m}
              onChange={(e) => set('targetPacePer100m', e.target.value)}
            />
          </div>
        )}
        {showPower && (
          <div className="space-y-1.5">
            <Label htmlFor="se-power">{t('planning.editor.session.power')}</Label>
            <Input
              id="se-power"
              type="number"
              min={1}
              value={f.targetPowerWatts}
              onChange={(e) => set('targetPowerWatts', e.target.value)}
            />
          </div>
        )}
        <div className="space-y-1.5">
          <Label htmlFor="se-rpe">{t('planning.editor.session.rpe')}</Label>
          <Input
            id="se-rpe"
            type="number"
            min={1}
            max={10}
            value={f.targetRpe}
            onChange={(e) => set('targetRpe', e.target.value)}
          />
        </div>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="se-desc">{t('planning.editor.session.description')}</Label>
        <Textarea
          id="se-desc"
          rows={3}
          value={f.description}
          placeholder={t('planning.editor.session.descriptionPlaceholder')}
          onChange={(e) => set('description', e.target.value)}
        />
      </div>

      <BlocksEditor
        blocks={f.intervals}
        showPace={showPace}
        showPower={showPower}
        onChange={(blocks) => set('intervals', blocks)}
      />

      {showExercises && (
        <ExercisesEditor exercises={f.exercises} onChange={(list) => set('exercises', list)} />
      )}

      {error && (
        <p role="alert" className="text-sm text-destructive">
          {error}
        </p>
      )}
      <div className="sticky bottom-0 flex gap-2 bg-background pt-2">
        <Button type="submit" disabled={saving} className="flex-1">
          {saving ? t('planning.overview.saving') : t('planning.overview.save')}
        </Button>
        <Button type="button" variant="outline" onClick={onClose} className="flex-1">
          {t('planning.overview.close')}
        </Button>
      </div>
    </form>
  )
}

function move<T>(list: T[], index: number, delta: number): T[] {
  const next = [...list]
  const target = index + delta
  if (target < 0 || target >= list.length) return list
  ;[next[index], next[target]] = [next[target], next[index]]
  return next
}

function RowActions({
  index,
  count,
  onMove,
  onRemove,
}: {
  index: number
  count: number
  onMove: (delta: number) => void
  onRemove: () => void
}) {
  const { t } = useTranslation()
  const btn =
    'rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground disabled:opacity-30'
  return (
    <div className="flex items-center gap-0.5">
      <button
        type="button"
        className={btn}
        disabled={index === 0}
        onClick={() => onMove(-1)}
        aria-label={t('planning.editor.moveUp')}
      >
        <ArrowUp className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        disabled={index === count - 1}
        onClick={() => onMove(1)}
        aria-label={t('planning.editor.moveDown')}
      >
        <ArrowDown className="h-3.5 w-3.5" />
      </button>
      <button
        type="button"
        className={btn}
        onClick={onRemove}
        aria-label={t('planning.editor.remove')}
      >
        <Trash2 className="h-3.5 w-3.5" />
      </button>
    </div>
  )
}

/** Structure de la séance : échauffement, répétitions, récupérations, retour au calme */
function BlocksEditor({
  blocks,
  showPace,
  showPower,
  onChange,
}: {
  blocks: IntervalBlock[]
  showPace: boolean
  showPower: boolean
  onChange: (blocks: IntervalBlock[]) => void
}) {
  const { t } = useTranslation()
  const update = (i: number, patch: Partial<IntervalBlock>) =>
    onChange(blocks.map((b, j) => (j === i ? { ...b, ...patch } : b)))
  const small = 'w-full rounded-md border border-input bg-background px-2 py-1 text-xs'

  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{t('planning.editor.blocks.title')}</legend>
      {blocks.length === 0 && (
        <p className="text-xs text-muted-foreground">{t('planning.editor.blocks.empty')}</p>
      )}
      {blocks.map((b, i) => (
        <div key={i} className="space-y-2 rounded-md bg-muted/40 p-2">
          <div className="flex items-center gap-2">
            <select
              aria-label={t('planning.editor.blocks.type')}
              className={small}
              value={b.type}
              onChange={(e) => update(i, { type: e.target.value as IntervalBlock['type'] })}
            >
              {(['warmup', 'work', 'recovery', 'cooldown'] as const).map((type) => (
                <option key={type} value={type}>
                  {t(`planning.overview.blockTypes.${type}`)}
                </option>
              ))}
            </select>
            <RowActions
              index={i}
              count={blocks.length}
              onMove={(d) => onChange(move(blocks, i, d))}
              onRemove={() => onChange(blocks.filter((_, j) => j !== i))}
            />
          </div>
          <div className="grid grid-cols-3 gap-2">
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.blocks.repeat')}
              <input
                type="number"
                min={1}
                className={small}
                value={b.repetitions}
                onChange={(e) =>
                  update(i, { repetitions: Math.max(1, Number(e.target.value) || 1) })
                }
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.blocks.duration')}
              <input
                inputMode="decimal"
                className={small}
                value={b.durationMinutes ?? ''}
                onChange={(e) => update(i, { durationMinutes: num(e.target.value) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.blocks.distance')}
              <input
                inputMode="numeric"
                className={small}
                value={b.distanceMeters ?? ''}
                onChange={(e) => update(i, { distanceMeters: num(e.target.value) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.session.zone')}
              <select
                className={small}
                value={b.intensityZone}
                onChange={(e) => update(i, { intensityZone: e.target.value as IntensityZone })}
              >
                {ZONES.map((z) => (
                  <option key={z} value={z}>
                    {z.toUpperCase()}
                  </option>
                ))}
              </select>
            </label>
            {showPace && (
              <label className="text-xs text-muted-foreground">
                {t('planning.editor.session.pacePerKm')}
                <input
                  className={small}
                  placeholder="4:30"
                  value={b.targetPace ?? ''}
                  onChange={(e) => update(i, { targetPace: e.target.value.trim() || null })}
                />
              </label>
            )}
            {showPower && (
              <label className="text-xs text-muted-foreground">
                {t('planning.editor.session.power')}
                <input
                  type="number"
                  className={small}
                  value={b.targetPowerWatts ?? ''}
                  onChange={(e) => update(i, { targetPowerWatts: num(e.target.value) })}
                />
              </label>
            )}
            {b.repetitions > 1 && (
              <>
                <label className="text-xs text-muted-foreground">
                  {t('planning.editor.blocks.recovery')}
                  <input
                    inputMode="decimal"
                    className={small}
                    value={b.recoveryDurationMinutes ?? ''}
                    onChange={(e) => update(i, { recoveryDurationMinutes: num(e.target.value) })}
                  />
                </label>
                <label className="text-xs text-muted-foreground">
                  {t('planning.editor.blocks.recoveryType')}
                  <select
                    className={small}
                    value={b.recoveryType ?? ''}
                    onChange={(e) =>
                      update(i, {
                        recoveryType: (e.target.value || null) as IntervalBlock['recoveryType'],
                      })
                    }
                  >
                    <option value="">—</option>
                    <option value="jog">{t('planning.overview.recoveryJog')}</option>
                    <option value="rest">{t('planning.overview.recoveryRest')}</option>
                  </select>
                </label>
              </>
            )}
          </div>
          <input
            aria-label={t('planning.editor.blocks.notes')}
            placeholder={t('planning.editor.blocks.notes')}
            className={small}
            value={b.notes ?? ''}
            onChange={(e) => update(i, { notes: e.target.value || null })}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...blocks, { ...NEW_BLOCK }])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {t('planning.editor.blocks.add')}
      </Button>
    </fieldset>
  )
}

/** Exercices d'une séance de renforcement ou de mobilité */
function ExercisesEditor({
  exercises,
  onChange,
}: {
  exercises: StrengthExercise[]
  onChange: (list: StrengthExercise[]) => void
}) {
  const { t } = useTranslation()
  const update = (i: number, patch: Partial<StrengthExercise>) =>
    onChange(exercises.map((x, j) => (j === i ? { ...x, ...patch } : x)))
  const small = 'w-full rounded-md border border-input bg-background px-2 py-1 text-xs'

  return (
    <fieldset className="space-y-2 rounded-lg border p-3">
      <legend className="px-1 text-sm font-medium">{t('planning.editor.exercises.title')}</legend>
      {exercises.map((x, i) => (
        <div key={i} className="space-y-2 rounded-md bg-muted/40 p-2">
          <div className="flex items-center gap-2">
            <input
              aria-label={t('planning.editor.exercises.name')}
              placeholder={t('planning.editor.exercises.name')}
              className={`${small} font-medium`}
              value={x.name}
              onChange={(e) => update(i, { name: e.target.value })}
            />
            <RowActions
              index={i}
              count={exercises.length}
              onMove={(d) => onChange(move(exercises, i, d))}
              onRemove={() => onChange(exercises.filter((_, j) => j !== i))}
            />
          </div>
          <div className="grid grid-cols-4 gap-2">
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.exercises.sets')}
              <input
                type="number"
                min={1}
                className={small}
                value={x.sets ?? ''}
                onChange={(e) => update(i, { sets: num(e.target.value) })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.exercises.reps')}
              <input
                className={small}
                value={x.reps ?? ''}
                onChange={(e) => update(i, { reps: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.exercises.load')}
              <input
                className={small}
                value={x.load ?? ''}
                onChange={(e) => update(i, { load: e.target.value || null })}
              />
            </label>
            <label className="text-xs text-muted-foreground">
              {t('planning.editor.exercises.rest')}
              <input
                type="number"
                min={0}
                className={small}
                value={x.restSeconds ?? ''}
                onChange={(e) => update(i, { restSeconds: num(e.target.value) })}
              />
            </label>
          </div>
          <input
            aria-label={t('planning.editor.blocks.notes')}
            placeholder={t('planning.editor.blocks.notes')}
            className={small}
            value={x.notes ?? ''}
            onChange={(e) => update(i, { notes: e.target.value || null })}
          />
        </div>
      ))}
      <Button
        type="button"
        variant="outline"
        size="sm"
        onClick={() => onChange([...exercises, { ...NEW_EXERCISE }])}
      >
        <Plus className="mr-1 h-3.5 w-3.5" />
        {t('planning.editor.exercises.add')}
      </Button>
    </fieldset>
  )
}
