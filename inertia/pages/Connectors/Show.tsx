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
  AlertTriangle,
} from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { pushToast } from '~/hooks/use_toast'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '~/components/ui/dialog'
import { Switch } from '~/components/ui/switch'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import SessionsDataTable from '~/components/import/SessionsDataTable'
import ApiKeyConnectForm from '~/components/connectors/ApiKeyConnectForm'
import type { StagingSession } from '~/types/staging_session'
import {
  connectorBrand,
  connectorAuthorizePath,
  connectorDisconnectPath,
  connectorSettingsPath,
  type ConnectorAuthKind,
  type ConnectorStatus,
} from '~/lib/connector_catalog'

interface ConnectorsShowProps {
  provider: string
  authKind: ConnectorAuthKind
  status: ConnectorStatus | null
  configured: boolean
  sessions: StagingSession[] | null
  connectorError: boolean
  initialAfter?: string
  initialBefore?: string
  autoImportEnabled: boolean
  pollingIntervalMinutes: number
}

export default function ConnectorsShow({
  provider,
  authKind,
  status,
  configured,
  sessions,
  connectorError,
  initialAfter,
  initialBefore,
  autoImportEnabled,
  pollingIntervalMinutes,
}: ConnectorsShowProps) {
  const { t } = useTranslation()
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [optimisticEnabled, setOptimisticEnabled] = useState(autoImportEnabled)
  const [interval, setInterval] = useState(pollingIntervalMinutes)
  const intervalDirty = interval !== pollingIntervalMinutes

  const brand = connectorBrand(provider)
  const i18n = (key: string) => t(`connectors.${brand.i18nKey}.${key}`)
  const isConnected = status === 'connected'

  function submitSettings(enabled: boolean, minutes: number) {
    router.post(
      connectorSettingsPath(provider),
      { auto_import_enabled: enabled, polling_interval_minutes: minutes },
      {
        preserveScroll: true,
        showProgress: false,
        onSuccess: () => pushToast(t('connectors.settings.updated')),
        onError: () => {
          setOptimisticEnabled(autoImportEnabled)
          setInterval(pollingIntervalMinutes)
          pushToast(t('connectors.settings.error'), 'error')
        },
      }
    )
  }

  function handleToggle(checked: boolean) {
    setOptimisticEnabled(checked)
    submitSettings(checked, interval)
  }

  function handleIntervalSave() {
    const clamped = Math.min(60, Math.max(5, interval))
    setInterval(clamped)
    submitSettings(optimisticEnabled, clamped)
  }

  function connect() {
    window.location.href = connectorAuthorizePath(provider)
  }

  function confirmDisconnect() {
    setConfirmOpen(false)
    router.post(connectorDisconnectPath(provider))
  }

  const canConnect = authKind === 'oauth'

  return (
    <>
      <Head title={brand.name} />
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
          <div
            className={`flex h-14 w-14 shrink-0 items-center justify-center rounded-xl ${brand.bgClass}`}
          >
            {brand.logo && <img src={brand.logo} alt={brand.name} className="h-8 w-8" />}
          </div>
          <div>
            <h1 className="text-2xl font-bold text-foreground">{brand.name}</h1>
            <p className="text-sm text-muted-foreground">{i18n('tagline')}</p>
          </div>
          <div className="ml-auto flex flex-col items-end gap-2">
            {!configured && (
              <span className="flex items-center gap-1.5 rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
                <TriangleAlert className="h-4 w-4" />
                {i18n('missingConfig')}
              </span>
            )}
            {status === 'connected' && (
              <>
                <span className="flex items-center gap-1 rounded-full bg-green-100 px-3 py-1 text-sm font-medium text-green-700">
                  <CheckCircle2 className="h-4 w-4" />
                  {i18n('status')}
                </span>
                <button
                  onClick={() => setConfirmOpen(true)}
                  className="flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/50 px-3 py-1.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 active:scale-95"
                >
                  <Unlink className="h-3.5 w-3.5" />
                  {i18n('disconnect')}
                </button>
              </>
            )}
            {status === 'error' && (
              <>
                <span className="flex items-center gap-1 rounded-full bg-orange-100 px-3 py-1 text-sm font-medium text-orange-700">
                  <AlertCircle className="h-4 w-4" />
                  {i18n('statusError')}
                </span>
                <p className="text-xs text-orange-700 max-w-xs text-right">
                  {i18n('errorMessage')}
                </p>
                {canConnect && (
                  <button
                    onClick={connect}
                    disabled={!configured}
                    className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${brand.buttonClass}`}
                  >
                    <RefreshCw className="h-3.5 w-3.5" />
                    {i18n('reconnect')}
                  </button>
                )}
              </>
            )}
            {status === null && canConnect && (
              <button
                onClick={connect}
                disabled={!configured}
                className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${brand.buttonClass}`}
              >
                <Link2 className="h-3.5 w-3.5" />
                {i18n('connect')}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Connexion par cle API (providers sans OAuth) */}
      {authKind === 'api_key' && status !== 'connected' && (
        <div className="px-6 pb-4">
          <ApiKeyConnectForm brand={brand} disabled={!configured} />
        </div>
      )}

      {/* Settings auto import */}
      <div className="px-6 pb-4">
        <div className="flex items-center gap-6 rounded-lg border p-4">
          <div className="flex items-center gap-3">
            <Switch
              id="auto-import"
              checked={optimisticEnabled}
              onCheckedChange={handleToggle}
              disabled={!isConnected}
            />
            <Label
              htmlFor="auto-import"
              className={!isConnected ? 'text-muted-foreground' : undefined}
            >
              {t('connectors.settings.autoImport')}
            </Label>
          </div>
          <div className="flex items-center gap-2">
            <Label
              htmlFor="polling-interval"
              className={!isConnected ? 'text-muted-foreground' : undefined}
            >
              {t('connectors.settings.interval')}
            </Label>
            <Input
              id="polling-interval"
              type="number"
              min={5}
              max={60}
              value={interval}
              onChange={(e) => setInterval(Number(e.target.value))}
              onKeyDown={(e) => e.key === 'Enter' && handleIntervalSave()}
              disabled={!isConnected}
              className="w-20"
            />
            <span className={`text-sm ${!isConnected ? 'text-muted-foreground' : ''}`}>min</span>
            <button
              onClick={handleIntervalSave}
              disabled={!intervalDirty || !isConnected}
              className="cursor-pointer rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition hover:bg-primary/90 active:scale-95 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {t('common.actions.save')}
            </button>
          </div>
        </div>
      </div>

      {/* Bandeau d'avertissement quand connecteur en erreur */}
      {connectorError && (
        <div className="mx-6 mb-4 flex items-start gap-3 rounded-lg border border-orange-200 bg-orange-50 p-4">
          <AlertTriangle className="mt-0.5 h-5 w-5 shrink-0 text-orange-600" />
          <div className="flex-1">
            <p className="text-sm font-medium text-orange-800">{i18n('errorBannerTitle')}</p>
            <p className="mt-0.5 text-sm text-orange-700">
              {i18n('errorBannerText')}{' '}
              <Link href="/connectors" className="underline hover:no-underline">
                {t('connectors.title')}
              </Link>
            </p>
          </div>
        </div>
      )}

      {/* Liste des sessions en staging */}
      {sessions !== null && (
        <div className="px-6 pb-6">
          <h2 className="text-lg font-semibold text-foreground">{t('import.title')}</h2>
          <SessionsDataTable
            provider={provider}
            sessions={sessions}
            connectorError={connectorError}
            initialAfter={initialAfter}
            initialBefore={initialBefore}
          />
        </div>
      )}

      {/* Modale de confirmation déconnexion */}
      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>
              {i18n('disconnect')} {brand.name} ?
            </DialogTitle>
            <DialogDescription>{i18n('disconnectDescription')}</DialogDescription>
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
              {i18n('disconnect')}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}

ConnectorsShow.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
