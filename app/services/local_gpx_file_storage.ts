import { writeFile, mkdir, rename } from 'node:fs/promises'
import { randomUUID } from 'node:crypto'
import { join } from 'node:path'
import app from '@adonisjs/core/services/app'
import { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

export class LocalGpxFileStorage extends GpxFileStorage {
  async saveTempFile(content: Buffer): Promise<string> {
    const tempId = randomUUID()
    const tmpDir = app.makePath('storage', 'gpx', 'tmp')
    await mkdir(tmpDir, { recursive: true })
    await writeFile(join(tmpDir, `${tempId}.gpx`), content)
    return tempId
  }

  async moveTempFile(tempId: string, userId: number, sessionId: number): Promise<string> {
    const src = app.makePath('storage', 'gpx', 'tmp', `${tempId}.gpx`)
    const destDir = app.makePath('storage', 'gpx', String(userId))
    await mkdir(destDir, { recursive: true })
    const dest = join(destDir, `${sessionId}.gpx`)
    await rename(src, dest)
    return `storage/gpx/${userId}/${sessionId}.gpx`
  }

  async saveFile(content: Buffer, userId: number, sessionId: number): Promise<string> {
    const destDir = app.makePath('storage', 'gpx', String(userId))
    await mkdir(destDir, { recursive: true })
    const dest = join(destDir, `${sessionId}.gpx`)
    await writeFile(dest, content)
    return `storage/gpx/${userId}/${sessionId}.gpx`
  }
}
