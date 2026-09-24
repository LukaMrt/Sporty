import { SourceBadge } from '~/components/shared/SourceBadge'
import { useTranslation } from '~/hooks/use_translation'

/** Références scientifiques du guide physiologique */
export default function GuideSources() {
  const { t } = useTranslation()
  return (
    <section className="rounded-xl border bg-muted/50 p-5 text-sm space-y-4">
      <h2 className="font-semibold text-sm">{t('profile.physiologyGuide.sources.title')}</h2>

      {/* Français */}
      <div>
        <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
          Français
        </h3>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>
            <SourceBadge type="synthesis" label={t('profile.physiologyGuide.sources.synthesis')} />
            <a
              href="https://fr.wikipedia.org/wiki/Vitesse_maximale_a%C3%A9robie"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Vitesse maximale aérobie — Wikipédia
            </a>
          </li>
          <li>
            <SourceBadge type="protocol" label={t('profile.physiologyGuide.sources.protocol')} />
            <a
              href="https://www.irbms.com/test-navette-de-luc-leger/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Test navette de Luc Léger — IRBMS
            </a>
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://www.sciencedirect.com/science/article/pii/0765159796812883"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Validation des tests VMA — Melin et al., 1996
            </a>
          </li>
          <li>
            <SourceBadge type="synthesis" label={t('profile.physiologyGuide.sources.synthesis')} />
            <a
              href="https://fr.wikipedia.org/wiki/Test_de_Cooper"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Test de Cooper — Wikipédia
            </a>
          </li>
          <li>
            <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
            <a
              href="https://www.materiel-velo.com/infos/fr/calculer-frequence-cardiaque-fcmax/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Calculer sa FC max (Tanaka, Gellish) — materiel-velo.com
            </a>
          </li>
          <li>
            <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
            <a
              href="https://conseilsport.decathlon.fr/comment-calculer-sa-frequence-cardiaque-maximale-fcm"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Comment calculer sa FCmax — Decathlon
            </a>
          </li>
        </ul>
      </div>

      {/* Anglais */}
      <div>
        <h3 className="font-medium text-xs uppercase tracking-wide text-muted-foreground mb-2">
          English
        </h3>
        <ul className="space-y-1.5 text-muted-foreground">
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            Tanaka H, Monahan KD, Seals DR. <em>
              Age-predicted maximal heart rate revisited.
            </em>{' '}
            JACC, 2001.
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://digitalcommons.wku.edu/ijes/vol13/iss7/6/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Age-predicted HRmax equations — IJES
            </a>
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://pmc.ncbi.nlm.nih.gov/articles/PMC5862813/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              HRmax in marathon runners — PMC, 2018
            </a>
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/33042384/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Accuracy of age-predicted HRmax equations — PubMed, 2020
            </a>
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/9088842/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              5-min maximal test for VMA — PubMed, 1997
            </a>
          </li>
          <li>
            <SourceBadge type="study" label={t('profile.physiologyGuide.sources.study')} />
            <a
              href="https://pubmed.ncbi.nlm.nih.gov/34319445/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Vmax protocols review — PubMed, 2021
            </a>
          </li>
          <li>
            <SourceBadge type="guide" label={t('profile.physiologyGuide.sources.guide')} />
            <a
              href="https://www.scienceforsport.com/maximal-aerobic-speed-mas/"
              target="_blank"
              rel="noopener noreferrer"
              className="underline underline-offset-2 hover:text-foreground"
            >
              Maximal Aerobic Speed (MAS) — Science for Sport
            </a>
          </li>
        </ul>
      </div>
    </section>
  )
}
