export abstract class GpxFileStorage {
  abstract saveTempFile(content: Buffer): Promise<string>
  abstract moveTempFile(tempId: string, userId: number, sessionId: number): Promise<string>
  abstract saveFile(content: Buffer, userId: number, sessionId: number): Promise<string>
}
