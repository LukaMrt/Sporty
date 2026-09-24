import type { GpxFileStorage } from '#domain/interfaces/gpx_file_storage'

export function makeMockGpxFileStorage(overrides: Partial<GpxFileStorage> = {}): GpxFileStorage {
  return {
    saveTempFile: async () => 'temp-id',
    readTempFile: async () => Buffer.from(''),
    moveTempFile: async () => 'storage/gpx/42/1.gpx',
    saveFile: async () => 'storage/gpx/42/1.gpx',
    deleteFile: async () => {},
    deleteAllForUser: async () => {},
    purgeTempFiles: async () => 0,
    ...overrides,
  }
}
