import { RotateCcw } from 'lucide-react'
import { Button } from '~/components/ui/button'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '~/components/ui/select'
import { useTranslation } from '~/hooks/use_translation'

interface Sport {
  id: number
  name: string
}

export type SortByField = 'date' | 'duration_minutes' | 'distance_km'
export type SortOrder = 'asc' | 'desc'

export interface Filters {
  sportId: number | null
  sortBy: SortByField | null
  sortOrder: SortOrder | null
}

interface SessionFiltersProps {
  sports: Sport[]
  filters: Filters
  onSportChange: (value: string) => void
  onSortByChange: (value: SortByField | 'default') => void
  onSortOrderChange: (value: SortOrder) => void
  onReset: () => void
}

export default function SessionFilters({
  sports,
  filters,
  onSportChange,
  onSortByChange,
  onSortOrderChange,
  onReset,
}: SessionFiltersProps) {
  const hasFilters = filters.sportId !== null || filters.sortBy !== null
  const { t } = useTranslation()

  return (
    <div className="px-4 md:px-6 pb-4 flex flex-wrap gap-3 items-center">
      <Select
        value={filters.sportId ? String(filters.sportId) : 'all'}
        onValueChange={onSportChange}
      >
        <SelectTrigger className="w-[180px] cursor-pointer">
          <SelectValue placeholder={t('sessions.filters.allSports')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="all">{t('sessions.filters.allSports')}</SelectItem>
          {sports.map((s) => (
            <SelectItem key={s.id} value={String(s.id)}>
              {s.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={filters.sortBy ?? ''}
        onValueChange={(v) => onSortByChange(v as SortByField | 'default')}
      >
        <SelectTrigger className="w-[160px] cursor-pointer">
          <SelectValue placeholder={t('sessions.filters.sortBy')} />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value="default">{t('sessions.filters.sortDefault')}</SelectItem>
          <SelectItem value="date">{t('sessions.filters.sortDate')}</SelectItem>
          <SelectItem value="duration_minutes">{t('sessions.filters.sortDuration')}</SelectItem>
          <SelectItem value="distance_km">{t('sessions.filters.sortDistance')}</SelectItem>
        </SelectContent>
      </Select>

      {filters.sortBy && (
        <Select
          value={filters.sortOrder ?? 'desc'}
          onValueChange={(v) => onSortOrderChange(v as SortOrder)}
        >
          <SelectTrigger className="w-[130px] cursor-pointer">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="desc">{t('sessions.filters.sortDesc')}</SelectItem>
            <SelectItem value="asc">{t('sessions.filters.sortAsc')}</SelectItem>
          </SelectContent>
        </Select>
      )}

      {hasFilters && (
        <Button variant="ghost" size="sm" onClick={onReset} className="gap-1.5">
          <RotateCcw size={14} />
          {t('sessions.filters.reset')}
        </Button>
      )}
    </div>
  )
}
