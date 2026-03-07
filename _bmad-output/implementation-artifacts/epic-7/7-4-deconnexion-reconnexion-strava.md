# Story 7.4 : Deconnexion & reconnexion Strava

Status: draft

## Story

As a **utilisateur avec un connecteur Strava**,
I want **deconnecter Strava ou reconnecter en cas d'erreur**,
so that **j'ai le controle sur la connexion et je peux corriger les problemes** (FR2, FR3, FR4).

## Acceptance Criteria

1. **Given** mon connecteur est en etat `connected` **When** je suis sur la page Connecteurs **Then** je vois l'etat "Connecte" (badge vert), la date du dernier sync, et un bouton "Deconnecter"
2. **Given** je clique "Deconnecter" et confirme **When** la requete est traitee **Then** `POST https://www.strava.com/oauth/deauthorize` est envoye, les tokens sont supprimes, le connecteur passe en `disconnected`, un toast confirme
3. **Given** mon connecteur est en etat `error` **When** je suis sur la page Connecteurs **Then** je vois l'etat "Erreur" (badge orange) et un bouton "Reconnecter"
4. **Given** je clique "Reconnecter" **When** le flow OAuth se relance **Then** le meme flux que Story 7.3 est execute et le connecteur repasse en `connected`
5. **Given** la requete deauthorize echoue (Strava indisponible) **When** la deconnexion est traitee **Then** les tokens sont quand meme supprimes localement et le connecteur passe en `disconnected`

## Tasks / Subtasks

- [ ] Task 1 : Use case DisconnectStrava (AC: #2, #5)
  - [ ] Appel deauthorize Strava (best-effort, pas bloquant)
  - [ ] Supprimer tokens, passer status a `disconnected`
- [ ] Task 2 : Route et controller disconnect (AC: #2)
  - [ ] Route `POST /connectors/strava/disconnect`
  - [ ] Confirmation cote frontend avant envoi
- [ ] Task 3 : Bouton Reconnecter (AC: #3, #4)
  - [ ] Reutilise le flow authorize de Story 7.3
- [ ] Task 4 : Affichage contextuel des etats (AC: #1, #3)
  - [ ] Badge vert/orange/gris selon status
  - [ ] Boutons contextuels

## Dev Notes

### Deauthorize best-effort

La deconnexion locale doit toujours reussir, meme si l'appel Strava echoue. On catch l'erreur et on continue.

### References

- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.4]
