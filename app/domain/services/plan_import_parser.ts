import type { ImportedPlanEntry } from '#domain/value_objects/imported_plan_entry'

export type PlanParseResult =
  | { ok: true; entries: ImportedPlanEntry[] }
  | { ok: false; error: 'empty' | 'no_entries' | 'invalid_json' | 'invalid_date' }

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/
/** « 45 min », « 1h30 », « 1 h 15 » */
const DURATION = /(\d+)\s*h\s*(\d{1,2})?|(\d+)\s*min/i
/** « 10 km », « 10,5 km » */
const DISTANCE = /(\d+(?:[.,]\d+)?)\s*km/i
/** Date en début de ligne : « 2026-03-02 », « 02/03/2026 » */
const LINE_DATE = /^(\d{4}-\d{2}-\d{2}|\d{2}\/\d{2}\/\d{4})/

function isValidDate(iso: string): boolean {
  return ISO_DATE.test(iso) && !Number.isNaN(Date.parse(`${iso}T00:00:00Z`))
}

function toIso(date: string): string {
  if (ISO_DATE.test(date)) return date
  const [d, m, y] = date.split('/')
  return `${y}-${m}-${d}`
}

function parseDuration(text: string): number | null {
  const m = DURATION.exec(text)
  if (!m) return null
  if (m[3]) return Number(m[3])
  return Number(m[1]) * 60 + Number(m[2] ?? 0)
}

function parseDistance(text: string): number | null {
  const m = DISTANCE.exec(text)
  return m ? Number(m[1].replace(',', '.')) : null
}

/** Valeur JSON scalaire en texte (objets et tableaux ignorés) */
function scalarText(value: unknown): string {
  return typeof value === 'string' || typeof value === 'number' ? String(value) : ''
}

function fromJson(raw: unknown): PlanParseResult {
  const list = Array.isArray(raw) ? raw : (raw as { sessions?: unknown[] })?.sessions
  if (!Array.isArray(list)) return { ok: false, error: 'invalid_json' }
  const entries: ImportedPlanEntry[] = []
  for (const item of list as Record<string, unknown>[]) {
    const date = scalarText(item.date)
    if (!isValidDate(date)) return { ok: false, error: 'invalid_date' }
    const title =
      (scalarText(item.title) || scalarText(item.name) || scalarText(item.type)).trim() || 'Séance'
    const duration = item.duration_minutes ?? item.durationMinutes ?? item.duration
    const distance = item.distance_km ?? item.distanceKm ?? item.distance
    entries.push({
      date,
      title: title.slice(0, 200),
      targetDurationMinutes:
        typeof duration === 'number' ? Math.round(duration) : parseDuration(scalarText(duration)),
      targetDistanceKm:
        typeof distance === 'number' ? distance : parseDistance(scalarText(distance)),
      notes: typeof item.notes === 'string' ? item.notes : null,
    })
  }
  return entries.length > 0 ? { ok: true, entries } : { ok: false, error: 'no_entries' }
}

/**
 * H3 · Plan rédigé dans Claude : JSON (`[{ date, title, duration_minutes,
 * distance_km, notes }]`) ou liste Markdown, une séance par ligne commençant
 * par une date : « - 2026-03-02 : Footing 45 min 8 km (au seuil) ».
 */
export function parseImportedPlan(input: string): PlanParseResult {
  const text = input.trim()
  if (!text) return { ok: false, error: 'empty' }

  if (text.startsWith('[') || text.startsWith('{')) {
    try {
      return fromJson(JSON.parse(text))
    } catch {
      return { ok: false, error: 'invalid_json' }
    }
  }

  const entries: ImportedPlanEntry[] = []
  for (const rawLine of text.split('\n')) {
    const line = rawLine
      .replace(/^\s*(?:[-*]|\d+\.)\s*/, '')
      .replace(/\*\*/g, '')
      .trim()
    const dateMatch = LINE_DATE.exec(line)
    if (!dateMatch) continue
    const date = toIso(dateMatch[1])
    if (!isValidDate(date)) return { ok: false, error: 'invalid_date' }
    const rest = line.slice(dateMatch[1].length).replace(/^\s*[:\-–—|]\s*/, '')
    const notesMatch = /\(([^)]*)\)\s*$/.exec(rest)
    const title = (notesMatch ? rest.slice(0, notesMatch.index) : rest).trim() || 'Séance'
    entries.push({
      date,
      title: title.slice(0, 200),
      targetDurationMinutes: parseDuration(rest),
      targetDistanceKm: parseDistance(rest),
      notes: notesMatch ? notesMatch[1].trim() : null,
    })
  }
  return entries.length > 0 ? { ok: true, entries } : { ok: false, error: 'no_entries' }
}
