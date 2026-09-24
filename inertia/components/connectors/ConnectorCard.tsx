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
      className="flex items-center gap-4 rounded-xl border bg-card p-5 shadow-sm transition hover:bg-muted/50 active:scale-[0.99]"
    >
      {/* Logo + nom + tagline */}
      <div className="flex flex-1 items-center gap-3">
        <div
          className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-lg ${brand.bgClass}`}
        >
          {brand.logo && <img src={brand.logo} alt={brand.name} className="h-6 w-6" />}
        </div>
        <div className="min-w-0">
          <p className="font-semibold text-foreground">{brand.name}</p>
          <p className="text-xs text-muted-foreground">
            {t(`connectors.${brand.i18nKey}.tagline`)}
          </p>
        </div>
      </div>

      {/* Badge statut + chevron */}
      <div className="flex items-center gap-2">
        {status === 'connected' && (
          <>
            <span className="flex items-center gap-1 rounded-full bg-green-100 px-2 py-0.5 text-xs font-medium text-green-700">
              <CheckCircle2 className="h-3 w-3" />
              {t(`connectors.${brand.i18nKey}.status`)}
            </span>
            <button
              onClick={(e) => {
                e.preventDefault()
                e.stopPropagation()
                onDisconnect(provider)
              }}
              className="flex cursor-pointer items-center gap-1.5 rounded-md border border-destructive/50 px-2 py-0.5 text-xs font-medium text-destructive transition hover:bg-destructive/10 active:scale-95"
            >
              <Unlink className="h-3.5 w-3.5" />
              {t(`connectors.${brand.i18nKey}.disconnect`)}
            </button>
          </>
        )}
        {status === 'error' && (
          <span className="flex items-center gap-1 rounded-full bg-orange-100 px-2 py-0.5 text-xs font-medium text-orange-700">
            <AlertCircle className="h-3 w-3" />
            {t(`connectors.${brand.i18nKey}.statusError`)}
          </span>
        )}
        <ChevronRight className="h-4 w-4 text-muted-foreground" />
      </div>
    </Link>
  )
}
