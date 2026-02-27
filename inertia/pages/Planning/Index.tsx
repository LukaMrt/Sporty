import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'

export default function PlanningIndex() {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('planning.title')} />
      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground">{t('planning.title')}</h1>
        <p className="mt-2 text-muted-foreground">{t('planning.description')}</p>
      </div>
    </>
  )
}

PlanningIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
