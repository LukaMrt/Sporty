import React from 'react'
import { Head, useForm, usePage } from '@inertiajs/react'
import AuthLayout from '~/layouts/AuthLayout'
import { Button } from '~/components/ui/button'
import { Input } from '~/components/ui/input'

export default function Login() {
  const { errors = {} } = usePage<{ errors?: { form?: string } }>().props
  const { data, setData, post, processing } = useForm({
    email: '',
    password: '',
  })

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault()
    post('/login')
  }

  return (
    <>
      <Head title="Connexion" />
      <h2 className="mb-6 text-xl font-semibold text-sand-12">Se connecter</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        {errors.form && <p className="text-sm text-red-500">{errors.form}</p>}

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
        </div>

        <div className="space-y-1">
          <label htmlFor="password" className="block text-sm font-medium text-sand-11">
            Mot de passe
          </label>
          <Input
            id="password"
            type="password"
            autoComplete="current-password"
            value={data.password}
            onChange={(e) => setData('password', e.target.value)}
          />
        </div>

        <Button type="submit" className="w-full" disabled={processing}>
          {processing ? 'Connexion...' : 'Se connecter'}
        </Button>
      </form>
    </>
  )
}

Login.layout = (page: React.ReactNode) => <AuthLayout>{page}</AuthLayout>
