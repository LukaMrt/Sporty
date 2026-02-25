import React from 'react'

interface FormFieldProps {
  label: string
  htmlFor?: string
  error?: string
  children: React.ReactNode
}

export default function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={htmlFor} className="block text-sm font-medium">
        {label}
      </label>
      {children}
      {error && <p className="text-xs text-destructive">{error}</p>}
    </div>
  )
}
