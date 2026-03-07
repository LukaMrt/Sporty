# Story 9.1 : Settings auto import

Status: draft

## Story

As a **utilisateur avec un connecteur Strava connecte**,
I want **activer l'import automatique et configurer l'intervalle de polling**,
so that **mes nouvelles seances arrivent dans Sporty sans intervention** (FR14, FR15).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `connected` **When** je suis sur la page Connecteurs **Then** je vois un toggle "Import automatique" (OFF par defaut) et un champ "Intervalle de polling" (defaut: 15 min)
2. **Given** j'active le toggle **When** la requete est traitee **Then** `auto_import_enabled` passe a `true`, toast confirme
3. **Given** je modifie l'intervalle a 10 minutes **When** je sauvegarde **Then** `polling_interval_minutes` passe a 10, le prochain cycle utilisera ce nouvel intervalle
4. **Given** je desactive le toggle **When** la requete est traitee **Then** `auto_import_enabled` passe a `false`, le polling s'arrete, toast confirme
5. **Given** mon connecteur est en etat `error` ou `disconnected` **When** je regarde le toggle **Then** il est desactive et non interactif (grise)

## Tasks / Subtasks

- [ ] Task 1 : Route et controller settings (AC: #2, #3, #4)
  - [ ] Route `POST /connectors/strava/settings`
  - [ ] Accepter `auto_import_enabled` et `polling_interval_minutes`
  - [ ] Mettre a jour le connecteur en base
  - [ ] Notifier le SyncScheduler du changement
- [ ] Task 2 : Frontend toggle et intervalle (AC: #1, #5)
  - [ ] Toggle Shadcn Switch pour auto import
  - [ ] Input number pour l'intervalle (min: 5, max: 60)
  - [ ] Desactive si connecteur pas `connected`
- [ ] Task 3 : Validation
  - [ ] Intervalle entre 5 et 60 minutes
  - [ ] VineJS validator

## Dev Notes

### Notification au SyncScheduler

Quand les settings changent, le controller doit notifier le SyncScheduler pour qu'il mette a jour ou supprime le `setInterval` correspondant. Utiliser le IoC container pour acceder au singleton.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 9.1]
