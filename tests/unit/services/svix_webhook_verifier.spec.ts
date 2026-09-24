import { test } from '@japa/runner'
import { createHmac } from 'node:crypto'
import { SvixWebhookVerifier } from '#services/svix_webhook_verifier'

const SECRET_BYTES = Buffer.from('super-secret-key-for-tests')
const SECRET = `whsec_${SECRET_BYTES.toString('base64')}`
const NOW = 1_780_000_000_000

function sign(id: string, ts: number, body: string) {
  return createHmac('sha256', SECRET_BYTES).update(`${id}.${ts}.${body}`).digest('base64')
}

test.group('SvixWebhookVerifier', () => {
  const verifier = new SvixWebhookVerifier(SECRET, () => NOW)
  const body = '{"type":"workout.created"}'
  const ts = NOW / 1000

  test('signature valide acceptée (parmi plusieurs)', ({ assert }) => {
    const headers = {
      'svix-id': 'msg_1',
      'svix-timestamp': String(ts),
      'svix-signature': `v1,invalid v1,${sign('msg_1', ts, body)}`,
    }
    assert.isTrue(verifier.verify(body, headers))
  })

  test('corps modifié, horodatage trop ancien ou secret absent → refus', ({ assert }) => {
    const good = {
      'svix-id': 'msg_1',
      'svix-timestamp': String(ts),
      'svix-signature': `v1,${sign('msg_1', ts, body)}`,
    }
    assert.isFalse(verifier.verify(`${body} `, good))
    const old = ts - 3600
    assert.isFalse(
      verifier.verify(body, {
        ...good,
        'svix-timestamp': String(old),
        'svix-signature': `v1,${sign('msg_1', old, body)}`,
      })
    )
    assert.isFalse(new SvixWebhookVerifier(undefined).verify(body, good))
  })
})
