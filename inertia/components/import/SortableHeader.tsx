import { ArrowDown, ArrowUp, ArrowUpDown } from 'lucide-react'

interface SortableHeaderProps {
  label: string
  sorted: false | 'asc' | 'desc'
  onToggle: () => void
}

export default function SortableHeader({ label, sorted, onToggle }: SortableHeaderProps) {
  return (
    <button
      onClick={onToggle}
      className="flex cursor-pointer items-center gap-1 font-medium text-muted-foreground hover:text-foreground min-h-[44px] min-w-[44px]"
    >
      {label}
      {sorted === 'asc' ? (
        <ArrowUp className="h-3.5 w-3.5" />
      ) : sorted === 'desc' ? (
        <ArrowDown className="h-3.5 w-3.5" />
      ) : (
        <ArrowUpDown className="h-3.5 w-3.5 opacity-50" />
      )}
    </button>
  )
}
