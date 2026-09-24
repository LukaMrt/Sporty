import { execSync } from 'node:child_process'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..')

const env: NodeJS.ProcessEnv = {
  ...process.env,
  NODE_ENV: 'test',
  DB_DATABASE: 'sporty_e2e',
  DB_HOST: process.env.DB_HOST ?? 'localhost',
  DB_PORT: process.env.DB_PORT ?? '5432',
  DB_USER: process.env.DB_USER ?? 'sporty',
  DB_PASSWORD: process.env.DB_PASSWORD ?? 'sporty',
  APP_KEY: process.env.APP_KEY ?? 'kDvkrhtbc8N2L0ftV-wQbX4Msfce8-IrF4AsJwtJ4do',
  LOG_LEVEL: 'error',
  SESSION_DRIVER: 'cookie',
  TZ: 'UTC',
}

/** Sortie des commandes Ace affichée uniquement en cas d'échec */
function run(cmd: string) {
  try {
    execSync(cmd, { cwd: root, env, stdio: 'pipe' })
  } catch (error) {
    const { stdout, stderr } = error as { stdout?: Buffer; stderr?: Buffer }
    const output = `${stdout?.toString() ?? ''}${stderr?.toString() ?? ''}`
    process.stderr.write(`[e2e] Échec : ${cmd}\n${output}\n`)
    throw error
  }
}

export default async function globalSetup() {
  run('node ace migration:run --force')
  run('node ace db:truncate --force')
  run('node ace db:seed')
}
