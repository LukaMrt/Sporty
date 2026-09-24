import { useState } from 'react'
import { useTranslation } from '~/hooks/use_translation'
import { Button } from '~/components/ui/button'
import { Section } from './shared'

/** H1 résumé à coller dans Claude · H4 export des données */
export default function ReportSection({ summary }: { summary: string }) {
  const { t } = useTranslation()
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(summary)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      setCopied(false)
    }
  }

  return (
    <Section
      id="report"
      title={t('analysis.report.title')}
      description={t('analysis.report.description')}
    >
      <pre className="max-h-72 overflow-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
        {summary}
      </pre>
      <div className="mt-3 flex flex-wrap gap-2">
        <Button type="button" onClick={() => void copy()}>
          {copied ? t('analysis.report.copied') : t('analysis.report.copy')}
        </Button>
        <Button variant="outline" asChild>
          <a href="/export/sessions.csv">{t('analysis.report.exportSessions')}</a>
        </Button>
        <Button variant="outline" asChild>
          <a href="/export/daily-metrics.csv">{t('analysis.report.exportDaily')}</a>
        </Button>
      </div>
      <p className="mt-2 text-xs text-muted-foreground">{t('analysis.report.privacy')}</p>
    </Section>
  )
}
