import type { ReactNode } from 'react'
import { useTranslation } from '~/hooks/use_translation'

/** Section repliable du guide physiologique */
export default function GuideSection({
  id,
  title,
  children,
}: {
  id?: string
  title: string
  children: ReactNode
}) {
  const { t } = useTranslation()
  return (
    <section id={id} className="overflow-hidden rounded-xl border bg-card shadow-sm">
      <details open>
        <summary className="flex cursor-pointer items-center justify-between p-5 text-base font-semibold transition-colors select-none hover:bg-muted/40">
          <span>{title}</span>
          <span className="text-xs font-normal text-muted-foreground">
            {t('profile.physiologyGuide.collapse')}
          </span>
        </summary>
        {children}
      </details>
    </section>
  )
}
