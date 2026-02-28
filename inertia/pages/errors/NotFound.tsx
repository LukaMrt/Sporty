import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { SearchX } from 'lucide-react'
import { Button } from '~/components/ui/button'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'

export default function NotFound() {
  const { t } = useTranslation()

  return (
    <>
      <Head title={t('errors.notFound.title')} />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <SearchX className="mb-6 h-16 w-16 text-muted-foreground" />
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">
          {t('errors.notFound.heading')}
        </h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          {t('errors.notFound.description')}
        </p>
        <Button className="mt-8" asChild>
          <Link href="/">{t('errors.notFound.back')}</Link>
        </Button>
      </div>
    </>
  )
}

NotFound.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
