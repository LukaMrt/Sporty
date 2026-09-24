import logger from '@adonisjs/core/services/logger'
import { Logger } from '#domain/interfaces/logger'

export class AdonisLogger extends Logger {
  info(context: Record<string, unknown>, message: string): void {
    logger.info(context, message)
  }

  warn(context: Record<string, unknown>, message: string): void {
    logger.warn(context, message)
  }

  error(context: Record<string, unknown>, message: string): void {
    logger.error(context, message)
  }
}
