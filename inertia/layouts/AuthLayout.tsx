import React from 'react'
import logo from '~/assets/logo.png'

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex items-center justify-center bg-sand-1 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <img src={logo} alt="Sporty" className="mx-auto h-32 w-32" />
          <h1 className="mt-4 text-2xl font-bold tracking-tight text-sand-12">Sporty</h1>
        </div>
        <div className="rounded-2xl border border-sand-7 bg-white p-8 shadow-sm">{children}</div>
      </div>
    </div>
  )
}
