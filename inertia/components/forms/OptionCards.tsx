export interface OptionCard<T extends string> {
  value: T
  label: string
  description?: string
}

/** Choix exclusif sous forme de cartes empilées (libellé + description) */
export default function OptionCards<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly OptionCard<T>[]
  value: T | ''
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" className="flex flex-col gap-2">
      {options.map((opt) => {
        const selected = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            role="radio"
            aria-checked={selected}
            onClick={() => onChange(opt.value)}
            className={`cursor-pointer rounded-xl border-2 p-3 text-left transition-all duration-150 hover:shadow-md ${
              selected
                ? 'border-sand-12 bg-sand-3 shadow-md'
                : 'border-sand-5 bg-white hover:border-sand-9 hover:bg-sand-2'
            }`}
          >
            <p className={`font-semibold ${selected ? 'text-sand-12' : 'text-sand-11'}`}>
              {opt.label}
            </p>
            {opt.description && <p className="mt-0.5 text-sm text-sand-10">{opt.description}</p>}
          </button>
        )
      })}
    </div>
  )
}
