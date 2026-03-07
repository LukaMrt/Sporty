# Story 10.2 : Rate limit manager avance

Status: draft

## Story

As a **systeme**,
I want **gerer le rate limiting de maniere proactive avec file d'attente**,
so that **les imports massifs respectent les limites sans intervention utilisateur** (FR24).

## Acceptance Criteria

1. **Given** le budget 15min est epuise (100 req) **When** une requete est tentee **Then** elle est mise en attente jusqu'au prochain interval naturel (:00, :15, :30, :45)
2. **Given** le budget journalier est epuise (1000 req) **When** une requete est tentee **Then** elle est rejetee avec message frontend "Limite journaliere atteinte, reprise demain"
3. **Given** un import de 50 activites **When** le seuil 15min est atteint **Then** l'import se met en pause, attend le reset, puis reprend, progression indique "En pause — reprise dans X minutes"
4. **Given** une requete retourne 429 **When** le backoff est applique **Then** delais 1s, 2s, 4s, 8s + jitter 0-500ms, apres 3 echecs 429 consecutifs la requete est abandonnee

## Tasks / Subtasks

- [ ] Task 1 : File d'attente RateLimitManager (AC: #1, #2)
  - [ ] Attente automatique si budget 15min epuise
  - [ ] Rejet si budget journalier epuise
  - [ ] Calcul du prochain interval naturel de reset
- [ ] Task 2 : Integration avec import batch (AC: #3)
  - [ ] Pause/reprise automatique pendant l'import
  - [ ] Mise a jour de la progression ("En pause...")
- [ ] Task 3 : Abandon apres 3 echecs 429 (AC: #4)
  - [ ] Compteur d'echecs consecutifs
  - [ ] Abandon et activite reste en status `new`

## Dev Notes

### Intervalles naturels de reset

Strava reset le compteur 15min aux quarts d'heure naturels. Pour calculer l'attente :

```typescript
const now = new Date()
const minutes = now.getMinutes()
const nextQuarter = Math.ceil((minutes + 1) / 15) * 15
const waitMs = (nextQuarter - minutes) * 60 * 1000 - now.getSeconds() * 1000
```

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 10.2]
