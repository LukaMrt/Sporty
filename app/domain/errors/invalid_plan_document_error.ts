import type { PlanDocError } from '#domain/services/plan_document'

/** Document de plan (JSON Claude) invalide : toutes les erreurs, avec leur chemin */
export class InvalidPlanDocumentError extends Error {
  readonly i18nKey = 'planning.editor.errors.invalidDocument'

  constructor(readonly errors: PlanDocError[]) {
    super('Document de plan invalide')
    this.name = 'InvalidPlanDocumentError'
  }
}
