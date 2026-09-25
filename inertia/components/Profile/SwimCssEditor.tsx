import { useState } from 'react'
import { Input } from '~/components/ui/input'
import FormField from '~/components/forms/FormField'
import Term from '~/components/shared/Term'
import { useTranslation } from '~/hooks/use_translation'
import { cssFromTest, formatPaceMinSec, parseMinSec } from '~/lib/format'

type SwimCssEditorProps = {
  /** CSS en min/100 m (décimal) */
  value: number | null
  onChange: (value: number | null) => void
  error?: string
}

/**
 * Saisie de la CSS : directement en m:ss/100 m, ou calculée depuis un test
 * 400 m + 200 m nagés à fond.
 */
export default function SwimCssEditor({ value, onChange, error }: SwimCssEditorProps) {
  const { t } = useTranslation()
  const [direct, setDirect] = useState(value !== null ? formatPaceMinSec(value) : '')
  const [t400, setT400] = useState('')
  const [t200, setT200] = useState('')

  function applyDirect(text: string) {
    setDirect(text)
    if (text.trim() === '') return onChange(null)
    const parsed = parseMinSec(text)
    if (parsed !== null) onChange(parsed)
  }

  const t400Min = parseMinSec(t400)
  const t200Min = parseMinSec(t200)
  const fromTest = t400Min !== null && t200Min !== null ? cssFromTest(t400Min, t200Min) : null

  return (
    <div className="space-y-3">
      <FormField label={t('profile.swim.css')} htmlFor="css_pace_per_100m" error={error}>
        <div className="flex items-center gap-2">
          <Input
            id="css_pace_per_100m"
            inputMode="numeric"
            placeholder="1:45"
            value={direct}
            onChange={(e) => applyDirect(e.target.value)}
            className="w-28"
          />
          <span className="text-sm text-muted-foreground">/100 m</span>
        </div>
      </FormField>
      <p className="text-xs text-muted-foreground">
        <Term id="css" /> — <Term id="stss">{t('profile.swim.usedFor')}</Term>
      </p>

      <details className="rounded-lg border p-3 text-sm">
        <summary className="cursor-pointer text-muted-foreground">
          {t('profile.swim.fromTest')}
        </summary>
        <p className="mt-2 text-xs text-muted-foreground">{t('profile.swim.testHint')}</p>
        <div className="mt-2 grid grid-cols-2 gap-2">
          <FormField label={t('profile.swim.time400')} htmlFor="css_t400">
            <Input
              id="css_t400"
              placeholder="7:00"
              value={t400}
              onChange={(e) => setT400(e.target.value)}
            />
          </FormField>
          <FormField label={t('profile.swim.time200')} htmlFor="css_t200">
            <Input
              id="css_t200"
              placeholder="3:20"
              value={t200}
              onChange={(e) => setT200(e.target.value)}
            />
          </FormField>
        </div>
        {fromTest !== null && (
          <button
            type="button"
            className="mt-2 text-primary underline underline-offset-2"
            onClick={() => {
              setDirect(formatPaceMinSec(fromTest))
              onChange(fromTest)
            }}
          >
            {t('profile.swim.useResult', { css: `${formatPaceMinSec(fromTest)}/100 m` })}
          </button>
        )}
      </details>
    </div>
  )
}
