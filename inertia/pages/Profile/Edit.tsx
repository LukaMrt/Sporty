import React from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import ChangePasswordForm from '~/components/Profile/ChangePasswordForm'

export default function ProfileEdit() {
  return (
    <>
      <Head title="Mon profil" />
      <div className="flex flex-col items-center p-6 pt-16">
        <div className="mb-8">
          <h1 className="text-xl font-semibold">Mon profil</h1>
        </div>
        <div className="w-full max-w-md space-y-6">
          <ChangePasswordForm />
        </div>
      </div>
    </>
  )
}

ProfileEdit.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
