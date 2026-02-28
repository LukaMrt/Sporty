import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

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
  const { t } = useTranslation()

  if (lastPage <= 1) return null

  return (
    <div className="flex items-center justify-between gap-4 mt-6">
      <Button variant="outline" onClick={onPrevious} disabled={page <= 1} className="min-h-[44px]">
        {t('sessions.pagination.previous')}
      </Button>
      <span className="text-sm text-muted-foreground">
        {t('sessions.pagination.page', { page, lastPage })}
      </span>
      <Button
        variant="outline"
        onClick={onNext}
        disabled={page >= lastPage}
        className="min-h-[44px]"
      >
        {t('sessions.pagination.next')}
      </Button>
    </div>
  )
}
