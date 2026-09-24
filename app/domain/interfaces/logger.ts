/**
 * Port de journalisation : permet aux use cases de tracer les erreurs
 * sans dépendre du logger d'AdonisJS.
 */
export abstract class Logger {
  abstract info(context: Record<string, unknown>, message: string): void
  abstract warn(context: Record<string, unknown>, message: string): void
  abstract error(context: Record<string, unknown>, message: string): void
}
