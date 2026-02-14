# Story 1.6 : Migrations initiales & seeders

Status: review

## Story

As a **dev (Luka)**,
I want **les migrations pour les tables users, sessions et sports, et un seeder pour les sports de base**,
so that **le modele de donnees est en place et pret pour le developpement des features**.

## Acceptance Criteria

1. **Given** PostgreSQL tourne via Docker Compose **When** je lance `node ace migration:run` **Then** les tables `users`, `sessions` et `sports` sont creees
2. **Given** les migrations sont appliquees **When** j'inspecte la table `users` **Then** elle contient : id, email, password, full_name, role (admin/user), timestamps
3. **Given** les migrations sont appliquees **When** j'inspecte la table `sessions` **Then** elle contient : id, user_id (FK), sport_type, date, duration_minutes, distance_km, avg_heart_rate, perceived_effort, sport_metrics (JSONB), deleted_at (nullable), timestamps
4. **Given** les migrations sont appliquees **When** j'inspecte la table `sports` **Then** elle contient : id, name, slug, default_metrics (JSONB), timestamps
5. **Given** les tables existent **When** je lance `node ace db:seed` **Then** le sport "Course a pied" est cree avec ses metriques par defaut
6. **Given** les migrations sont appliquees **When** je lance `node ace migration:rollback` **Then** les migrations s'annulent proprement

## Tasks / Subtasks

