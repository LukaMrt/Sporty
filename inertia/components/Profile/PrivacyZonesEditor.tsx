import { useTranslation } from '~/hooks/use_translation'

export type PrivacyZoneInput = {
  lat: number
  lon: number
  radius_m: number
}

const MAX_ZONES = 5

/**
 * Zones de confidentialité : les portions de traces qui y passent sont
 * masquées sur les cartes (domicile, travail…), comme sur Strava.
 */
export default function PrivacyZonesEditor({
  value,
  onChange,
  error,
}: {
  value: PrivacyZoneInput[]
  onChange: (zones: PrivacyZoneInput[]) => void
  error?: string
}) {
  const { t } = useTranslation()

  function update(index: number, patch: Partial<PrivacyZoneInput>) {
    onChange(value.map((zone, i) => (i === index ? { ...zone, ...patch } : zone)))
  }

  function addCurrentPosition() {
    navigator.geolocation?.getCurrentPosition(
      (pos) =>
        onChange([
          ...value,
          {
            lat: Math.round(pos.coords.latitude * 1e5) / 1e5,
            lon: Math.round(pos.coords.longitude * 1e5) / 1e5,
            radius_m: 400,
          },
        ]),
      () => onChange([...value, { lat: 0, lon: 0, radius_m: 400 }])
    )
  }

  return (
    <fieldset className="space-y-2">
      <legend className="text-sm font-medium">{t('profile.privacyZones.title')}</legend>
      <p className="text-xs text-muted-foreground">{t('profile.privacyZones.description')}</p>
      {value.map((zone, i) => (
        <div key={i} className="flex flex-wrap items-end gap-2 text-sm">
          {(['lat', 'lon'] as const).map((field) => (
            <label key={field} className="flex flex-col text-xs">
              {t(`profile.privacyZones.${field}`)}
              <input
                type="number"
                step="0.00001"
                value={zone[field]}
                onChange={(e) => update(i, { [field]: Number(e.target.value) })}
                className="w-28 rounded-md border bg-background px-2 py-1 text-sm"
              />
            </label>
          ))}
          <label className="flex flex-col text-xs">
            {t('profile.privacyZones.radius')}
            <input
              type="number"
              min={100}
              max={2000}
              step={50}
              value={zone.radius_m}
              onChange={(e) => update(i, { radius_m: Number(e.target.value) })}
              className="w-24 rounded-md border bg-background px-2 py-1 text-sm"
            />
          </label>
          <button
            type="button"
            onClick={() => onChange(value.filter((_, j) => j !== i))}
            className="rounded-md px-2 py-1 text-xs text-destructive hover:bg-destructive/10"
          >
            {t('profile.privacyZones.remove')}
          </button>
        </div>
      ))}
      {value.length < MAX_ZONES && (
        <button
          type="button"
          onClick={addCurrentPosition}
          className="text-xs text-primary hover:underline"
        >
          {t('profile.privacyZones.add')}
        </button>
      )}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </fieldset>
  )
}
