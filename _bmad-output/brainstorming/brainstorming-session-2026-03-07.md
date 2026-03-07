---
stepsCompleted: [1, 2, 3, 4]
inputDocuments: []
session_topic: "Systeme d'import de seances depuis des sources externes (Strava first, extensible)"
session_goals: "Identifier les zones d'ombre, cadrer pour un PRD, valider le design extensible"
selected_approach: 'ai-recommended'
techniques_used: ['question-storming', 'assumption-reversal', 'chaos-engineering']
ideas_generated: [53 questions, 10 hypotheses, 5 scenarios]
context_file: ''
session_active: false
workflow_completed: true
---

# Brainstorming Session Results

**Facilitateur:** Luka
**Date:** 2026-03-07

## Session Overview

**Sujet :** Systeme d'import de seances sportives depuis des sources externes (Strava en priorite, extensible a Garmin, fichiers, etc.)
**Objectifs :** Identifier les zones d'ombre et cas edge, cadrer l'architecture pour un PRD, valider le design extensible des connecteurs

### Session Setup

- Vision initiale claire : interface profil avec connecteurs, page d'import avec liste de seances, actions ignorer/importer
- Scope reduit et cible : Strava d'abord, mais architecture extensible
- Objectif : passer d'une vision solide a un design robuste et complet

## Technique Selection

**Approche :** Techniques recommandees par l'IA
**Contexte d'analyse :** Systeme d'import extensible avec focus sur les zones d'ombre

**Techniques recommandees :**

- **Question Storming :** Generer des questions (pas des reponses) pour reveler les angles morts du design
- **Assumption Reversal :** Identifier et inverser les hypotheses implicites pour trouver les failles
- **Chaos Engineering :** Casser volontairement le systeme pour decouvrir les cas edge et la resilience

**Raisonnement IA :** Vision deja claire -> besoin de stress-test plutot que d'ideation libre. Sequence concue pour cartographier les inconnues, puis challenger les certitudes, puis tester la robustesse.

## Technique Execution Results

### Question Storming (53 questions - 9 domaines)

**Fil 1 : Authentification & Connexion**
1. Quand l'utilisateur connecte Strava pour la premiere fois, que voit-il ? Historique complet ou seulement les nouvelles seances ?
2. Si un utilisateur a 3 ans d'historique Strava, comment gerer l'import initial massif ?
3. L'import est-il ponctuel ou continu (sync automatique en arriere-plan) ?
4. Qui declenche l'import — l'utilisateur a la demande, ou le systeme via webhook/polling ?
5. Strava utilise OAuth2 — redirection vers Strava pour autoriser, ou credentials dans Sporty ?
6. Quels scopes/permissions demander a Strava ? Lecture seule suffit-elle ?
7. Que se passe-t-il quand le token OAuth expire ? Refresh automatique ou re-connexion manuelle ?
8. L'utilisateur peut-il revoquer l'acces depuis Sporty ? Et si il revoque depuis Strava ?
9. Peut-on connecter plusieurs comptes Strava au meme profil Sporty ?

**Fil 2 : Visualisation pre-import & Navigation**
10. Comment presenter une longue liste de seances (pagination, scroll infini, filtres) ?
11. Quel niveau de detail montrer dans la liste pre-import ?
12. Comment distinguer visuellement les seances deja importees, ignorees, et nouvelles ?
13. Peut-on filtrer par plage de dates ?
14. Peut-on filtrer par type d'activite ?
15. La liste montre-t-elle un apercu de la seance (mini carte, stats cles) ?

**Fil 3 : Processus d'import**
16. L'import est-il instantane ou asynchrone (queue/job) ?
17. Peut-on importer en lot ou seulement une par une ?
18. Que voit l'utilisateur pendant l'import ? Barre de progression ?
19. Apres un import, l'utilisateur atterrit ou ?
20. Peut-on annuler un import en cours ? Supprimer une seance importee ?

**Fil 4 : Mapping & Integration**
21. Comment les seances importees s'integrent dans les statistiques globales ?
22. Les seances importees ont-elles le meme poids que les seances manuelles ?
23. Si l'utilisateur modifie une seance sur Strava apres import, Sporty se met-il a jour ?
24. Comment mapper les zones de frequence cardiaque Strava vers celles de Sporty ?
25. Que faire si une seance importee a des donnees que Sporty ne gere pas encore ?

