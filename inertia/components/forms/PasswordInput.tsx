import React, { useState } from 'react'
import { Lock, Eye, EyeOff } from 'lucide-react'
import IconInput from './IconInput'

interface PasswordInputProps {
  id?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  placeholder?: string
  autoComplete?: string
}

export default function PasswordInput({
  id,
  value,
  onChange,
  placeholder = 'Minimum 8 caractères',
  autoComplete = 'new-password',
}: PasswordInputProps) {
  const [visible, setVisible] = useState(false)

  return (
    <IconInput
      id={id}
      type={visible ? 'text' : 'password'}
      autoComplete={autoComplete}
      placeholder={placeholder}
      value={value}
      onChange={onChange}
      icon={<Lock className="h-4 w-4" />}
      trailing={
        <button
          type="button"
          onClick={() => setVisible((v) => !v)}
          className="cursor-pointer text-muted-foreground transition hover:text-foreground"
          aria-label={visible ? 'Masquer le mot de passe' : 'Afficher le mot de passe'}
        >
          {visible ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
        </button>
      }
    />
  )
}
