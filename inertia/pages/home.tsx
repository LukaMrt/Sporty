import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'

export default function Home() {
  return (
    <>
      <Head title="Accueil" />
      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground">Bienvenue sur Sporty</h1>
        <p className="mt-2 text-muted-foreground">Votre espace d'entraînement personnel.</p>
      </div>
    </>
  )
}

Home.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
