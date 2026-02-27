import React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { Save } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import ChangePasswordForm from '~/components/Profile/ChangePasswordForm'
import FormField from '~/components/forms/FormField'
import { Input } from '~/components/ui/input'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

interface Sport {
  id: number
  name: string
}

interface ProfileData {
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
}

interface EditProps {
  user: { id: number; fullName: string; email: string; role: string }
  profile: ProfileData | null
  sports: Sport[]
}

export default function ProfileEdit({ user, profile, sports }: EditProps) {
  const { t } = useTranslation()
  const form = useForm({
    full_name: user.fullName,
    email: user.email,
    sport_id: profile?.sportId ?? 0,
    level: profile?.level ?? ('' as 'beginner' | 'intermediate' | 'advanced' | ''),
    objective: profile?.objective ?? ('' as ProfileData['objective'] | ''),
    preferred_unit: profile?.preferences.speedUnit ?? ('min_km' as 'min_km' | 'km_h'),
    distance_unit: profile?.preferences.distanceUnit ?? ('km' as 'km' | 'mi'),
    weight_unit: profile?.preferences.weightUnit ?? ('kg' as 'kg' | 'lbs'),
    week_starts_on: profile?.preferences.weekStartsOn ?? ('monday' as 'monday' | 'sunday'),
    date_format: profile?.preferences.dateFormat ?? ('DD/MM/YYYY' as 'DD/MM/YYYY' | 'MM/DD/YYYY'),
    locale: profile?.preferences.locale ?? ('fr' as 'fr' | 'en'),
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
                <div className="flex gap-2">
                  {LEVELS.map((lvl) => (
                    <button
                      key={lvl.value}
                      type="button"
                      onClick={() => form.setData('level', lvl.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.level === lvl.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {lvl.label}
                    </button>
                  ))}
                </div>
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
                      (e.target.value || null) as ProfileData['objective'] | ''
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
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'min_km', label: 'min/km' },
                      { value: 'km_h', label: 'km/h' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('preferred_unit', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.preferred_unit === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Distance */}
              <FormField label={t('profile.distance')} error={form.errors.distance_unit}>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'km', label: 'km' },
                      { value: 'mi', label: 'miles' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('distance_unit', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.distance_unit === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Poids */}
              <FormField label={t('profile.weight')} error={form.errors.weight_unit}>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'kg', label: 'kg' },
                      { value: 'lbs', label: 'lbs' },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('weight_unit', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.weight_unit === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Début de semaine */}
              <FormField label={t('profile.weekStart')} error={form.errors.week_starts_on}>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'monday', label: t('profile.weekStartOptions.monday') },
                      { value: 'sunday', label: t('profile.weekStartOptions.sunday') },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('week_starts_on', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.week_starts_on === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Format de date */}
              <FormField label={t('profile.dateFormat')} error={form.errors.date_format}>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'DD/MM/YYYY', label: t('profile.dateFormatOptions.ddmmyyyy') },
                      { value: 'MM/DD/YYYY', label: t('profile.dateFormatOptions.mmddyyyy') },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('date_format', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.date_format === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>

              {/* Langue */}
              <FormField label={t('profile.locale')} error={form.errors.locale}>
                <div className="flex gap-2">
                  {(
                    [
                      { value: 'fr', label: t('profile.localeOptions.fr') },
                      { value: 'en', label: t('profile.localeOptions.en') },
                    ] as const
                  ).map((opt) => (
                    <button
                      key={opt.value}
                      type="button"
                      onClick={() => form.setData('locale', opt.value)}
                      className={`flex-1 rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 cursor-pointer ${
                        form.data.locale === opt.value
                          ? 'border-sand-12 bg-sand-3 text-sand-12'
                          : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                      }`}
                    >
                      {opt.label}
                    </button>
                  ))}
                </div>
              </FormField>
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
