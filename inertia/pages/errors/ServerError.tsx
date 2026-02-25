import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { ServerCrash } from 'lucide-react'
import { Button } from '~/components/ui/button'
import MainLayout from '~/layouts/MainLayout'

export default function ServerError() {
  return (
    <>
      <Head title="Erreur serveur" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <ServerCrash className="mb-6 h-16 w-16 text-muted-foreground" />
        <p className="text-7xl font-bold text-destructive">500</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Erreur serveur</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          Une erreur inattendue s'est produite. Réessaie dans quelques instants.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </>
  )
}

ServerError.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
