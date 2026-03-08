import React from 'react'
import { Head } from '@inertiajs/react'
import { CheckCircle2, Link2 } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import stravaLogo from '~/assets/strava-logo.svg'
import { useTranslation } from '~/hooks/use_translation'

interface ConnectorsIndexProps {
  stravaConfigured: boolean
  stravaConnected: boolean
}

export default function ConnectorsIndex({
  stravaConfigured,
  stravaConnected,
}: ConnectorsIndexProps) {
  const { t } = useTranslation()

  function connectStrava() {
    window.location.href = '/connectors/strava/authorize'
  }

  return (
    <>
      <Head title={t('connectors.title')} />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">{t('connectors.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('connectors.description')}</p>

        <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {stravaConfigured && (
            <div className="flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm">
              {/* Header */}
              <div className="flex items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FC4C02]">
                  <img src={stravaLogo} alt="Strava" className="h-6 w-6" />
                </div>
                <div>
                  <p className="font-semibold text-foreground">Strava</p>
                  <p className="text-xs text-muted-foreground">Réseau social sportif</p>
                </div>
                {stravaConnected && (
                  <CheckCircle2 className="ml-auto h-5 w-5 shrink-0 text-green-500" />
                )}
              </div>

              {/* Action */}
              {stravaConnected ? (
                <p className="text-xs font-medium text-green-600">
                  {t('connectors.strava.status')}
                </p>
              ) : (
                <button
                  onClick={connectStrava}
                  className="flex cursor-pointer items-center justify-center gap-2 rounded-lg bg-[#FC4C02] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#e04400] active:scale-95"
                >
                  <Link2 className="h-4 w-4" />
                  {t('connectors.strava.connect')}
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  )
}

ConnectorsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
