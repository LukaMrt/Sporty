# Story 7.6 : Page frontend Connecteurs

Status: draft

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

- [ ] Task 1 : Route et controller ConnectorsController#index (AC: #1, #3, #6)
  - [ ] Route `GET /connectors`
  - [ ] Transmettre la liste des connecteurs (sans tokens) + `stravaConfigured`
- [ ] Task 2 : Page React `Connectors/Index` (AC: #1, #2, #4, #5)
  - [ ] Composant `ConnectorCard` avec logo, badge, boutons contextuels
  - [ ] Layout responsive : colonne mobile, grille desktop
  - [ ] Message si `stravaConfigured === false`
- [ ] Task 3 : Navigation (AC: #1)
  - [ ] Ajouter lien vers `/connectors` dans la section Profil du menu
- [ ] Task 4 : Badges colores
  - [ ] Vert `connected`, orange `error`, gris `disconnected`

## Dev Notes

### Securite des props Inertia

Ne JAMAIS transmettre `encrypted_access_token` ou `encrypted_refresh_token` au frontend. Le controller doit mapper explicitement les champs transmis.

### Design

Suivre le design system existant (Shadcn/ui, Tailwind). Badges coherents avec le reste de l'app.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.6]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md]
