---
stepsCompleted: [1, 2, 3, 4, 5, 6]
inputDocuments:
  - brainstorming-session-2026-02-13.md
date: 2026-02-13
author: Luka
workflow_completed: true
---

# Product Brief: Sporty

## Executive Summary

Sporty est une application sportive personnelle, self-hosted, qui unifie la planification d'entraînement, le suivi de séances et l'analyse de progression en une seule interface simple. L'app remplace l'assemblage fragile de Strava + plans web + suivi manuel par un outil cohérent, adaptatif et entièrement sous le contrôle de l'utilisateur.

---

## Core Vision

### Problem Statement

Les sportifs amateurs sérieux jonglent entre plusieurs outils disconnectés : une montre connectée pour les données, Strava pour l'historique, des plans d'entraînement trouvés sur le web, et leur mémoire pour tout relier. Aucune solution existante ne combine planification adaptative, suivi simple et visualisation claire dans un outil libre et self-hostable.

### Problem Impact

Sans outil unifié, l'utilisateur perd du temps à assembler ses données, ne peut pas facilement adapter ses plans à sa progression réelle, et manque de visibilité claire sur son évolution. La motivation peut en souffrir.

### Why Existing Solutions Fall Short

- **Strava** : excellent pour l'enregistrement, limité en planification et analyse fine
- **Plans web** : statiques, non connectés aux données réelles, pas d'adaptation
- **Apps premium (TrainingPeaks, etc.)** : payantes, données captives, pas self-hostable, souvent trop complexes

Aucune solution n'offre à la fois simplicité, adaptabilité, liberté des données et auto-hébergement.

### Proposed Solution

Une application web containerisée (Docker) qui permet de planifier ses entraînements, importer ses séances (Strava, fichiers GPX/FIT), suivre sa progression avec des visualisations claires, et adapter ses plans en continu — le tout hébergé chez soi.

### Key Differentiators

- **Self-hosted & libre** : données souveraines, aucun lock-in
- **Plans adaptatifs** : le plan s'ajuste à la réalité des séances effectuées
- **Simplicité en surface, puissance en profondeur** : interface minimaliste, moteur intelligent accessible
- **API-first** : architecture ouverte et extensible

## Target Users

### Primary Users

**Persona 1 — Le sportif connecté (ex: Marc, 32 ans)**
Sportif régulier qui utilise déjà une montre connectée et Strava. Frustré par l'éparpillement de ses données et l'absence de plans adaptatifs. Il arrive sur Sporty pour importer son historique et enfin avoir planification + suivi + analyse au même endroit.

**Persona 2 — Le débutant motivé (ex: Sarah, 27 ans)**
Veut se mettre à la course à pied sérieusement mais ne sait pas par où commencer. Elle arrive sur Sporty, renseigne son niveau et ses disponibilités, et obtient un plan adapté. L'app l'accompagne sans la culpabiliser.

**Persona 3 — Le curieux (ex: Alex, 40 ans)**
Cherche un outil libre et self-hosted pour gérer son entraînement. Il teste Sporty en créant un plan et quelques séances pour voir si l'outil lui convient avant de s'engager.

### Secondary Users

N/A — Sporty est un outil strictement personnel. Pas de rôle coach, admin ou professionnel.

### User Journey

1. **Découverte** : L'utilisateur trouve Sporty (GitHub, bouche-à-oreille, communauté self-hosted)
2. **Onboarding** : Il déploie le container Docker, crée son compte, renseigne son profil (niveau, sport, objectifs)
3. **Premier usage** : Selon son profil — importe ses données existantes, crée un plan, ou les deux
4. **Usage quotidien** : Consulte son plan, enregistre/importe ses séances, visualise sa progression
5. **Moment "aha"** : Il voit son plan s'adapter automatiquement après une séance et comprend la valeur
6. **Long terme** : Sporty devient son outil central d'entraînement, il ajoute de nouveaux sports au fil du temps

### Scope sportif

- **V1** : Course à pied (focus initial)
- **Architecture modulaire** : conçue pour ajouter facilement d'autres sports (vélo, natation, etc.)

## Success Metrics

### Métriques utilisateur

- **Adhérence au plan** : l'utilisateur suit les séances planifiées (taux de complétion des séances prévues)
- **Rétention** : l'utilisateur revient régulièrement (usage hebdomadaire continu sur plusieurs mois)
- **Abandon des anciens outils** : Sporty devient l'outil principal, plus besoin de jongler entre Strava/plans web/tableurs
- **Satisfaction des plans** : l'utilisateur accepte les plans et adaptations proposés sans les modifier constamment

### Business Objectives

N/A — Projet personnel. Le succès se mesure à l'envie de l'utiliser soi-même au quotidien.

### Key Performance Indicators

| KPI                              | Mesure                                      | Cible                          |
| -------------------------------- | ------------------------------------------- | ------------------------------ |
| Séances complétées vs planifiées | % de complétion hebdomadaire                | > 70%                          |
| Régularité d'utilisation         | Connexions par semaine                      | Utilisation stable sur 3+ mois |
| Remplacement d'outils            | Nombre d'outils externes encore nécessaires | 0 (Sporty suffit)              |
| Satisfaction personnelle         | "Est-ce que j'aime utiliser cette app ?"    | Oui                            |

## MVP Scope

### Core Features (MVP 0 + 1 + 2)

**MVP 0 — Squelette technique**
- Container Docker fonctionnel
- API de base + système de comptes
- Modèle de données initial (utilisateur, sports, séances)
- Interface minimale

**MVP 1 — Enregistrer ses séances**
- Saisie manuelle (sport, durée, distance, FC, ressenti)
- Liste des séances passées
- Vue timeline basique

**MVP 2 — Voir sa progression**
- Dashboard avec métriques clés
- Graphiques d'évolution (vitesse, FC, volume)
- Zoom temporel (semaine/mois)

### Out of Scope for MVP

- Import Strava / GPX / FIT (MVP 3)
- Plans d'entraînement adaptatifs (MVP 4)
- Coaching proactif et score readiness (MVP 5)
- Multi-sport avancé, export rapport, personnalisation poussée (MVP 6)
- Application mobile native

### MVP Success Criteria

- L'app tourne en Docker, je peux me connecter et créer un compte
- Je peux enregistrer mes séances de course manuellement
- Je peux visualiser ma progression sur les dernières semaines/mois
- L'expérience est simple et agréable — je préfère l'utiliser plutôt que mon setup actuel

### Future Vision

| Phase | Objectif                                                               |
| ----- | ---------------------------------------------------------------------- |
| MVP 3 | Import automatique (Strava, GPX/FIT), détection auto du type de séance |
| MVP 4 | Plans adaptatifs goal-first, timeline unifiée plan + historique        |
| MVP 5 | Coaching intelligent, score readiness, prévention surentraînement      |
| MVP 6 | Modes simple/expert, multi-sport unifié, export rapport, API ouverte   |

Architecture modulaire dès le départ pour faciliter l'ajout progressif de sports et fonctionnalités.
