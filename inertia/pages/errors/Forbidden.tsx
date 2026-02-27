import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { ShieldOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'

export default function Forbidden() {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('errors.forbidden.title')} />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <ShieldOff className="mb-6 h-16 w-16 text-muted-foreground" />
        <p className="text-7xl font-bold text-warning">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">{t('errors.forbidden.heading')}</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('errors.forbidden.description')}
        </p>
        <Button className="mt-8" asChild>
          <Link href="/">{t('errors.forbidden.back')}</Link>
        </Button>
      </div>
    </>
  )
}

Forbidden.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
