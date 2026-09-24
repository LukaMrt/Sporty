/**
 * Stockage des fichiers GPX.
 * Les chemins renvoyés sont logiques (`storage/gpx/<userId>/<sessionId>.gpx`) :
 * l'implémentation les résout par rapport à sa racine physique.
 */
export abstract class GpxFileStorage {
  /** Fichier temporaire, cloisonné par utilisateur ; renvoie un identifiant opaque */
  abstract saveTempFile(content: Buffer, userId: number): Promise<string>
  abstract readTempFile(tempId: string, userId: number): Promise<Buffer>
  abstract moveTempFile(tempId: string, userId: number, sessionId: number): Promise<string>
  abstract saveFile(content: Buffer, userId: number, sessionId: number): Promise<string>
  abstract deleteFile(path: string): Promise<void>
  abstract deleteAllForUser(userId: number): Promise<void>
  /** Supprime les fichiers temporaires plus vieux que `maxAgeMs` ; renvoie le nombre supprimé */
  abstract purgeTempFiles(maxAgeMs: number): Promise<number>
}
