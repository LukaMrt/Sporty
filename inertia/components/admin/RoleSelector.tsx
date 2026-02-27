import React from 'react'
import { User, ShieldCheck } from 'lucide-react'
import { useTranslation } from '~/hooks/use_translation'

type RoleValue = 'user' | 'admin'

interface RoleSelectorProps {
  value: string
  onChange: (role: RoleValue) => void
  error?: string
}

export default function RoleSelector({ value, onChange, error }: RoleSelectorProps) {
  const { t } = useTranslation()

  const ROLES = [
    {
      value: 'user' as const,
      label: t('admin.roles.user.label'),
      description: t('admin.roles.user.description'),
      icon: User,
    },
    {
      value: 'admin' as const,
      label: t('admin.roles.admin.label'),
      description: t('admin.roles.admin.description'),
      icon: ShieldCheck,
    },
  ]

  return (
    <div className="space-y-1.5">
      <span className="block text-sm font-medium">{t('admin.roles.label')}</span>
      <div className="grid grid-cols-2 gap-3">
        {ROLES.map(({ value: roleValue, label, description, icon: Icon }) => {
          const selected = value === roleValue
          return (
            <button
              key={roleValue}
              type="button"
              onClick={() => onChange(roleValue)}
              className={`flex cursor-pointer flex-col items-start gap-1 rounded-lg border p-3 text-left transition ${
                selected
                  ? 'border-primary bg-primary/5 ring-1 ring-primary'
                  : 'border-border hover:border-muted-foreground/40 hover:bg-muted/40'
              }`}
            >
              <div className="flex items-center gap-2">
                <Icon
                  className={`h-4 w-4 ${selected ? 'text-primary' : 'text-muted-foreground'}`}
                />
                <span className={`text-sm font-medium ${selected ? 'text-primary' : ''}`}>
                  {label}
                </span>
              </div>
              <span className="text-xs text-muted-foreground">{description}</span>
            </button>
          )
        })}
      </div>
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
