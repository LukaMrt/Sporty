import React from 'react'
import { Head, Link, useForm } from '@inertiajs/react'
import { ArrowLeft, UserPlus, User, Mail, Info } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import FormField from '~/components/forms/FormField'
import IconInput from '~/components/forms/IconInput'
import PasswordInput from '~/components/forms/PasswordInput'
import RoleSelector from '~/components/admin/RoleSelector'
import { useTranslation } from '~/hooks/use_translation'

export default function AdminUsersCreate() {
  const { data, setData, post, processing, errors } = useForm({
    full_name: '',
    email: '',
    password: '',
    role: 'user',
  })
  const { t } = useTranslation()

  function handleSubmit(e: React.SyntheticEvent<HTMLFormElement, SubmitEvent>) {
    e.preventDefault()
    post('/admin/users')
  }

  return (
    <>
      <Head title={t('admin.create.title')} />
      <div className="relative flex flex-col items-center p-6 pt-16">
        <Link
          href="/admin/users"
          className="absolute top-6 left-6 inline-flex items-center gap-1.5 text-sm text-muted-foreground transition hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" />
          {t('admin.edit.back')}
        </Link>

        {/* Page header */}
        <div className="mb-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10">
              <UserPlus className="h-5 w-5 text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-semibold">{t('admin.create.heading')}</h1>
              <p className="text-sm text-muted-foreground">{t('admin.create.description')}</p>
            </div>
          </div>
        </div>

        {/* Form card */}

        <div className="max-w-md rounded-xl border bg-card p-6 shadow-sm">
          <form onSubmit={handleSubmit} className="space-y-5">
            <FormField label={t('admin.create.fullName')} htmlFor="full_name" error={errors.full_name}>
              <IconInput
                id="full_name"
                type="text"
                autoComplete="name"
                placeholder={t('admin.create.fullNamePlaceholder')}
                icon={<User className="h-4 w-4" />}
                value={data.full_name}
                onChange={(e) => setData('full_name', e.target.value)}
              />
            </FormField>

            <FormField label={t('admin.create.email')} htmlFor="email" error={errors.email}>
              <IconInput
                id="email"
                type="email"
                autoComplete="email"
                placeholder={t('admin.create.emailPlaceholder')}
                icon={<Mail className="h-4 w-4" />}
                value={data.email}
                onChange={(e) => setData('email', e.target.value)}
              />
            </FormField>

            <FormField label={t('admin.create.tempPassword')} htmlFor="password" error={errors.password}>
              <PasswordInput
                id="password"
                value={data.password}
                onChange={(e) => setData('password', e.target.value)}
              />
            </FormField>

            <RoleSelector
              value={data.role}
              onChange={(role) => setData('role', role)}
              error={errors.role}
            />

            <div className="flex items-start gap-2 rounded-lg bg-muted px-3 py-2.5 text-xs text-muted-foreground">
              <Info className="mt-0.5 h-3.5 w-3.5 shrink-0" />
              <span>{t('admin.create.firstLoginNote')}</span>
            </div>

            <div className="flex items-center gap-6 pt-1">
              <Button type="submit" disabled={processing} className="flex items-center gap-2">
                <UserPlus className="h-4 w-4" />
                {processing ? t('admin.create.creating') : t('admin.create.submit')}
              </Button>
              <Link
                href="/admin/users"
                className="text-sm text-muted-foreground transition hover:text-foreground"
              >
                {t('admin.create.cancel')}
              </Link>
            </div>
          </form>
        </div>
      </div>
    </>
  )
}

AdminUsersCreate.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
