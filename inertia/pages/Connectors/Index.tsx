import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import { CheckCircle2, AlertCircle, Link2, Unlink, RefreshCw } from 'lucide-react'
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

type ConnectorStatus = 'connected' | 'error'

interface ConnectorsIndexProps {
  stravaConfigured: boolean
  stravaStatus: ConnectorStatus | null
}

export default function ConnectorsIndex({ stravaConfigured, stravaStatus }: ConnectorsIndexProps) {
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
      <Head title={t('connectors.title')} />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">{t('connectors.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('connectors.description')}</p>

        {!stravaConfigured && (
          <p className="mt-6 text-sm text-muted-foreground">{t('connectors.notConfigured')}</p>
        )}

        {stravaConfigured && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            <div className="flex gap-4 rounded-xl border bg-card p-5 shadow-sm">
              {/* Gauche : logo + nom + description — pleine hauteur */}
              <div className="flex flex-1 items-center gap-3">
                <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-[#FC4C02]">
                  <img src={stravaLogo} alt="Strava" className="h-6 w-6" />
                </div>
                <div className="min-w-0">
                  <p className="font-semibold text-foreground">Strava</p>
                  <p className="text-xs text-muted-foreground">Réseau social sportif</p>
                </div>
              </div>

              {/* Droite : badge en haut, action en bas */}
              <div className="flex flex-col items-end justify-between gap-2">
                {/* Badge statut */}
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
                {stravaStatus === null && <span />}

                {/* Action */}
                {stravaStatus === 'connected' && (
                  <button
                    onClick={() => setConfirmOpen(true)}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 active:scale-95"
                  >
                    <Unlink className="h-3.5 w-3.5" />
                    {t('connectors.strava.disconnect')}
                  </button>
                )}
                {stravaStatus === 'error' && (
                  <button
                    onClick={connectStrava}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FC4C02] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#e04400] active:scale-95"
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {t('connectors.strava.reconnect')}
                  </button>
                )}
                {stravaStatus === null && (
                  <button
                    onClick={connectStrava}
                    className="flex cursor-pointer items-center gap-1.5 rounded-md bg-[#FC4C02] px-3 py-1.5 text-xs font-medium text-white transition hover:bg-[#e04400] active:scale-95"
                  >
                    <Link2 className="h-3.5 w-3.5" />
                    {t('connectors.strava.connect')}
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Modale de confirmation déconnexion */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>{t('connectors.strava.disconnect')} Strava ?</DialogTitle>
            <DialogDescription>
              Vos tokens seront supprimés et votre compte Strava sera révoqué. Vous pourrez
              reconnecter à tout moment.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <DialogClose asChild>
              <button className="cursor-pointer rounded-md border px-4 py-2 text-sm font-medium transition hover:bg-muted">
                Annuler
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

ConnectorsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
