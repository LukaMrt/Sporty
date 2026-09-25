import React, { useEffect } from 'react'
import { Head } from '@inertiajs/react'
import MainLayout from '~/layouts/MainLayout'
import { useTranslation } from '~/hooks/use_translation'
import { GLOSSARY_GROUPS, type GlossaryGroup } from '~/lib/glossary'

export default function HelpMetrics() {
  const { t } = useTranslation()

  // Arrivée depuis un <Term> : met en évidence la notion ciblée
  useEffect(() => {
    const id = window.location.hash.slice(1)
    if (id) document.getElementById(id)?.scrollIntoView({ block: 'center' })
  }, [])

  return (
    <>
      <Head title={t('glossary.title')} />
      <div className="mx-auto max-w-3xl space-y-6 p-4 sm:p-6">
        <header>
          <h1 className="text-xl font-semibold">{t('glossary.title')}</h1>
          <p className="mt-1 text-sm text-muted-foreground">{t('glossary.intro')}</p>
        </header>

        <nav className="flex flex-wrap gap-3 text-sm" aria-label={t('glossary.title')}>
          {(Object.keys(GLOSSARY_GROUPS) as GlossaryGroup[]).map((group) => (
            <a key={group} href={`#group-${group}`} className="text-primary hover:underline">
              {t(`glossary.groups.${group}`)}
            </a>
          ))}
        </nav>

        {(Object.entries(GLOSSARY_GROUPS) as [GlossaryGroup, readonly string[]][]).map(
          ([group, ids]) => (
            <section key={group} id={`group-${group}`} className="space-y-3">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted-foreground">
                {t(`glossary.groups.${group}`)}
              </h2>
              <dl className="space-y-3">
                {ids.map((id) => (
                  <div
                    key={id}
                    id={id}
                    className="scroll-mt-20 rounded-xl border bg-card p-4 shadow-sm target:ring-2 target:ring-primary"
                  >
                    <dt className="font-semibold text-foreground">
                      {t(`glossary.terms.${id}.name`)}
                    </dt>
                    <dd className="mt-1 text-sm leading-relaxed text-muted-foreground">
                      {t(`glossary.terms.${id}.short`)}
                    </dd>
                    <dd className="mt-2 text-sm leading-relaxed text-foreground/80">
                      <span className="font-medium">{t('glossary.howToRead')} </span>
                      {t(`glossary.terms.${id}.read`)}
                    </dd>
                  </div>
                ))}
              </dl>
            </section>
          )
        )}
      </div>
    </>
  )
}

HelpMetrics.layout = (page: React.ReactNode) => <MainLayout>{page}</MainLayout>