**Fil 5 : Securite**
26. Ou et comment stocker les tokens OAuth ? En base chiffres ? Vault ?
27. Les tokens passent-ils par le frontend ?
28. En cas de fuite de la base, les tokens sont-ils exploitables ?
29. L'API d'import expose-t-elle des endpoints vulnerables (IDOR) ?
30. Les logs risquent-ils de logger des tokens ?

**Fil 6 : Deconnexion & Suppression**
31. Quand on deconnecte un connecteur, que deviennent les seances importees ?
32. L'utilisateur doit-il confirmer que les seances restent ?
33. Deconnecter le connecteur revoque-t-il l'acces cote Strava ?
34. Si l'utilisateur reconnecte le meme compte, retrouve-t-on l'etat precedent ?
35. Peut-on supprimer le connecteur ET garder les seances ?

**Fil 7 : Doublons**
36. Sur quel critere detecter un doublon ?
37. Que faire si l'utilisateur a cree manuellement une seance qui correspond a une seance Strava ?
38. Si une seance importee est supprimee, la re-proposer a l'import ?
39. Import depuis deux sources de la meme seance reelle — comment detecter ?
40. Detection de doublons a l'affichage ou a l'import ?

**Fil 8 : Rate Limiting API**
41. Strava limite a ~200 req/15min et 2000/jour — comment repartir le budget ?
42. Si on atteint la limite, file d'attente ou erreur ?
43. Faut-il un cache local des seances deja recuperees ?
44. Le polling consomme-t-il du budget API meme quand l'utilisateur n'est pas connecte ?
45. Comment prioriser : utilisateur actif vs. sync automatique ?

**Fil 9 : Gestion d'erreurs**
46. Que montrer si l'API Strava est down ?
47. Si un import echoue en milieu de lot, que faire des seances deja importees ?
48. Si le token est expire au moment d'un import, quelle UX ?
49. Comment gerer les donnees corrompues ou incompletes venant de Strava ?
50. L'utilisateur est-il notifie des erreurs silencieuses (sync background qui echoue) ?
51. Comment gerer les types d'activites non supportes par Sporty ?
52. Que faire des champs Strava sans equivalent dans Sporty ?
53. Mapping partiel : on importe avec ce qu'on a, on affiche les infos disponibles

### Assumption Reversal (10 hypotheses)

| #   | Hypothese                               | Decision                                                                            |
| --- | --------------------------------------- | ----------------------------------------------------------------------------------- |
| H1  | L'utilisateur choisit seance par seance | **Import auto configurable** — bouton ON/OFF dans config profil                     |
| H2  | 1 connecteur = 1 source                 | **Confirme** — pas d'agregation multi-sources                                       |
| H3  | Import entrant uniquement               | **Confirme** — pas d'export depuis Sporty                                           |
| H4  | Config connecteurs dans le profil       | **Multi-points d'entree** — parametres globaux + proposition a l'onboarding         |
| H5  | Seances importees = meme modele         | **Confirme** — mapper vers modele Sporty, si modele evolue les connecteurs suivent  |
| H6  | Import via API officielle               | **API d'abord, fichiers plus tard** — GPX/FIT/TCX = future iteration                |
| H7  | 1 compte par source externe             | **Confirme** — simple pour le moment                                                |
| H8  | Donnees Strava fiables et completes     | **Mapping partiel OK** — on importe ce qu'on peut, on affiche les infos disponibles |
| H9  | Import initie par l'utilisateur (pull)  | **Pull par defaut** — webhook en option future (self-hosted = pas d'URL publique)   |
| H10 | Page dediee separee                     | **Confirme** — page separee + reflet visible dans le calendrier apres import        |

### Chaos Engineering (5 scenarios)

