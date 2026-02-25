import React from 'react'
import { Input } from '~/components/ui/input'

interface IconInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  icon: React.ReactNode
  trailing?: React.ReactNode
}

export default function IconInput({ icon, trailing, className, ...props }: IconInputProps) {
  return (
    <div className="relative flex items-center">
      <span className="pointer-events-none absolute left-3 text-muted-foreground">{icon}</span>
      <Input className={`pl-9 ${trailing ? 'pr-10' : ''} ${className ?? ''}`} {...props} />
      {trailing && <span className="absolute right-3">{trailing}</span>}
    </div>
  )
}
