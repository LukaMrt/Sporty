import { useTranslation } from '~/hooks/use_translation'
import type { Insight } from '../../../app/domain/services/analysis/insights'
import { DISTANCE_KEYS, formatNumber, formatSeconds, formatSigned } from './format'

/** Paramètres qui ont un format dédié ; les autres nombres sont localisés */
const DECIMALS: Record<string, number> = { acwr: 2, monotony: 2 }

/** Rédige un constat du moteur d'enseignements (`analysis.insights.<id>`) */
export function useInsightText() {
  const { t, locale } = useTranslation()
  return (insight: Insight): string => {
    const params: Record<string, string> = {}
    for (const [key, value] of Object.entries(insight.params)) {
      if (key === 'time' || key === 'gap') params[key] = formatSeconds(Number(value))
      else if (key === 'distance')
        params[key] = t(`analysis.distances.${DISTANCE_KEYS[Number(value)]}`)
      else if (key === 'signal') params[key] = t(`analysis.recovery.signals.${value}`)
      else if (key === 'delta') params[key] = formatSigned(Number(value), locale)
      else if (typeof value === 'number')
        params[key] = formatNumber(value, locale, DECIMALS[key] ?? 1)
      else params[key] = value
    }
    return t(`analysis.insights.${insight.id}`, params)
  }
}
