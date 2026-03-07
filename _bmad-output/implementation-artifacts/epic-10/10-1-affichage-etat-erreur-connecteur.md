# Story 10.1 : Affichage etat erreur connecteur

Status: draft

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

- [ ] Task 1 : Affichage erreur page Connecteurs (AC: #1)
  - [ ] Badge orange "Erreur" sur ConnectorCard
  - [ ] Message explicatif contextuel
  - [ ] Bouton "Reconnecter"
- [ ] Task 2 : Bandeau avertissement page Import (AC: #2)
  - [ ] Bandeau en haut de page si connecteur en erreur
  - [ ] Lien vers la page Connecteurs
  - [ ] Bouton Importer desactive
- [ ] Task 3 : Distinction erreurs temporaires vs permanentes (AC: #3, #4)
  - [ ] 500/503 = temporaire, ne change pas le status
  - [ ] 401 + refresh echoue = permanent, status -> error

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
