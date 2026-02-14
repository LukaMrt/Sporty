---
source: planning-artifacts/epics.md
splitDate: '2026-02-14'
status: complete
inputDocuments:
  - prd.md
  - architecture.md
  - ux-design-specification.md
---

# Sporty - Epic Breakdown

## Overview

Ce dossier contient le decoupage par epic du projet Sporty. Chaque fichier correspond a un epic et contient ses stories detaillees.

## Fichiers

| Fichier | Epic | Stories |
|---------|------|---------|
| [epic-1-squelette-technique.md](epic-1-squelette-technique.md) | Squelette Technique & Environnement de Dev | 1.1 - 1.7 |
| [epic-2-authentification.md](epic-2-authentification.md) | Authentification & Premier Acces | 2.1 - 2.5 |
| [epic-3-gestion-utilisateurs.md](epic-3-gestion-utilisateurs.md) | Gestion Utilisateurs & Profils | 3.1 - 3.6 |
| [epic-4-saisie-seances.md](epic-4-saisie-seances.md) | Saisie & Consultation de Seances | 4.1 - 4.4 |
| [epic-5-cycle-vie-seances.md](epic-5-cycle-vie-seances.md) | Cycle de Vie des Seances | 5.1 - 5.4 |
| [epic-6-dashboard-visualisation.md](epic-6-dashboard-visualisation.md) | Dashboard & Visualisation de Progression | 6.1 - 6.5 |

## Requirements Inventory

### Functional Requirements

**Gestion des Comptes & Authentification**
- FR1: Le premier utilisateur cree devient automatiquement administrateur du serveur
- FR2: L'administrateur peut creer des comptes utilisateurs
- FR3: L'administrateur peut modifier et supprimer des comptes utilisateurs
- FR4: Un utilisateur peut se connecter a son compte via identifiant et mot de passe
- FR5: Un utilisateur peut se deconnecter de son compte
- FR6: Un utilisateur peut modifier son mot de passe

**Profil Utilisateur**
- FR7: Un utilisateur peut renseigner son profil sportif (niveau, sport(s) pratique(s), objectifs)
- FR8: Un utilisateur peut configurer ses preferences d'affichage (unites : km/h, min/km, ou les deux)
- FR9: Un utilisateur peut modifier son profil et ses preferences a tout moment

**Gestion des Seances**
- FR10: Un utilisateur peut saisir manuellement une seance avec les donnees du socle commun (sport, duree, distance, FC moyenne, ressenti)
- FR11: Un utilisateur peut saisir des metriques specifiques au sport pratique lors d'une seance (ex: allure pour la course)
- FR12: Un utilisateur peut consulter la liste de ses seances passees
- FR13: Un utilisateur peut modifier une seance existante
- FR14: Un utilisateur peut supprimer une seance (soft-delete)
- FR15: Un utilisateur peut consulter ses seances supprimees
- FR16: Un utilisateur peut restaurer une seance supprimee
- FR17: Un utilisateur peut filtrer et trier ses seances (par sport, date, duree, etc.)

**Visualisation & Progression**
- FR18: Un utilisateur peut consulter un dashboard avec ses metriques cles de progression
- FR19: Un utilisateur peut visualiser des graphiques d'evolution de ses donnees (allure, FC, volume)
- FR20: Un utilisateur peut zoomer sur une periode temporelle (semaine, mois)
- FR21: Un utilisateur peut voir ses donnees affichees dans les unites qu'il a configurees

**Gestion des Sports**
- FR22: Le systeme supporte un socle commun de donnees partagees par tous les sports (duree, distance, FC, ressenti)
- FR23: Le systeme supporte des metriques specifiques par sport (extensible)
- FR24: Un utilisateur peut consulter ses donnees par sport

**Administration Serveur**
- FR25: L'administrateur peut deployer l'application via un docker-compose.yml et des variables d'environnement
- FR26: L'administrateur peut mettre a jour l'application via pull + restart du container
- FR27: L'administrateur peut consulter la liste des utilisateurs du serveur

### NonFunctional Requirements

**Performance**
- NFR1: Les actions utilisateur courantes (saisie, navigation, consultation) repondent en moins de 2 secondes sur le reseau local
- NFR2: Les graphiques de progression se chargent et s'affichent de maniere fluide avec plusieurs mois de donnees (jusqu'a ~500 seances)
- NFR3: L'application reste utilisable sur un serveur modeste (VPS entree de gamme ou Raspberry Pi-class)
- NFR4: Navigation intra-app fluide (SPA, pas de rechargement entre les vues)

