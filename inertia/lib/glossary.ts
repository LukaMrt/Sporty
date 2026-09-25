/**
 * Notions expliquées dans l'aide. Les textes vivent dans
 * `resources/lang/{fr,en}/glossary.json` (clé `glossary.terms.<id>`).
 */
export const GLOSSARY_GROUPS = {
  load: ['tss', 'rtss', 'stss', 'trimp', 'rpe', 'ctl', 'atl', 'tsb', 'acwr', 'monotony', 'strain'],
  heart: ['maxHr', 'restingHr', 'lthr', 'karvonen', 'hrZones', 'cardiacDrift'],
  performance: ['vdot', 'vo2max', 'ef', 'decoupling', 'gap'],
  recovery: ['readiness', 'hrv', 'spo2'],
  swimming: ['swimPace', 'css', 'swolf'],
} as const

export type GlossaryGroup = keyof typeof GLOSSARY_GROUPS
export type GlossaryTermId = (typeof GLOSSARY_GROUPS)[GlossaryGroup][number]

export const GLOSSARY_TERM_IDS: GlossaryTermId[] = Object.values(GLOSSARY_GROUPS).flat()

export const HELP_METRICS_URL = '/help/metrics'
