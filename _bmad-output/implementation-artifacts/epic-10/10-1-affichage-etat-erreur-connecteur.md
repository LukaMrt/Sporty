# Story 10.1 : Affichage etat erreur connecteur

Status: review

## Story

As a **utilisateur avec un connecteur en erreur**,
I want **voir clairement que mon connecteur a un probleme et pouvoir agir**,
so that **je ne suis jamais dans le doute sur l'etat de mes imports** (FR23).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `error` **When** je suis sur la page Connecteurs **Then** badge orange "Erreur" avec message explicatif et bouton "Reconnecter"
2. **Given** mon connecteur est en etat `error` **When** j'accede a la page Import **Then** bandeau d'avertissement en haut avec lien vers Connecteurs, activites en staging visibles, bouton Importer desactive
3. **Given** l'API Strava est temporairement indisponible (500/503) **When** des erreurs repetees surviennent **Then** le connecteur ne passe PAS en `error`, retry au prochain cycle
4. **Given** le token est invalide (401 + refresh echoue) **When** le systeme detecte l'echec **Then** le connecteur passe en `error`, import auto suspendu

## Tasks / Subtasks

- [x] Task 1 : Affichage erreur page Connecteurs (AC: #1)
  - [x] Badge orange "Erreur" sur ConnectorCard
  - [x] Message explicatif contextuel
  - [x] Bouton "Reconnecter"
- [x] Task 2 : Bandeau avertissement page Import (AC: #2)
  - [x] Bandeau en haut de page si connecteur en erreur
  - [x] Lien vers la page Connecteurs
  - [x] Bouton Importer desactive
- [x] Task 3 : Distinction erreurs temporaires vs permanentes (AC: #3, #4)
  - [x] 500/503 = temporaire, ne change pas le status
  - [x] 401 + refresh echoue = permanent, status -> error

## Dev Notes

### Erreurs temporaires vs permanentes

| Erreur | Type | Action |
|--------|------|--------|
| 500, 503 | Temporaire | Retry au prochain cycle, pas de changement status |
| 429 | Temporaire | Backoff, pas de changement status |
| 401 + refresh OK | Temporaire | Refresh token, continue |
| 401 + refresh KO | Permanent | Status -> error, stop polling |
| Token revoque | Permanent | Status -> error, stop polling |

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 10.1]

## Dev Agent Record

### File List

- `inertia/pages/Connectors/Show.tsx` — message explicatif + bandeau d'avertissement + prop connectorError
- `inertia/components/import/SessionsDataTable.tsx` — prop connectorError, bouton import désactivé, gestion dailyLimitReached
- `app/use_cases/import/get_staged_activities.ts` — nouveau use case lecture staging sans appel connecteur
- `app/controllers/connectors/strava_connector_controller.ts` — activités staging visibles en état error
- `resources/lang/fr/connectors.json` — clés errorMessage, errorBannerTitle, errorBannerText
- `resources/lang/en/connectors.json` — idem en anglais
- `tests/functional/import/import_activities.spec.ts` — test AC#2 mis à jour
- `tests/unit/use_cases/import/get_staged_activities.spec.ts` — nouveau test

### Completion Notes

- Task 1 : badge et bouton déjà présents, message explicatif ajouté sous le badge dans Show.tsx
- Task 2 : GetStagedActivities use case créé pour lire le staging sans appeler Strava ; bandeau orange avec lien /connectors ; bouton import désactivé via prop connectorError
- Task 3 : déjà implémenté dans strava_http_client.ts (500/503 retry, 401+refresh KO → setStatus error)

### Change Log

- Implémentation stories 10.1, 10.2, 10.3 (2026-03-15)
