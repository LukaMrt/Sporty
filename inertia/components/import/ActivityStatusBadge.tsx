import React from 'react'
import { Badge } from '~/components/ui/badge'
import { useTranslation } from '~/hooks/use_translation'

interface ActivityStatusBadgeProps {
  status: string
}

export default function ActivityStatusBadge({ status }: ActivityStatusBadgeProps) {
  const { t } = useTranslation()

  if (status === 'imported') {
    return <Badge variant="green">{t('import.status.imported')}</Badge>
  }
  if (status === 'importing') {
    return (
      <Badge variant="blue" className="animate-pulse">
        {t('import.status.importing')}
      </Badge>
    )
  }
  if (status === 'ignored') {
    return <Badge variant="gray">{t('import.status.ignored')}</Badge>
  }
  return <Badge variant="blue">{t('import.status.new')}</Badge>
}
