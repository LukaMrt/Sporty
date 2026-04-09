import React, { useEffect, useRef } from 'react'
import { useTranslation } from '~/hooks/use_translation'
import type { PlannedWeek } from '~/types/planning'

interface WeekSelectorProps {
  weeks: PlannedWeek[]
  currentWeekNumber: number
  selectedWeekNumber: number
  onSelect: (weekNumber: number) => void
}

export default function WeekSelector({
  weeks,
  currentWeekNumber,
  selectedWeekNumber,
  onSelect,
}: WeekSelectorProps) {
  const { t } = useTranslation()
  const scrollRef = useRef<HTMLDivElement>(null)
  const activeRef = useRef<HTMLButtonElement>(null)

  // Center the current week on mount
  useEffect(() => {
    if (activeRef.current && scrollRef.current) {
      const container = scrollRef.current
      const el = activeRef.current
      const offset = el.offsetLeft - container.clientWidth / 2 + el.clientWidth / 2
      container.scrollTo({ left: offset, behavior: 'smooth' })
    }
  }, [currentWeekNumber])

  return (
    <div
      ref={scrollRef}
      className="flex gap-2 overflow-x-auto py-1 px-1 -mx-1"
      style={{ scrollbarWidth: 'none' }}
    >
      {weeks.map((week) => {
        const isSelected = week.weekNumber === selectedWeekNumber
        const isCurrent = week.weekNumber === currentWeekNumber

        return (
          <button
            key={week.weekNumber}
            ref={isCurrent ? activeRef : undefined}
            onClick={() => onSelect(week.weekNumber)}
            className={[
              'cursor-pointer flex-shrink-0 flex flex-col items-center gap-1 rounded-lg px-3 py-2 text-sm transition-colors',
              isSelected
                ? 'bg-primary text-primary-foreground font-semibold'
                : 'bg-muted text-muted-foreground hover:bg-muted/80',
            ].join(' ')}
          >
            <span>
              {t('planning.overview.week')} {week.weekNumber}
            </span>
            {isCurrent && (
              <span
                className={[
                  'w-1.5 h-1.5 rounded-full',
                  isSelected ? 'bg-primary-foreground' : 'bg-primary',
                ].join(' ')}
              />
            )}
          </button>
        )
      })}
    </div>
  )
}
