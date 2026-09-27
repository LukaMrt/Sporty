import type { PaceZones } from '#domain/value_objects/pace_zones'
import type { ZoneBoundsBpm } from '#domain/value_objects/heart_rate_zones_config'
import { IntensityZone, SessionType } from '#domain/value_objects/planning_types'
import { PLAN_DOCUMENT_VERSION, type PlanDocument } from '#domain/services/plan_document'

/**
 * Prompt à coller dans Claude pour créer ou réviser un plan. Il décrit le
 * document de plan champ par champ (le contrat que `parsePlanDocument` valide),
 * donne le profil et le contexte de l'athlète, et exige une réponse JSON seule.
 */

export type PlanPromptInput = {
  mode: 'create' | 'revise'
  today: string
  sports: { slug: string; name: string }[]
  athlete: {
    sex: string | null
    maxHeartRate: number | null
    restingHeartRate: number | null
    lthr: number | null
    hrZones: ZoneBoundsBpm | null
    vdot: number | null
    paceZones: PaceZones | null
    /** min/100 m */
    cssPacePer100m: number | null
    level: string | null
  }
  fitness: { ctl: number; atl: number; tsb: number } | null
  /** Volume moyen par semaine sur les 8 dernières semaines, par sport */
  recentVolume: { sport: string; minutesPerWeek: number; sessionsPerWeek: number }[]
  goal: { distanceKm: number; targetTimeMinutes: number | null; eventDate: string | null } | null
  /** Révision : plan actuel et semaine en cours */
  currentPlan: PlanDocument | null
  currentWeekNumber: number | null
}

const SESSION_TYPE_HELP: Record<SessionType, string> = {
  [SessionType.Easy]: 'endurance facile (Z1-Z2)',
  [SessionType.LongRun]: 'sortie longue (tous sports)',
  [SessionType.Tempo]: 'seuil / tempo (Z3-Z4)',
  [SessionType.MarathonPace]: 'allure spécifique longue (allure marathon, allure course)',
  [SessionType.Interval]: 'fractionné VO2max (Z4-Z5)',
  [SessionType.Repetition]: 'répétitions courtes et rapides, vitesse (Z5)',
  [SessionType.Recovery]: 'récupération active très facile (Z1)',
  [SessionType.Race]: 'course / compétition / test',
  [SessionType.CrossTraining]: 'entraînement croisé libre',
  [SessionType.Strength]: 'renforcement musculaire (utiliser exercises)',
  [SessionType.Mobility]: 'mobilité, étirements, gainage léger',
  [SessionType.Technique]: 'éducatifs, technique (nage, gammes, vélocité)',
  [SessionType.Rest]: 'repos explicite (inutile : un jour sans séance est un jour de repos)',
}

const pace = (minutes: number) => {
  let m = Math.floor(minutes)
  let s = Math.round((minutes - m) * 60)
  if (s === 60) {
    m++
    s = 0
  }
  return `${m}:${String(s).padStart(2, '0')}`
}

function profileLines(input: PlanPromptInput): string[] {
  const a = input.athlete
  const lines: string[] = []
  if (a.level) lines.push(`- Niveau déclaré : ${a.level}`)
  if (a.sex) lines.push(`- Sexe : ${a.sex}`)
  if (a.maxHeartRate) lines.push(`- FC max : ${a.maxHeartRate} bpm`)
  if (a.restingHeartRate) lines.push(`- FC repos : ${a.restingHeartRate} bpm`)
  if (a.lthr) lines.push(`- FC au seuil (LTHR) : ${a.lthr} bpm`)
  if (a.hrZones) {
    const b = a.hrZones
    lines.push(
      `- Zones cardiaques : Z1 ${b[0]}-${b[1]}, Z2 ${b[1]}-${b[2]}, Z3 ${b[2]}-${b[3]}, Z4 ${b[3]}-${b[4]}, Z5 ${b[4]}-${b[5]} bpm`
    )
  }
  if (a.vdot) lines.push(`- VDOT (Daniels) : ${a.vdot}`)
  if (a.paceZones) {
    const z = a.paceZones
    const range = (r: { minPacePerKm: number; maxPacePerKm: number }) =>
      `${pace(r.minPacePerKm)}-${pace(r.maxPacePerKm)}/km`
    lines.push(
      `- Allures course (VDOT) : facile ${range(z.easy)}, marathon ${range(z.marathon)}, seuil ${range(z.threshold)}, VO2max ${range(z.interval)}, répétitions ${range(z.repetition)}`
    )
  }
  if (a.cssPacePer100m)
    lines.push(`- Natation, CSS (allure seuil) : ${pace(a.cssPacePer100m)}/100 m`)
  return lines.length > 0 ? lines : ['- (profil peu renseigné : pose-moi les questions utiles)']
}

