import { Flame } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

interface TrimpIndicatorProps {
  value: number
}

export default function TrimpIndicator({ value }: TrimpIndicatorProps) {
  const { t } = useTranslation()

  function getTrimpLevel(): { label: string; colorClass: string } {
    if (value < 50) return { label: t('sessions.show.trimpLight'), colorClass: 'text-blue-500' }
    if (value < 100)
      return { label: t('sessions.show.trimpModerate'), colorClass: 'text-green-500' }
    if (value < 200) return { label: t('sessions.show.trimpHard'), colorClass: 'text-orange-500' }
    return {
      label: t('sessions.show.trimpVeryHard'),
      colorClass: 'text-orange-700 dark:text-orange-400',
    }
  }

  const { label, colorClass } = getTrimpLevel()

  return (
    <div className="flex items-center gap-3">
      <Flame size={18} className={colorClass} />
      <div>
        <span className="text-xl font-bold text-foreground">{Math.round(value)}</span>
        <span className={`ml-2 text-sm font-medium ${colorClass}`}>{label}</span>
      </div>
    </div>
  )
}
