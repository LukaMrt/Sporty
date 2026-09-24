import { useMemo } from 'react'
import { Link } from '@inertiajs/react'
import { useTranslation } from '~/hooks/use_translation'
// Module pur du domaine : même calcul et même validation que le serveur
// eslint-disable-next-line @adonisjs/no-backend-import-in-frontend
import {
  isZoneBoundsResult,
  previewAllMethods,
  validateZoneBounds,
  type ZoneBoundsOutcome,
} from '../../../app/domain/services/heart_rate_zone_bounds'
import type {
  HrZoneMethod,
  ZoneBoundsBpm,
} from '../../../app/domain/value_objects/heart_rate_zones_config'

/** Mêmes couleurs que HeartRateZonesChart */
const ZONE_COLORS = ['#9ca3af', '#60a5fa', '#34d399', '#fb923c', '#f87171']

const METHODS: HrZoneMethod[] = ['auto', 'karvonen', 'percent_max', 'lthr', 'custom']

export interface HrZonesValue {
  method: HrZoneMethod
  lthr: number | null
  customBounds: ZoneBoundsBpm | null
}

interface Props {
  maxHeartRate: number | null
  restingHeartRate: number | null
  value: HrZonesValue
  onChange: (value: HrZonesValue) => void
  error?: string
}

function ZoneBar({ bounds }: { bounds: ZoneBoundsBpm }) {
  const span = bounds[5] - bounds[0]
  return (
    <div className="space-y-1">
      <div className="flex h-3 w-full overflow-hidden rounded-full" aria-hidden="true">
        {ZONE_COLORS.map((color, i) => (
          <div
            key={color}
            style={{
              backgroundColor: color,
              width: `${span > 0 ? ((bounds[i + 1] - bounds[i]) / span) * 100 : 20}%`,
            }}
          />
        ))}
      </div>
      <div className="grid grid-cols-5 gap-1 text-[10px] text-muted-foreground tabular-nums">
        {ZONE_COLORS.map((color, i) => (
          <span key={color}>
            Z{i + 1} {bounds[i]}–{bounds[i + 1]}
          </span>
        ))}
      </div>
    </div>
  )
}

