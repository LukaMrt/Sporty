import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { Textarea } from '~/components/ui/textarea'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '~/components/ui/dialog'
import type { PlannedWeek, TrainingPlan } from '~/types/planning'

type DialogProps = { open: boolean; onClose: () => void }

function Actions({ saving, onClose }: { saving: boolean; onClose: () => void }) {
  const { t } = useTranslation()
  return (
    <div className="flex gap-2 pt-1">
      <Button type="submit" disabled={saving} className="flex-1">
        {saving ? t('planning.overview.saving') : t('planning.overview.save')}
      </Button>
      <Button type="button" variant="outline" onClick={onClose} className="flex-1">
        {t('planning.overview.close')}
      </Button>
    </div>
  )
}

/** Nom et consignes générales du plan */
export function PlanInfoDialog({ plan, open, onClose }: DialogProps & { plan: TrainingPlan }) {
  const { t } = useTranslation()
  const [name, setName] = useState(plan.name ?? '')
  const [notes, setNotes] = useState(plan.notes ?? '')
  const [saving, setSaving] = useState(false)

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    router.put(
      '/planning/plan',
      { name: name.trim() || null, notes: notes.trim() || null },
      { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('planning.editor.plan.title')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="plan-name">{t('planning.editor.plan.name')}</Label>
            <Input
              id="plan-name"
              value={name}
              maxLength={200}
              onChange={(e) => setName(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="plan-notes">{t('planning.editor.plan.notes')}</Label>
            <Textarea
              id="plan-notes"
              rows={5}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <Actions saving={saving} onClose={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Phase, consignes et statut « semaine allégée » ; suppression de la semaine */
export function WeekDialog({
  week,
  canDelete,
  open,
  onClose,
}: DialogProps & { week: PlannedWeek; canDelete: boolean }) {
  const { t } = useTranslation()
  const [phase, setPhase] = useState(week.phaseName === 'custom' ? week.phaseLabel : '')
  const [notes, setNotes] = useState(week.notes ?? '')
  const [recovery, setRecovery] = useState(week.isRecoveryWeek)
  const [saving, setSaving] = useState(false)

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    router.put(
      `/planning/weeks/${week.weekNumber}`,
      {
        ...(phase.trim() || week.phaseName === 'custom' ? { phaseLabel: phase.trim() } : {}),
        notes: notes.trim() || null,
        isRecoveryWeek: recovery,
      },
      { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) }
    )
  }

  function remove() {
    if (!window.confirm(t('planning.editor.week.confirmDelete', { n: week.weekNumber }))) return
    router.delete(`/planning/weeks/${week.weekNumber}`, {
      preserveScroll: true,
      onSuccess: onClose,
    })
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('planning.overview.weekLabel', { n: week.weekNumber })}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="week-phase">{t('planning.editor.week.phase')}</Label>
            <Input
              id="week-phase"
              value={phase}
              maxLength={60}
              placeholder={t('planning.editor.week.phasePlaceholder')}
              onChange={(e) => setPhase(e.target.value)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="week-notes">{t('planning.editor.week.notes')}</Label>
            <Textarea
              id="week-notes"
              rows={4}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={recovery}
              onChange={(e) => setRecovery(e.target.checked)}
            />
            {t('planning.overview.recoveryWeek')}
          </label>
          <Actions saving={saving} onClose={onClose} />
          {canDelete && (
            <button
              type="button"
              onClick={remove}
              className="w-full rounded-lg border border-border py-2 text-sm text-destructive hover:bg-destructive/10"
            >
              {t('planning.editor.week.delete')}
            </button>
          )}
        </form>
      </DialogContent>
    </Dialog>
  )
}

/** Nouvelle semaine en fin de plan : vide ou copie d'une semaine existante */
export function AddWeekDialog({ weeks, open, onClose }: DialogProps & { weeks: PlannedWeek[] }) {
  const { t } = useTranslation()
  const [copyFrom, setCopyFrom] = useState<string>(
    weeks.length > 0 ? String(weeks.at(-1)!.weekNumber) : ''
  )
  const [saving, setSaving] = useState(false)

  function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setSaving(true)
    router.post(
      '/planning/weeks',
      { copyFromWeek: copyFrom ? Number(copyFrom) : null },
      { preserveScroll: true, onSuccess: onClose, onFinish: () => setSaving(false) }
    )
  }

  return (
    <Dialog open={open} onOpenChange={(o) => !o && onClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{t('planning.editor.week.addTitle')}</DialogTitle>
        </DialogHeader>
        <form onSubmit={submit} className="space-y-4">
          <div className="space-y-1.5">
            <Label htmlFor="week-copy">{t('planning.editor.week.copyFrom')}</Label>
            <select
              id="week-copy"
              className="w-full rounded-md border border-input bg-background px-3 py-2 text-sm"
              value={copyFrom}
              onChange={(e) => setCopyFrom(e.target.value)}
            >
              <option value="">{t('planning.editor.week.empty')}</option>
              {weeks.map((w) => (
                <option key={w.weekNumber} value={w.weekNumber}>
                  {t('planning.overview.weekLabel', { n: w.weekNumber })}
                </option>
              ))}
            </select>
          </div>
          <Actions saving={saving} onClose={onClose} />
        </form>
      </DialogContent>
    </Dialog>
  )
}
