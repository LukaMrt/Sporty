import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import {
  CheckCircle2,
  AlertCircle,
  Link2,
  Unlink,
  RefreshCw,
  ChevronLeft,
  TriangleAlert,
} from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import stravaLogo from '~/assets/strava-logo.svg'
import { useTranslation } from '~/hooks/use_translation'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog'
import SessionsDataTable from '~/components/import/SessionsDataTable'
import type { StagingSession } from '~/types/staging_session'

type ConnectorStatus = 'connected' | 'error'

interface ConnectorsShowProps {
  stravaStatus: ConnectorStatus | null
  stravaConfigured: boolean
  activities: StagingSession[] | null
  initialAfter?: string
  initialBefore?: string
}

export default function ConnectorsShow({
  stravaStatus,
  stravaConfigured,
  activities,
  initialAfter,
  initialBefore,
}: ConnectorsShowProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)

  function connectStrava() {
    window.location.href = '/connectors/strava/authorize'
  }

  function confirmDisconnect() {
    setConfirmOpen(false)
    router.post('/connectors/strava/disconnect')
  }

  return (
    <>
      <Head title="Strava" />
      <div className="p-6">
        {/* Retour */}
        <Link
          href="/connectors"
          className="mb-6 inline-flex items-center gap-1 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" />
          {t('common.actions.back')}
        </Link>

        {/* En-tête */}
        <div className="flex items-center gap-4">
          <div className="flex h-14 w-14 shrink-0 items-center justify-center rounded-xl bg-[#FC4C02]">
            <img src={stravaLogo} alt="Strava" className="h-8 w-8" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">Strava</h1>
            <p className="text-sm text-muted-foreground">{t('connectors.strava.tagline')}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            {!stravaConfigured && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                <TriangleAlert className="h-4 w-4" />
                {t('connectors.strava.missingConfig')}
              </span>
            )}
            {stravaStatus === 'connected' && (
              <>
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {t('connectors.strava.status')}
                </span>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 active:scale-95"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  {t('connectors.strava.disconnect')}
                </button>
              </>
            )}
            {stravaStatus === 'error' && (
              <>
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                  <AlertCircle className="h-4 w-4" />
                  {t('connectors.strava.statusError')}
                </span>
                <button
                  onClick={connectStrava}
                  disabled={!stravaConfigured}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FC4C02] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#e04400] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <RefreshCw className="h-3.5 w-3.5" />
                  {t('connectors.strava.reconnect')}
                </button>
              </>
            )}
            {stravaStatus === null && (
              <button
                onClick={connectStrava}
                disabled={!stravaConfigured}
                className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FC4C02] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#e04400] active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <Link2 className="h-3.5 w-3.5" />
                {t('connectors.strava.connect')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Liste des activités en staging */}
      {activities !== null && (
        <div className="px-6 pb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('import.title')}</h2>
          <SessionsDataTable
            sessions={activities}
            initialAfter={initialAfter}
            initialBefore={initialBefore}
          />
        </div>
      )}

      {/* Modale de confirmation déconnexion */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('connectors.strava.disconnect')} Strava ?</DialogTitle>
            <DialogDescription>{t('connectors.strava.disconnectDescription')}</DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                {t('common.actions.cancel')}
              </button>
            </DialogClose>
            <button
              onClick={confirmDisconnect}
              className="cursor-pointer rounded-md bg-destructive px-4 py-2 text-sm font-medium text-destructive-foreground transition hover:bg-destructive/90"
            >
              {t('connectors.strava.disconnect')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

ConnectorsShow.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
