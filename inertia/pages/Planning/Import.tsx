import React, { useState } from 'react'
import { Head, Link, router } from '@inertiajs/react'
import { Check, ClipboardCopy, Download, Sparkles } from 'lucide-react'
import MainLayout from '~/layouts/MainLayout'
import { Button } from '~/components/ui/button'
import { Textarea } from '~/components/ui/textarea'
import { useTranslation } from '~/hooks/use_translation'
import { postJson } from '~/lib/http'

type ImportError = { path: string; code: string; expected?: string }

type Props = { hasActivePlan: boolean }

/** Mode annoncé par le JSON collé (pour prévenir avant de remplacer le plan actif) */
function detectMode(text: string): 'replace' | 'merge' | null {
  const match = /"mode"\s*:\s*"(replace|merge)"/.exec(text)
  return match ? (match[1] as 'replace' | 'merge') : null
}

/**
 * Créer ou réviser son plan avec Claude : 1) copier le prompt (format + profil
 * + plan actuel), 2) échanger avec Claude, 3) coller sa réponse JSON. Un
 * document invalide est refusé en entier, avec la liste des corrections à
 * renvoyer à Claude.
 */
export default function PlanningImport({ hasActivePlan }: Props) {
  const { t } = useTranslation()
  const [mode, setMode] = useState<'create' | 'revise'>(hasActivePlan ? 'revise' : 'create')
  const [prompt, setPrompt] = useState<string | null>(null)
  const [copied, setCopied] = useState<'prompt' | 'errors' | null>(null)
  const [document, setDocument] = useState('')
  const [errors, setErrors] = useState<ImportError[]>([])
  const [importing, setImporting] = useState(false)
  const [failure, setFailure] = useState<string | null>(null)

  async function copy(text: string, what: 'prompt' | 'errors') {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(what)
      setTimeout(() => setCopied(null), 2000)
    } catch {
      setCopied(null)
    }
  }

  async function loadAndCopyPrompt() {
    const response = await fetch(`/planning/prompt?mode=${mode}`, {
      headers: { Accept: 'text/plain' },
    })
    if (!response.ok) return setFailure(t('planning.editor.import.promptError'))
    const text = await response.text()
    setPrompt(text)
    await copy(text, 'prompt')
  }

  const errorLine = (e: ImportError) =>
    `${e.path} : ${t(`planning.editor.import.codes.${e.code}`, { expected: e.expected ?? '' })}`

  const errorsForClaude = () =>
    [t('planning.editor.import.errorsIntro'), ...errors.map((e) => `- ${errorLine(e)}`)].join('\n')

  async function submit(e: React.SyntheticEvent) {
    e.preventDefault()
    setFailure(null)
    setErrors([])
    if (detectMode(document) !== 'merge' && hasActivePlan) {
      if (!window.confirm(t('planning.editor.import.confirmReplace'))) return
    }
    setImporting(true)
    try {
      const response = await postJson('/planning/import', { document })
      if (response.ok) return router.visit('/planning')
      if (response.status === 422) {
        const body = (await response.json()) as { errors?: ImportError[] }
        setErrors(body.errors ?? [])
        if (!body.errors) setFailure(t('planning.editor.import.failed'))
      } else setFailure(t('planning.editor.import.failed'))
    } catch {
      setFailure(t('planning.editor.import.failed'))
    } finally {
      setImporting(false)
    }
  }

  const tab = (value: 'create' | 'revise') =>
    `flex-1 rounded-md py-1.5 text-sm font-medium transition-colors ${
      mode === value
        ? 'bg-background text-foreground shadow-sm'
        : 'text-muted-foreground hover:text-foreground'
    }`

  return (
    <>
      <Head title={t('planning.editor.import.title')} />
      <div className="mx-auto max-w-3xl space-y-4 p-4 sm:p-6">
        <div>
          <Link href="/planning" className="text-sm text-muted-foreground hover:text-foreground">
            ← {t('planning.title')}
          </Link>
          <h1 className="mt-1 flex items-center gap-2 text-xl font-semibold">
            <Sparkles className="h-5 w-5 text-primary" aria-hidden="true" />
            {t('planning.editor.import.title')}
          </h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('planning.editor.import.intro')}</p>
        </div>

        <div role="tablist" className="flex gap-1 rounded-lg bg-muted p-1">
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'create'}
            className={tab('create')}
            onClick={() => {
              setMode('create')
              setPrompt(null)
            }}
          >
            {t('planning.editor.import.modes.create')}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={mode === 'revise'}
            disabled={!hasActivePlan}
            className={`${tab('revise')} disabled:opacity-40`}
            onClick={() => {
              setMode('revise')
              setPrompt(null)
            }}
          >
            {t('planning.editor.import.modes.revise')}
          </button>
        </div>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">1. {t('planning.editor.import.step1.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t(`planning.editor.import.step1.${mode}`)}
          </p>
          <Button className="mt-3" onClick={() => void loadAndCopyPrompt()}>
            {copied === 'prompt' ? (
              <Check className="mr-1.5 h-4 w-4" aria-hidden="true" />
            ) : (
              <ClipboardCopy className="mr-1.5 h-4 w-4" aria-hidden="true" />
            )}
            {copied === 'prompt'
              ? t('planning.editor.import.copied')
              : t('planning.editor.import.copyPrompt')}
          </Button>
          {prompt && (
            <details className="mt-3 text-sm">
              <summary className="cursor-pointer text-muted-foreground">
                {t('planning.editor.import.showPrompt')}
              </summary>
              <pre className="mt-2 max-h-80 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
                {prompt}
              </pre>
            </details>
          )}
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">2. {t('planning.editor.import.step2.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('planning.editor.import.step2.text')}
          </p>
        </section>

        <section className="rounded-xl border bg-card p-4 shadow-sm">
          <h2 className="text-sm font-semibold">3. {t('planning.editor.import.step3.title')}</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            {t('planning.editor.import.step3.text')}
          </p>
          <form onSubmit={(e) => void submit(e)} className="mt-3 space-y-3">
            <Textarea
              aria-label={t('planning.editor.import.step3.title')}
              rows={12}
              className="font-mono text-xs"
              placeholder='{ "version": 1, "mode": "replace", "plan": { … }, "weeks": [ … ] }'
              value={document}
              onChange={(e) => setDocument(e.target.value)}
            />
            {document.trim() && (
              <p className="text-xs text-muted-foreground">
                {t(`planning.editor.import.detected.${detectMode(document) ?? 'replace'}`)}
              </p>
            )}
            <Button type="submit" disabled={importing || !document.trim()}>
              {importing
                ? t('planning.editor.import.importing')
                : t('planning.editor.import.submit')}
            </Button>
          </form>

          {errors.length > 0 && (
            <div
              role="alert"
              className="mt-4 rounded-lg border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900"
            >
              <p className="font-medium">
                {t('planning.editor.import.invalid', { count: errors.length })}
              </p>
              <ul className="mt-2 max-h-60 list-disc space-y-0.5 overflow-auto pl-5 font-mono text-xs">
                {errors.map((error, i) => (
                  <li key={i}>{errorLine(error)}</li>
                ))}
              </ul>
              <Button
                size="sm"
                variant="outline"
                className="mt-3"
                onClick={() => void copy(errorsForClaude(), 'errors')}
              >
                <ClipboardCopy className="mr-1.5 h-3.5 w-3.5" aria-hidden="true" />
                {copied === 'errors'
                  ? t('planning.editor.import.copied')
                  : t('planning.editor.import.copyErrors')}
              </Button>
            </div>
          )}
          {failure && (
            <p role="alert" className="mt-3 text-sm text-destructive">
              {failure}
            </p>
          )}
        </section>

        {hasActivePlan && (
          <a
            href="/planning/export.json"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
          >
            <Download className="h-4 w-4" aria-hidden="true" />
            {t('planning.editor.export')}
          </a>
        )}
      </div>
    </>
  )
}

PlanningImport.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
