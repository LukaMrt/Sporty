import React from 'react'
import { useForm } from '@inertiajs/react'
import { Save } from 'lucide-react'
import { Button } from '~/components/ui/button'
import FormField from '~/components/forms/FormField'
import PasswordInput from '~/components/forms/PasswordInput'

export default function ChangePasswordForm() {
  const form = useForm({
    current_password: '',
    new_password: '',
    new_password_confirmation: '',
  })

  function handleSubmit(e: React.SyntheticEvent) {
    e.preventDefault()
    form.put('/profile/password', {
      onSuccess: () => form.reset(),
    })
  }

  return (
    <div className="rounded-xl border bg-card p-6 shadow-sm">
      <h2 className="mb-4 text-sm font-semibold">Changer mon mot de passe</h2>
      <form onSubmit={handleSubmit} className="space-y-4">
        <FormField
          label="Mot de passe actuel"
          htmlFor="current_password"
          error={form.errors.current_password}
        >
          <PasswordInput
            id="current_password"
            value={form.data.current_password}
            onChange={(e) => form.setData('current_password', e.target.value)}
            placeholder="Votre mot de passe actuel"
            autoComplete="current-password"
          />
        </FormField>
        <FormField
          label="Nouveau mot de passe"
          htmlFor="new_password"
          error={form.errors.new_password}
        >
          <PasswordInput
            id="new_password"
            value={form.data.new_password}
            onChange={(e) => form.setData('new_password', e.target.value)}
            placeholder="Minimum 8 caractères"
            autoComplete="new-password"
          />
        </FormField>
        <FormField
          label="Confirmation du nouveau mot de passe"
          htmlFor="new_password_confirmation"
          error={form.errors.new_password_confirmation}
        >
          <PasswordInput
            id="new_password_confirmation"
            value={form.data.new_password_confirmation}
            onChange={(e) => form.setData('new_password_confirmation', e.target.value)}
            placeholder="Répétez le nouveau mot de passe"
            autoComplete="new-password"
          />
        </FormField>
        <Button type="submit" disabled={form.processing} className="flex items-center gap-2">
          <Save className="h-4 w-4" />
          {form.processing ? 'Modification...' : 'Modifier le mot de passe'}
        </Button>
      </form>
    </div>
  )
}
