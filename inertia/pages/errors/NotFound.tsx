import React from 'react'
import { Head, Link } from '@inertiajs/react'
import { SearchX } from 'lucide-react'
import { Button } from '~/components/ui/button'
import MainLayout from '~/layouts/MainLayout'

export default function NotFound() {
  return (
    <>
      <Head title="Page introuvable" />
      <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
        <SearchX className="mb-6 h-16 w-16 text-muted-foreground" />
        <p className="text-7xl font-bold text-primary">404</p>
        <h1 className="mt-4 text-2xl font-semibold text-foreground">Page introuvable</h1>
        <p className="mt-2 max-w-sm text-sm text-muted-foreground">
          La page que tu cherches n'existe pas ou a été déplacée.
        </p>
        <Button className="mt-8" asChild>
          <Link href="/">Retour à l'accueil</Link>
        </Button>
      </div>
    </>
  )
}

NotFound.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
