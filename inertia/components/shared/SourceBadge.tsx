const TYPE_STYLES: Record<string, string> = {
  study: 'bg-violet-100 text-violet-700 dark:bg-violet-900 dark:text-violet-300',
  guide: 'bg-blue-100 text-blue-700 dark:bg-blue-900 dark:text-blue-300',
  synthesis: 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900 dark:text-emerald-300',
  protocol: 'bg-orange-100 text-orange-700 dark:bg-orange-900 dark:text-orange-300',
}

export function SourceBadge({ type, label }: { type: string; label: string }) {
  return (
    <span
      className={`mr-1.5 inline-block rounded px-1.5 py-0.5 text-xs font-medium ${TYPE_STYLES[type] ?? ''}`}
    >
      {label}
    </span>
  )
}
