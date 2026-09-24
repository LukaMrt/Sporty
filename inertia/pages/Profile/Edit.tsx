import React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { useTechMode } from '~/hooks/use_tech_mode'
import { Save } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import ChangePasswordForm from '~/components/Profile/ChangePasswordForm'
import NumberField from '~/components/forms/NumberField'
import SegmentedChoice from '~/components/forms/SegmentedChoice'
import FormField from '~/components/forms/FormField'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import PrivacyZonesEditor from '~/components/Profile/PrivacyZonesEditor'
import HeartRateZonesEditor, { type HrZonesValue } from '~/components/Profile/HeartRateZonesEditor'
import { useTranslation } from '~/hooks/use_translation'

type Sport = {
  id: number
  name: string
}

type ProfileData = {
  sportId: number
  level: 'beginner' | 'intermediate' | 'advanced' | null
  objective:
    | 'endurance_progress'
    | 'run_faster'
    | 'comeback_after_break'
    | 'maintain_fitness'
    | 'prepare_competition'
    | null
  preferredUnit: 'min_km' | 'km_h'
  preferences: {
    speedUnit: 'min_km' | 'km_h'
    distanceUnit: 'km' | 'mi'
    weightUnit: 'kg' | 'lbs'
    weekStartsOn: 'monday' | 'sunday'
    dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'
    locale: 'fr' | 'en'
  }
  maxHeartRate: number | null
  restingHeartRate: number | null
  vma: number | null
  sex: 'male' | 'female' | null
  timezone: string | null
  privacyZones: { lat: number; lon: number; radiusM: number }[]
  hrZonesConfig: {
    method: HrZonesValue['method']
    lthr: number | null
    customBoundsBpm: HrZonesValue['customBounds']
  } | null
}

/** Fuseau du navigateur, proposé par défaut */
function browserTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone
  } catch {
    return 'UTC'
  }
}

type EditProps = {
  user: { id: number; fullName: string; email: string; role: string }
  profile: ProfileData | null
  sports: Sport[]
}

