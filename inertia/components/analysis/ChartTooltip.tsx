type Entry = {
  name?: string | number
  value?: number | string | null | readonly (number | string)[]
  color?: string
  dataKey?: string | number | ((obj: unknown) => unknown)
  payload?: Record<string, unknown>
}

type ChartTooltipProps = {
  active?: boolean
  payload?: readonly Entry[]
  label?: string | number
  /** Titre de l'infobulle (date, semaine…) */
  labelFormat?: (label: string) => string
  /** Format d'une valeur ; `null` masque la ligne */
  valueFormat?: (value: number, entry: Entry) => string | null
}

/**
 * Infobulle commune aux graphiques : titre formaté, valeurs localisées avec
 * unités, pastille de couleur. Remplace l'infobulle brute de Recharts.
 */
export default function ChartTooltip({
  active,
  payload,
  label,
  labelFormat,
  valueFormat,
}: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const rows = payload.flatMap((entry) => {
    if (entry.value === null || entry.value === undefined || Array.isArray(entry.value)) return []
    const value = Number(entry.value)
    if (!Number.isFinite(value)) return []
    const text = valueFormat ? valueFormat(value, entry) : String(Math.round(value * 10) / 10)
    return text === null ? [] : [{ entry, text }]
  })
  if (rows.length === 0) return null
  const title = label === undefined ? '' : labelFormat ? labelFormat(String(label)) : String(label)

  return (
    <div className="rounded-lg border bg-card px-3 py-2 text-xs shadow-md">
      {title && <div className="mb-1 font-medium">{title}</div>}
      <ul className="space-y-0.5">
        {rows.map(({ entry, text }) => (
          <li key={String(entry.dataKey ?? entry.name)} className="flex items-center gap-2">
            <span
              className="h-2 w-2 rounded-full"
              style={{ backgroundColor: entry.color }}
              aria-hidden="true"
            />
            <span className="text-muted-foreground">{entry.name}</span>
            <span className="ml-auto pl-3 font-medium tabular-nums">{text}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
