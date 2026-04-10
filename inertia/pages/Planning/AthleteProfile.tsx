import React, { useState, useEffect, type SyntheticEvent } from 'react'
import { useTechMode } from '~/hooks/use_tech_mode'
import { Head, useForm, router } from '@inertiajs/react'
import { ChevronLeft, Edit2, Check, X } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import PaceZonesDisplay from '~/components/planning/PaceZonesDisplay'
import FitnessMetrics from '~/components/planning/FitnessMetrics'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'
import { SourceBadge } from '~/components/shared/SourceBadge'
import InfoTooltip from '~/components/shared/InfoTooltip'

// ── Types ──────────────────────────────────────────────────────────────────────

interface PaceZoneRange {
  minPacePerKm: number
  maxPacePerKm: number
}

interface PaceZones {
  easy: PaceZoneRange
  marathon: PaceZoneRange
  threshold: PaceZoneRange
  interval: PaceZoneRange
  repetition: PaceZoneRange
}

interface FitnessData {
  ctl: number
  atl: number
  tsb: number
  acwr: number
}

interface Profile {
  trainingState: 'idle' | 'preparation' | 'transition' | 'maintenance'
  maxHeartRate: number | null
  restingHeartRate: number | null
  vma: number | null
  sex: 'male' | 'female' | null
  speedUnit: 'min_km' | 'km_h'
}

interface AthleteProfileProps {
  profile: Profile | null
  vdot: number | null
  paceZones: PaceZones | null
  fitnessProfile: FitnessData | null
}

// ── Constants ──────────────────────────────────────────────────────────────────

// ── Main component ─────────────────────────────────────────────────────────────

