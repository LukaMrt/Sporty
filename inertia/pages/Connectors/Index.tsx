import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { CheckCircle2, AlertCircle, ChevronRight } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import stravaLogo from '~/assets/strava-logo.svg'
import { useTranslation } from '~/hooks/use_translation'

type ConnectorStatus = 'connected' | 'error'

interface ConnectorsIndexProps {
  stravaConfigured: boolean
  stravaStatus: ConnectorStatus | null
}

export default function ConnectorsIndex({ stravaConfigured, stravaStatus }: ConnectorsIndexProps) {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('connectors.title')} />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">{t('connectors.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('connectors.description')}</p>

        {!stravaConfigured && (
          <p className="mt-6 text-sm text-muted-foreground">{t('connectors.notConfigured')}</p>
        )}

        {stravaConfigured && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <Link
              href="/connectors/strava"
              className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition hover:bg-muted/50 active:scale-[0.99]"
            >
              {/* Logo + nom + tagline */}
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FC4C02]">
                  <img src={stravaLogo} alt="Strava" className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Strava</p>
                  <p className="text-xs text-muted-foreground">{t('connectors.strava.tagline')}</p>
                </div>
              </div>

              {/* Badge statut + chevron */}
              <div className="flex items-center gap-2">
                {stravaStatus === 'connected' && (
                  <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
                    <CheckCircle2 className="h-3 w-3" />
                    {t('connectors.strava.status')}
                  </span>
                )}
                {stravaStatus === 'error' && (
                  <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
                    <AlertCircle className="h-3 w-3" />
                    {t('connectors.strava.statusError')}
                  </span>
                )}
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </Link>
          </div>
        )}
      </div>
    </>
  )
}

ConnectorsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
