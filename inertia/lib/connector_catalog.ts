import stravaLogo from '~/assets/strava-logo.svg'
import openWearablesLogo from '~/assets/open-wearables-logo.svg'

export type ConnectorStatus = 'connected' | 'error' | 'disconnected'
export type ConnectorAuthKind = 'oauth' | 'api_key'

export type ConnectorBrand = {
  provider: string
  name: string
  logo: string
  /** Classe Tailwind de la pastille de marque. */
  bgClass: string
  /** Classe Tailwind du bouton de connexion (couleur de marque + hover). */
  buttonClass: string
  /** Classe Tailwind du badge de provenance affiche sur une seance importee. */
  badgeClass: string
  /** Namespace i18n : `connectors.<i18nKey>.*` */
  i18nKey: string
}

export const CONNECTOR_BRANDS: Record<string, ConnectorBrand> = {
  'strava': {
    provider: 'strava',
    name: 'Strava',
    logo: stravaLogo,
    bgClass: 'bg-[#FC4C02]',
    buttonClass: 'bg-[#FC4C02] hover:bg-[#e04400] text-white',
    badgeClass: 'bg-orange-100 text-orange-600 dark:bg-orange-900/30 dark:text-orange-400',
    i18nKey: 'strava',
  },
  'open-wearables': {
    provider: 'open-wearables',
    name: 'Open Wearables',
    logo: openWearablesLogo,
    bgClass: 'bg-[#0F172A]',
    buttonClass: 'bg-[#0F172A] hover:bg-[#1E293B] text-white',
    badgeClass: 'bg-slate-100 text-slate-600 dark:bg-slate-800/60 dark:text-slate-300',
    i18nKey: 'openWearables',
  },
}

/** Marque du provider, avec repli lisible pour un provider inconnu du front. */
export function connectorBrand(provider: string): ConnectorBrand {
  return (
    CONNECTOR_BRANDS[provider] ?? {
      provider,
      name: provider.charAt(0).toUpperCase() + provider.slice(1),
      logo: '',
      bgClass: 'bg-muted',
      buttonClass: 'bg-primary hover:bg-primary/90 text-primary-foreground',
      badgeClass: 'bg-muted text-muted-foreground',
      i18nKey: provider,
    }
  )
}

export const connectorPath = (provider: string) => `/connectors/${provider}`
export const connectorAuthorizePath = (provider: string) => `/connectors/${provider}/authorize`
export const connectorConnectPath = (provider: string) => `/connectors/${provider}/connect`
export const connectorDisconnectPath = (provider: string) => `/connectors/${provider}/disconnect`
export const connectorSettingsPath = (provider: string) => `/connectors/${provider}/settings`