- [x] Task 1 : Creer la migration users (AC: #1, #2)
  - [x] `node ace make:migration create_users_table`
  - [x] Colonnes : `id` (increments), `email` (string, unique, not null), `password` (string, not null), `full_name` (string, not null), `role` (enum: 'admin'|'user', default: 'user', not null), `created_at`, `updated_at`
  - [x] Index sur `email` (unique)
- [x] Task 2 : Creer la migration sessions (AC: #1, #3)
  - [x] `node ace make:migration create_sessions_table`
  - [x] Colonnes : `id` (increments), `user_id` (FK → users.id, on delete cascade), `sport_type` (string, not null), `date` (date, not null), `duration_minutes` (integer, not null), `distance_km` (decimal(8,2), nullable), `avg_heart_rate` (integer, nullable), `perceived_effort` (integer, nullable), `sport_metrics` (jsonb, default: '{}'), `deleted_at` (timestamp, nullable), `created_at`, `updated_at`
  - [x] Index sur `user_id`
  - [x] Index sur `sport_type`
  - [x] Index sur `deleted_at` (pour filtrer les soft-deletes efficacement)
- [x] Task 3 : Creer la migration sports (AC: #1, #4)
  - [x] `node ace make:migration create_sports_table`
  - [x] Colonnes : `id` (increments), `name` (string, not null), `slug` (string, unique, not null), `default_metrics` (jsonb, default: '{}'), `created_at`, `updated_at`
  - [x] Index sur `slug` (unique)
- [x] Task 4 : Creer les modeles Lucid (AC: #1-#4)
  - [x] Creer/mettre a jour `app/models/user.ts` avec les colonnes et relations
  - [x] Creer `app/models/session.ts` avec les colonnes, relation user, scope softDelete
  - [x] Creer `app/models/sport.ts` avec les colonnes
  - [x] Configurer le hash du password dans le modele User (hook `@beforeSave`)
- [x] Task 5 : Creer le seeder sports (AC: #5)
  - [x] `node ace make:seeder sport`
  - [x] Inserer "Course a pied" avec slug `running` et metriques par defaut :
    ```json
    {
      "pace_per_km": { "type": "duration", "unit": "min/km", "label": "Allure" },
      "cadence": { "type": "number", "unit": "spm", "label": "Cadence" }
    }
    ```
- [x] Task 6 : Validation (AC: #1-#6)
  - [x] `node ace migration:run` → 3 tables creees
  - [x] `node ace db:seed` → "Course a pied" inseree
  - [x] Verifier en base : `SELECT * FROM sports;` → "Course a pied" presente
  - [x] `node ace migration:rollback` → tables supprimees proprement
  - [x] `node ace migration:run` a nouveau → tout se recree
  - [x] `pnpm lint` et `tsc --noEmit` → passent

## Dev Notes

### Schema de donnees

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   users     │     │   sessions   │     │   sports    │
├─────────────┤     ├──────────────┤     ├─────────────┤
│ id          │◄────│ user_id (FK) │     │ id          │
│ email       │     │ sport_type   │     │ name        │
│ password    │     │ date         │     │ slug        │
│ full_name   │     │ duration_min │     │ default_    │
│ role        │     │ distance_km  │     │   metrics   │
│ created_at  │     │ avg_heart_r  │     │ created_at  │
│ updated_at  │     │ perceived_e  │     │ updated_at  │
│             │     │ sport_metrics│     └─────────────┘
│             │     │ deleted_at   │
│             │     │ created_at   │
│             │     │ updated_at   │
│             │     └──────────────┘
```

### Conventions de nommage DB (architecture.md)

| Element         | Convention               | Exemple                                   |
| --------------- | ------------------------ | ----------------------------------------- |
| Tables          | snake_case, pluriel      | `users`, `sessions`, `sports`             |
| Colonnes        | snake_case               | `user_id`, `sport_type`, `avg_heart_rate` |
| Cles etrangeres | `<table_singulier>_id`   | `user_id`                                 |
| Index           | `idx_<table>_<colonnes>` | `idx_sessions_user_id`                    |

### Colonne JSONB sport_metrics

Decision architecturale cle : les metriques specifiques au sport sont stockees en JSONB, PAS dans des colonnes typees. Ca permet l'extensibilite multi-sport sans migration par sport.

Exemple pour une seance de course :

```json
{
  "pace_per_km": "5:12",
  "cadence": 180
}
```

La validation des metriques se fait dans la couche domain (use case), PAS en base.

### Soft-delete pattern

- Colonne `deleted_at` nullable sur `sessions`
- Quand une seance est "supprimee", `deleted_at` est rempli avec le timestamp
- Les requetes normales filtrent `WHERE deleted_at IS NULL`
- Implementer un scope Lucid `withoutTrashed` / `onlyTrashed` sur le modele Session
- La restauration remet `deleted_at` a null

### Modele User — hash du password

Le modele User doit utiliser le hook `@beforeSave` pour hasher le password automatiquement :

```typescript
@beforeSave()
public static async hashPassword(user: User) {
  if (user.$dirty.password) {
    user.password = await hash.make(user.password)
  }
}
```

AdonisJS utilise argon2 par defaut (NFR7).

### Role enum

Le champ `role` sur User est un enum simple : `'admin' | 'user'`. Le premier inscrit deviendra admin (logique dans le use case RegisterUser en Epic 2).

### Anti-patterns a eviter

- Ne PAS creer d'index GIN sur `sport_metrics` maintenant — seulement si les perfs le justifient plus tard
- Ne PAS ajouter de logique metier dans les migrations — elles ne font que du DDL
- Ne PAS mettre la validation des sport_metrics dans le modele — ca va dans le domain (value object)
- Ne PAS utiliser `text` pour les colonnes qui ont des contraintes connues — utiliser les types specifiques (string, integer, decimal)

### References

- [Source: _bmad-output/planning-artifacts/architecture.md#Data Architecture]
- [Source: _bmad-output/planning-artifacts/architecture.md#Naming Patterns]
- [Source: _bmad-output/planning-artifacts/architecture.md#Authentication & Security]
- [Source: _bmad-output/planning-artifacts/epics.md#Story 1.6]

## Dev Agent Record

### Agent Model Used

claude-sonnet-4-5-20250929

### Debug Log References

- Conflit de nommage `hashPassword` entre `withAuthFinder` mixin et hook `@beforeSave` → renommé en `encryptPassword`
- Migrations dans container Docker (prod build) non accessibles → run localement contre service `db` Docker

### Completion Notes List

- Migration `users` : ajout colonne `role` (enu admin|user, default user) + `full_name` NOT NULL
- Migration `sessions` : création complète avec FK cascade, JSONB sport_metrics, soft-delete `deleted_at`, 3 index
- Migration `sports` : création avec JSONB default_metrics, index unique sur slug
- Modèle `User` : ajout `role`, relation `hasMany(Session)`, hook `@beforeSave encryptPassword`
- Modèle `Session` : scopes `withoutTrashed` / `onlyTrashed`, relation `belongsTo(User)`
- Modèle `Sport` : colonnes name, slug, defaultMetrics
- Seeder `SportSeeder` : upsert "Course à pied" / running via `updateOrCreate`
- Validation complète : migration:run → db:seed → SELECT * FROM sports → migration:rollback → migration:run → lint → tsc

### File List

- database/migrations/1771088865534_create_users_table.ts (modifié)
- database/migrations/1771104621147_create_sessions_table.ts (créé)
- database/migrations/1771104621148_create_sports_table.ts (créé)
- app/models/user.ts (modifié)
- app/models/session.ts (créé)
- app/models/sport.ts (créé)
- database/seeders/sport_seeder.ts (créé)