export default function AthleteProfile({
  profile,
  vdot: initialVdot,
  paceZones: initialPaceZones,
  fitnessProfile,
}: AthleteProfileProps) {
  const { t } = useTranslation()
  const { techMode: techVisible } = useTechMode()
  const [editingVdot, setEditingVdot] = useState(false)
  const [vdot, setVdot] = useState<number | null>(initialVdot)
  const [paceZones, setPaceZones] = useState<PaceZones | null>(initialPaceZones)
  const [sliderValue, setSliderValue] = useState<number>(initialVdot ?? 40)
  const [sliderZones, setSliderZones] = useState<PaceZones | null>(initialPaceZones)
  const [loadingEstimate, setLoadingEstimate] = useState(!initialVdot)
  const [estimationMethod, setEstimationMethod] = useState<string | null>(null)

  const profileForm = useForm({
    sex: profile?.sex ?? ('' as 'male' | 'female' | ''),
    max_heart_rate: profile?.maxHeartRate ?? (null as number | null),
    resting_heart_rate: profile?.restingHeartRate ?? (null as number | null),
    vma: profile?.vma ?? (null as number | null),
  })

  // ── Estimation VDOT au chargement si pas encore de VDOT ─────────────────────
  useEffect(() => {
    if (initialVdot !== null) {
      setLoadingEstimate(false)
      return
    }
    fetch('/profile/athlete/estimate-vdot', {
      headers: { 'X-Requested-With': 'XMLHttpRequest', 'Accept': 'application/json' },
    })
      .then((r) => r.json() as Promise<{ vdot: number; method: string; paceZones: PaceZones }>)
      .then((data) => {
        setVdot(data.vdot)
        setSliderValue(data.vdot)
        setPaceZones(data.paceZones)
        setSliderZones(data.paceZones)
        setEstimationMethod(data.method)
        setLoadingEstimate(false)
      })
      .catch(() => setLoadingEstimate(false))
  }, [initialVdot])

  // ── Slider : mise à jour des zones en temps réel ────────────────────────────
  function handleSliderChange(newVdot: number) {
    setSliderValue(newVdot)
    const csrf = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
    void fetch('/profile/athlete/confirm-vdot', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRF-TOKEN': csrf ?? '',
        'Accept': 'application/json',
      },
      body: JSON.stringify({ vdot: newVdot }),
    })
      .then((res) => (res.ok ? (res.json() as Promise<{ paceZones: PaceZones }>) : null))
      .then((data) => {
        if (data) setSliderZones(data.paceZones)
      })
  }

  function confirmVdotEdit() {
    setVdot(sliderValue)
    setPaceZones(sliderZones)
    setEditingVdot(false)
  }

  function cancelVdotEdit() {
    setSliderValue(vdot ?? 40)
    setSliderZones(paceZones)
    setEditingVdot(false)
  }

  // ── Sauvegarde profil ────────────────────────────────────────────────────────
  function saveProfile(e: SyntheticEvent) {
    e.preventDefault()
    profileForm.put('/profile/athlete')
  }

  // ── Render ───────────────────────────────────────────────────────────────────
  return (
    <MainLayout>
      <Head title={t('planning.athlete.pageTitle')} />

      <div className="max-w-lg mx-auto px-4 py-6 space-y-6">
        {/* Header */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => router.visit('/profile')}
            className="cursor-pointer text-muted-foreground hover:text-foreground transition-colors"
          >
            <ChevronLeft size={20} />
          </button>
          <h1 className="text-xl font-semibold">{t('planning.athlete.pageTitle')}</h1>
        </div>

        {/* Section VDOT */}
        <section className="rounded-xl border bg-card p-4 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t('planning.athlete.sections.estimatedLevel')}
            </h2>
            {!editingVdot && vdot !== null && (
              <button
                onClick={() => setEditingVdot(true)}
                className="flex cursor-pointer items-center gap-1 text-sm text-primary hover:underline"
              >
                <Edit2 size={14} />
                {t('planning.athlete.vdot.edit')}
              </button>
            )}
          </div>

          {loadingEstimate ? (
            <div className="text-center text-muted-foreground py-4 text-sm">
              {t('planning.athlete.vdot.loading')}
            </div>
          ) : vdot === null ? (
            <div className="text-center py-6 space-y-3">
              <p className="text-muted-foreground text-sm">{t('planning.athlete.vdot.noData')}</p>
              <Button variant="outline" size="sm" onClick={() => router.visit('/planning/goal')}>
                {t('planning.athlete.vdot.estimateCta')}
              </Button>
            </div>
          ) : (
            <>
              <div className="text-center">
                <div className="text-6xl font-bold tabular-nums">
                  {editingVdot ? sliderValue : vdot}
                </div>
                <div className="flex items-center justify-center gap-1.5 text-sm text-muted-foreground mt-1">
                  {t('planning.athlete.vdot.label')}
                  <InfoTooltip
                    description={t('planning.athlete.vdot.description')}
                    interpretation={t('planning.athlete.vdot.interpretation')}
                    align="left"
                  />
                </div>
                {estimationMethod && (
                  <div className="text-xs text-muted-foreground mt-1">
                    {t(`planning.athlete.vdot.methods.${estimationMethod}`)}
                  </div>
                )}
              </div>

              {editingVdot && (
                <div className="space-y-3">
                  <input
                    type="range"
                    min={Math.max(15, (vdot ?? 40) - 5)}
                    max={Math.min(85, (vdot ?? 40) + 5)}
                    value={sliderValue}
                    onChange={(e) => {
                      handleSliderChange(Number(e.target.value))
                    }}
                    className="w-full"
                  />
                  <div className="flex justify-center gap-2">
                    <Button size="sm" onClick={confirmVdotEdit}>
                      <Check size={14} className="mr-1" />
                      {t('planning.athlete.vdot.confirm')}
                    </Button>
                    <Button size="sm" variant="ghost" onClick={cancelVdotEdit}>
                      <X size={14} className="mr-1" />
                      {t('planning.athlete.vdot.cancel')}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </section>

        {/* Section zones d'allure */}
        {(editingVdot ? sliderZones : paceZones) && (
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t('planning.athlete.sections.paceZones')}
            </h2>
            <PaceZonesDisplay
              paceZones={(editingVdot ? sliderZones : paceZones)!}
              speedUnit={profile?.speedUnit ?? 'min_km'}
            />
          </section>
        )}

        {/* Section état d'entraînement */}
        <section className="rounded-xl border bg-card p-4 space-y-2">
          <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {t('planning.athlete.sections.trainingState')}
          </h2>
          <div className="text-sm">
            <span className="text-muted-foreground">Statut : </span>
            <span className="font-medium">
              {t(`planning.athlete.trainingState.${profile?.trainingState ?? 'idle'}`)}
            </span>
          </div>
        </section>

        {/* Section données techniques (conditionnel toggle) */}
        {techVisible && fitnessProfile && (
          <section className="rounded-xl border bg-card p-4 space-y-3">
            <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
              {t('planning.athlete.sections.technicalData')}
            </h2>
            <FitnessMetrics {...fitnessProfile} />
          </section>
        )}

        {/* Section informations personnelles */}
        <section className="rounded-xl border bg-card p-4 space-y-4">
          <h2 className="font-medium text-sm text-muted-foreground uppercase tracking-wide">
            {t('planning.athlete.sections.personalInfo')}
          </h2>
          <form onSubmit={saveProfile} className="space-y-3">
            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t('planning.athlete.personalInfo.sex')}
              </label>
              <select
                value={profileForm.data.sex}
                onChange={(e) =>
                  profileForm.setData('sex', e.target.value as 'male' | 'female' | '')
                }
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              >
                <option value="">{t('planning.athlete.personalInfo.sexOptions.unset')}</option>
                <option value="male">{t('planning.athlete.personalInfo.sexOptions.male')}</option>
                <option value="female">
                  {t('planning.athlete.personalInfo.sexOptions.female')}
                </option>
              </select>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t('planning.athlete.personalInfo.maxHr')}
                </label>
                <input
                  type="number"
                  value={profileForm.data.max_heart_rate ?? ''}
                  onChange={(e) =>
                    profileForm.setData(
                      'max_heart_rate',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="185"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
              <div className="space-y-1">
                <label className="text-xs text-muted-foreground">
                  {t('planning.athlete.personalInfo.restHr')}
                </label>
                <input
                  type="number"
                  value={profileForm.data.resting_heart_rate ?? ''}
                  onChange={(e) =>
                    profileForm.setData(
                      'resting_heart_rate',
                      e.target.value ? Number(e.target.value) : null
                    )
                  }
                  placeholder="58"
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-xs text-muted-foreground">
                {t('planning.athlete.personalInfo.vma')}
              </label>
              <input
                type="number"
                step="0.1"
                value={profileForm.data.vma ?? ''}
                onChange={(e) =>
                  profileForm.setData('vma', e.target.value ? Number(e.target.value) : null)
                }
                placeholder="15.5"
                className="w-full rounded-md border bg-background px-3 py-2 text-sm"
              />
            </div>

            <Button type="submit" size="sm" disabled={profileForm.processing} className="w-full">
              {profileForm.processing
                ? t('planning.athlete.personalInfo.saving')
                : t('planning.athlete.personalInfo.save')}
            </Button>
          </form>
        </section>

        {/* Section sources */}
        <section className="rounded-xl border bg-muted/50 p-5 text-sm space-y-4">
          <h2 className="font-semibold text-sm">{t('planning.athlete.sources.title')}</h2>
          <ul className="space-y-1.5 text-muted-foreground">
            <li>
              <SourceBadge type="book" label={t('planning.athlete.sources.badges.book')} />
              Daniels J. <em>Daniels' Running Formula</em> (2nd ed.). Human Kinetics, 2005. — Le
              VDOT est une approximation du VO₂max normalisée par l'économie de course.
            </li>
            <li>
              <SourceBadge type="study" label={t('planning.athlete.sources.badges.study')} />
              Banister E.W. et al. <em>
                A systems model of training for athletic performance.
              </em>{' '}
              Australian Journal of Sports Medicine, 7, 57–61, 1975. — Modèle fitness-fatigue (CTL /
              ATL / TSB).
            </li>
            <li>
              <SourceBadge type="study" label={t('planning.athlete.sources.badges.study')} />
              <a
                href="https://bjsm.bmj.com/content/50/5/273"
                target="_blank"
                rel="noreferrer"
                className="underline hover:text-foreground transition-colors"
              >
                Gabbett T.J. <em>The training-injury prevention paradox.</em> Br J Sports Med, 50 :
                273–280, 2016.
              </a>{' '}
              — ACWR entre 0,8 et 1,3 = risque de blessure minimal.
            </li>
          </ul>
        </section>
      </div>
    </MainLayout>
  )
}
