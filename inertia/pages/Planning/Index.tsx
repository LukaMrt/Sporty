import React from 'react'
import { Head, router } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import { useTranslation } from '~/hooks/use_translation'

export default function PlanningIndex() {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('planning.title')} />
      <div className="max-w-lg mx-auto px-4 py-6 space-y-4">
        <h1 className="text-2xl font-bold text-foreground">{t('planning.title')}</h1>
        <p className="text-muted-foreground">{t('planning.noActivePlan')}</p>
        <Button onClick={() => router.visit('/planning/goal')}>
          {t('planning.defineGoalCta')}
        </Button>
      </div>
    </>
  )
}

PlanningIndex.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