| Scenario                 | Probleme                                    | Decision                                                                                                          |
| ------------------------ | ------------------------------------------- | ----------------------------------------------------------------------------------------------------------------- |
| **L'avalanche**          | 1200 activites a l'import initial           | Limiter a 1 mois par defaut + selecteur de plage. Spinner avec compteur seances recues/traitees.                  |
| **Le fantome**           | Seances supprimees cote Strava apres import | Pas de sync bilaterale. Import = copie definitive = seance Sporty. Metadonnee source conservee.                   |
| **Le doublon sournois**  | Seance manuelle + meme seance sur Strava    | Pas de detection automatique. Tout apparait dans la liste. L'utilisateur gere.                                    |
| **Le token mort**        | Token OAuth expire/revoque                  | Etat "erreur" visible dans le profil. Invite a reconnecter. Seances existantes non affectees.                     |
| **Le self-hosted isole** | Pas d'URL publique pour callbacks           | Polling avec retry a intervalle configurable (~10-15min). OAuth callback sans URL publique = a traiter plus tard. |

## Idea Organization and Prioritization

### Theme 1 : Authentification & Gestion des connecteurs

- OAuth2 avec redirection vers Strava (pas de credentials dans Sporty)
- Gestion cycle de vie des tokens (expiration, refresh, revocation)
- Etat du connecteur visible dans le profil (connecte / erreur / deconnecte)
- 1 compte par source, 1 connecteur par source
- Points d'entree multiples : parametres globaux + onboarding
- Deconnexion du connecteur ne touche pas les seances importees

### Theme 2 : Flux d'import & UX

- Mode configurable : import auto OU import manuel (selection par l'utilisateur)
- Liste pre-import limitee a 1 mois par defaut + selecteur de plage
- Apercu des seances avec infos cles (date, type, duree, logo source)
- Import en lot possible + spinner avec compteur de progression
- 3 etats visuels par seance : nouvelle / importee / ignoree
- Apres import -> seance visible dans le calendrier

### Theme 3 : Architecture du systeme de connecteurs

- **Pattern "one-way snapshot"** : import = copie definitive, pas de sync bilaterale
- Metadonnee "source" conservee sur chaque seance (ex: importedFrom: strava)
- Architecture extensible : Strava d'abord, Garmin/fichiers plus tard
- Fichiers (GPX/FIT/TCX) = futur connecteur separe
- Polling par defaut (intervalle configurable ~10-15min), webhook en option future
- Pas d'export depuis Sporty

### Theme 4 : Mapping des donnees & Integration

- Mapper les donnees Strava vers le modele Sporty existant
- Seances importees = meme statut que seances manuelles
- Si mapping partiel : on importe ce qu'on peut, on affiche les infos disponibles
- Integration complete dans les stats, dashboard, calendrier
- Si le modele Sporty evolue, les connecteurs s'adaptent (pas l'inverse)

### Theme 5 : Robustesse & Cas edge

- Pas de detection automatique de doublons — l'utilisateur gere
- Pas de suppression en cascade si la source supprime une activite
- Token mort -> etat erreur visible, invite a reconnecter
- Donnees incompletes -> on affiche ce qu'on a
- Self-hosted : OAuth callback sans URL publique = a traiter plus tard

### Theme 6 : Securite

- Tokens OAuth stockes de maniere securisee (chiffrement en base ou vault)
- Tokens jamais exposes cote frontend
- Pas de logging accidentel des tokens
- Protection IDOR sur les endpoints d'import

### Concepts transversaux

- **Import = snapshot** : principe architectural fort qui simplifie tout le systeme, pas de sync bilaterale
- **Connecteur comme entite a etat** : connecte/erreur/deconnecte — pattern reutilisable pour chaque future integration
- **Config utilisateur** : import auto vs manuel, intervalle de polling — respect de l'autonomie utilisateur

## Session Summary

**Techniques utilisees :** Question Storming, Assumption Reversal, Chaos Engineering
**Production :** 53 questions, 10 hypotheses tranchees, 5 scenarios de rupture
**Themes identifies :** 6 themes + concepts transversaux

**Decisions architecturales cles :**

1. One-way snapshot (pas de sync bilaterale)
2. Import auto configurable (ON/OFF)
3. Polling par defaut, webhook optionnel futur
4. 1 mois par defaut + selecteur de plage
5. Mapping partiel accepte — on affiche ce qu'on a
6. Pas de detection de doublons automatique
7. Connecteur comme entite a etat (connecte/erreur/deconnecte)
8. Multi-points d'entree pour la config (profil + onboarding)

**Prochaine etape :** Creer un PRD a partir de ce document.
