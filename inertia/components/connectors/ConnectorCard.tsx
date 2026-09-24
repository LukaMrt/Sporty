import { Link } from '@inertiajs/react'
import { CheckCircle2, AlertCircle, ChevronRight, Unlink } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'
import { connectorBrand, connectorPath, type ConnectorStatus } from '~/lib/connector_catalog'

type ConnectorCardProps = {
  provider: string
  status: ConnectorStatus | null
  onDisconnect: (provider: string) => void
}

export default function ConnectorCard({ provider, status, onDisconnect }: ConnectorCardProps) {
  const { t } = useTranslation()
  const brand = connectorBrand(provider)

  return (
    <Link
      href={connectorPath(provider)}
      className="group flex flex-col gap-4 rounded-xl border bg-card p-5 shadow-sm transition hover:bg-muted/50 active:scale-[0.99]"
    >
      <div className="flex items-start gap-3">
        <div
          className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-lg ${brand.bgClass}`}
        >
          {brand.logo && <img src={brand.logo} alt="" className="h-6 w-6" />}
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-semibold leading-tight text-foreground">{brand.name}</p>
          <p className="mt-0.5 text-xs text-muted-foreground">
            {t(`connectors.${brand.i18nKey}.tagline`)}
          </p>
        </div>
        <ChevronRight className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground transition group-hover:translate-x-0.5" />
      </div>

      {(status === 'connected' || status === 'error') && (
        <div className="flex flex-wrap items-center justify-between gap-2 border-t pt-3">
          {status === 'connected' ? (
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700 dark:bg-green-900/30 dark:text-green-400">
              <CheckCircle2 className="h-3 w-3" />
              {t(`connectors.${brand.i18nKey}.status`)}
            </span>
          ) : (
            <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700 dark:bg-orange-900/30 dark:text-orange-400">
              <AlertCircle className="h-3 w-3" />
              {t(`connectors.${brand.i18nKey}.statusError`)}
            </span>
          )}
          {status === 'connected' && (
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDisconnect(provider)
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-destructive/10 hover:text-destructive active:scale-95"
            >
              <Unlink className="h-3.5 w-3.5" />
              {t(`connectors.${brand.i18nKey}.disconnect`)}
            </button>
          )}
        </div>
      )}
    </Link>
  )
}
