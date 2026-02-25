import { Activity } from 'lucide-react'
import { Button } from '~/components/ui/button'

interface EmptyStateProps {
  title: string
  description?: string
  ctaLabel?: string
  onCtaClick?: () => void
}

export default function EmptyState({ title, description, ctaLabel, onCtaClick }: EmptyStateProps) {
  return (
    <div className="flex min-h-[50vh] flex-col items-center justify-center px-4 text-center">
      <Activity size={48} className="mb-4 text-muted-foreground" />
      <h2 className="text-lg font-semibold text-foreground">{title}</h2>
      {description && <p className="mt-1 max-w-sm text-sm text-muted-foreground">{description}</p>}
      {ctaLabel && (
        <Button disabled={!onCtaClick} onClick={onCtaClick} className="mt-4">
          {ctaLabel}
        </Button>
      )}
    </div>
  )
}
