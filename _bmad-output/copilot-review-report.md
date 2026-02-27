# Rapport de Review Copilot — PRs #3, #5, #6, #7

> Généré par Winston 🏗️ (Architecture), Amelia 💻 (Dev) et Quinn 🧪 (QA)

## Résumé

- **PR #3** (Epic 2 — Auth) : 6 commentaires
- **PR #5** (Story 5-4 — Filtres/Tri) : 5 commentaires
- **PR #6** (CI — Tests) : 4 commentaires
- **PR #7** (Epic 6 — Dashboard) : 11 commentaires

---

## 🔴 Priorité Haute — Bugs réels

### 1. `formatPaceMinSec` peut afficher "5'60"
- **PR #7** — `inertia/lib/format.ts:28` et `:53`
- `Math.round(seconds)` peut donner 60. Il faut normaliser le carry.
- **Aussi affecté** : `formatChartValue` branche `pace` (même fichier, L53)

### 2. `Math.min/max(...[])` → ±Infinity crash Recharts
- **PR #7** — `inertia/components/shared/EvolutionChart.tsx:137`
- Si `filteredData` est vide, `yDomain` reçoit `[Infinity, -Infinity]` → crash du graphe.
- **Fix** : guard `filteredData.length === 0` → domain `[0, 1]` + message "pas de données".

### 3. Tri sur colonne nullable sans gestion des NULLs
- **PR #5** — `app/repositories/lucid_session_repository.ts:41`
- Tri par `distance_km` (nullable) → ordre indéterminé des NULLs selon le moteur DB.
- **Fix** : `orderByRaw('distance_km IS NULL, distance_km ${sortOrder}')`.

### 4. Parsing `new Date('YYYY-MM-DD')` → décalage timezone
- **PR #7** — `inertia/lib/format.ts:46` et `:67`
- `new Date('2026-01-15')` est interprété en UTC. En timezone négative → jour précédent.
- Touche : `isoWeek`, `formatChartDate`, `isThisWeek`, `isThisMonth`.
- **Fix** : utiliser Luxon `DateTime.fromISO(iso, { zone: 'utc' })` ou split manuel.

---

## 🟡 Priorité Moyenne — Qualité / Cohérence

### 5. Facteur magique `0.621371` dupliqué
- **PR #7** — `inertia/pages/Dashboard.tsx:70` et `inertia/pages/Sessions/Show.tsx:120`
- Le hook `useUnitConversion` existe déjà avec `kmToMiles` / `formatDistance`.
- **Fix** : remplacer les calculs inline par les helpers centralisés.

### 6. Appel DB inutile dans `DashboardController`
- **PR #7** — `app/controllers/dashboard/dashboard_controller.ts:28`
- `getProfile.execute()` pour `speedUnit`, alors que les shared props Inertia fournissent déjà les préférences.
- **Fix** : supprimer l'appel `GetProfile` du controller.

### 7. `formatTrend` — texte incohérent
- **PR #7** — `inertia/lib/format.ts:34`
- Affiche "vs mois dernier" mais le calcul backend compare des fenêtres rolling de 4 semaines.
- Force "s/km" même en mode km/h.
- **Fix** : paramétrer le label de période et l'unité.

### 8. Type safety faible sur `sortBy` côté frontend
- **PR #5** — `inertia/components/sessions/SessionFilters.tsx:19`
- `sortBy: string | null` au lieu de `'date' | 'duration_minutes' | 'distance_km' | null`.
- **Fix** : aligner le type frontend avec l'enum du validateur backend.

### 9. Pas de moyen de clear le tri seul
- **PR #5** — `inertia/components/sessions/SessionFilters.tsx:69`
- L'utilisateur doit "Réinitialiser" tous les filtres pour enlever le tri.
- **Fix** : ajouter une option "Par défaut" dans le dropdown de tri.

---

## 🟢 Priorité Basse — Cosmétique / Détails

### 10. Description de test inexacte (`@beforeSave`)
- **PR #3** — `tests/unit/use_cases/register_user.spec.ts:68`
- Le test mentionne `@beforeSave` mais le hash est fait par `withAuthFinder`.

### 11. `--force-exit` dans le script de test
- **PR #3** — `package.json:11`
- Peut masquer des fuites de ressources. Idéalement investiguer la cause racine.

### 12. `pnpm-workspace.yaml` superflu
- **PR #3** — Config `onlyBuiltDependencies` pourrait aller dans `package.json`.

### 13. Avatar fallback pour `fullName` vide
- **PR #3** — `inertia/layouts/MainLayout.tsx:74`
- `charAt(0)` sur string vide → avatar vide. Fallback sur email ou `'?'`.

### 14. Duplication dans les tests de navigation
- **PR #3** — `tests/functional/navigation.spec.ts:44`
- Création user + login dupliquée. Extraire un helper.

### 15. `site.webmanifest` : "MyWebSite" → "Sporty"
- **PR #3** — `public/site.webmanifest:3`

### 16. Faute d'accent "Course a pied"
- **PR #5** — `tests/unit/use_cases/sessions/list_sessions.spec.ts:13`

### 17. Tests dashboard fragiles (dépendance date système)
- **PR #7** — `tests/unit/use_cases/dashboard/get_dashboard_metrics.spec.ts:46`
- Injecter `now` dans le use case ou utiliser des fake timers.

### 18. Test d'isolation incomplet (trash)
- **PR #7** — `tests/functional/sessions/trash_sessions.spec.ts:104`
- Ne vérifie pas que user1 ne voit PAS la séance supprimée de user2 côté réponse.

---

## CI (PR #6) — Actions requises

| # | Problème | Fichier | Action |
|---|----------|---------|--------|
| 19 | Variables d'env manquantes (PORT, HOST, LOG_LEVEL, SESSION_DRIVER) | `.github/workflows/ci.yml:52` | Ajouter dans la section `env` |
| 20 | Version Postgres CI (17) ≠ dev (18-alpine) | `.github/workflows/ci.yml:33` | Aligner sur `postgres:18-alpine` |
| 21 | `APP_KEY` via secret non documenté | `.github/workflows/ci.yml:47` | Hardcoder une clé de test ou documenter le secret |
| 22 | `TZ=UTC` manquant | `.github/workflows/ci.yml:52` | Ajouter pour cohérence timezone |

---

## Recommandation d'implémentation

**Sprint immédiat** (bugs) : Items 1-4
**Prochain sprint** (qualité) : Items 5-9, 19-22
**Backlog** : Items 10-18
