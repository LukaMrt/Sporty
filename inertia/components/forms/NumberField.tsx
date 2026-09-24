import { Input } from '~/components/ui/input'

/** Champ numérique optionnel avec unité et lien d'aide (vide = null) */
export default function NumberField({
  id,
  label,
  unit,
  helpHref,
  helpLabel,
  value,
  onChange,
  min,
  max,
  step,
  placeholder,
  error,
}: {
  id: string
  label: string
  unit: string
  helpHref?: string
  helpLabel?: string
  value: number | null
  onChange: (value: number | null) => void
  min?: number
  max?: number
  step?: number
  placeholder?: string
  error?: string
}) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-center gap-2">
        <label htmlFor={id} className="text-sm font-medium">
          {label} <span className="font-normal text-muted-foreground">({unit})</span>
        </label>
        {helpHref && (
          <a href={helpHref} className="text-xs text-primary underline underline-offset-2">
            {helpLabel}
          </a>
        )}
      </div>
      <Input
        id={id}
        type="number"
        min={min}
        max={max}
        step={step}
        value={value ?? ''}
        onChange={(e) => onChange(e.target.value === '' ? null : Number(e.target.value))}
        placeholder={placeholder}
      />
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