export default function ProfileEdit({ user, profile, sports }: EditProps) {
  const { t, locale } = useTranslation()
  const { techMode, toggleTechMode } = useTechMode()
  const form = useForm({
    full_name: user.fullName,
    email: user.email,
    sport_id: profile?.sportId ?? 0,
    level: profile?.level ?? '',
    objective: profile?.objective ?? '',
    preferred_unit: profile?.preferences.speedUnit ?? 'min_km',
    distance_unit: profile?.preferences.distanceUnit ?? 'km',
    weight_unit: profile?.preferences.weightUnit ?? 'kg',
    week_starts_on: profile?.preferences.weekStartsOn ?? 'monday',
    date_format: profile?.preferences.dateFormat ?? 'DD/MM/YYYY',
    locale: profile?.preferences.locale ?? locale,
    max_heart_rate: profile?.maxHeartRate ?? (null as number | null),
    resting_heart_rate: profile?.restingHeartRate ?? (null as number | null),
    vma: profile?.vma ?? (null as number | null),
    timezone: profile?.timezone ?? browserTimezone(),
    privacy_zones: (profile?.privacyZones ?? []).map((z) => ({
      lat: z.lat,
      lon: z.lon,
      radius_m: z.radiusM,
    })),
    hr_zones_method: profile?.hrZonesConfig?.method ?? 'auto',
    lthr: profile?.hrZonesConfig?.lthr ?? (null as number | null),
    hr_zones_custom_bounds: profile?.hrZonesConfig?.customBoundsBpm ?? null,
  })

  const LEVELS = [
    { value: 'beginner' as const, label: t('profile.levels.beginner') },
    { value: 'intermediate' as const, label: t('profile.levels.intermediate') },
    { value: 'advanced' as const, label: t('profile.levels.advanced') },
  ]

  const OBJECTIVES = [
    { value: 'endurance_progress' as const, label: t('profile.objectives.endurance_progress') },
    { value: 'run_faster' as const, label: t('profile.objectives.run_faster') },
    { value: 'comeback_after_break' as const, label: t('profile.objectives.comeback_after_break') },
    { value: 'maintain_fitness' as const, label: t('profile.objectives.maintain_fitness') },
    { value: 'prepare_competition' as const, label: t('profile.objectives.prepare_competition') },
  ]

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    form.put('/profile')
  }

  return (
    <>
      <Head title={t('profile.title')} />
      <div className="flex flex-col items-center p-6 pt-16">
        <div className="mb-8">
          <h1 className="text-xl font-semibold">{t('profile.title')}</h1>
        </div>
        <div className="w-full max-w-md space-y-6">
          {/* Lien profil athlète */}
          <Link
            href="/profile/athlete"
            className="flex items-center justify-between rounded-xl border bg-card px-4 py-3 text-sm hover:bg-muted/50 transition-colors"
          >
            <span>{t('profile.athleteProfileLink')}</span>
            <span className="text-muted-foreground">→</span>
          </Link>

          {/* Toggle données techniques */}
          <div className="flex items-center justify-between rounded-xl border bg-card px-4 py-3">
            <span className="text-sm">{t('planning.athlete.toggle.technicalData')}</span>
            <button
              onClick={toggleTechMode}
              className={`relative inline-flex h-5 w-9 cursor-pointer items-center rounded-full transition-colors ${
                techMode ? 'bg-primary' : 'bg-muted'
              }`}
              role="switch"
              aria-checked={techMode}
            >
              <span
                className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                  techMode ? 'translate-x-4' : 'translate-x-0.5'
                }`}
              />
            </button>
          </div>

          {/* Formulaire principal : infos perso + profil sportif */}
          <form onSubmit={handleSubmit} className="space-y-6">
            {/* Informations personnelles */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">{t('profile.personalInfo')}</h2>
              <FormField
                label={t('profile.fullName')}
                htmlFor="full_name"
                error={form.errors.full_name}
              >
                <Input
                  id="full_name"
                  value={form.data.full_name}
                  onChange={(e) => form.setData('full_name', e.target.value)}
                  placeholder={t('profile.fullNamePlaceholder')}
                  autoComplete="name"
                />
              </FormField>
              <FormField label={t('profile.email')} htmlFor="email" error={form.errors.email}>
                <Input
                  id="email"
                  type="email"
                  value={form.data.email}
                  onChange={(e) => form.setData('email', e.target.value)}
                  placeholder={t('profile.emailPlaceholder')}
                  autoComplete="email"
                />
              </FormField>
            </div>

            {/* Profil sportif */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">{t('profile.sportProfile')}</h2>

              {/* Sport */}
              <FormField label={t('profile.sport')} htmlFor="sport_id" error={form.errors.sport_id}>
                <select
                  id="sport_id"
                  value={form.data.sport_id}
                  onChange={(e) => form.setData('sport_id', Number(e.target.value))}
                  className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value={0} disabled>
                    {t('profile.sportPlaceholder')}
                  </option>
                  {sports.map((sport) => (
                    <option key={sport.id} value={sport.id}>
                      {sport.name}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Niveau */}
              <FormField label={t('profile.level')} error={form.errors.level}>
                <SegmentedChoice
                  options={LEVELS}
                  value={form.data.level}
                  onChange={(v) => form.setData('level', v)}
                />
              </FormField>

              {/* Objectif */}
              <FormField
                label={t('profile.objective')}
                htmlFor="objective"
                error={form.errors.objective}
              >
                <select
                  id="objective"
                  value={form.data.objective ?? ''}
                  onChange={(e) =>
                    form.setData(
                      'objective',
                      e.target.value as NonNullable<ProfileData['objective']> | ''
                    )
                  }
                  className="flex h-10 w-full cursor-pointer rounded-md border border-input bg-background px-3 py-2 text-sm transition-colors hover:border-sand-9 hover:bg-sand-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
                >
                  <option value="">{t('profile.noObjective')}</option>
                  {OBJECTIVES.map((obj) => (
                    <option key={obj.value} value={obj.value}>
                      {obj.label}
                    </option>
                  ))}
                </select>
              </FormField>

              {/* Unité de vitesse */}
              <FormField label={t('profile.speedUnit')} error={form.errors.preferred_unit}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'min_km', label: 'min/km' },
                      { value: 'km_h', label: 'km/h' },
                    ] as const
                  }
                  value={form.data.preferred_unit}
                  onChange={(v) => form.setData('preferred_unit', v)}
                />
              </FormField>

              {/* Distance */}
              <FormField label={t('profile.distance')} error={form.errors.distance_unit}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'km', label: 'km' },
                      { value: 'mi', label: 'miles' },
                    ] as const
                  }
                  value={form.data.distance_unit}
                  onChange={(v) => form.setData('distance_unit', v)}
                />
              </FormField>

              {/* Poids */}
              <FormField label={t('profile.weight')} error={form.errors.weight_unit}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'kg', label: 'kg' },
                      { value: 'lbs', label: 'lbs' },
                    ] as const
                  }
                  value={form.data.weight_unit}
                  onChange={(v) => form.setData('weight_unit', v)}
                />
              </FormField>

              {/* Début de semaine */}
              <FormField label={t('profile.weekStart')} error={form.errors.week_starts_on}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'monday', label: t('profile.weekStartOptions.monday') },
                      { value: 'sunday', label: t('profile.weekStartOptions.sunday') },
                    ] as const
                  }
                  value={form.data.week_starts_on}
                  onChange={(v) => form.setData('week_starts_on', v)}
                />
              </FormField>

              {/* Format de date */}
              <FormField label={t('profile.dateFormat')} error={form.errors.date_format}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'DD/MM/YYYY', label: t('profile.dateFormatOptions.ddmmyyyy') },
                      { value: 'MM/DD/YYYY', label: t('profile.dateFormatOptions.mmddyyyy') },
                    ] as const
                  }
                  value={form.data.date_format}
                  onChange={(v) => form.setData('date_format', v)}
                />
              </FormField>

              {/* Langue */}
              <FormField label={t('profile.locale')} error={form.errors.locale}>
                <SegmentedChoice
                  options={
                    [
                      { value: 'fr', label: t('profile.localeOptions.fr') },
                      { value: 'en', label: t('profile.localeOptions.en') },
                    ] as const
                  }
                  value={form.data.locale}
                  onChange={(v) => form.setData('locale', v)}
                />
              </FormField>

              {/* Fuseau horaire : « aujourd'hui », semaine courante, forme du jour */}
              <FormField label={t('profile.timezone')} error={form.errors.timezone}>
                <input
                  list="timezones"
                  value={form.data.timezone ?? ''}
                  onChange={(e) => form.setData('timezone', e.target.value)}
                  className="w-full rounded-md border bg-background px-3 py-2 text-sm"
                />
                <datalist id="timezones">
                  {(Intl.supportedValuesOf?.('timeZone') ?? []).map((tz) => (
                    <option key={tz} value={tz} />
                  ))}
                </datalist>
              </FormField>
            </div>

            {/* Paramètres physiologiques */}
            <div className="rounded-xl border bg-card p-6 shadow-sm space-y-4">
              <h2 className="text-sm font-semibold">{t('profile.physiological.title')}</h2>

              <NumberField
                id="max_heart_rate"
                label={t('profile.physiological.maxHeartRate')}
                unit={t('profile.physiological.maxHeartRateUnit')}
                helpHref="/profile/physiology-guide"
                helpLabel={t('profile.physiological.howToMeasure')}
                min={100}
                max={250}
                value={form.data.max_heart_rate}
                onChange={(v) => form.setData('max_heart_rate', v)}
                placeholder={t('profile.physiological.maxHeartRatePlaceholder')}
                error={form.errors.max_heart_rate}
              />
              <NumberField
                id="resting_heart_rate"
                label={t('profile.physiological.restingHeartRate')}
                unit={t('profile.physiological.maxHeartRateUnit')}
                min={20}
                max={120}
                value={form.data.resting_heart_rate}
                onChange={(v) => form.setData('resting_heart_rate', v)}
                placeholder={t('profile.physiological.restingHeartRatePlaceholder')}
                error={form.errors.resting_heart_rate}
              />
              <NumberField
                id="vma"
                label={t('profile.physiological.vma')}
                unit={t('profile.physiological.vmaUnit')}
                helpHref="/profile/physiology-guide"
                helpLabel={t('profile.physiological.howToMeasure')}
                min={5}
                max={30}
                step={0.1}
                value={form.data.vma}
                onChange={(v) => form.setData('vma', v)}
                placeholder={t('profile.physiological.vmaPlaceholder')}
                error={form.errors.vma}
              />

              <PrivacyZonesEditor
                value={form.data.privacy_zones}
                onChange={(zones) => form.setData('privacy_zones', zones)}
                error={form.errors.privacy_zones}
              />

              <HeartRateZonesEditor
                maxHeartRate={form.data.max_heart_rate}
                restingHeartRate={form.data.resting_heart_rate}
                value={{
                  method: form.data.hr_zones_method,
                  lthr: form.data.lthr,
                  customBounds: form.data.hr_zones_custom_bounds,
                }}
                onChange={(zones) =>
                  form.setData((data) => ({
                    ...data,
                    hr_zones_method: zones.method,
                    lthr: zones.lthr,
                    hr_zones_custom_bounds: zones.customBounds,
                  }))
                }
                error={
                  form.errors.hr_zones_method ??
                  form.errors.lthr ??
                  form.errors.hr_zones_custom_bounds
                }
              />
            </div>

            <Button
              type="submit"
              disabled={form.processing}
              className="flex w-full items-center gap-2"
            >
              <Save className="h-4 w-4" />
              {form.processing ? t('profile.saving') : t('profile.save')}
            </Button>
          </form>

          {/* Mot de passe */}
          <ChangePasswordForm />

          {/* Corbeille */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-3 text-sm font-semibold">{t('profile.trash.title')}</h2>
            <Button variant="outline" className="w-full" asChild>
              <Link href="/sessions/trash">{t('profile.trash.link')}</Link>
            </Button>
          </div>

          {/* Administration */}
          {user.role === 'admin' && (
            <div className="rounded-xl border bg-card p-6 shadow-sm">
              <h2 className="mb-3 text-sm font-semibold">{t('profile.adminSection.title')}</h2>
              <Button variant="outline" className="w-full" asChild>
                <Link href="/admin/users">{t('profile.adminSection.link')}</Link>
              </Button>
            </div>
          )}
        </div>
      </div>
    </>
  )
}

ProfileEdit.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
