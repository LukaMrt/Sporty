import { test } from '@japa/runner'
import {
  encodeExternalId,
  decodeExternalId,
} from '#connectors/open_wearables/open_wearables_external_id'

test.group('open-wearables externalId', () => {
  test('round-trip encode/decode', ({ assert }) => {
    const id = encodeExternalId('2026-08-07T10:24:14+02:00', 'hiking')
    const decoded = decodeExternalId(id)

    assert.isNotNull(decoded)
    assert.equal(decoded!.type, 'hiking')
    assert.equal(decoded!.startUtc.toISOString(), '2026-08-07T08:24:14.000Z')
  })

  test('stable quel que soit l offset representant le meme instant', ({ assert }) => {
    const withOffset = encodeExternalId('2026-08-07T10:24:14+02:00', 'hiking')
    const inUtc = encodeExternalId('2026-08-07T08:24:14Z', 'hiking')

    assert.equal(withOffset, inUtc)
  })

  test('prefixe ow: pour ne pas entrer en collision avec un id Strava', ({ assert }) => {
    const id = encodeExternalId('2026-08-07T10:24:14+02:00', 'running')

    assert.isTrue(id.startsWith('ow:'))
    assert.isNull(decodeExternalId('17696043236'), 'un id Strava numerique n est pas decodable')
  })

  test('les millisecondes ne changent pas la cle', ({ assert }) => {
    const a = encodeExternalId('2026-08-07T08:24:14.000Z', 'running')
    const b = encodeExternalId('2026-08-07T08:24:14.999Z', 'running')

    assert.equal(a, b.replace('.999', ''))
    assert.isFalse(a.includes('.'))
  })

  test('types differents donnent des cles differentes', ({ assert }) => {
    const running = encodeExternalId('2026-08-07T08:24:14Z', 'running')
    const hiking = encodeExternalId('2026-08-07T08:24:14Z', 'hiking')

    assert.notEqual(running, hiking)
  })

  test('rejette une date invalide', ({ assert }) => {
    assert.throws(() => encodeExternalId('pas-une-date', 'running'))
  })

  test('decode rejette les formes malformees', ({ assert }) => {
    assert.isNull(decodeExternalId('ow:sans-separateur'))
    assert.isNull(decodeExternalId('ow:2026-08-07T08:24:14Z|'))
    assert.isNull(decodeExternalId('ow:pas-une-date|running'))
    assert.isNull(decodeExternalId(''))
  })

  test('un type contenant un pipe reste decodable', ({ assert }) => {
    const id = encodeExternalId('2026-08-07T08:24:14Z', 'strength|training')
    assert.equal(decodeExternalId(id)!.type, 'strength|training')
  })
})
