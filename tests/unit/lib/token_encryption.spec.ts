import { test } from '@japa/runner'
import { TokenEncryption } from '#lib/token_encryption'

test.group('TokenEncryption', () => {
  const KEY = 'test-secret-key-for-sporty-tests!'

  test('chiffre et déchiffre une valeur correctement', ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    const plaintext = 'my-access-token-12345'
    const encrypted = svc.encrypt(plaintext)
    const decrypted = svc.decrypt(encrypted)
    assert.equal(decrypted, plaintext)
  })

  test('le format chiffré est base64(iv):base64(ciphertext):base64(authTag)', ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    const encrypted = svc.encrypt('hello')
    const parts = encrypted.split(':')
    assert.lengthOf(parts, 3)
    // Chaque partie est un base64 valide (pas vide)
    for (const part of parts) {
      assert.isTrue(part.length > 0)
      assert.doesNotThrow(() => Buffer.from(part, 'base64'))
    }
  })

  test("l'IV est unique à chaque opération de chiffrement", ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    const enc1 = svc.encrypt('same-value')
    const enc2 = svc.encrypt('same-value')
    assert.notEqual(enc1, enc2)
    // Mais les deux se déchiffrent en la même valeur
    assert.equal(svc.decrypt(enc1), 'same-value')
    assert.equal(svc.decrypt(enc2), 'same-value')
  })

  test('lève une erreur si le ciphertext est altéré', ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    const encrypted = svc.encrypt('sensitive-token')
    // On altère la partie ciphertext
    const parts = encrypted.split(':')
    parts[1] = Buffer.from('tampered').toString('base64')
    const tampered = parts.join(':')
    assert.throws(() => svc.decrypt(tampered))
  })

  test('lève une erreur si le format est invalide', ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    assert.throws(() => svc.decrypt('invalid-format'))
  })

  test('chiffre des tokens longs (> 256 chars)', ({ assert }) => {
    const svc = new TokenEncryption(KEY)
    const longToken = 'a'.repeat(512)
    const encrypted = svc.encrypt(longToken)
    assert.equal(svc.decrypt(encrypted), longToken)
  })
})
