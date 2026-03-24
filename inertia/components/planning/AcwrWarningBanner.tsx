import { X } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

interface AcwrWarningBannerProps {
  acwr: number
  techMode: boolean
  onDismiss: () => void
}

export default function AcwrWarningBanner({ acwr, techMode, onDismiss }: AcwrWarningBannerProps) {
  const { t } = useTranslation()

  return (
    <div className="rounded-xl border border-orange-200 bg-orange-50 px-4 py-3 flex items-start gap-3">
      <span className="text-orange-400 text-base flex-shrink-0 mt-0.5">⚡</span>
      <div className="flex-1 min-w-0 text-sm text-orange-800">
        <span className="font-medium">{t('planning.acwr.warning.title')}</span>
        <span className="ml-1">{t('planning.acwr.warning.message')}</span>
        {techMode && (
          <span className="ml-2 text-xs font-mono bg-orange-100 text-orange-700 px-1.5 py-0.5 rounded">
            ACWR : {acwr.toFixed(2)}
          </span>
        )}
      </div>
      <button
        onClick={onDismiss}
        aria-label={t('planning.acwr.warning.dismiss')}
        className="cursor-pointer flex-shrink-0 text-orange-400 hover:text-orange-600 transition-colors mt-0.5"
      >
        <X size={16} />
      </button>
    </div>
  )
}
