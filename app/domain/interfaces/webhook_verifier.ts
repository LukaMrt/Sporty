/** Vérification de la signature d'un webhook entrant */
export abstract class WebhookVerifier {
  /** Le secret est-il configuré ? Sans lui, les webhooks sont refusés. */
  abstract isConfigured(): boolean
  abstract verify(rawBody: string, headers: Record<string, string | undefined>): boolean
}
