import React from 'react'
import { router } from '@inertiajs/react'
import logo from '~/assets/logo.png'

export default function MainLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-sand-1">
      <header className="border-b border-sand-7 bg-white">
        <div className="mx-auto flex max-w-screen-xl items-center justify-between px-6 py-3">
          <div className="flex items-center gap-3">
            <img src={logo} alt="Sporty" className="h-8 w-8" />
            <span className="text-lg font-bold tracking-tight text-sand-12">Sporty</span>
          </div>
          <button
            onClick={() => router.post('/logout')}
            className="cursor-pointer rounded-lg border border-sand-7 bg-sand-2 px-4 py-2 text-sm font-medium text-sand-11 transition hover:border-sand-8 hover:bg-sand-3 hover:text-sand-12"
          >
            Se déconnecter
          </button>
        </div>
      </header>
      <main>{children}</main>
    </div>
  )
}
