import { inject } from '@adonisjs/core'
import { SessionRepository } from '#domain/interfaces/session_repository'
import { TrainingLoadCalculator } from '#domain/interfaces/training_load_calculator'
import { EventEmitter } from '#domain/interfaces/event_emitter'
import type { MappedSessionData, MappingContext } from '#domain/interfaces/connector'
import type { UserProfile } from '#domain/entities/user_profile'
import type { TrainingSession } from '#domain/entities/training_session'
import type { SportSummary } from '#domain/interfaces/sport_repository'
import { deriveSessionFields } from '#domain/services/session_derived_fields'
import { findDuplicateSession } from '#domain/services/session_deduplication'

export type WriteImportedSessionResult =
  | { kind: 'created'; session: TrainingSession }
  | { kind: 'unsupported_sport'; sportSlug: string }
  | { kind: 'duplicate'; existingSessionId: number }

/**
 * Écriture d'une séance issue d'un connecteur, partagée par l'import manuel
 * (`ImportSessions`) et la synchronisation automatique (`SyncConnector`).
 */
@inject()
export default class ImportedSessionWriter {
  constructor(
    private sessionRepository: SessionRepository,
    private loadCalculator: TrainingLoadCalculator,
    private eventEmitter: EventEmitter
  ) {}

  static mappingContext(profile: UserProfile | null): MappingContext {
    return {
      maxHeartRate: profile?.maxHeartRate ?? undefined,
      restingHeartRate: profile?.restingHeartRate ?? undefined,
      hrZonesConfig: profile?.hrZonesConfig ?? undefined,
    }
  }

  async write(
    userId: number,
    mapped: MappedSessionData,
    sports: SportSummary[],
    profile: UserProfile | null
  ): Promise<WriteImportedSessionResult> {
    const sport = sports.find((s) => s.slug === mapped.sportSlug)
    if (!sport) return { kind: 'unsupported_sport', sportSlug: mapped.sportSlug }

    // Même sortie déjà importée depuis un AUTRE provider (montre synchronisée
    // vers Strava et vers Open Wearables) : ne pas compter deux fois la charge.
    const sameDay = await this.sessionRepository.findByUserIdAndDateRange(
      userId,
      mapped.date,
      mapped.date
    )
    const duplicate = findDuplicateSession(
      { ...mapped, sportId: sport.id },
      sameDay.filter((s) => s.importedFrom !== mapped.importedFrom)
    )
    if (duplicate) return { kind: 'duplicate', existingSessionId: duplicate.id }

    const derived = deriveSessionFields(
      {
        durationMinutes: mapped.durationMinutes,
        distanceKm: mapped.distanceKm,
        avgHeartRate: mapped.avgHeartRate,
        perceivedEffort: mapped.perceivedEffort ?? null,
        sportMetrics: mapped.sportMetrics,
        sportSlug: sport.slug,
      },
      profile,
      this.loadCalculator
    )

    const session = await this.sessionRepository.create({
      userId,
      sportId: sport.id,
      date: mapped.date,
      durationMinutes: mapped.durationMinutes,
      distanceKm: mapped.distanceKm,
      avgHeartRate: mapped.avgHeartRate,
      perceivedEffort: mapped.perceivedEffort ?? null,
      sportMetrics: derived.sportMetrics,
      notes: null,
      importedFrom: mapped.importedFrom,
      externalId: mapped.externalId,
      trainingLoad: derived.trainingLoad,
      loadMethod: derived.loadMethod,
      analysis: derived.analysis,
      trackPreview: derived.trackPreview,
    })

    await this.eventEmitter.emit('session:completed', { sessionId: session.id, userId })
    return { kind: 'created', session }
  }
}
