export const SPORT_ICONS: Record<string, string> = {
  running: '🏃',
  cycling: '🚴',
  swimming: '🏊',
  walking: '🚶',
  hiking: '🥾',
  strength: '🏋️',
}

export function sportIcon(slug: string): string {
  return SPORT_ICONS[slug] ?? '⚡'
}
