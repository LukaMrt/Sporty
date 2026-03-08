import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32

function deriveKey(rawKey: string): Buffer {
  return scryptSync(rawKey, 'sporty-connector-salt', KEY_LENGTH)
}

export class TokenEncryption {
  private key: Buffer

  constructor(encryptionKey: string) {
    this.key = deriveKey(encryptionKey)
  }

  encrypt(plaintext: string): string {
    const iv = randomBytes(IV_LENGTH)
    const cipher = createCipheriv(ALGORITHM, this.key, iv, { authTagLength: AUTH_TAG_LENGTH })
    const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()])
    const authTag = cipher.getAuthTag()
    return `${iv.toString('base64')}:${encrypted.toString('base64')}:${authTag.toString('base64')}`
  }

  decrypt(ciphertext: string): string {
    const [ivB64, encryptedB64, authTagB64] = ciphertext.split(':')
    if (!ivB64 || !encryptedB64 || !authTagB64) {
      throw new Error('Invalid ciphertext format')
    }
    const iv = Buffer.from(ivB64, 'base64')
    const encrypted = Buffer.from(encryptedB64, 'base64')
    const authTag = Buffer.from(authTagB64, 'base64')
    const decipher = createDecipheriv(ALGORITHM, this.key, iv, { authTagLength: AUTH_TAG_LENGTH })
    decipher.setAuthTag(authTag)
    return decipher.update(encrypted).toString('utf8') + decipher.final('utf8')
  }
}
