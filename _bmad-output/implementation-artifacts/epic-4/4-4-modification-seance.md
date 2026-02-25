# Story 4.4 : Modification d'une séance

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **modifier une séance existante**,
so that **je peux corriger une erreur de saisie** (FR13).

## Acceptance Criteria

1. **Given** je suis sur la vue détail d'une séance **When** je clique sur "Modifier" (icône ou texte en haut à droite) **Then** le formulaire de saisie s'ouvre pré-rempli avec les données existantes (même formulaire que la story 4.1)
2. **Given** je modifie un ou plusieurs champs et je clique "Enregistrer" **When** la requête est traitée **Then** les modifications sont sauvegardées en base **And** je reviens à la vue détail avec les données mises à jour **And** un toast confirme "Séance modifiée"
3. **Given** je modifie la distance de 5 km à 15 km **When** je sauvegarde et consulte la séance **Then** la distance affiche bien 15 km et l'allure est recalculée

## Tasks / Subtasks

- [ ] Task 1 : Use Case — UpdateSession (AC: #2, #3)
  - [ ] Créer `app/use_cases/sessions/update_session.ts`
  - [ ] `@inject()`, reçoit `SessionRepository`
  - [ ] `execute(sessionId: number, userId: number, data: UpdateSessionInput)` :
    - Charger la séance via `findById`, vérifier propriété (throw `SessionForbiddenError` / `SessionNotFoundError`)
    - Appeler `sessionRepository.update(sessionId, data)`
    - Retourner la séance mise à jour
  - [ ] `UpdateSessionInput` : mêmes champs que `CreateSessionInput`, tous optionnels sauf les requis (`sport_type`, `date`, `duration_minutes` restent requis car le formulaire renvoie toujours tous les champs)

- [ ] Task 2 : Validator — update session (AC: #2)
  - [ ] Créer `app/validators/sessions/update_session_validator.ts`
  - [ ] Même schéma que `create_session_validator.ts` (les champs requis restent requis car le formulaire renvoie le tout)

- [ ] Task 3 : Route + Controller update (AC: #2)
  - [ ] Ajouter route : `PUT /sessions/:id` → `SessionsController.update`
  - [ ] Controller `update({ params, request, response, session, auth })` :
    - `request.validateUsing(updateSessionValidator)`
    - `updateSession.execute(params.id, auth.user!.id, data)`
    - Catch domain errors → redirect back + flash error
    - Success → `session.flash('success', 'Séance modifiée')` + `response.redirect('/sessions/' + params.id)`

- [ ] Task 4 : Réutiliser SessionForm en mode edit (AC: #1, #3)
  - [ ] Le `SessionForm` créé en story 4.1 accepte déjà `mode: 'create' | 'edit'` et `session?: TrainingSession`
  - [ ] En mode `edit` : pré-remplir tous les champs avec les valeurs existantes
  - [ ] En mode `edit` : `form.put('/sessions/' + session.id)` au lieu de `form.post('/sessions')`
  - [ ] Le bouton submit affiche "Enregistrer" (pareil dans les deux modes)

- [ ] Task 5 : Intégrer le formulaire d'édition (AC: #1)
  - [ ] **Option A** : depuis la vue détail (`Sessions/Show.tsx`), le bouton "Modifier" ouvre un Dialog/Sheet avec `SessionForm` en mode `edit`
  - [ ] **Option B** : le bouton "Modifier" navigue vers une page `Sessions/Edit.tsx`
  - [ ] **Recommandation :** Option A (consistant avec la saisie en modale/sheet de story 4.1) — un state `isEditing` dans Show.tsx contrôle l'ouverture
  - [ ] Passer les `sports` comme prop dans `Sessions/Show` (chargés par le controller)

- [ ] Task 6 : Tests unitaires (AC: #2, #3)
  - [ ] Créer `tests/unit/use_cases/sessions/update_session.spec.ts`
  - [ ] Tests : mise à jour réussie, séance inexistante → error, séance d'un autre user → error, distance modifiée correctement

- [ ] Task 7 : Tests fonctionnels (AC: #1, #2, #3)
  - [ ] Ajouter à `tests/functional/sessions/sessions.spec.ts`
  - [ ] `PUT /sessions/:id` valide → 302 redirect + données mises à jour en DB
  - [ ] `PUT /sessions/:id` distance modifiée → nouvelle distance en DB
  - [ ] `PUT /sessions/:id` non propriétaire → redirect + error
  - [ ] `PUT /sessions/:id` séance inexistante → redirect + error
  - [ ] `PUT /sessions/:id` données invalides → redirect back + validation errors
  - [ ] `PUT /sessions/:id` non connecté → redirect `/login`

## Dev Notes

### Réutilisation du SessionForm

Le `SessionForm` conçu en story 4.1 est **le même composant** pour la création et l'édition. La différence :

```typescript
// Création (story 4.1)
<SessionForm mode="create" sports={sports} onClose={() => setIsFormOpen(false)} />

// Édition (story 4.4)
<SessionForm mode="edit" session={session} sports={sports} onClose={() => setIsEditing(false)} />
```

Internalement, le `useForm` est initialisé différemment :

```typescript
const form = useForm({
  sport_type: session?.sportType ?? defaultSportType ?? '',
  date: session?.date ?? new Date().toISOString().slice(0, 10),
  duration_minutes: session?.durationMinutes ?? '',
  distance_km: session?.distanceKm ?? '',
  avg_heart_rate: session?.avgHeartRate ?? '',
  perceived_effort: session?.perceivedEffort ?? '',
  sport_metrics: session?.sportMetrics ?? {},
  notes: session?.notes ?? '',
})

// Submit
mode === 'create'
  ? form.post('/sessions', { onSuccess: onClose })
  : form.put(`/sessions/${session!.id}`, { onSuccess: onClose })
```

### Controller show doit charger les sports

Pour permettre l'édition directement depuis la vue détail, le controller `show` doit aussi passer les `sports` :

```typescript
async show({ params, inertia, auth }: HttpContext) {
  const trainingSession = await this.getSession.execute(params.id, auth.user!.id)
  const sports = await this.listSports.execute()
  return inertia.render('Sessions/Show', { session: trainingSession, sports })
}
```

### Allure recalculée automatiquement

L'allure est calculée côté frontend dans `SessionForm` ET dans `Sessions/Show`. Quand la distance passe de 5 à 15 km, l'allure se recalcule immédiatement — aucune logique serveur nécessaire (AC #3).

### Fichiers à créer / modifier

| Action   | Fichier                                                |
|----------|--------------------------------------------------------|
| Créer    | `app/use_cases/sessions/update_session.ts`             |
| Créer    | `app/validators/sessions/update_session_validator.ts`  |
| Modifier | `app/controllers/sessions/sessions_controller.ts` (update) |
| Modifier | `start/routes.ts` (PUT /sessions/:id)                  |
| Modifier | `inertia/pages/Sessions/Show.tsx` (bouton Modifier + Dialog/Sheet) |
| Modifier | `inertia/components/sessions/SessionForm.tsx` (mode edit + put) |
| Créer    | `tests/unit/use_cases/sessions/update_session.spec.ts` |
| Modifier | `tests/functional/sessions/sessions.spec.ts` (update tests) |

### References

- [Source: _bmad-output/planning-artifacts/epics.md#Story 4.4]
- [Source: _bmad-output/planning-artifacts/architecture.md#API Patterns — routes intentionnelles]
- [Source: Story 4.1 — SessionForm component (mode create/edit)]
- [Source: Story 4.3 — Sessions/Show page, GetSession use case]

## Dev Agent Record

### Agent Model Used

{{agent_model_name_version}}

### Debug Log References

### Completion Notes List

### File List
