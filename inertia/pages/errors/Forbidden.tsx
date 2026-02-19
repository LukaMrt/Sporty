import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { ShieldOff } from 'lucide-react'
import { Button } from '~/components/ui/button'
import MainLayout from '~/layouts/MainLayout'

export default function Forbidden() {
  return (
    <>
      <Head title="Accès refusé" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <ShieldOff className="mb-6 h-16 w-16 text-muted-foreground" />
        <p className="text-7xl font-bold text-warning">403</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Accès refusé</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Tu n'as pas les permissions nécessaires pour accéder à cette page.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </>
  )
}

Forbidden.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
