import { useTranslation } from '~/hooks/use_translation'
import React from 'react'
import { Plus } from 'lucide-react'

interface FABProps {
  onClick: () => void
}

export default function FAB({ onClick }: FABProps) {
  const { t } = useTranslation()
  return (
    <button
      onClick={onClick}
      aria-label={t('sessions.fab.newSession')}
      className="fixed bottom-20 right-4 flex h-14 w-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg md:hidden"
    >
      <Plus size={24} />
    </button>
  )
}
