# Story 4.3 : Détail d'une séance

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **voir tous les détails d'une séance**,
so that **je peux consulter l'ensemble des métriques enregistrées**.

## Acceptance Criteria

1. **Given** je suis sur la liste des séances **When** je tape sur une séance **Then** une vue détail s'ouvre en plein écran (push navigation) **And** je vois toutes les métriques : sport, date, durée, distance, allure, FC moyenne, ressenti, notes **And** les métriques spécifiques au sport sont affichées (sport_metrics JSONB)
2. **Given** je suis sur la vue détail **When** je clique sur "Retour" **Then** je reviens à la liste des séances à la même position de scroll

## Tasks / Subtasks

- [ ] Task 1 : Use Case — GetSession (AC: #1)
  - [ ] Créer `app/use_cases/sessions/get_session.ts`
  - [ ] `@inject()`, reçoit `SessionRepository`
  - [ ] `execute(sessionId: number, userId: number)` : charge la séance, vérifie que `session.userId === userId`, sinon throw `SessionForbiddenError`
  - [ ] Si la séance n'existe pas → throw `SessionNotFoundError`

- [ ] Task 2 : Route + Controller show (AC: #1)
  - [ ] Ajouter route : `GET /sessions/:id` → `SessionsController.show`
  - [ ] Controller `show({ params, inertia, auth })` :
    - Appeler `GetSession.execute(params.id, auth.user!.id)`
    - Catch `SessionNotFoundError` → redirect `/sessions` avec flash error
    - Catch `SessionForbiddenError` → redirect `/sessions` avec flash error
    - Render `Sessions/Show` avec props `{ session }` (toutes les métriques)

- [ ] Task 3 : Page Sessions/Show (AC: #1, #2)
  - [ ] Créer `inertia/pages/Sessions/Show.tsx`
  - [ ] Layout plein écran avec header : bouton retour (← `/sessions`), titre sport, bouton "Modifier" (icône, préparé pour story 4.4)
  - [ ] Affichage de toutes les métriques en sections :
    - **En-tête** : sport + date formatée
    - **Métriques principales** : durée (hh:mm), distance (km), allure calculée (min/km)
    - **Métriques secondaires** : FC moyenne (bpm), ressenti (emoji)
    - **Notes** : texte libre (si renseigné)
    - **Métriques sport-spécifiques** : afficher les clés/valeurs de `sportMetrics` JSONB dynamiquement
  - [ ] Bouton retour : `<Link href="/sessions" preserveState>` pour préserver le scroll de la liste
  - [ ] Bouton "Modifier" : `<Link href={'/sessions/' + session.id + '/edit'}>` (ou état local pour modale, story 4.4)

- [ ] Task 4 : Rendre les SessionCards cliquables (AC: #1)
  - [ ] Modifier `SessionCard.tsx` : wrapper le contenu dans `<Link href={'/sessions/' + session.id}>`
  - [ ] L'URL `/sessions/:id` fait un push navigation (comportement Inertia par défaut)

- [ ] Task 5 : Tests unitaires (AC: #1)
  - [ ] Créer `tests/unit/use_cases/sessions/get_session.spec.ts`
  - [ ] Tests : séance trouvée retournée, séance inexistante → `SessionNotFoundError`, séance d'un autre user → `SessionForbiddenError`

- [ ] Task 6 : Tests fonctionnels (AC: #1, #2)
  - [ ] Ajouter à `tests/functional/sessions/sessions.spec.ts`
  - [ ] `GET /sessions/:id` connecté + propriétaire → 200 + session complète
  - [ ] `GET /sessions/:id` connecté + pas propriétaire → redirect + flash error
  - [ ] `GET /sessions/:id` séance inexistante → redirect + flash error
  - [ ] `GET /sessions/:id` non connecté → redirect `/login`

## Dev Notes

### Vérification de propriété

```typescript
// get_session.ts
async execute(sessionId: number, userId: number): Promise<TrainingSession> {
  const session = await this.sessionRepository.findById(sessionId)
  if (!session) throw new SessionNotFoundError(sessionId)
  if (session.userId !== userId) throw new SessionForbiddenError(sessionId)
  return session
}
```

La vérification de propriété est faite dans le use case, PAS dans le controller. Le controller attrape les erreurs domain et redirige avec un flash.

### Controller show — gestion d'erreurs

```typescript
async show({ params, inertia, auth, response, session }: HttpContext) {
  try {
    const trainingSession = await this.getSession.execute(params.id, auth.user!.id)
    return inertia.render('Sessions/Show', { session: trainingSession })
  } catch (error) {
    if (error instanceof SessionNotFoundError || error instanceof SessionForbiddenError) {
      session.flash('error', 'Séance introuvable')
      return response.redirect('/sessions')
    }
    throw error
  }
}
```

**IMPORTANT :** Pour le flash error, utiliser un message générique ("Séance introuvable") même en cas de `SessionForbiddenError` pour ne pas leaker l'existence de la séance.

### Allure calculée côté frontend

```typescript
function formatPace(durationMinutes: number, distanceKm: number | null): string | null {
  if (!distanceKm || distanceKm === 0) return null
  const paceMin = durationMinutes / distanceKm
  const minutes = Math.floor(paceMin)
  const seconds = Math.round((paceMin - minutes) * 60)
  return `${minutes}'${seconds.toString().padStart(2, '0')}/km`
}
```

L'allure n'est PAS stockée en base — elle est calculée à l'affichage uniquement.

### Métriques sport-spécifiques dynamiques

Le champ `sportMetrics` est un JSONB libre. Pour l'affichage :
```typescript
{Object.entries(session.sportMetrics).map(([key, value]) => (
  <div key={key}>
    <span className="text-muted-foreground">{formatMetricKey(key)}</span>
    <span>{String(value)}</span>
  </div>
))}

function formatMetricKey(key: string): string {
  return key.replace(/_/g, ' ').replace(/\b\w/g, c => c.toUpperCase())
}
```

### Préservation du scroll

Inertia préserve le scroll automatiquement avec le bouton retour du navigateur. Pour le bouton "Retour" dans la page, utiliser :
```typescript
<Link href="/sessions" preserveState>← Retour</Link>
```

### Fichiers à créer / modifier

| Action   | Fichier                                                |
|----------|--------------------------------------------------------|
| Créer    | `app/use_cases/sessions/get_session.ts`                |
| Créer    | `inertia/pages/Sessions/Show.tsx`                      |
| Modifier | `app/controllers/sessions/sessions_controller.ts` (show) |
| Modifier | `start/routes.ts` (GET /sessions/:id)                  |
| Modifier | `inertia/components/sessions/SessionCard.tsx` (Link)   |
| Créer    | `tests/unit/use_cases/sessions/get_session.spec.ts`    |
| Modifier | `tests/functional/sessions/sessions.spec.ts` (show tests) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.3]
- [Source: _bmad-output/planning-artifacts/architecture.md#Gestion d'erreurs — domain errors]
- [Source: app/domain/errors/ — pattern domain error]
- [Source: Story 4.1 — SessionRepository.findById, domain errors]
- [Source: Story 4.2 — SessionCard, Sessions/Index page]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
