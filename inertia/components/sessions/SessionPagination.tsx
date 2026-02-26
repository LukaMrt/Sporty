import { Button } from '~/components/ui/button'

interface SessionPaginationProps {
  page: number
  lastPage: number
  onPrevious: () => void
  onNext: () => void
}

export default function SessionPagination({
  page,
  lastPage,
  onPrevious,
  onNext,
}: SessionPaginationProps) {
  if (lastPage <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <Button variant="outline" onClick={onPrevious} disabled={page <= 1} className="min-h-[44px]">
        Précédent
      </Button>
      <span className="text-sm text-muted-foreground">
        Page {page} / {lastPage}
      </span>
      <Button
        variant="outline"
        onClick={onNext}
        disabled={page >= lastPage}
        className="min-h-[44px]"
      >
        Suivant
      </Button>
    </div>
  )
}
