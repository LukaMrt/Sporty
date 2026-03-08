# Story 7.6 : Page frontend Connecteurs

Status: done

## Story

As a **utilisateur connecte**,
I want **une page dans mes parametres pour gerer mes connecteurs**,
so that **je peux voir l'etat de mes connexions et les gerer en un coup d'oeil** (FR3).

## Acceptance Criteria

1. **Given** je navigue vers Profil > Connecteurs **When** la page se charge **Then** je vois une `ConnectorCard` pour Strava avec logo, etat (badge colore), date du dernier sync
2. **Given** le connecteur est connecte/erreur/deconnecte **When** je vois la card **Then** les boutons d'action sont contextuels : "Deconnecter" / "Reconnecter" / "Connecter"
3. **Given** les credentials admin ne sont pas configures **When** la page se charge **Then** aucune card, un message explique que la fonctionnalite n'est pas activee
4. **Given** je suis sur mobile (< 768px) **When** je regarde la page **Then** les cards sont en pleine largeur, empilees
5. **Given** je suis sur desktop **When** je regarde la page **Then** les cards sont dans une grille
6. **Given** la page est rendue **When** je verifie les props Inertia **Then** les tokens ne sont jamais exposes (seuls provider, status, lastSyncAt sont transmis)

## Tasks / Subtasks

- [x] Task 1 : Route et controller ConnectorsController#index (AC: #1, #3, #6)
  - [x] Route `GET /connectors`
  - [x] Transmettre la liste des connecteurs (sans tokens) + `stravaConfigured`
- [x] Task 2 : Page React `Connectors/Index` (AC: #1, #2, #4, #5)
  - [x] Composant `ConnectorCard` avec logo, badge, boutons contextuels
  - [x] Layout responsive : colonne mobile, grille desktop
  - [x] Message si `stravaConfigured === false`
- [x] Task 3 : Navigation (AC: #1)
  - [x] Ajouter lien vers `/connectors` dans la section Profil du menu
- [x] Task 4 : Badges colores
  - [x] Vert `connected`, orange `error` (disconnected supprimé — non pertinent)

## Dev Notes

### Securite des props Inertia

Ne JAMAIS transmettre `encrypted_access_token` ou `encrypted_refresh_token` au frontend. Le controller doit mapper explicitement les champs transmis.

### Design

Suivre le design system existant (Shadcn/ui, Tailwind). Badges coherents avec le reste de l'app.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]

## Dev Agent Record

### Implementation Notes

- `ConnectorStatus.Disconnected` supprimé de l'enum — statut non pertinent en pratique (null = non connecté).
- Bug corrigé dans `Index.tsx` : `!stravaStatus` remplacé par `stravaStatus === null` (string 'disconnected' est truthy).
- Message d'empty state ajouté quand `stravaConfigured === false` (AC#3).
- Clés i18n `notConfigured` ajoutées en FR et EN.
- 4 tests fonctionnels ajoutés (`connectors_index.spec.ts`) : auth guard, props stravaStatus null/connected/error, tokens absents des props (AC#6).

### File List

- `app/domain/value_objects/connector_status.ts` — suppression de `Disconnected`
- `inertia/pages/Connectors/Index.tsx` — fix null check, message !stravaConfigured, type mis à jour
- `resources/lang/fr/connectors.json` — ajout clé `notConfigured`
- `resources/lang/en/connectors.json` — ajout clé `notConfigured`
- `tests/functional/connectors/connectors_index.spec.ts` — nouveau fichier de tests

### Change Log

- 2026-03-08 : Story 7.6 implémentée — page frontend connecteurs, fix bugs Index.tsx, tests fonctionnels
