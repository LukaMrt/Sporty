import { inject } from '@adonisjs/core'
import type { HttpContext } from '@adonisjs/core/http'
import logger from '@adonisjs/core/services/logger'
import GetConnectorStatus from '#use_cases/connectors/get_connector_status'
import DisconnectConnector from '#use_cases/connectors/disconnect_connector'
import ListPreImportSessions, {
  ConnectorNotConnectedError,
} from '#use_cases/import/list_pre_import_sessions'
import GetStagedSessions from '#use_cases/import/get_staged_sessions'
import BackfillConnector from '#use_cases/connectors/backfill_connector'
import type { ImportSessionStatus } from '#domain/value_objects/import_session_status'
import { describeProvider } from '#domain/value_objects/connector_descriptor'
import { isProviderConfigured } from '#lib/connector_config'

type RawSessionData = {
  name?: string
  sportSlug?: string
  date?: string
  distanceKm?: number | null
  durationMinutes?: number
}

type StagingSessionDto = {
  id: number
  externalId: string
  status: ImportSessionStatus
  date: string
  name: string
  sportType: string
  durationMinutes: number
  distanceKm: number | null
}

function toStagingDto(record: {
  id: number
  externalId: string
  status: ImportSessionStatus
  rawData: Record<string, unknown> | null
}): StagingSessionDto {
  const raw = (record.rawData ?? {}) as unknown as RawSessionData
  return {
    id: record.id,
    externalId: record.externalId,
    status: record.status,
    date: raw.date ?? '',
    name: raw.name ?? record.externalId,
    sportType: raw.sportSlug ?? '',
    durationMinutes: raw.durationMinutes ?? 0,
    distanceKm: raw.distanceKm ?? null,
  }
}

@inject()
export default class ConnectorController {
  constructor(
    private getConnectorStatus: GetConnectorStatus,
    private disconnectConnector: DisconnectConnector,
    private listPreImportSessions: ListPreImportSessions,
    private getStagedSessions: GetStagedSessions,
    private backfillConnector: BackfillConnector
  ) {}

  async show({ inertia, auth, request, params, response, i18n }: HttpContext) {
    const provider = this.getConnectorStatus.resolveProvider(params.provider)
    if (!provider) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    const userId = auth.user!.id
    const status = await this.getConnectorStatus.getStatus(userId, provider)
    const configured = isProviderConfigured(provider)

    const { after: afterParam, before: beforeParam } = request.qs() as {
      after?: string
      before?: string
    }
    const after = afterParam ? new Date(afterParam) : undefined
    const before = beforeParam ? new Date(beforeParam) : undefined

    const settings = await this.getConnectorStatus.getSettings(userId, provider)
    const basePayload = {
      provider,
      authKind: describeProvider(provider).authKind,
      status,
      configured,
      initialAfter: afterParam,
      initialBefore: beforeParam,
      autoImportEnabled: settings?.autoImportEnabled ?? false,
      pollingIntervalMinutes: settings?.pollingIntervalMinutes ?? 15,
    }

    try {
      const records = await this.listPreImportSessions.execute({ userId, provider, after, before })
      return inertia.render('Connectors/Show', {
        ...basePayload,
        sessions: records.map(toStagingDto),
        connectorError: false,
      })
    } catch (error) {
      if (!(error instanceof ConnectorNotConnectedError)) throw error

      // En etat error : on montre le staging deja present sans appeler l'API,
      // avec le bouton import desactive (AC#2 story 10.1)
      const connectorError = status === 'error'
      let sessions: StagingSessionDto[] | null = null
      if (connectorError) {
        const records = await this.getStagedSessions.execute(userId, provider)
        sessions = records.map(toStagingDto)
      }

      return inertia.render('Connectors/Show', {
        ...basePayload,
        sessions,
        connectorError,
      })
    }
  }

  async disconnect({ response, auth, session, params, i18n }: HttpContext) {
    const provider = this.getConnectorStatus.resolveProvider(params.provider)
    if (!provider) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }

    await this.disconnectConnector.execute({ userId: auth.user!.id, provider })
    session.flash(
      'success',
      i18n.t(`connectors.${describeProvider(provider).i18nKey}.disconnected`)
    )

    return response.redirect('/connectors')
  }

  /**
   * POST /connectors/:provider/backfill — import de l'historique (A3) en tâche
   * de fond : séances mises en staging et métriques de récupération.
   */
  async backfill({ response, auth, session, params, i18n }: HttpContext) {
    const provider = this.getConnectorStatus.resolveProvider(params.provider)
    if (!provider) {
      return response.abort(i18n.t('connectors.settings.providerNotFound'), 404)
    }
    const userId = auth.user!.id
    setImmediate(() => {
      this.backfillConnector.execute(userId, provider).catch((error: unknown) => {
        logger.error({ err: error, userId, provider }, 'Connector backfill failed')
      })
    })
    session.flash('success', i18n.t('connectors.backfill.started'))
    return response.redirect().back()
  }
}
