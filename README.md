# Sporty

Application de suivi sportif : saisie et import de séances (GPX, Strava, open-wearables), analyse de charge et de forme (CTL/ATL/TSB, zones cardiaques), plans d'entraînement Daniels générés et recalibrés automatiquement.

**Stack** : AdonisJS 6 · Inertia · React 19 · Tailwind 4 · PostgreSQL 18 · Node 22/24 · pnpm.

## Démarrage rapide

```bash
pnpm install
cp .env.example .env
docker compose up -d db        # PostgreSQL + bases sporty_test / sporty_e2e
node ace migration:run
pnpm db:seed                   # comptes de démo (voir ci-dessous)
pnpm dev                       # http://localhost:3333
```

Comptes de démo créés par le seed (dev et test uniquement, mot de passe `password123`) : `user@example.com`, `user2@example.com`, `admin@example.com`, `non-onboarded@example.com`.

### Configuration locale

- `.env` : valeurs par défaut du développement, copiées depuis `.env.example`. Non versionné.
- `.env.local` : surcharges personnelles (port de base différent, clés Strava…). Chargé automatiquement par AdonisJS, ignoré en `NODE_ENV=test`. Une variable déjà définie dans le shell reste prioritaire.
- `.env.test` : versionné, utilisé par `pnpm test` (base `sporty_test`, logs muets).

### Connecteurs

- **Strava** : créer une application sur <https://www.strava.com/settings/api>, puis renseigner `STRAVA_CLIENT_ID`, `STRAVA_CLIENT_SECRET` et `APP_URL`, qui sert à construire l'URL de retour OAuth.
- **open-wearables** : définir `OPEN_WEARABLES_BASE_URL`. La clé API est saisie par chaque utilisateur dans l'interface. Pour les webhooks (`POST /webhooks/open-wearables`), il faut aussi `OPEN_WEARABLES_WEBHOOK_SECRET`.
- Les jetons sont chiffrés (AES-256-GCM) avec `CONNECTOR_ENCRYPTION_KEY`. Générer une vraie clé en production.

## Commandes

| Commande          | Rôle                                                                                      |
| ----------------- | ----------------------------------------------------------------------------------------- |
| `pnpm dev`        | Serveur de dev avec HMR                                                                   |
| `pnpm run ci`     | Pipeline locale : format → lint → typecheck (back + front) → dependency-cruiser → tests   |
| `pnpm test`       | Tests Japa (unitaires + fonctionnels) avec couverture                                     |
| `pnpm test:front` | Tests Vitest des composants React                                                         |
| `pnpm test:e2e`   | Playwright sur le **build de production** (`node build/bin/server.js`), base `sporty_e2e` |
| `pnpm format`     | Prettier                                                                                  |
| `node ace build`  | Build de production dans `build/`                                                         |

Pour afficher les logs applicatifs pendant les tests : `LOG_LEVEL=debug pnpm test`.

## Docker

```bash
docker compose up -d           # app (port 3333) + PostgreSQL
```

L'image applique les migrations au démarrage (`docker/entrypoint.sh`). Les fichiers GPX sont stockés dans le volume `appstorage`. Pour une production, retirer l'exposition du port PostgreSQL et fournir `APP_KEY`, `CONNECTOR_ENCRYPTION_KEY` et les secrets Strava.

## Architecture

Clean Architecture, avec des dépendances vérifiées par dependency-cruiser : le domaine n'importe rien, et les use cases n'importent que le domaine.

```
Route → Middleware → Controller → Validator → Use case → Port (abstract class) → Repository / Service
                       app/controllers        app/use_cases   app/domain/interfaces   app/repositories, app/services
```

- `app/domain/` : entités, value objects, services purs (charge, zones, analyse).
- `app/use_cases/{feature}/` : une intention métier par fichier.
- `providers/app_provider.ts` : liaisons port → implémentation.
- `inertia/` : pages React (`pages/`), composants (`components/`), hooks et utilitaires.

Le détail des conventions (nommage, patterns de test, pièges AdonisJS) se trouve dans [`CLAUDE.md`](CLAUDE.md) et dans `_bmad-output/planning-artifacts/_shared/dev-quality-guidelines.md`.

## Notes

- **Migrations au préfixe dupliqué** : `1772000000003_add_imported_columns_to_sessions` et `1772000000003_rename_import_activities_to_import_sessions` partagent le même horodatage. Elles touchent des tables différentes (`sessions`, `import_activities`) : leur ordre, alphabétique à préfixe égal, est donc sans effet. Elles ne sont pas renommées, car les bases existantes les ont déjà enregistrées sous ces noms dans `adonis_schema`. Pour les nouvelles migrations, toujours passer par `node ace make:migration`.
