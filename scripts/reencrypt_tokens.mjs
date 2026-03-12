/**
 * Reencrypt Strava tokens from prod key to dev key.
 *
 * Usage:
 *   PROD_KEY="..." DEV_KEY="..." \
 *   ENCRYPTED_ACCESS="iv:enc:tag" ENCRYPTED_REFRESH="iv:enc:tag" \
 *   node scripts/reencrypt_tokens.mjs
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const SALT = 'sporty-connector-salt'

function deriveKey(rawKey) {
  return scryptSync(rawKey, SALT, KEY_LENGTH)
}

function decrypt(ciphertext, key) {
  const [ivB64, encryptedB64, authTagB64] = ciphertext.split(':')
  const iv = Buffer.from(ivB64, 'base64')
  const encrypted = Buffer.from(encryptedB64, 'base64')
  const authTag = Buffer.from(authTagB64, 'base64')
  const decipher = createDecipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  decipher.setAuthTag(authTag)
  return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
}

function encrypt(plaintext, key) {
  const iv = randomBytes(IV_LENGTH)
  const cipher = createCipheriv(ALGORITHM, key, iv, { authTagLength: AUTH_TAG_LENGTH })
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
  const authTag = cipher.getAuthTag()
  return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`
}

const { PROD_KEY, DEV_KEY, ENCRYPTED_ACCESS, ENCRYPTED_REFRESH } = process.env

if (!PROD_KEY || !DEV_KEY || !ENCRYPTED_ACCESS || !ENCRYPTED_REFRESH) {
  console.error('Missing env vars. Set PROD_KEY, DEV_KEY, ENCRYPTED_ACCESS, ENCRYPTED_REFRESH')
  process.exit(1)
}

const prodKey = deriveKey(PROD_KEY)
const devKey = deriveKey(DEV_KEY)

const accessToken = decrypt(ENCRYPTED_ACCESS, prodKey)
const refreshToken = decrypt(ENCRYPTED_REFRESH, prodKey)

const newAccess = encrypt(accessToken, devKey)
const newRefresh = encrypt(refreshToken, devKey)

console.log('\n-- Valeurs re-chiffrées pour ta DB locale --\n')
console.log(`encrypted_access_token:  ${newAccess}`)
console.log(`encrypted_refresh_token: ${newRefresh}`)
console.log('\n-- SQL à exécuter en local --\n')
console.log(`UPDATE connectors SET`)
console.log(`  encrypted_access_token = '${newAccess}',`)
console.log(`  encrypted_refresh_token = '${newRefresh}'`)
console.log(`WHERE id = <CONNECTOR_ID>;`)
