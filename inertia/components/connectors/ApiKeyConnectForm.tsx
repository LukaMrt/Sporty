import React, { useState } from 'react'
import { router } from '@inertiajs/react'
import { KeyRound } from 'lucide-react'
import { Input } from '~/components/ui/input'
import { Label } from '~/components/ui/label'
import { connectorConnectPath, type ConnectorBrand } from '~/lib/connector_catalog'
import { useTranslation } from '~/hooks/use_translation'

type ApiKeyConnectFormProps = {
  brand: ConnectorBrand
  disabled?: boolean
}

export default function ApiKeyConnectForm({ brand, disabled }: ApiKeyConnectFormProps) {
  const { t } = useTranslation()
  const [apiKey, setApiKey] = useState('')
  const [submitting, setSubmitting] = useState(false)

  const i18n = (key: string) => t(`connectors.${brand.i18nKey}.${key}`)

  function submit(event: React.SyntheticEvent) {
    event.preventDefault()
    if (!apiKey.trim() || disabled) return

    setSubmitting(true)
    router.post(
      connectorConnectPath(brand.provider),
      { api_key: apiKey.trim() },
      {
        preserveScroll: true,
        onFinish: () => {
          setSubmitting(false)
          setApiKey('')
        },
      }
    )
  }

  return (
    <form onSubmit={submit} className="flex flex-col gap-2 rounded-lg border p-4">
      <Label htmlFor="api-key">{i18n('apiKeyLabel')}</Label>
      <div className="flex items-center gap-2">
        <Input
          id="api-key"
          type="password"
          autoComplete="off"
          placeholder={i18n('apiKeyPlaceholder')}
          value={apiKey}
          onChange={(event) => setApiKey(event.target.value)}
          disabled={disabled || submitting}
          className="max-w-md"
        />
        <button
          type="submit"
          disabled={disabled || submitting || apiKey.trim().length === 0}
          className={`flex cursor-pointer items-center gap-1.5 rounded-md px-3 py-2 text-sm font-medium transition active:scale-95 disabled:cursor-not-allowed disabled:opacity-50 ${brand.buttonClass}`}
        >
          <KeyRound className="h-4 w-4" />
          {i18n('connect')}
        </button>
      </div>
      <p className="text-xs text-muted-foreground">{i18n('apiKeyHelp')}</p>
    </form>
  )
}
