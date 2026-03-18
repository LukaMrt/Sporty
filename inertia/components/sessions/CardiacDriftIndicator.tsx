import { TrendingUp } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

interface CardiacDriftIndicatorProps {
  value: number
}

export default function CardiacDriftIndicator({ value }: CardiacDriftIndicatorProps) {
  const { t } = useTranslation()

  function getDriftLevel(): { label: string; colorClass: string } {
    if (value < 5)
      return { label: t('sessions.show.driftNormal'), colorClass: 'text-muted-foreground' }
    if (value < 10)
      return { label: t('sessions.show.driftModerate'), colorClass: 'text-orange-500' }
    return {
      label: t('sessions.show.driftHigh'),
      colorClass: 'text-orange-700 dark:text-orange-400',
    }
  }

  const { label, colorClass } = getDriftLevel()

  return (
    <div className="flex items-center gap-3">
      <TrendingUp size={18} className={colorClass} />
      <div>
        <span className="text-xl font-bold text-foreground">{value}%</span>
        <span className={`ml-2 text-sm font-medium ${colorClass}`}>{label}</span>
      </div>
    </div>
  )
}
