import React from 'react'
import { Head, Link, useForm, usePage, router } from '@inertiajs/react'
import { ArrowLeft, User, Mail, Trash2, Save, RotateCcw } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import FormField from '~/components/forms/FormField'
import IconInput from '~/components/forms/IconInput'
import PasswordInput from '~/components/forms/PasswordInput'

interface UserData {
  id: number
  fullName: string
  email: string
  role: string
}

interface AdminUsersEditProps {
  user: UserData
}

interface SharedProps {
  auth?: { user: { id: number; fullName: string; role: string } | null }
}

export default function AdminUsersEdit({ user }: AdminUsersEditProps) {
  const { auth } = usePage<SharedProps>().props
  const isSelf = auth?.user?.id === user.id

  const editForm = useForm({
    full_name: user.fullName,
    email: user.email,
  })

  const passwordForm = useForm({
    password: '',
  })

  function handleEditSubmit(e: React.FormEvent) {
    e.preventDefault()
    editForm.put(`/admin/users/${user.id}`)
  }

  function handlePasswordSubmit(e: React.FormEvent) {
    e.preventDefault()
    passwordForm.put(`/admin/users/${user.id}/password`)
  }

  function handleDelete() {
    if (!window.confirm('Supprimer ce compte ? Cette action est irréversible.')) return
    router.delete(`/admin/users/${user.id}`)
  }

  return (
    <>
      <Head title={`Administration — ${user.fullName}`} />
      <div className="relative flex flex-col items-center p-6 pt-16">
        <Link
          href="/admin/users"
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          Retour à la liste
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <User className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{user.fullName}</h1>
              <p className="text-sm text-muted-foreground capitalize">{user.role}</p>
            </div>
          </div>
        </div>

        <div className="w-full max-w-md space-y-6">
          {/* Edit profile */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Informations du compte</h2>
            <form onSubmit={handleEditSubmit} className="space-y-4">
              <FormField label="Nom complet" htmlFor="full_name" error={editForm.errors.full_name}>
                <IconInput
                  id="full_name"
                  type="text"
                  autoComplete="name"
                  icon={<User className="h-4 w-4" />}
                  value={editForm.data.full_name}
                  onChange={(e) => editForm.setData('full_name', e.target.value)}
                />
              </FormField>
              <FormField label="Adresse e-mail" htmlFor="email" error={editForm.errors.email}>
                <IconInput
                  id="email"
                  type="email"
                  autoComplete="email"
                  icon={<Mail className="h-4 w-4" />}
                  value={editForm.data.email}
                  onChange={(e) => editForm.setData('email', e.target.value)}
                />
              </FormField>
              <Button
                type="submit"
                disabled={editForm.processing}
                className="flex items-center gap-2"
              >
                <Save className="h-4 w-4" />
                {editForm.processing ? 'Sauvegarde...' : 'Sauvegarder'}
              </Button>
            </form>
          </div>

          {/* Reset password */}
          <div className="rounded-xl border bg-card p-6 shadow-sm">
            <h2 className="mb-4 text-sm font-semibold">Réinitialiser le mot de passe</h2>
            <form onSubmit={handlePasswordSubmit} className="space-y-4">
              <FormField
                label="Nouveau mot de passe temporaire"
                htmlFor="password"
                error={passwordForm.errors.password}
              >
                <PasswordInput
                  id="password"
                  value={passwordForm.data.password}
                  onChange={(e) => passwordForm.setData('password', e.target.value)}
                />
              </FormField>
              <Button
                type="submit"
                variant="outline"
                disabled={passwordForm.processing}
                className="flex items-center gap-2"
              >
                <RotateCcw className="h-4 w-4" />
                {passwordForm.processing ? 'Réinitialisation...' : 'Réinitialiser'}
              </Button>
            </form>
          </div>

          {/* Danger zone */}
          <div className="rounded-xl border border-destructive/40 bg-destructive/5 p-6 shadow-sm">
            <h2 className="mb-1 text-sm font-semibold text-destructive">Zone dangereuse</h2>
            <p className="mb-4 text-xs text-muted-foreground">
              La suppression est définitive et irréversible.
            </p>
            <Button
              type="button"
              variant="destructive"
              disabled={isSelf}
              onClick={handleDelete}
              className="flex items-center gap-2"
              title={isSelf ? 'Impossible de supprimer votre propre compte' : undefined}
            >
              <Trash2 className="h-4 w-4" />
              Supprimer le compte
            </Button>
            {isSelf && (
              <p className="mt-2 text-xs text-muted-foreground">
                Impossible de supprimer votre propre compte.
              </p>
            )}
          </div>
        </div>
      </div>
    </>
  )
}

AdminUsersEdit.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
