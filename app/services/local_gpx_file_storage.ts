import { writeFile, mkdir, rename, readFile, rm, readdir, stat } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join, resolve, sep } from 'node:path'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

const LOGICAL_PREFIX = 'storage/'
const UUID_RE = /^[0-9a-f-]{36}$/i

/**
 * Stockage GPX sur disque local.
 * `root` correspond au dossier `storage/` (configurable via `STORAGE_PATH`
 * pour pouvoir le monter en volume Docker).
 */
export class LocalGpxFileStorage extends GpxFileStorage {
  constructor(private root: string) {
    super()
  }

  async saveTempFile(content: Buffer, userId: number): Promise<string> {
    const tempId = randomUUID()
    const dir = this.#tmpDir(userId)
    await mkdir(dir, { recursive: true })
    await writeFile(join(dir, `${tempId}.gpx`), content)
    return tempId
  }

  async readTempFile(tempId: string, userId: number): Promise<Buffer> {
    return readFile(this.#tmpFile(tempId, userId))
  }

  async moveTempFile(tempId: string, userId: number, sessionId: number): Promise<string> {
    const destDir = join(this.root, 'gpx', String(userId))
    await mkdir(destDir, { recursive: true })
    await rename(this.#tmpFile(tempId, userId), join(destDir, `${sessionId}.gpx`))
    return `${LOGICAL_PREFIX}gpx/${userId}/${sessionId}.gpx`
  }

  async saveFile(content: Buffer, userId: number, sessionId: number): Promise<string> {
    const destDir = join(this.root, 'gpx', String(userId))
    await mkdir(destDir, { recursive: true })
    await writeFile(join(destDir, `${sessionId}.gpx`), content)
    return `${LOGICAL_PREFIX}gpx/${userId}/${sessionId}.gpx`
  }

  async deleteFile(path: string): Promise<void> {
    await rm(this.#resolveLogical(path), { force: true })
  }

  async deleteAllForUser(userId: number): Promise<void> {
    await rm(join(this.root, 'gpx', String(userId)), { recursive: true, force: true })
    await rm(this.#tmpDir(userId), { recursive: true, force: true })
  }

  async purgeTempFiles(maxAgeMs: number): Promise<number> {
    const tmpRoot = join(this.root, 'gpx', 'tmp')
    const threshold = Date.now() - maxAgeMs
    let removed = 0
    const walk = async (dir: string): Promise<void> => {
      let entries
      try {
        entries = await readdir(dir, { withFileTypes: true })
      } catch {
        return // dossier absent : rien à purger
      }
      for (const entry of entries) {
        const full = join(dir, entry.name)
        if (entry.isDirectory()) {
          await walk(full)
        } else if ((await stat(full)).mtimeMs < threshold) {
          await rm(full, { force: true })
          removed++
        }
      }
    }
    await walk(tmpRoot)
    return removed
  }

  #tmpDir(userId: number): string {
    return join(this.root, 'gpx', 'tmp', String(userId))
  }

  #tmpFile(tempId: string, userId: number): string {
    // L'identifiant vient du client : on refuse tout ce qui n'est pas un UUID (path traversal)
    if (!UUID_RE.test(tempId)) throw new Error('Invalid GPX temp id')
    return join(this.#tmpDir(userId), `${tempId}.gpx`)
  }

  #resolveLogical(path: string): string {
    const relative = path.startsWith(LOGICAL_PREFIX) ? path.slice(LOGICAL_PREFIX.length) : path
    const full = resolve(this.root, relative)
    if (!full.startsWith(resolve(this.root) + sep)) throw new Error('Path outside storage root')
    return full
  }
}
