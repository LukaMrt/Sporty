import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'

export default function ProfileEdit() {
  return (
    <>
      <Head title="Profil" />
      <div className="p-4">
        <h1 className="text-2xl font-bold text-foreground">Profil</h1>
        <p className="mt-2 text-muted-foreground">Gérez votre profil ici.</p>
      </div>
    </>
  )
}

ProfileEdit.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
