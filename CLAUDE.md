# Sporty — Guide Agent

Application de suivi sportif — AdonisJS v6 + Inertia + React + Tailwind v4.

## Commandes

```bash
pnpm dev              # Serveur de dev (HMR)
pnpm format           # Formater le code (Prettier)
pnpm run ci           # Pipeline complète (format:check → lint → typecheck → depcruise → test)
node ace migration:run        # Lancer les migrations
node ace make:migration       # Créer une migration
NODE_ENV=test node ace migration:run  # Migrations en base de test
```

**IMPORTANT : ne jamais lancer `pnpm run ci` ni `pnpm test` automatiquement.** L'utilisateur lance la CI lui-même et fait un retour des erreurs. L'agent peut lancer `pnpm format` avant de rendre la main.

## Architecture (Clean Architecture)

```
app/
├── domain/           # Couche métier pure (zéro dépendance externe)
│   ├── entities/     # Entités métier
│   ├── interfaces/   # Ports = abstract classes (JAMAIS interface TS)
│   ├── value_objects/ # Value objects
│   ├── errors/       # Erreurs métier
│   └── services/     # Services domaine
├── use_cases/        # Un use case = une intention métier (1 fichier, 1 classe)
│   └── {feature}/    # Groupés par feature (auth/, sessions/, import/…)
├── controllers/      # Thin controllers : validate → use case → response
│   └── {feature}/
├── validators/       # Validation VineJS, groupés par feature
│   └── {feature}/
├── repositories/     # Implémentations Lucid des ports
├── services/         # Implémentations des services (AdonisAuthService…)
├── connectors/       # Connecteurs externes (Strava…)
├── models/           # Models Lucid (ORM)
├── middleware/        # Middleware HTTP
└── lib/              # Utilitaires internes

inertia/
├── pages/            # Pages React (PascalCase) — renderInertia('Pages/Name')
├── components/       # Composants React réutilisables
│   ├── ui/           # Composants UI de base (shadcn)
│   ├── forms/        # Composants formulaire
│   ├── shared/       # Composants partagés entre pages
│   └── {feature}/    # Composants spécifiques à une feature
└── layouts/          # Layouts (MainLayout, AuthLayout)

start/routes.ts       # Toutes les routes (lazy imports de controllers)
providers/app_provider.ts  # Tous les bindings IoC (port → implémentation)
```

### Flux d'une requête

```
Route → Middleware → Controller → Validator → Use Case → Port (abstract) → Repository/Service (impl)
```

### Dependency-cruiser (8 règles)

Les imports entre couches sont strictement contrôlés. Règle clé : **domain n'importe rien**, use cases n'importent que domain, controllers ne touchent pas l'infra directement. Voir `.dependency-cruiser.cjs` pour le détail.

## Ajouter une feature (checklist)

1. **Port** (si besoin) — `app/domain/interfaces/my_port.ts` → `abstract class`
2. **Entité/VO** (si besoin) — `app/domain/entities/` ou `app/domain/value_objects/`
3. **Use case** — `app/use_cases/{feature}/my_action.ts` → injecter les ports via `@inject()`
4. **Repository/Service** — `app/repositories/` ou `app/services/` → implémenter le port
5. **Binding IoC** — `providers/app_provider.ts` → `this.app.container.bind(Port, ...)`
6. **Validator** — `app/validators/{feature}/my_validator.ts`
7. **Controller** — `app/controllers/{feature}/my_controller.ts` → thin, délègue au use case
8. **Route** — `start/routes.ts` → lazy import du controller
9. **Page React** (si UI) — `inertia/pages/{Feature}/MyPage.tsx`

## Path aliases

| Alias             | Chemin              |
| ----------------- | ------------------- |
| `#domain/*`       | `app/domain/`       |
| `#use_cases/*`    | `app/use_cases/`    |
| `#controllers/*`  | `app/controllers/`  |
| `#validators/*`   | `app/validators/`   |
| `#repositories/*` | `app/repositories/` |
| `#services/*`     | `app/services/`     |
| `#models/*`       | `app/models/`       |
| `#connectors/*`   | `app/connectors/`   |
| `#middleware/*`   | `app/middleware/`   |
| `#lib/*`          | `app/lib/`          |
| `#tests/*`        | `tests/`            |
| `#start/*`        | `start/`            |

## Conventions et pièges

Voir @_bmad-output/planning-artifacts/dev-quality-guidelines.md pour :
- Conventions de nommage (snake_case backend, PascalCase React)
- Patterns obligatoires (ports = abstract class, constructeurs avec super(), controllers minces)
- Patterns de test (isolation DB par test, mocks de ports, CSRF désactivé en test)
- Pièges connus AdonisJS v6
- Anti-patterns interdits
