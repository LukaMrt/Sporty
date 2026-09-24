import React, { useState } from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import ConnectorCard from '~/components/connectors/ConnectorCard'
import { useTranslation } from '~/hooks/use_translation'
import {
  connectorBrand,
  connectorDisconnectPath,
  type ConnectorAuthKind,
  type ConnectorStatus,
} from '~/lib/connector_catalog'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog'

type ConnectorCardDto = {
  provider: string
  authKind: ConnectorAuthKind
  configured: boolean
  status: ConnectorStatus | null
}

type ConnectorsIndexProps = {
  connectors: ConnectorCardDto[]
}

export default function ConnectorsIndex({ connectors }: ConnectorsIndexProps) {
  const { t } = useTranslation()
  const [pendingDisconnect, setPendingDisconnect] = useState<string | null>(null)

  const available = connectors.filter((c) => c.configured)

  function confirmDisconnect() {
    if (!pendingDisconnect) return
    const provider = pendingDisconnect
    setPendingDisconnect(null)
    router.post(connectorDisconnectPath(provider))
  }

  const pendingBrand = pendingDisconnect ? connectorBrand(pendingDisconnect) : null

  return (
    <>
      <Head title={t('connectors.title')} />
      <div className="p-6">
        <h1 className="text-2xl font-bold text-foreground">{t('connectors.title')}</h1>
        <p className="mt-1 text-sm text-muted-foreground">{t('connectors.description')}</p>

        {available.length === 0 && (
          <p className="mt-6 text-sm text-muted-foreground">{t('connectors.notConfigured')}</p>
        )}

        {available.length > 0 && (
          <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {available.map((connector) => (
              <ConnectorCard
                key={connector.provider}
                provider={connector.provider}
                status={connector.status}
                onDisconnect={setPendingDisconnect}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modale de confirmation déconnexion */}
      <Dialog open={pendingDisconnect !== null} onOpenChange={() => setPendingDisconnect(null)}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {t(`connectors.${pendingBrand?.i18nKey ?? 'strava'}.disconnect`)} {pendingBrand?.name}{' '}
              ?
            </DialogTitle>
            <DialogDescription>
              {t(`connectors.${pendingBrand?.i18nKey ?? 'strava'}.disconnectDescription`)}
            </DialogDescription>
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
              {t(`connectors.${pendingBrand?.i18nKey ?? 'strava'}.disconnect`)}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

ConnectorsIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
