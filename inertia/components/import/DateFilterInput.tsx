import { useRef } from 'react'
import { Calendar } from 'lucide-react'

interface DateFilterInputProps {
  value: string
  onChange: (v: string) => void
  formatDate: (d: string) => string
  min?: string
  max?: string
}

export default function DateFilterInput({
  value,
  onChange,
  formatDate,
  min,
  max,
}: DateFilterInputProps) {
  const inputRef = useRef<HTMLInputElement>(null)

  return (
    <div
      className="relative rounded-md border border-input bg-background px-2 py-1 text-sm text-foreground min-h-[44px] flex items-center min-w-[120px] cursor-pointer"
      onClick={() => inputRef.current?.showPicker()}
    >
      <span className="pointer-events-none select-none flex items-center gap-1.5">
        {value ? formatDate(value) : '—'}
        <Calendar className="h-3.5 w-3.5 text-muted-foreground" />
      </span>
      <input
        ref={inputRef}
        type="date"
        value={value}
        min={min}
        max={max}
        onChange={(e) => onChange(e.target.value)}
        className="sr-only"
      />
    </div>
  )
}
