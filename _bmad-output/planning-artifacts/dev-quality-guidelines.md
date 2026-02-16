# Règles de qualité de développement — Sporty

> Document de référence pour tout développeur (humain ou IA) travaillant sur le projet.
> Basé sur les retours d'exécution de l'Epic 2 et l'outillage d'analyse statique en place.

---

## 1. Pipeline de qualité

Toutes les vérifications sont exécutées par `pnpm run ci` :

```
format:check → lint → typecheck → depcruise → test
```

| Outil              | Commande              | Tolérance          |
| ------------------ | --------------------- | ------------------- |
| Prettier           | `format:check`        | Zéro écart          |
| ESLint             | `lint --max-warnings 0` | Zéro warning       |
| TypeScript         | `typecheck` (`strict: true`) | Zéro erreur   |
| dependency-cruiser | `depcruise app`       | Zéro violation       |
| Japa               | `test`                | Tous les tests verts |

**Règle : aucun merge si `pnpm run ci` échoue.**

---

## 2. Architecture en couches (enforced par dependency-cruiser)

```
Controller → Use Case → Domain ← Repository (abstract class)
     ↓                              ↑
  Validator                  LucidRepository (implémentation)
```

8 règles `severity: error` dans `.dependency-cruiser.cjs` :

| Règle | Signification |
| --- | --- |
| `domain-no-internal-deps` | Le domaine n'importe aucune autre couche |
| `use-cases-only-domain` | Les use cases n'importent que le domaine |
| `controllers-no-direct-infra` | Les controllers passent par les use cases |
| `infra-no-http-nor-usecases` | Repositories/services ignorent HTTP et use cases |
| `models-isolated` | Les models Lucid n'importent aucune couche métier |
| `validators-isolated` | Les validators sont autonomes |
| `middleware-no-infra` | Les middleware n'accèdent pas à l'infra |
| `no-circular` | Zéro dépendance circulaire |

---

## 3. Conventions de nommage

| Élément | Convention | Exemple |
| --- | --- | --- |
| Fichiers backend | `snake_case.ts` | `register_user.ts` |
| Fichiers React | `PascalCase.tsx` | `Register.tsx` |
| Classes TS | `PascalCase` | `RegisterUser` |
| Fonctions/méthodes | `camelCase` | `registerUser()` |
| Tables DB | `snake_case` pluriel | `users` |
| Colonnes DB | `snake_case` | `full_name` |
| Props Inertia | `camelCase` | `{ sessionCount }` |
| Path aliases | `#couche/*` | `#domain/*`, `#use_cases/*` |

ESLint enforce : `@unicorn/filename-case` → `PascalCase` ou `camelCase` sur les `.tsx`.

---

## 4. Patterns obligatoires

### Ports = abstract classes (jamais `interface`)

Les interfaces TypeScript sont effacées à la compilation → `@inject()` reçoit `Object` → erreur IoC.

```typescript
// ✅ Correct
export abstract class UserRepository {
  abstract create(data: Omit<User, 'id'>): Promise<User>
}

// ❌ Interdit
export interface UserRepository { ... }
```

**Corollaire :** toujours `import` (valeur), jamais `import type` pour une classe abstraite injectée.

### Constructeurs explicites avec `super()`

Le shorthand TypeScript (`constructor(private x: X)`) dans une classe dérivée ne génère pas `super()` correctement.

```typescript
// ✅ Correct
@inject()
export class AdonisAuthService extends AuthService {
  private ctx: HttpContext
  constructor(ctx: HttpContext) {
    super()
    this.ctx = ctx
  }
}

// ❌ Interdit — pas de super() émis
export class AdonisAuthService extends AuthService {
  constructor(private ctx: HttpContext) {}
}
```

### Controllers minces

Le controller ne fait que : valider → déléguer au use case → gérer la réponse HTTP. Zéro logique métier.

### Un use case = une intention métier

Un fichier, une classe, une méthode publique. Toute la logique métier vit ici.

---

## 5. Tests

### Isolation DB par test (pas par suite)

```typescript
// ✅ Correct — transaction par test
group.each.setup(async () => testUtils.db().withGlobalTransaction())

// ❌ Interdit — transaction partagée, pas d'isolation
suite.setup(() => testUtils.db().withGlobalTransaction())
```

### Mocks des ports

Créer un mock via une classe concrète qui étend l'abstract class :

```typescript
function makeUserRepository(overrides: Partial<UserRepository> = {}): UserRepository {
  class Mock extends UserRepository {
    async countAll() { return 0 }
    // ... défauts raisonnables
  }
  return Object.assign(new Mock(), overrides)
}
```

### CSRF en tests

CSRF est désactivé quand `NODE_ENV === 'test'` (dans `config/shield.ts`). Pas besoin de `withCsrfToken()`.

---

## 6. Pièges connus (retours Epic 2)

| Piège | Solution |
| --- | --- |
| `response.abort(403)` sans body | Premier argument = body : `response.abort('Message', 403)` |
| `assert.rejects(fn, callback)` non supporté par Japa | Utiliser `try/catch` + `assert.instanceOf` |
| `withGlobalTransaction()` retourne une `Promise<CleanupHandler>` | Le callback du setup **doit** être `async` |
| Tailwind v4 preflight `color: inherit` hors `@layer` | Ajouter `color: revert-layer` après l'import Tailwind |
| `@theme inline` avec `hsl(var(--x))` | `:root` contient les valeurs `hsl()` complètes, `@theme` utilise `var()` directement |
| `auth.loginViaId()` n'existe pas en AdonisJS v6 | Utiliser `auth.use('web').login(lucidModel)` |
| Hash driver = `scrypt` (pas argon2) | `@beforeSave()` sur le model gère le hash automatiquement |

---

## 7. Anti-patterns interdits

- Controller qui accède à Lucid/DB directement
- Logique métier dans un composant React
- Fichiers fourre-tout `utils.ts` ou `helpers.ts` (nommer par responsabilité)
- `import type` sur une abstract class utilisée avec `@inject()`
- `GET` pour une action destructrice (logout, suppression)
- `console.log` dans le code source (ESLint `no-console: error`)
- Dépendances circulaires entre couches (dependency-cruiser bloque)