function contextLines(input: PlanPromptInput): string[] {
  const lines: string[] = [`- Date du jour : ${input.today}`]
  if (input.fitness) {
    lines.push(
      `- Forme actuelle (modèle de Banister, TSS/jour) : CTL ${Math.round(input.fitness.ctl)}, ATL ${Math.round(input.fitness.atl)}, TSB ${Math.round(input.fitness.tsb)}`
    )
  }
  if (input.recentVolume.length > 0) {
    lines.push('- Volume moyen des 8 dernières semaines :')
    for (const v of input.recentVolume) {
      lines.push(
        `  - ${v.sport} : ${Math.round(v.minutesPerWeek)} min/semaine, ${v.sessionsPerWeek.toFixed(1)} séances/semaine`
      )
    }
  } else {
    lines.push('- Aucune séance enregistrée ces 8 dernières semaines.')
  }
  if (input.goal) {
    const g = input.goal
    lines.push(
      `- Objectif actuel : ${g.distanceKm} km` +
        (g.targetTimeMinutes ? ` en ${pace(g.targetTimeMinutes)} (h:mm)` : '') +
        (g.eventDate ? `, le ${g.eventDate}` : '')
    )
  }
  return lines
}

const EXAMPLE: PlanDocument = {
  version: PLAN_DOCUMENT_VERSION,
  mode: 'replace',
  plan: {
    name: 'Semi-marathon en 1h45',
    start_date: '2026-10-05',
    notes: 'Priorité à la régularité. Renfo 1×/semaine.',
    goal: { distance_km: 21.1, target_time: '1:45:00', event_date: '2027-01-17' },
  },
  weeks: [
    {
      week: 1,
      phase: 'Base',
      notes: 'Reprise en douceur, tout en aisance respiratoire.',
      sessions: [
        {
          day: 'tuesday',
          sport: 'running',
          type: SessionType.Interval,
          title: '6 × 1000 m',
          duration_minutes: 60,
          zone: IntensityZone.Z4,
          description: 'Récupération trottinée entre les fractions.',
          blocks: [
            { type: 'warmup', duration_minutes: 15, zone: IntensityZone.Z2 },
            {
              type: 'work',
              repeat: 6,
              distance_m: 1000,
              pace_per_km: '4:40',
              recovery_minutes: 2,
              recovery_type: 'jog',
            },
            { type: 'cooldown', duration_minutes: 10, zone: IntensityZone.Z1 },
          ],
        },
        {
          day: 'thursday',
          sport: 'strength',
          type: SessionType.Strength,
          title: 'Renfo bas du corps',
          duration_minutes: 40,
          rpe: 6,
          exercises: [
            { name: 'Squat', sets: 3, reps: '10', load: '20 kg', rest_seconds: 90 },
            { name: 'Fentes marchées', sets: 3, reps: '12 par jambe', rest_seconds: 60 },
          ],
        },
        {
          day: 'sunday',
          sport: 'running',
          type: SessionType.LongRun,
          title: 'Sortie longue',
          duration_minutes: 80,
          distance_km: 14,
          zone: IntensityZone.Z2,
          pace_per_km: '5:50',
        },
      ],
    },
  ],
}

