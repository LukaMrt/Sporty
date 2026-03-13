/**
 * Reencrypt Strava tokens from prod key to dev key.
 *
 * Usage (mode manuel):
 *   node scripts/reencrypt_tokens.mjs
 *
 * Usage (mode semi-auto — fetch depuis la DB):
 *   node scripts/reencrypt_tokens.mjs --db
 */

import { createCipheriv, createDecipheriv, randomBytes, scryptSync } from 'node:crypto'
import { createInterface } from 'node:readline/promises'
import { stdin as input, stdout as output } from 'node:process'

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 12
const AUTH_TAG_LENGTH = 16
const KEY_LENGTH = 32
const SALT = 'sporty-connector-salt'

// ── Crypto ────────────────────────────────────────────────────────────────────

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

// ── Readline helpers ──────────────────────────────────────────────────────────

const rl = createInterface({ input, output })

async function ask(question) {
  const answer = await rl.question(question)
  return answer.trim()
}

/** Masque la saisie (affiche des *) pour les secrets */
function askSecret(question) {
  return new Promise((resolve) => {
    output.write(question)
    let value = ''

    // Fallback simple si le terminal ne supporte pas le raw mode
    if (!input.isTTY) {
      rl.once('line', (line) => resolve(line.trim()))
      return
    }

    input.setRawMode(true)
    input.resume()
    input.setEncoding('utf8')

    const onData = (char) => {
      if (char === '\r' || char === '\n') {
        input.setRawMode(false)
        input.pause()
        input.removeListener('data', onData)
        output.write('\n')
        resolve(value)
      } else if (char === '\u0003') {
        // Ctrl+C
        output.write('\n')
        process.exit(0)
      } else if (char === '\u007F') {
        // Backspace
        if (value.length > 0) {
          value = value.slice(0, -1)
          output.write('\b \b')
        }
      } else {
        value += char
        output.write('*')
      }
    }

    input.on('data', onData)
  })
}

// ── Mode semi-auto : fetch depuis la DB ───────────────────────────────────────

async function fetchFromDb() {
  const { default: pg } = await import('pg')
  const { Client } = pg

  console.log('\n── Connexion à la base de données ──\n')

  const useUrl = (await ask('Utiliser une URL de connexion ? (o/n) : ')).toLowerCase() === 'o'

  let client
  if (useUrl) {
    const connectionString = await ask('URL de connexion (ex: postgresql://user:pass@host/db) : ')
    client = new Client({ connectionString })
  } else {
    const host = await ask('Host : ')
    const port = (await ask('Port [5432] : ')) || '5432'
    const database = await ask('Base de données : ')
    const user = await ask('Utilisateur : ')
    const password = await askSecret('Mot de passe : ')
    client = new Client({ host, port: parseInt(port), database, user, password })
  }

  await client.connect()
  console.log('✓ Connecté\n')

  const connectorId = await ask('ID du connector à re-chiffrer : ')

  const result = await client.query(
    'SELECT encrypted_access_token, encrypted_refresh_token FROM connectors WHERE id = $1',
    [connectorId]
  )

  await client.end()

  if (result.rows.length === 0) {
    console.error(`Aucun connector trouvé avec l'id ${connectorId}`)
    process.exit(1)
  }

  const { encrypted_access_token, encrypted_refresh_token } = result.rows[0]
  console.log('\n✓ Tokens récupérés depuis la DB\n')

  return { encryptedAccess: encrypted_access_token, encryptedRefresh: encrypted_refresh_token }
}

// ── Mode manuel ───────────────────────────────────────────────────────────────

async function fetchManual() {
  console.log('\n── Tokens chiffrés (format iv:enc:tag) ──\n')
  const encryptedAccess = await ask('encrypted_access_token : ')
  const encryptedRefresh = await ask('encrypted_refresh_token : ')
  return { encryptedAccess, encryptedRefresh }
}

// ── Main ──────────────────────────────────────────────────────────────────────

const isDbMode = process.argv.includes('--db')

console.log(
  `\n=== Re-chiffrement de tokens Strava (mode ${isDbMode ? 'semi-auto DB' : 'manuel'}) ===`
)

const { encryptedAccess, encryptedRefresh } = isDbMode ? await fetchFromDb() : await fetchManual()

console.log('\n── Clés de chiffrement ──\n')
const prodKeyRaw = await askSecret('Clé de chiffrement PROD : ')
const devKeyRaw = await askSecret('Clé de chiffrement DEV  : ')

rl.close()

const prodKey = deriveKey(prodKeyRaw)
const devKey = deriveKey(devKeyRaw)

const accessToken = decrypt(encryptedAccess, prodKey)
const refreshToken = decrypt(encryptedRefresh, prodKey)

const newAccess = encrypt(accessToken, devKey)
const newRefresh = encrypt(refreshToken, devKey)

console.log('\n── Valeurs re-chiffrées pour ta DB locale ──\n')
console.log(`encrypted_access_token:  ${newAccess}`)
console.log(`encrypted_refresh_token: ${newRefresh}`)
console.log('\n── SQL à exécuter en local ──\n')
console.log(`UPDATE connectors SET`)
console.log(`  encrypted_access_token = '${newAccess}',`)
console.log(`  encrypted_refresh_token = '${newRefresh}'`)
console.log(`WHERE id = <CONNECTOR_ID>;`)
console.log()
