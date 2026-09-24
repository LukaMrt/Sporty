import { createHmac, timingSafeEqual } from 'node:crypto'
import { WebhookVerifier } from '#domain/interfaces/webhook_verifier'

/** Tolérance d'horloge sur l'horodatage signé (protection contre le rejeu) */
const TOLERANCE_SECONDS = 5 * 60

/**
 * Signature Svix (utilisée par Open Wearables) :
 * base64(HMAC-SHA256(secret, `${id}.${timestamp}.${body}`)), en-tête
 * `svix-signature` = liste « v1,<signature> » séparée par des espaces.
 */
export class SvixWebhookVerifier extends WebhookVerifier {
  constructor(
    private secret: string | undefined,
    private now: () => number = Date.now
  ) {
    super()
  }

  isConfigured(): boolean {
    return Boolean(this.secret)
  }

  verify(rawBody: string, headers: Record<string, string | undefined>): boolean {
    if (!this.secret) return false
    const id = headers['svix-id']
    const timestamp = headers['svix-timestamp']
    const signatures = headers['svix-signature']
    if (!id || !timestamp || !signatures) return false

    const ts = Number(timestamp)
    if (!Number.isFinite(ts) || Math.abs(this.now() / 1000 - ts) > TOLERANCE_SECONDS) return false

    const key = Buffer.from(this.secret.replace(/^whsec_/, ''), 'base64')
    const expected = createHmac('sha256', key).update(`${id}.${timestamp}.${rawBody}`).digest()

    return signatures.split(' ').some((entry) => {
      const [version, signature] = entry.split(',')
      if (version !== 'v1' || !signature) return false
      const received = Buffer.from(signature, 'base64')
      return received.length === expected.length && timingSafeEqual(received, expected)
    })
  }
}