export function buildPlanPrompt(input: PlanPromptInput): string {
  const sports = input.sports.map((s) => `\`${s.slug}\` (${s.name})`).join(', ')
  const types = Object.values(SessionType)
    .map((t) => `  - \`${t}\` : ${SESSION_TYPE_HELP[t]}`)
    .join('\n')

  const task =
    input.mode === 'create'
      ? [
          '# Ta mission',
          '',
          "Tu es mon entraîneur. Construis-moi un plan d'entraînement complet, semaine par semaine, adapté à mon profil et à mon contexte ci-dessous.",
          'Avant de produire le plan, pose-moi les questions indispensables (objectif, date, disponibilités, sports souhaités, blessures, matériel…) si elles ne sont pas déjà claires. Quand tout est clair, réponds avec le document JSON décrit plus bas.',
        ]
      : [
          '# Ta mission',
          '',
          'Tu es mon entraîneur. Voici mon plan actuel (au format décrit plus bas). Je veux le faire évoluer : je vais te dire quoi changer.',
          `Nous sommes en semaine ${input.currentWeekNumber ?? '?'}. Règles de révision :`,
          '- Ne modifie pas les semaines passées ; les séances marquées `"done": true` sont déjà réalisées : garde-les telles quelles si tu renvoies leur semaine.',
          '- Pour ne changer que quelques semaines, réponds en `"mode": "merge"` avec **uniquement** les semaines modifiées ou ajoutées (chacune est remplacée entièrement, séances réalisées conservées). `delete_weeks` supprime des semaines.',
          '- Pour tout refaire, réponds en `"mode": "replace"` avec le plan complet.',
          '',
          '## Plan actuel',
          '',
          '```json',
          JSON.stringify(input.currentPlan, null, 2),
          '```',
        ]

  return [
    ...task,
    '',
    '# Mon profil',
    '',
    ...profileLines(input),
    '',
    '# Mon contexte',
    '',
    ...contextLines(input),
    '',
    '# Format de réponse (obligatoire)',
    '',
    "Ton plan sera importé automatiquement dans mon application. Réponds avec **un seul bloc ```json** contenant un objet qui respecte exactement ce schéma (champs en snake_case, valeurs d'énumération en minuscules, aucun commentaire dans le JSON) :",
    '',
    '## Racine',
    `- \`version\` : toujours \`${PLAN_DOCUMENT_VERSION}\``,
    '- `mode` : `"replace"` (nouveau plan complet, remplace le plan actuel) ou `"merge"` (met à jour seulement les semaines fournies du plan actuel)',
    '- `plan` : informations générales (voir ci-dessous)',
    '- `weeks` : liste des semaines',
    '- `delete_weeks` (facultatif, mode merge) : numéros de semaines à supprimer',
    '',
    '## `plan`',
    '- `name` : nom court du plan',
    '- `start_date` : date `YYYY-MM-DD` du **lundi** de la semaine 1 (obligatoire en mode replace ; prends le lundi qui suit la date du jour sauf demande contraire)',
    '- `notes` : consignes générales (facultatif)',
    '- `goal` (facultatif) : `{ "distance_km": nombre, "target_time": "H:MM:SS" ou null, "event_date": "YYYY-MM-DD" ou null }`',
    '',
    '## `weeks[]`',
    '- `week` : numéro, à partir de 1, sans trou en mode replace',
    '- `phase` : nom de la phase (« Base », « Développement », « Spécifique », « Affûtage »…)',
    '- `recovery_week` : `true` pour une semaine allégée',
    '- `notes` : objectif de la semaine (facultatif)',
    "- `sessions` : séances de la semaine (un jour sans séance = repos ; plusieurs séances le même jour sont possibles, dans l'ordre de la journée)",
    '',
    '## `weeks[].sessions[]`',
    '- `day` (obligatoire) : `monday`, `tuesday`, `wednesday`, `thursday`, `friday`, `saturday`, `sunday`',
    `- \`sport\` (obligatoire) : ${sports}`,
    '- `type` (obligatoire) :',
    types,
    '- `duration_minutes` (obligatoire) : durée totale prévue, échauffement compris',
    '- `title` : titre court et parlant (« 6 × 1000 m », « Renfo haut du corps »)',
    '- `distance_km` : distance prévue (facultatif)',
    '- `zone` : intensité dominante `z1` (très facile) à `z5` (maximale), sur mes zones cardiaques',
    '- `pace_per_km` : allure cible course `M:SS` (par km)',
    '- `pace_per_100m` : allure cible natation `M:SS` (par 100 m)',
    '- `power_watts` : puissance cible vélo (entier)',
    "- `rpe` : effort perçu cible de 1 à 10 (utile pour le renfo et quand il n'y a ni allure ni puissance)",
    '- `description` : consignes détaillées (déroulé, sensations, conseils)',
    "- `blocks` : structure détaillée pour le fractionné ou toute séance construite, dans l'ordre :",
    '  - `type` : `warmup`, `work`, `recovery`, `cooldown`',
    '  - `repeat` : nombre de répétitions (défaut 1)',
    "  - `duration_minutes` **ou** `distance_m` : durée ou distance d'une répétition",
    '  - `zone`, `pace_per_km`, `power_watts` : cible du bloc',
    '  - `recovery_minutes` + `recovery_type` (`jog` ou `rest`) : récupération entre répétitions',
    '  - `notes` : consigne du bloc',
    '- `exercises` : pour le renfo, liste de `{ "name", "sets", "reps" (texte : « 10 », « 8-12 », « 30 s »), "load" (texte : « 20 kg », « poids du corps »), "rest_seconds", "notes" }`',
    '',
    '## Règles',
    '- Respecte mes zones et mes allures ci-dessus ; une allure ou une puissance doit être réaliste pour mon niveau.',
    "- Progresse d'environ 10 % maximum de volume par semaine, avec une semaine allégée toutes les 3 à 4 semaines, et un affûtage avant l'objectif.",
    "- Environ 80 % du temps d'endurance en Z1-Z2.",
    '- Les champs facultatifs inutiles peuvent être omis. Pas de texte hors du bloc JSON dans la réponse finale.',
    '',
    '## Exemple (extrait)',
    '',
    '```json',
    JSON.stringify(EXAMPLE, null, 2),
    '```',
  ].join('\n')
}
