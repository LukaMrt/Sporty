import React from 'react'
import { Head, useForm } from '@inertiajs/react'
import AuthLayout from '~/layouts/AuthLayout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export default function Register() {
  const { data, setData, post, processing, errors } = useForm({
    full_name: '',
    email: '',
    password: '',
  })

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault()
    post('/register')
  }

  return (
    <>
      <Head title="Inscription" />
      <h2 className="mb-6 text-xl font-semibold text-sand-12">Créer un compte administrateur</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <div className="space-y-1">
          <label htmlFor="full_name" className="block text-sm font-medium text-sand-11">
            Nom complet
          </label>
          <Input
            id="full_name"
            type="text"
            autoComplete="name"
            value={data.full_name}
            onChange={(e) => setData('full_name', e.target.value)}
          />
          {errors.full_name && <p className="text-sm text-red-500">{errors.full_name}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="email" className="block text-sm font-medium text-sand-11">
            Adresse e-mail
          </label>
          <Input
            id="email"
            type="email"
            autoComplete="email"
            value={data.email}
            onChange={(e) => setData('email', e.target.value)}
          />
          {errors.email && <p className="text-sm text-red-500">{errors.email}</p>}
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-sand-11">
            Mot de passe
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="new-password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
          />
          {errors.password && <p className="text-sm text-red-500">{errors.password}</p>}
        </div>

        <Button type="submit" className="w-full" disabled={processing}>
          {processing ? 'Création...' : 'Créer mon compte'}
        </Button>
      </form>
    </>
  )
}

Register.layout = (page: React.ReactNode) => <AuthLayout>{page}</AuthLayout>
