import React, { useState } from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import logo from '~/assets/logo.png'
import { useTranslation } from '~/hooks/use_translation'

interface SharedProps {
  auth?: { user: { fullName: string } | null }
}

interface Sport {
  id: number
  name: string
  slug: string
}

interface WizardProps {
  sports: Sport[]
}

const SPORT_ICONS: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  hiking: '🥾',
}

export default function Wizard({ sports }: WizardProps) {
  const { auth } = usePage<SharedProps>().props
  const { t } = useTranslation()
  const firstName = auth?.user?.fullName?.split(' ')[0] ?? ''
  const [step, setStep] = useState(1)
  const { data, setData, post, processing, errors } = useForm({
    sport_id: 0,
    level: '' as 'beginner' | 'intermediate' | 'advanced' | '',
    objective: '' as
      | 'endurance_progress'
      | 'run_faster'
      | 'comeback_after_break'
      | 'maintain_fitness'
      | 'prepare_competition'
      | '',
    preferred_unit: 'min_km' as 'min_km' | 'km_h',
    distance_unit: 'km' as 'km' | 'mi',
    weight_unit: 'kg' as 'kg' | 'lbs',
    week_starts_on: 'monday' as 'monday' | 'sunday',
    date_format: 'DD/MM/YYYY' as 'DD/MM/YYYY' | 'MM/DD/YYYY',
  })

  const LEVELS = [
    {
      value: 'beginner' as const,
      label: t('onboarding.levels.beginner.label'),
      description: t('onboarding.levels.beginner.description'),
    },
    {
      value: 'intermediate' as const,
      label: t('onboarding.levels.intermediate.label'),
      description: t('onboarding.levels.intermediate.description'),
    },
    {
      value: 'advanced' as const,
      label: t('onboarding.levels.advanced.label'),
      description: t('onboarding.levels.advanced.description'),
    },
  ]

  const OBJECTIVES = [
    {
      value: 'endurance_progress' as const,
      label: t('onboarding.objectives.endurance_progress.label'),
      description: t('onboarding.objectives.endurance_progress.description'),
    },
    {
      value: 'run_faster' as const,
      label: t('onboarding.objectives.run_faster.label'),
      description: t('onboarding.objectives.run_faster.description'),
    },
    {
      value: 'comeback_after_break' as const,
      label: t('onboarding.objectives.comeback_after_break.label'),
      description: t('onboarding.objectives.comeback_after_break.description'),
    },
    {
      value: 'maintain_fitness' as const,
      label: t('onboarding.objectives.maintain_fitness.label'),
      description: t('onboarding.objectives.maintain_fitness.description'),
    },
    {
      value: 'prepare_competition' as const,
      label: t('onboarding.objectives.prepare_competition.label'),
      description: t('onboarding.objectives.prepare_competition.description'),
    },
  ]

  const canGoNext = () => {
    if (step === 1) return data.sport_id > 0
    if (step === 2) return data.level !== ''
    return true
  }

  const [done, setDone] = useState(false)

  const handleFinish = () => {
    setDone(true)
    setTimeout(() => post('/onboarding'), 1800)
  }

  return (
    <>
      <Head title={t('onboarding.title')} />
      <div className="h-screen bg-sand-1 flex flex-col px-4 py-6 overflow-hidden">
        <div className="w-full max-w-lg mx-auto flex flex-col flex-1 min-h-0">
          {/* Logo + accroche */}
          <div className="mb-4 text-center shrink-0">
            <img src={logo} alt="Sporty" className="mx-auto h-10 w-10 mb-2" />
            <h1 className="text-xl font-bold text-sand-12">
              {firstName
                ? t('onboarding.welcome', { name: firstName })
                : t('onboarding.welcomeGeneric')}
            </h1>
            <p className="mt-1 text-sm text-sand-10">{t('onboarding.subtitle')}</p>
          </div>

          {/* Carte principale */}
          <div className="flex-1 min-h-0 rounded-2xl border border-sand-6 bg-white shadow-sm px-8 py-6 flex flex-col">
            {done ? (
              /* Écran de confirmation */
              <div className="flex-1 flex flex-col items-center justify-center text-center gap-4">
                <div className="text-5xl animate-bounce">🎉</div>
                <h2 className="text-xl font-bold text-sand-12">{t('onboarding.done.title')}</h2>
                <p className="text-sand-10 text-sm max-w-xs">{t('onboarding.done.description')}</p>
                <div className="flex gap-1 mt-2">
                  {[0, 1, 2].map((i) => (
                    <div
                      key={i}
                      className="h-1.5 w-1.5 rounded-full bg-sand-9 animate-pulse"
                      style={{ animationDelay: `${i * 0.2}s` }}
                    />
                  ))}
                </div>
              </div>
            ) : (
              <>
                {/* Progress dots — position fixe dans la carte */}
                <div className="flex justify-center gap-2 mb-6 shrink-0">
                  {[1, 2, 3, 4].map((n) => (
                    <div
                      key={n}
                      className={`h-2 rounded-full transition-all duration-300 ${
                        n === step ? 'bg-sand-12 w-6' : n < step ? 'bg-sand-9 w-2' : 'bg-sand-5 w-2'
                      }`}
                    />
                  ))}
                </div>

                {/* Titre de l'étape — hors scroll */}
                <div className="mb-4 shrink-0">
                  {step === 1 && (
                    <>
                      <h1 className="text-2xl font-bold text-sand-12 mb-1">
                        {t('onboarding.step1.title')}
                      </h1>
                      <p className="text-sm text-sand-11">{t('onboarding.step1.subtitle')}</p>
                    </>
                  )}
                  {step === 2 && (
                    <>
                      <h1 className="text-2xl font-bold text-sand-12 mb-1">
                        {t('onboarding.step2.title')}
                      </h1>
                      <p className="text-sm text-sand-11">{t('onboarding.step2.subtitle')}</p>
                    </>
                  )}
                  {step === 3 && (
                    <>
                      <h1 className="text-2xl font-bold text-sand-12 mb-1">
                        {t('onboarding.step3.title')}
                      </h1>
                      <p className="text-sm text-sand-11">{t('onboarding.step3.subtitle')}</p>
                    </>
                  )}
                  {step === 4 && (
                    <>
                      <h1 className="text-2xl font-bold text-sand-12 mb-1">
                        {t('onboarding.step4.title')}
                      </h1>
                      <p className="text-sm text-sand-11">{t('onboarding.step4.subtitle')}</p>
                    </>
                  )}
                </div>

                <div className="flex-1 min-h-0 overflow-y-auto">
                  {/* Step 1 — Sport */}
                  {step === 1 && (
                    <div>
                      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
                        {sports.map((sport) => (
                          <button
                            key={sport.id}
                            type="button"
                            onClick={() => setData('sport_id', sport.id)}
                            className={`rounded-xl border-2 p-4 text-center transition-all duration-150 cursor-pointer
                              hover:shadow-md
                              ${
                                data.sport_id === sport.id
                                  ? 'border-sand-12 bg-sand-3 font-semibold text-sand-12 shadow-md'
                                  : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
                              }`}
                          >
                            <span className="text-2xl mb-1 block">
                              {SPORT_ICONS[sport.slug] ?? '⚡'}
                            </span>
                            <span className="text-sm">{sport.name}</span>
                          </button>
                        ))}
                      </div>
                      {errors.sport_id && (
                        <p className="mt-2 text-sm text-red-600">{errors.sport_id}</p>
                      )}
                    </div>
                  )}
                  {/* Step 2 — Niveau */}
                  {step === 2 && (
                    <div>
                      <div className="flex flex-col gap-3">
                        {LEVELS.map((lvl) => (
                          <button
                            key={lvl.value}
                            type="button"
                            onClick={() => setData('level', lvl.value)}
                            className={`rounded-xl border-2 p-4 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                              data.level === lvl.value
                                ? 'border-sand-12 bg-sand-3 shadow-md'
                                : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                            }`}
                          >
                            <p
                              className={`font-semibold ${data.level === lvl.value ? 'text-sand-12' : 'text-sand-11'}`}
                            >
                              {lvl.label}
                            </p>
                            <p className="text-sm text-sand-10 mt-0.5">{lvl.description}</p>
                          </button>
                        ))}
                      </div>
                      {errors.level && <p className="mt-2 text-sm text-red-600">{errors.level}</p>}
                    </div>
                  )}

                  {/* Step 3 — Objectif */}
                  {step === 3 && (
                    <div>
                      <div className="flex flex-col gap-3">
                        {OBJECTIVES.map((obj) => (
                          <button
                            key={obj.value}
                            type="button"
                            onClick={() => setData('objective', obj.value)}
                            className={`rounded-xl border-2 p-4 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                              data.objective === obj.value
                                ? 'border-sand-12 bg-sand-3 shadow-md'
                                : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                            }`}
                          >
                            <p
                              className={`font-semibold ${data.objective === obj.value ? 'text-sand-12' : 'text-sand-11'}`}
                            >
                              {obj.label}
                            </p>
                            <p className="text-sm text-sand-10 mt-0.5">{obj.description}</p>
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setData('objective', '')}
                          className={`rounded-xl border-2 p-4 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                            data.objective === ''
                              ? 'border-sand-12 bg-sand-3 shadow-md'
                              : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                          }`}
                        >
                          <p
                            className={`font-semibold ${data.objective === '' ? 'text-sand-12' : 'text-sand-11'}`}
                          >
                            {t('onboarding.objectives.none.label')}
                          </p>
                          <p className="text-sm text-sand-10 mt-0.5">
                            {t('onboarding.objectives.none.description')}
                          </p>
                        </button>
                      </div>
                    </div>
                  )}

                  {/* Step 4 — Préférences */}
                  {step === 4 && (
                    <div className="flex flex-col gap-6 pb-2">
                      {/* Vitesse */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sand-10 mb-2">
                          {t('onboarding.speed.title')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                value: 'min_km',
                                label: t('onboarding.speed.min_km.label'),
                                description: t('onboarding.speed.min_km.description'),
                              },
                              {
                                value: 'km_h',
                                label: t('onboarding.speed.km_h.label'),
                                description: t('onboarding.speed.km_h.description'),
                              },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setData('preferred_unit', opt.value)}
                              className={`rounded-xl border-2 p-3 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                                data.preferred_unit === opt.value
                                  ? 'border-sand-12 bg-sand-3 shadow-md'
                                  : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                              }`}
                            >
                              <p
                                className={`font-semibold ${data.preferred_unit === opt.value ? 'text-sand-12' : 'text-sand-11'}`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-sm text-sand-10 mt-0.5">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Distance */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sand-10 mb-2">
                          {t('onboarding.distance.title')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                value: 'km',
                                label: t('onboarding.distance.km.label'),
                                description: t('onboarding.distance.km.description'),
                              },
                              {
                                value: 'mi',
                                label: t('onboarding.distance.mi.label'),
                                description: t('onboarding.distance.mi.description'),
                              },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setData('distance_unit', opt.value)}
                              className={`rounded-xl border-2 p-3 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                                data.distance_unit === opt.value
                                  ? 'border-sand-12 bg-sand-3 shadow-md'
                                  : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                              }`}
                            >
                              <p
                                className={`font-semibold ${data.distance_unit === opt.value ? 'text-sand-12' : 'text-sand-11'}`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-sm text-sand-10 mt-0.5">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Poids */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sand-10 mb-2">
                          {t('onboarding.weight.title')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                value: 'kg',
                                label: t('onboarding.weight.kg.label'),
                                description: t('onboarding.weight.kg.description'),
                              },
                              {
                                value: 'lbs',
                                label: t('onboarding.weight.lbs.label'),
                                description: t('onboarding.weight.lbs.description'),
                              },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setData('weight_unit', opt.value)}
                              className={`rounded-xl border-2 p-3 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                                data.weight_unit === opt.value
                                  ? 'border-sand-12 bg-sand-3 shadow-md'
                                  : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                              }`}
                            >
                              <p
                                className={`font-semibold ${data.weight_unit === opt.value ? 'text-sand-12' : 'text-sand-11'}`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-sm text-sand-10 mt-0.5">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Début de semaine */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sand-10 mb-2">
                          {t('onboarding.weekStart.title')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                value: 'monday',
                                label: t('onboarding.weekStart.monday.label'),
                                description: t('onboarding.weekStart.monday.description'),
                              },
                              {
                                value: 'sunday',
                                label: t('onboarding.weekStart.sunday.label'),
                                description: t('onboarding.weekStart.sunday.description'),
                              },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setData('week_starts_on', opt.value)}
                              className={`rounded-xl border-2 p-3 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                                data.week_starts_on === opt.value
                                  ? 'border-sand-12 bg-sand-3 shadow-md'
                                  : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                              }`}
                            >
                              <p
                                className={`font-semibold ${data.week_starts_on === opt.value ? 'text-sand-12' : 'text-sand-11'}`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-sm text-sand-10 mt-0.5">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Format de date */}
                      <div>
                        <p className="text-xs font-semibold uppercase tracking-wide text-sand-10 mb-2">
                          {t('onboarding.dateFormat.title')}
                        </p>
                        <div className="flex flex-col gap-2">
                          {(
                            [
                              {
                                value: 'DD/MM/YYYY',
                                label: t('onboarding.dateFormat.ddmmyyyy.label'),
                                description: t('onboarding.dateFormat.ddmmyyyy.description'),
                              },
                              {
                                value: 'MM/DD/YYYY',
                                label: t('onboarding.dateFormat.mmddyyyy.label'),
                                description: t('onboarding.dateFormat.mmddyyyy.description'),
                              },
                            ] as const
                          ).map((opt) => (
                            <button
                              key={opt.value}
                              type="button"
                              onClick={() => setData('date_format', opt.value)}
                              className={`rounded-xl border-2 p-3 text-left transition-all duration-150 cursor-pointer hover:shadow-md ${
                                data.date_format === opt.value
                                  ? 'border-sand-12 bg-sand-3 shadow-md'
                                  : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
                              }`}
                            >
                              <p
                                className={`font-semibold ${data.date_format === opt.value ? 'text-sand-12' : 'text-sand-11'}`}
                              >
                                {opt.label}
                              </p>
                              <p className="text-sm text-sand-10 mt-0.5">{opt.description}</p>
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
          {/* fin carte */}

          {/* Navigation — position fixe en bas */}
          {!done && (
            <div className="mt-4 flex justify-between shrink-0">
              {step > 1 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s - 1)}
                  className="rounded-lg border border-sand-7 bg-white px-5 py-2.5 text-sm font-medium text-sand-11 transition-all duration-150 hover:bg-sand-2 hover:border-sand-9 hover:shadow-sm cursor-pointer"
                >
                  {t('onboarding.back')}
                </button>
              ) : (
                <span />
              )}
              {step < 4 ? (
                <button
                  type="button"
                  onClick={() => setStep((s) => s + 1)}
                  disabled={!canGoNext()}
                  className="rounded-lg bg-sand-12 px-5 py-2.5 text-sm font-medium text-sand-1 transition-all duration-150 hover:bg-sand-11 hover:shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:shadow-none disabled:hover:bg-sand-12"
                >
                  {t('onboarding.next')}
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleFinish}
                  disabled={processing}
                  className="rounded-lg bg-sand-12 px-5 py-2.5 text-sm font-medium text-sand-1 transition-all duration-150 hover:bg-sand-11 hover:shadow-sm cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  {processing ? t('onboarding.saving') : t('onboarding.finish')}
                </button>
              )}
            </div>
          )}
          {/* fin nav */}
        </div>
      </div>
    </>
  )
}
