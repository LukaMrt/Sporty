export type SegmentedOption<T extends string> = {
  value: T
  label: string
}

/** Choix exclusif présenté en boutons côte à côte (unités, format, langue…) */
export default function SegmentedChoice<T extends string>({
  options,
  value,
  onChange,
}: {
  options: readonly SegmentedOption<T>[]
  value: T | '' | null
  onChange: (value: T) => void
}) {
  return (
    <div role="radiogroup" className="flex gap-2">
      {options.map((opt) => (
        <button
          key={opt.value}
          type="button"
          role="radio"
          aria-checked={value === opt.value}
          onClick={() => onChange(opt.value)}
          className={`flex-1 cursor-pointer rounded-lg border-2 py-2 text-sm font-medium transition-all duration-150 ${
            value === opt.value
              ? 'border-sand-12 bg-sand-3 text-sand-12'
              : 'border-sand-5 bg-white text-sand-11 hover:border-sand-9 hover:bg-sand-2'
          }`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}