**Securite**
- NFR5: Toutes les communications transitent en HTTPS
- NFR6: Authentification sessions cookie-based avec CSRF integre (Inertia)
- NFR7: Mots de passe hashes argon2 (jamais stockes en clair)
- NFR8: Inputs utilisateur sanitises pour prevenir les injections (SQL, XSS)
- NFR9: Endpoints API proteges par authentification — aucun acces anonyme aux donnees
- NFR10: Headers de securite HTTP standards (CORS, CSP, X-Frame-Options)
- NFR11: Pas de chiffrement de la base de donnees au repos (self-hosted, confiance dans l'infra)

**Maintenabilite & Operations**
- NFR12: Deploiement complet via un seul docker-compose.yml + fichier .env
- NFR13: Mise a jour via docker compose pull && docker compose up -d
- NFR14: Logs applicatifs accessibles via docker compose logs
- NFR15: Les donnees persistent dans un volume Docker (pas de perte au redemarrage)
- NFR16: Le schema de base de donnees supporte les migrations (evolutions entre versions)

### Additional Requirements

**Architecture**
- Starter template : AdonisJS Inertia Starter Kit (React) — `pnpm create adonisjs@latest sporty -- -K=inertia --adapter=react --no-ssr`
- Clean Architecture : controllers minces -> use cases -> domain -> repositories
- Colonne JSONB `sport_metrics` pour extensibilite multi-sport, validation dans le domain
- CI/CD GitHub Actions (lint, format, build, Docker push)
- Politique "warnings as errors" sur tous les outils des le jour 1 (ESLint --max-warnings 0, TypeScript strict)
- Shadcn/ui (Radix + Tailwind CSS) pour le design system
- Recharts pour les graphiques
- pnpm comme package manager
- 2 containers Docker (app + db PostgreSQL)
- Sessions cookie-based via AdonisJS guards (pas de JWT pour Inertia)
- Champ `role` sur User (`admin` | `user`), premier inscrit = admin
- Routes intentionnelles semantiques (POST /sessions/log, POST /sessions/:id/restore, etc.)
- State local React + props Inertia (pas de store global)

**UX**
- Mobile-first, desktop-enriched
- Direction design : Hybride D1+D2+D5, Variante B (hero compact + quick stats + timeline unifiee)
- Bottom tab bar mobile (4 onglets : Accueil / Seances / Planning / Profil)
- Sidebar navigation sur desktop (remplace bottom tab)
- FAB flottant "+" pour saisie rapide (mobile)
- Bottom sheet (mobile) / modale (desktop) pour la saisie de seance
- Onboarding wizard 4 etapes (sport, niveau, objectif, preferences)
- Composants custom : HeroMetric, QuickStatCard, TimelineItem, TimelineDivider, SparklineChart, SessionForm, SessionDetail, EmptyState, FAB
- Police system native, unite de base 4px
- Palette sobre : accent bleu, pas de rouge pour les echecs (gris neutre ou orange doux)
- Progressive disclosure (champs secondaires replies sous "Plus de details")
- Zones tactiles minimum 44x44px, contraste WCAG AA (4.5:1)

### FR Coverage Map

| FR | Epic | Description |
|----|------|-------------|
| FR1 | Epic 2 | Premier inscrit = admin |
| FR2 | Epic 3 | Admin cree des comptes |
| FR3 | Epic 3 | Admin modifie/supprime des comptes |
| FR4 | Epic 2 | Login utilisateur |
| FR5 | Epic 2 | Logout utilisateur |
| FR6 | Epic 3 | Changement de mot de passe |
| FR7 | Epic 3 | Profil sportif |
| FR8 | Epic 3 | Preferences d'affichage (unites) |
| FR9 | Epic 3 | Modification profil/preferences |
| FR10 | Epic 4 | Saisie seance (socle commun) |
| FR11 | Epic 4 | Metriques sport-specifiques |
| FR12 | Epic 4 | Liste des seances |
| FR13 | Epic 4 | Modification d'une seance |
| FR14 | Epic 5 | Suppression seance (soft-delete) |
| FR15 | Epic 5 | Consultation seances supprimees |
| FR16 | Epic 5 | Restauration seance |
| FR17 | Epic 5 | Filtrage et tri des seances |
| FR18 | Epic 6 | Dashboard metriques cles |
| FR19 | Epic 6 | Graphiques d'evolution |
| FR20 | Epic 6 | Zoom temporel |
| FR21 | Epic 6 | Affichage unites configurees |
| FR22 | Epic 4 | Socle commun multi-sport |
| FR23 | Epic 4 | Metriques extensibles par sport |
| FR24 | Epic 5 | Consultation par sport |
| FR25 | Epic 1 | Deploiement Docker |
| FR26 | Epic 1 | Mise a jour container |
| FR27 | Epic 3 | Liste utilisateurs admin |

## Epic List (resume)

| Epic | Titre | FRs | Stories |
|------|-------|-----|---------|
| 1 | Squelette Technique & Environnement de Dev | FR25, FR26 | 7 stories |
| 2 | Authentification & Premier Acces | FR1, FR4, FR5 | 5 stories |
| 3 | Gestion Utilisateurs & Profils | FR2, FR3, FR6, FR7, FR8, FR9, FR27 | 6 stories |
| 4 | Saisie & Consultation de Seances | FR10, FR11, FR12, FR13, FR22, FR23 | 4 stories |
| 5 | Cycle de Vie des Seances | FR14, FR15, FR16, FR17, FR24 | 4 stories |
| 6 | Dashboard & Visualisation de Progression | FR18, FR19, FR20, FR21 | 5 stories |