export default function HeartRateZonesEditor({
  maxHeartRate,
  restingHeartRate,
  value,
  onChange,
  error,
}: Props) {
  const { t } = useTranslation()

  const previews = useMemo(
    () =>
      previewAllMethods(
        { maxHeartRate, restingHeartRate },
        { lthr: value.lthr, customBoundsBpm: value.customBounds }
      ),
    [maxHeartRate, restingHeartRate, value.lthr, value.customBounds]
  )

  const customValid = value.method !== 'custom' || validateZoneBounds(value.customBounds)

  function customizeFrom(outcome: ZoneBoundsOutcome) {
    if (!isZoneBoundsResult(outcome)) return
    onChange({ ...value, method: 'custom', customBounds: [...outcome.bounds] as ZoneBoundsBpm })
  }

  function setBound(index: number, raw: string) {
    const bounds = [...(value.customBounds ?? [0, 0, 0, 0, 0, 0])] as ZoneBoundsBpm
    bounds[index] = raw === '' ? 0 : Number(raw)
    onChange({ ...value, customBounds: bounds })
  }

  return (
    <fieldset className="space-y-3">
      <legend className="text-sm font-medium">{t('profile.hrZones.title')}</legend>
      <p className="text-xs text-muted-foreground">{t('profile.hrZones.description')}</p>

      <div role="radiogroup" aria-label={t('profile.hrZones.title')} className="space-y-2">
        {METHODS.map((method) => {
          const outcome = previews[method]
          const available = isZoneBoundsResult(outcome)
          const selected = value.method === method
          // La méthode LTHR / custom reste sélectionnable pour pouvoir saisir la valeur manquante
          const selectable = available || method === 'lthr' || method === 'custom'
          return (
            <div
              key={method}
              role="radio"
              aria-checked={selected}
              aria-disabled={!selectable}
              tabIndex={selectable ? 0 : -1}
              onClick={() => selectable && onChange({ ...value, method })}
              onKeyDown={(e) => {
                if (selectable && (e.key === ' ' || e.key === 'Enter')) {
                  e.preventDefault()
                  onChange({ ...value, method })
                }
              }}
              className={[
                'cursor-pointer rounded-lg border p-3 transition outline-none focus-visible:ring-2 focus-visible:ring-ring',
                selected ? 'border-primary bg-primary/5' : 'hover:bg-muted/50',
                selectable ? '' : 'cursor-not-allowed opacity-50',
              ].join(' ')}
            >
              <div className="mb-1 flex items-center justify-between gap-2">
                <span className="text-sm font-medium">
                  {t(`profile.hrZones.methods.${method}.label`)}
                  {method === 'auto' && available && (
                    <span className="ml-1 text-xs font-normal text-muted-foreground">
                      ({t(`profile.hrZones.methods.${outcome.method}.label`)})
                    </span>
                  )}
                </span>
                {available && method !== 'custom' && (
                  <button
                    type="button"
                    className="text-xs text-primary hover:underline"
                    onClick={(e) => {
                      e.stopPropagation()
                      customizeFrom(outcome)
                    }}
                  >
                    {t('profile.hrZones.customizeFrom')}
                  </button>
                )}
              </div>
              <p className="mb-2 text-xs text-muted-foreground">
                {t(`profile.hrZones.methods.${method}.description`)}
              </p>
              {available ? (
                <ZoneBar bounds={outcome.bounds} />
              ) : (
                <p className="text-xs text-amber-600">
                  {t(`profile.hrZones.errors.${outcome.issue}`)}
                </p>
              )}
            </div>
          )
        })}
      </div>

      {value.method === 'lthr' && (
        <div className="space-y-1">
          <label htmlFor="lthr" className="text-sm font-medium">
            {t('profile.hrZones.lthr')}
          </label>
          <input
            id="lthr"
            type="number"
            inputMode="numeric"
            min={100}
            max={230}
            value={value.lthr ?? ''}
            onChange={(e) =>
              onChange({ ...value, lthr: e.target.value === '' ? null : Number(e.target.value) })
            }
            className="w-full rounded-md border bg-background px-3 py-2 text-sm"
          />
          <Link
            href="/profile/physiology-guide#lthr"
            className="text-xs text-primary hover:underline"
          >
            {t('profile.hrZones.lthrHowTo')}
          </Link>
        </div>
      )}

      {value.method === 'custom' && (
        <div className="space-y-2">
          {[0, 1, 2, 3, 4].map((zone) => (
            <div key={zone} className="flex items-center gap-2 text-sm">
              <span
                className="inline-block h-3 w-3 rounded-full"
                style={{ backgroundColor: ZONE_COLORS[zone] }}
                aria-hidden="true"
              />
              <span className="w-8 font-medium">Z{zone + 1}</span>
              {zone === 0 ? (
                <input
                  type="number"
                  aria-label={t('profile.hrZones.boundLabel', { zone: 1, edge: 'min' })}
                  value={value.customBounds?.[0] || ''}
                  onChange={(e) => setBound(0, e.target.value)}
                  className="w-20 rounded-md border bg-background px-2 py-1"
                />
              ) : (
                <span className="w-20 px-2 text-muted-foreground tabular-nums">
                  {value.customBounds?.[zone] || '–'}
                </span>
              )}
              <span aria-hidden="true">–</span>
              <input
                type="number"
                aria-label={t('profile.hrZones.boundLabel', { zone: zone + 1, edge: 'max' })}
                value={value.customBounds?.[zone + 1] || ''}
                onChange={(e) => setBound(zone + 1, e.target.value)}
                className="w-20 rounded-md border bg-background px-2 py-1"
              />
              <span className="text-xs text-muted-foreground">bpm</span>
            </div>
          ))}
          {!customValid && (
            <p className="text-xs text-destructive">{t('profile.hrZones.errors.invalid_bounds')}</p>
          )}
        </div>
      )}

      {error && <p className="text-xs text-destructive">{error}</p>}
      <p className="text-xs text-muted-foreground">{t('profile.hrZones.recomputeNotice')}</p>
    </fieldset>
  )
}
