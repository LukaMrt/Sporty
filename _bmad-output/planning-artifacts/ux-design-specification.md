---
stepsCompleted: [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11]
inputDocuments:
  - product-brief-Sporty-2026-02-13.md
  - prd.md
  - brainstorming-session-2026-02-13.md
---

# UX Design Specification Sporty

**Author:** Luka
**Date:** 2026-02-14

---

## Executive Summary

### Project Vision

Sporty est un outil d'entraînement personnel self-hosted qui unifie saisie, planification, suivi et analyse sportive. Le principe directeur UX est "simplicité en surface, puissance en profondeur" — une interface minimaliste qui cache un moteur intelligent. L'app propose, l'utilisateur dispose. Zéro culpabilité, contrôle total.

### Target Users

- **Marc (sportif connecté, 32 ans)** — Utilisateur régulier de montre connectée et Strava, frustré par l'éparpillement de ses données. Cherche un outil unique pour voir sa progression clairement. À l'aise avec les dashboards.
- **Sarah (débutante motivée, 27 ans)** — Veut se mettre à la course avec un outil qui l'accompagne sans la juger ni la submerger. Besoin de clarté et de simplicité dans les métriques affichées.
- **Luka/Admin** — Déploie et maintient l'instance. Gère les comptes. Veut un déploiement et une maintenance minimaux.

**Contexte d'utilisation :** Principalement mobile, souvent juste après une séance (saisie rapide) ou pour consulter le planning à venir. Desktop pour l'analyse approfondie et la consultation des dashboards détaillés. L'approche de design doit être mobile-first avec enrichissement desktop.

### Key Design Challenges

1. **Dualité mobile/desktop** — Saisie ultra-rapide sur mobile (< 30s) vs dashboards riches sur desktop. Pas un simple responsive mais une vraie adaptation des parcours selon le device.
2. **Disclosure progressive** — Montrer les métriques clés immédiatement, offrir le détail à la demande. Chaque écran répond à "qu'est-ce que je veux voir en premier ?".
3. **Multi-contexte d'usage** — Trois intentions distinctes (saisie post-séance, consultation planning, analyse progression) cohabitent sans friction dans une navigation unifiée.

### Design Opportunities

1. **Expérience "zéro culpabilité"** — Ton bienveillant et factuel, aucune gamification culpabilisante. L'app constate et ajuste, ne juge jamais.
2. **Timeline unifiée** — Plan + historique dans un flux continu. Le passé = ce qui a été fait, le futur = ce que l'app propose. Pattern de navigation central.
3. **Données narratives** — Progression racontée en langage humain plutôt qu'en chiffres bruts, rendant les insights accessibles à tous les niveaux.

## Core User Experience

### Defining Experience

L'expérience fondamentale de Sporty est la **consultation de sa progression**. L'utilisateur ouvre l'app pour se voir progresser — pas pour saisir des données. La saisie de séances est un moyen, pas une fin : elle doit tendre vers l'invisible grâce aux imports automatiques et à la détection intelligente.

La boucle core :
1. **Je m'entraîne** (hors app)
2. **Mes données arrivent** (import auto, détection, ou saisie rapide en dernier recours)
3. **Je vois où j'en suis** (dashboard, tendances, insights)

Le produit livre sa valeur à l'étape 3. Les étapes 1 et 2 doivent être aussi transparentes que possible.

### Platform Strategy

- **Mobile-first** — L'usage principal est sur téléphone : consultation rapide du planning, saisie post-séance quand nécessaire, coup d'oeil à la progression
- **Desktop-enriched** — Sur PC, les dashboards s'étendent : graphiques détaillés, zoom temporel, analyse approfondie. Le contenu est le même, la profondeur augmente
- **Web app responsive (SPA)** — Pas d'app native, une PWA à considérer pour l'accès rapide mobile
- **Touch-first, keyboard-friendly** — Navigation tactile prioritaire, raccourcis clavier en bonus desktop
- **Online-only au MVP** — Pas de mode offline pour l'instant

### Effortless Interactions

- **Consultation progression** — Ouvrir l'app = voir immédiatement ses métriques clés. Zéro tap pour l'essentiel, un tap pour le détail
- **Saisie de séance** — Quand nécessaire : formulaire pré-rempli intelligemment, champs minimum obligatoires, le reste optionnel. Objectif < 30 secondes
- **Import automatique** (post-MVP) — Strava, GPX/FIT : les séances arrivent sans intervention
- **Navigation entre contextes** — Passer de "ma progression" à "mon planning" à "saisir une séance" en un tap maximum
- **Correction d'erreur** — Modifier une séance aussi vite que la saisir

### Critical Success Moments

1. **Premier dashboard** — L'utilisateur voit ses premières données affichées clairement. Pas de superflu, pas de survendu. "C'est simple, c'est clair, c'est ce que je voulais."
2. **Première tendance visible** — Après quelques séances, une courbe montre une évolution. Le moment "aha" : "Je VOIS que je progresse."
3. **Saisie éclair** — La première séance saisie en quelques secondes. "C'est vraiment rapide."
4. **Plan qui s'adapte** (post-MVP) — Le plan se recalcule après une séance. "L'app comprend ma réalité."

### Experience Principles

1. **La progression d'abord** — L'écran d'accueil montre où tu en es, pas ce que tu dois faire. La donnée la plus importante est toujours visible en premier.
2. **La saisie tend vers zéro** — Chaque fonctionnalité d'import ou de détection réduit le besoin de saisie manuelle. L'objectif à terme : l'utilisateur n'a presque rien à faire.
3. **Clarté sans superflu** — Pas de survendu, pas de décoration. Chaque élément affiché a une raison d'être. Si ça n'aide pas l'utilisateur, ça n'existe pas.
4. **Profondeur à la demande** — Les métriques clés sont en surface. Le détail est à un tap. L'analyse poussée à deux taps. Jamais plus.
5. **Bienveillance factuelle** — L'app montre les faits, ne porte aucun jugement. Le ton est neutre, encourageant par les données, jamais culpabilisant.

## Desired Emotional Response

### Primary Emotional Goals

- **Fierté personnelle** — L'utilisateur se sent fier de SA progression, pas comparé aux autres. "Je suis meilleur qu'hier" plutôt que "je suis meilleur que les autres". Une fierté intime et motivante.
- **Satisfaction tranquille** — Après consultation du dashboard, le sentiment de "tout est clair, je sais où j'en suis". Pas d'excitation artificielle, une satisfaction authentique.
- **Contrôle total** — "C'est mon outil, mes données, mon rythme." Aucune pression extérieure, aucun jugement.

### Emotional Journey Mapping

| Moment | Émotion visée | Ce que l'app fait |
|--------|--------------|-------------------|
| **Ouverture de l'app** | Curiosité tranquille | Affiche immédiatement la progression, pas de splash screen ni de notifications agressives |
| **Séances régulières, progression visible** | Fierté, motivation | Met en valeur les tendances positives. Encourage à continuer sans en faire trop |
| **Séance ratée / pause longue** | Sérénité, léger encouragement | Ajuste le plan silencieusement. Un message subtil ("Tu reprends, le plan s'adapte") sans culpabiliser |
| **Régression des métriques** | Lucidité sans anxiété | Montre les faits clairement. N'essaie pas de cacher la réalité, mais ne dramatise pas |
| **Première tendance positive** | Fierté, déclic | Le moment "aha" — les données montrent concrètement l'amélioration. L'app peut souligner ce moment |
| **Retour après absence** | Accueil neutre | Pas de "Tu nous as manqué !" ni de compteur de jours manqués. Juste l'état actuel, prêt à repartir |

### Micro-Emotions

**À cultiver :**
- **Confiance** — L'interface est prévisible, les données sont fiables, l'utilisateur sait toujours où il est
- **Autonomie** — L'utilisateur choisit son niveau d'interaction : consultation silencieuse ou échange avec l'app
- **Accomplissement** — Chaque séance enregistrée, chaque tendance visible nourrit un sentiment de progression

**À éviter absolument :**
- **Culpabilité** — Aucun compteur de séries, aucun "tu as raté X séances", aucune notification de rappel culpabilisante
- **Comparaison sociale** — Aucun classement, aucune référence aux autres utilisateurs
- **Anxiété de performance** — Pas d'objectifs imposés, pas de rouge/vert agressif sur les résultats
- **Surexcitation artificielle** — Pas de badges, pas de confettis, pas de gamification forcée

### Design Implications

| Émotion visée | Implication UX |
|---------------|----------------|
| Fierté personnelle | Graphiques de tendance centrés sur l'évolution individuelle. Highlights subtils sur les améliorations ("Allure moyenne : -15s/km ce mois") |
| Satisfaction tranquille | Dashboard épuré, hiérarchie visuelle claire. L'info importante se lit en 2 secondes |
| Contrôle | Paramétrage du niveau de "feedback" de l'app : silencieux / factuel / encourageant. L'utilisateur choisit |
| Sérénité face à l'échec | Recalcul silencieux du plan. Ton neutre-positif dans les messages. Aucun indicateur de "retard" |
| Copain discret | Insights et commentaires disponibles mais non imposés. Un espace "ce que l'app a remarqué" consultable à la demande |

### Emotional Design Principles

1. **Le copain discret** — L'app a de la personnalité quand on la sollicite, mais sait se faire silencieuse quand on veut juste ses chiffres. Le niveau de "voix" est configurable.
2. **Fierté intime** — Toute célébration est personnelle et factuelle. "Tu cours 1 min/km plus vite qu'il y a 2 mois" plutôt que des badges ou des trophées.
3. **L'échec n'existe pas** — Une séance ratée est un plan réajusté. Une pause est un nouveau point de départ. L'app ne connaît que "avant" et "maintenant".
4. **Factuel d'abord, humain en option** — Les données brutes sont toujours accessibles. Les interprétations et encouragements sont une couche supplémentaire, jamais obligatoire.

## UX Pattern Analysis & Inspiration

### Inspiring Products Analysis

**Strava (référence directe — ce qu'on garde, ce qu'on corrige)**
- *Ce qui marche :* Enregistrement fiable, feed d'activités clair, cartes de parcours lisibles
- *Ce qui frustre :* Fonctionnalités clés derrière un paywall, pas de planification intégrée, pas de vision long terme sur les objectifs, analyse déconnectée des objectifs personnels
- *Leçon pour Sporty :* Reprendre la clarté du feed d'activités, mais y ajouter la dimension "plan + progression vers un objectif" que Strava n'offre pas

**Patterns UX transversaux inspirants (basés sur les principes de Sporty) :**
- *Apps bancaires modernes (Revolut, N26)* — Dashboard immédiat à l'ouverture, chiffre clé en gros, détails en scroll/tap. Exactement le modèle "profondeur à la demande" qu'on vise
- *Apps météo minimalistes* — Information essentielle visible instantanément, prévisions (= notre planning) en scroll naturel. Zéro friction pour l'info quotidienne
- *Apple Health / Santé* — Résumés visuels propres, tendances sur le temps, cartes compactes expansibles. Le pattern de disclosure progressive parfait

### Transferable UX Patterns

**Navigation :**
- **Bottom tab bar (mobile)** — 3-4 onglets max : Dashboard / Séances / Planning / Profil. Navigation en un tap entre les contextes principaux
- **Dashboard-first** — L'app s'ouvre directement sur la progression, pas sur un menu ou un feed social
- **Scroll vertical naturel** — Les détails se découvrent en scrollant, pas en naviguant vers d'autres pages

**Interaction :**
- **Cartes compactes expansibles** — Chaque métrique est une carte : résumé visible, tap pour détail. Le pattern Apple Health
- **Formulaire minimal + optionnel** — Saisie de séance : 3-4 champs obligatoires en haut, le reste en section "Plus de détails" repliée
- **Swipe pour les périodes temporelles** — Semaine ↔ Mois ↔ Trimestre en swipe horizontal sur les graphiques

**Visuel :**
- **Hiérarchie typographique forte** — Un gros chiffre (métrique clé), un sous-titre (contexte), un micro-graphique (tendance). Lisible en 2 secondes
- **Couleurs fonctionnelles, pas décoratives** — Palette neutre/sobre avec une couleur d'accent pour les tendances positives. Pas de rouge pour les "échecs"
- **Graphiques simples** — Courbes de tendance plutôt que graphiques complexes. La tendance se lit, pas besoin de l'interpréter

### Anti-Patterns to Avoid

| Anti-pattern | Pourquoi l'éviter | Alternative Sporty |
|-------------|-------------------|-------------------|
| **Paywall sur les fonctionnalités utiles** | Frustration majeure, sentiment de manipulation | Tout est gratuit et ouvert. Self-hosted = pas de modèle économique à nourrir |
| **Parcours longs et complexes** | L'utilisateur veut voir ses données, pas naviguer dans des menus | Maximum 2 taps pour atteindre n'importe quelle information |
| **Feed social / comparaison** | Crée de l'anxiété, hors sujet pour un outil personnel | Aucune dimension sociale. L'app est un miroir personnel |
| **Gamification agressive** | Badges, séries, notifications culpabilisantes — contraire au "zéro culpabilité" | Progression factuelle et personnelle uniquement |
| **Onboarding long** | Un sportif veut utiliser l'app, pas faire un tutoriel | Profil minimal au setup, le reste se découvre à l'usage |
| **Graphiques surchargés** | Trop de données = aucune donnée lisible | 3-4 métriques clés en surface, le reste en profondeur |

### Design Inspiration Strategy

**Adopter :**
- Le pattern "dashboard immédiat" des apps bancaires — ouvrir = voir l'essentiel
- Les cartes compactes expansibles d'Apple Health — disclosure progressive naturelle
- La bottom tab bar pour la navigation mobile — simple, universelle, efficace

**Adapter :**
- Le feed d'activités de Strava — le transformer en timeline unifiée plan + historique
- Les graphiques de tendance des apps fitness — les simplifier et les centrer sur l'évolution personnelle, pas la performance absolue

**Éviter :**
- Tout modèle paywall / freemium dans l'UX (pas de fonctionnalité "grisée")
- Toute mécanique sociale (feed, likes, classements)
- Toute gamification (badges, séries, confettis)
- Tout parcours de plus de 2 taps pour l'information courante

## Design System Foundation

### Design System Choice

**Approche retenue : Design system thémable**

Un système de composants headless (comportement sans style imposé) combiné à un framework CSS utilitaire pour le styling. Les composants gèrent l'accessibilité, les interactions et les états — le développeur contrôle entièrement le rendu visuel.

Exemples concrets selon la stack frontend choisie ultérieurement :
- React : Shadcn/ui, Radix UI, Headless UI + Tailwind CSS
- Vue : Radix Vue, Headless UI + Tailwind CSS
- Svelte : Bits UI, Melt UI + Tailwind CSS

Le choix spécifique du framework et de la librairie de composants sera fait lors de l'architecture technique. L'approche reste la même quelle que soit la stack.

### Rationale for Selection

- **Cohérence avec "simplicité en surface, puissance en profondeur"** — Les composants headless offrent un comportement riche (accessibilité, clavier, états) sans imposer de style. Le développeur garde le contrôle total du rendu
- **Identité visuelle sobre et unique** — Pas de look "Material" ou "Ant" générique. Sporty aura son propre caractère visuel, aligné avec le ton "copain discret"
- **Vitesse de développement** — Tailwind CSS accélère le styling sans écrire de CSS custom. Les composants headless évitent de réinventer la roue pour les comportements complexes (modales, dropdowns, formulaires)
- **Mobile-first natif** — Tailwind est conçu pour le responsive mobile-first. Les breakpoints desktop enrichissent naturellement l'expérience
- **Développeur unique** — Le combo headless + utilitaire est le plus productif pour un dev solo : pas besoin de maintenir un design system lourd ni de surcharger des styles imposés

### Implementation Approach

- **Tokens de design** — Définir les variables fondamentales : couleurs, typographie, espacements, rayons de bordure. Ces tokens garantissent la cohérence visuelle sur toute l'app
- **Composants réutilisables** — Construire une bibliothèque de composants internes (Card, Button, Input, Chart, MetricDisplay) basés sur les composants headless
- **Patterns de layout** — Templates de mise en page pour les 3 contextes principaux : dashboard, liste de séances, formulaire de saisie
- **Dark mode ready** — L'architecture des tokens doit supporter un thème sombre dès le départ (même si pas implémenté au MVP)

### Customization Strategy

- **Palette sobre** — Couleurs neutres (gris, blanc) avec une couleur d'accent unique pour les tendances positives et les actions principales. Pas de rouge pour les "échecs" — couleurs neutres ou orange doux pour les alertes
- **Typographie fonctionnelle** — Hiérarchie forte : gros chiffres pour les métriques clés, texte secondaire discret pour le contexte. Police system ou sans-serif lisible
- **Espacements généreux** — Touch-friendly sur mobile, respirant sur desktop. Les cartes et éléments ont assez d'espace pour être cliquables au pouce
- **Animations minimales** — Transitions fluides mais discrètes. Pas d'animations décoratives. L'interface est réactive, pas spectaculaire

## Defining Core Experience

### Defining Experience

**"Ouvre l'app, vois ta progression."**

L'expérience définissante de Sporty tient en un geste : ouvrir l'app et comprendre immédiatement où on en est. Pas de navigation préalable, pas de chargement de données, pas de choix à faire. L'écran d'accueil EST la valeur du produit.

L'écran d'accueil se compose de trois blocs :
1. **Un chiffre clé motivant** — La métrique la plus pertinente du moment, affichée en grand. Exemple : "Allure moyenne : 5'12/km (-18s ce mois)"
2. **Le programme des prochaines séances** — Les 2-3 prochaines séances planifiées, avec date et contenu. L'utilisateur sait ce qui l'attend
3. **Un graphique d'évolution récente** — Une courbe simple montrant la tendance des dernières semaines. La progression se lit en un coup d'oeil

Ces trois éléments répondent aux trois questions que l'utilisateur se pose en ouvrant l'app : "Comment je progresse ?", "Qu'est-ce que je fais ensuite ?", "Quelle est ma tendance ?"

### User Mental Model

**Modèle mental actuel (sans Sporty) :**
- L'utilisateur ouvre Strava → voit sa dernière activité → pas de plan, pas de vision globale
- Il ouvre un Google Doc / tableur → voit son plan statique → aucun lien avec ses données réelles
- Il fait le lien mentalement entre les deux → frustrant, incomplet, lent

**Modèle mental cible (avec Sporty) :**
- L'utilisateur ouvre Sporty → voit SA progression, SON planning, SA tendance — tout connecté
- Le lien entre données réelles et plan est automatique
- L'utilisateur ne "cherche" plus d'information, elle est là

**Transition clé :** Passer de "je dois assembler l'information moi-même" à "l'app me la présente déjà organisée". C'est le raccourci mental qui crée la valeur.

### Success Criteria

| Critère | Mesure | Cible |
|---------|--------|-------|
| **Temps de compréhension** | Temps pour comprendre "où j'en suis" à l'ouverture | < 3 secondes |
| **Saisie de séance** | Temps pour saisir une séance complète | < 30 secondes |
| **Profondeur accessible** | Nombre de taps pour atteindre n'importe quelle donnée détaillée | ≤ 2 taps |
| **Clarté du planning** | L'utilisateur sait ce qu'il doit faire demain | Visible sans scroll sur l'accueil |
| **Tendance lisible** | La progression est visible sans interpréter les chiffres | Graphique auto-explicatif |

### Novel UX Patterns

**Approche : Patterns établis combinés de façon originale**

Sporty n'invente pas de nouvelles interactions — il combine des patterns connus dans un contexte sportif personnel qui n'existe pas encore :

**Patterns établis utilisés :**
- Dashboard-first (apps bancaires) → appliqué au suivi sportif
- Cartes compactes expansibles (Apple Health) → métriques sportives
- Bottom tab bar → navigation entre contextes
- Formulaire progressif → saisie de séance

**Combinaison originale :**
- La **timeline unifiée plan + historique** — pattern inédit dans les apps sportives. Le passé et le futur dans un seul flux continu
- Le **chiffre clé dynamique** — la métrique affichée en gros s'adapte à ce qui est le plus pertinent (progression récente, prochain objectif, tendance notable)
- Le **feedback configurable** — l'utilisateur choisit si l'app "parle" ou reste silencieuse. Pas de pattern équivalent dans les apps sportives existantes

**Aucune éducation nécessaire** — Tous les patterns de base sont familiers. L'originalité vient de leur assemblage, pas de leur fonctionnement.

### Experience Mechanics

**1. Initiation — Ouverture de l'app**
- L'utilisateur ouvre Sporty (tap sur l'icône ou PWA)
- L'écran d'accueil s'affiche immédiatement avec les 3 blocs (chiffre clé, planning, graphique)
- Aucune action requise — la valeur est déjà là

**2. Interaction — Exploration**
- **Scroll down** → Plus de détails sur la progression, séances récentes
- **Tap sur le chiffre clé** → Détail de la métrique, historique de cette donnée
- **Tap sur une séance planifiée** → Détail de la séance, possibilité de la modifier
- **Tap sur le graphique** → Vue étendue, choix de la période, choix de la métrique
- **Bottom tab** → Navigation vers Séances, Planning, Profil

**3. Feedback — Confirmation**
- Les données sont toujours à jour à l'ouverture
- Les tendances positives sont subtilement mises en valeur (couleur d'accent, flèche montante)
- Les régressions sont montrées factuellement, sans alarme visuelle
- Après saisie d'une séance : retour au dashboard avec données mises à jour instantanément

**4. Completion — Satisfaction**
- L'utilisateur a vu sa progression → fierté personnelle
- L'utilisateur sait ce qui l'attend → sérénité
- L'utilisateur a saisi une séance en < 30s → satisfaction de l'efficacité
- L'utilisateur ferme l'app en sachant où il en est → contrôle total

## Visual Design Foundation

### Color System

**Palette principale : Clair, aéré, accent bleu**

| Rôle | Token | Utilisation |
|------|-------|-------------|
| **Background** | Blanc pur / Gris très clair | Fond principal de l'app. Respiration maximale |
| **Surface** | Blanc | Cartes, composants, zones de contenu surélevées |
| **Text Primary** | Gris très foncé (quasi-noir) | Texte principal, chiffres clés, titres |
| **Text Secondary** | Gris moyen | Labels, descriptions, métadonnées |
| **Text Muted** | Gris clair | Placeholders, texte désactivé |
| **Primary / Accent** | Bleu | Actions principales, liens, tendances positives, éléments interactifs. Le bleu de Sporty |
| **Primary Light** | Bleu clair / pastel | Fond de badges, highlights subtils, zones de focus |
| **Success** | Vert doux | Séance complétée, tendance positive confirmée |
| **Warning** | Orange doux | Alertes non critiques, ajustements de plan |
| **Neutral** | Gris | États neutres, régressions (jamais de rouge agressif) |
| **Border** | Gris très clair | Séparateurs, bordures de cartes, structure subtile |

**Principes couleur :**
- Pas de rouge pour les "échecs" — les régressions sont affichées en gris neutre ou orange doux
- Le bleu est la seule couleur "forte" de l'interface — il attire l'oeil sur ce qui compte
- Les fonds restent blancs/gris très clair pour maximiser la lisibilité et la sensation d'espace
- Contraste suffisant pour l'accessibilité (ratio minimum 4.5:1 pour le texte)
- Dark mode : prévoir l'inversion des tokens dès l'architecture (implémentation post-MVP)

### Typography System

**Approche : Police system native**

```
font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto,
             "Helvetica Neue", Arial, sans-serif;
```

Polices natives du système — rapides, familières, optimisées par chaque OS. Pas de chargement de web fonts.

**Échelle typographique :**

| Niveau | Taille (mobile) | Taille (desktop) | Usage |
|--------|----------------|-----------------|-------|
| **Display** | 32-36px | 40-48px | Chiffre clé du dashboard (la métrique motivante) |
| **H1** | 24px | 28-32px | Titres de sections |
| **H2** | 20px | 22-24px | Sous-titres, noms des cartes |
| **H3** | 16-18px | 18-20px | Labels de métriques, en-têtes de listes |
| **Body** | 14-16px | 16px | Texte courant, descriptions |
| **Caption** | 12px | 13px | Métadonnées, timestamps, unités |

**Principes typographiques :**
- Le chiffre clé en Display — c'est le premier élément que l'oeil capte
- Hiérarchie forte entre les niveaux — on distingue immédiatement titres, données et contexte
- Les chiffres/métriques utilisent un poids semi-bold ou bold pour ressortir
- Le texte secondaire est volontairement discret (gris moyen, taille réduite)
- Line-height confortable : 1.5 pour le body, 1.2-1.3 pour les titres

### Spacing & Layout Foundation

**Unité de base : 4px**

Tous les espacements sont des multiples de 4px pour garantir l'alignement et la cohérence :

| Token | Valeur | Usage |
|-------|--------|-------|
| **xs** | 4px | Micro-espacement interne (entre icône et label) |
| **sm** | 8px | Espacement interne compact (padding de badges) |
| **md** | 16px | Espacement standard (padding de cartes, gap entre éléments) |
| **lg** | 24px | Séparation entre blocs (entre les cartes du dashboard) |
| **xl** | 32px | Séparation de sections |
| **2xl** | 48px | Marges de page, grands espaces de respiration |

**Layout mobile (prioritaire) :**
- Colonne unique, pleine largeur
- Cartes empilées verticalement avec gap de 16px
- Padding horizontal de 16px
- Bottom tab bar fixe (56-64px de hauteur)
- Zone de contenu scrollable

**Layout desktop (enrichi) :**
- Contenu centré avec max-width (~1200px)
- Grille 2-3 colonnes pour le dashboard (cartes côte à côte)
- Sidebar optionnelle pour la navigation (remplace la bottom tab)
- Plus d'espace de respiration (paddings et gaps augmentés)

**Principes layout :**
- Espacements généreux — l'interface respire, rien n'est serré
- Touch-friendly — zones cliquables minimum 44x44px sur mobile
- Le scroll vertical est le mode de navigation naturel dans le contenu
- Les cartes sont le composant structurant principal — chaque bloc d'information est une carte

### Accessibility Considerations

- **Contraste texte** — Ratio minimum 4.5:1 pour le texte normal, 3:1 pour le texte large (WCAG AA)
- **Zones tactiles** — Minimum 44x44px pour tous les éléments interactifs sur mobile
- **Focus visible** — Outline bleu clair sur les éléments focusés (navigation clavier)
- **Labels** — Tous les champs de formulaire ont un label visible
- **Couleur non exclusive** — L'information n'est jamais transmise uniquement par la couleur (icônes ou texte en complément)
- **Police system** — Taille de base respectant les préférences d'accessibilité du navigateur (rem plutôt que px fixes)

## Design Direction Decision

### Design Directions Explored

6 directions de design explorées via showcase HTML interactif :
- **D1 — Minimal Focus** : Ultra-épuré, hero centré, respiration maximale
- **D2 — Card Stack** : Cartes modulaires empilées, style Apple Health
- **D3 — Compact Dashboard** : Grille de métriques dense (éliminé)
- **D4 — Story Mode** : Narratif, chaleureux (éliminé)
- **D5 — Timeline Unified** : Flux chronologique passé/futur unifié
- **D6 — Data Dense** : Style fintech, header sombre (éliminé)

### Chosen Direction

**Direction retenue : Hybride D1 + D2 + D5, Variante B (hero compact + stats rapides)**

L'écran d'accueil mobile se compose de :

1. **Header** — Logo Sporty + avatar utilisateur
2. **Hero compact** — Chiffre clé motivant à gauche (allure moyenne, gros et bold) avec micro-graphique de tendance à droite. Trend affiché sous le chiffre
3. **Quick stats** — Ligne de 3 mini-cartes : volume hebdo, FC moyenne, nombre de séances. Compactes, factuelles, avec tendances
4. **Timeline unifiée** — Flux chronologique continu :
   - **À venir** (opacité réduite, dots en pointillés bleus) — prochaines séances planifiées
   - **Séparateur "Demain"** (dot bleu plein, mise en avant) — prochaine séance
   - **Passé** (dots verts ✓) — séances complétées avec résultats (allure, FC, ressenti)
5. **FAB (Floating Action Button)** — Bouton "+" bleu flottant pour saisie rapide
6. **Bottom tab bar** — 4 onglets : Accueil / Séances / Planning / Profil

**Version desktop :**
- Sidebar de navigation (remplace la bottom tab)
- Grille 3 colonnes : hero+stats | graphique détaillé | timeline en panneau latéral
- Bouton "Nouvelle séance" dans le header (remplace le FAB)

### Design Rationale

- **Hero compact** plutôt que centré : laisse de la place aux quick stats sans sacrifier l'impact du chiffre clé. Plus d'information visible sans scroll
- **Quick stats en ligne** : satisfait le besoin de voir "où j'en suis" en un coup d'oeil sur plusieurs dimensions (volume, FC, fréquence) sans surcharger
- **Timeline unifiée** : le différenciateur UX de Sporty. Le passé et le futur vivent dans le même flux, rendant la connexion plan/réalité immédiate et naturelle
- **FAB flottant** : la saisie de séance est toujours accessible en un tap, sans encombrer la navigation principale
- **Fond gris clair + cartes blanches** : structure visuelle claire, chaque bloc d'info a son "espace", cohérent avec l'identité sobre et aérée

### Implementation Approach

- **Mobile-first** : construire la variante B mobile en premier, puis enrichir pour desktop
- **Composants clés à développer** :
  - `HeroMetric` — chiffre clé + trend + mini-graphique
  - `QuickStatCard` — mini-carte de métrique avec tendance
  - `TimelineItem` — item de timeline (futur/today/passé) avec dot, rail et carte
  - `TimelineDivider` — séparateur visuel passé/futur
  - `FAB` — bouton flottant d'action rapide
- **Responsive breakpoint** : ~768px pour basculer bottom-tab → sidebar, colonne unique → grille

## User Journey Flows

### Flow 1 : Onboarding (premier login)

**Déclencheur :** Premier login après création du compte par l'admin
**Objectif :** Profil configuré, prêt à utiliser l'app
**Durée cible :** < 1 minute

```mermaid
flowchart TD
    A[Login avec identifiants] --> B[Écran de bienvenue\n"Bienvenue sur Sporty !"]
    B --> C[Step 1 : Quel sport pratiques-tu ?\nSélection visuelle icônes]
    C --> D[Step 2 : Quel est ton niveau ?\nDébutant / Intermédiaire / Confirmé]
    D --> E[Step 3 : Quel est ton objectif ?\nProgresser en endurance / Courir plus vite / Reprendre...]
    E --> F[Step 4 : Tes préférences\nUnités : km/h ou min/km]
    F --> G[Dashboard — écran d'accueil]
    G --> H{Premières données ?}
    H -->|Aucune séance| I[Dashboard vide avec message\n"Saisis ta première séance\npour commencer"]
    H -->|Séances existantes| J[Dashboard avec données]
```

**Détails UX :**
- Chaque étape = un écran, un choix. Barre de progression discrète en haut (4 dots)
- Bouton "Suivant" en bas de chaque étape. Possibilité de revenir en arrière
- Step 1 : grille d'icônes cliquables (course à pied sélectionné par défaut en V1)
- Step 2 : 3 cartes avec description courte ("Je débute" / "Je cours régulièrement" / "Je m'entraîne sérieusement")
- Step 3 : choix libres, pas obligatoire — possibilité de skip ("Pas d'objectif précis")
- Step 4 : toggle simple, valeur par défaut raisonnable (min/km pour la course)
- Toutes ces infos sont modifiables plus tard dans le profil

### Flow 2 : Saisie de séance (flow principal)

**Déclencheur :** Tap sur FAB "+" (mobile) ou bouton "Nouvelle séance" (desktop)
**Objectif :** Séance enregistrée
**Durée cible :** < 30 secondes

```mermaid
flowchart TD
    A[Tap sur +] --> B[Bottom sheet monte\nFormulaire de saisie]
    B --> C[Champs principaux visibles :\nSport / Date / Durée / Distance]
    C --> D{Remplir les champs}
    D --> E[Section repliée :\n"Plus de détails"\nFC / Allure / Ressenti / Notes]
    E --> F{Déplier ?}
    F -->|Oui| G[Champs secondaires visibles\nRemplissage optionnel]
    F -->|Non| H[Ignorer les détails]
    G --> I[Tap "Enregistrer"]
    H --> I
    I --> J[Bottom sheet se ferme\nDashboard mis à jour\nFeedback subtil : "Séance ajoutée"]
    D --> K{Annuler ?}
    K -->|Swipe down / tap hors zone| L[Bottom sheet se ferme\nAucune donnée perdue si champs vides]
    K -->|Champs remplis| M[Confirmation : "Abandonner la saisie ?"]
```

**Détails UX :**
- Bottom sheet (mobile) / modale centrée (desktop)
- Sport pré-rempli avec le dernier sport utilisé
- Date pré-remplie à aujourd'hui
- Champs principaux : Sport (dropdown), Date (datepicker), Durée (hh:mm), Distance (km)
- "Plus de détails" replié par défaut — un tap pour déplier
- Champs secondaires : FC moyenne (bpm), Allure (auto-calculée si durée+distance), Ressenti (emoji picker : 😊😐😅😣), Notes libres
- Bouton "Enregistrer" toujours visible en bas du bottom sheet
- Après enregistrement : retour au dashboard, la séance apparaît dans la timeline "Passé"

### Flow 3 : Consultation dashboard (flow quotidien)

**Déclencheur :** Ouverture de l'app
**Objectif :** Comprendre sa progression en < 3 secondes

```mermaid
flowchart TD
    A[Ouvrir l'app] --> B[Dashboard Variante B\nHero compact + Quick stats + Timeline]
    B --> C{Intention ?}
    C -->|Voir ma progression| D[Chiffre clé visible immédiatement\nQuick stats en dessous]
    D --> E{Plus de détail ?}
    E -->|Tap chiffre clé| F[Vue détaillée de la métrique\nHistorique, graphique étendu]
    E -->|Tap quick stat| G[Vue détaillée de cette stat]
    E -->|Non| H[Satisfaction — fermer l'app]
    C -->|Voir mon planning| I[Scroll vers timeline "À venir"\nProchaines séances planifiées]
    I --> J{Modifier une séance planifiée ?}
    J -->|Tap sur séance| K[Détail de la séance\nModification possible]
    J -->|Non| H
    C -->|Voir mes séances passées| L[Scroll vers timeline "Passé"\nSéances avec résultats]
    L --> M{Voir détail ?}
    M -->|Tap sur séance| N[Détail complet de la séance\nToutes les métriques]
    M -->|Non| H
    C -->|Saisir une séance| O[Tap sur FAB +]
    O --> P[Flow saisie de séance]
```

**Détails UX :**
- Aucune action requise pour voir l'essentiel — hero + stats sont visibles immédiatement
- La timeline unifiée se parcourt en scroll vertical naturel
- Chaque élément cliquable mène à une vue détaillée (tap = profondeur)
- Le retour au dashboard est toujours possible via back ou tap sur l'onglet Accueil

### Flow 4 : Consultation et modification d'une séance

**Déclencheur :** Tap sur une séance (timeline ou liste)
**Objectif :** Voir les détails, corriger si besoin

```mermaid
flowchart TD
    A[Tap sur une séance] --> B[Vue détail séance\nToutes les métriques affichées]
    B --> C{Action ?}
    C -->|Consulter seulement| D[Lire les données\nRetour au dashboard]
    C -->|Modifier| E[Tap "Modifier"\nFormulaire pré-rempli\nMêmes champs que la saisie]
    E --> F[Modifier les champs souhaités]
    F --> G[Tap "Enregistrer"]
    G --> H[Retour à la vue détail\nDonnées mises à jour\nFeedback : "Séance modifiée"]
    C -->|Supprimer| I[Tap "Supprimer"]
    I --> J[Confirmation :\n"Supprimer cette séance ?"\nSéance déplacée dans la corbeille]
    J -->|Confirmer| K[Séance soft-deleted\nRetour au dashboard\nFeedback : "Séance supprimée"\nOption "Annuler" temporaire]
    J -->|Annuler| B
```

**Détails UX :**
- Vue détail en plein écran (push navigation sur mobile)
- Toutes les métriques affichées : sport, date, durée, distance, allure, FC, ressenti, notes
- Bouton "Modifier" discret (icône ou texte en haut à droite)
- Modification = même formulaire que la saisie, pré-rempli avec les données existantes
- Suppression = soft-delete avec possibilité de restaurer (accessible dans Profil > Corbeille)
- Feedback "Séance supprimée" avec bouton "Annuler" temporaire (toast/snackbar, ~5 secondes)

### Flow 5 : Admin — gestion utilisateurs

**Déclencheur :** Menu admin (visible uniquement pour l'admin)
**Objectif :** Créer, modifier ou supprimer des comptes

```mermaid
flowchart TD
    A[Profil > Administration] --> B[Liste des utilisateurs\nNom, email, date de création]
    B --> C{Action ?}
    C -->|Créer| D[Tap "Ajouter"\nFormulaire : nom, email, mot de passe temporaire]
    D --> E[Enregistrer\nCompte créé\nL'utilisateur devra changer son mot de passe]
    C -->|Modifier| F[Tap sur un utilisateur\nVue détail du compte]
    F --> G[Modifier les infos\nRéinitialiser le mot de passe]
    C -->|Supprimer| H[Tap supprimer\nConfirmation : "Supprimer ce compte ?"]
    H --> I[Compte supprimé]
```

**Détails UX :**
- Section "Administration" visible uniquement dans le profil de l'admin
- Interface simple : liste + CRUD standard
- Pas de complexité — c'est un outil interne pour l'admin serveur

### Journey Patterns

| Pattern | Usage | Comportement |
|---------|-------|-------------|
| **Bottom sheet / Modale** | Saisie de séance, actions rapides | Monte sur mobile, modale centrée sur desktop. Swipe down pour fermer |
| **Vue détail (push)** | Détail séance, détail métrique | Plein écran, back pour revenir. Toutes les données + actions contextuelles |
| **Confirmation destructive** | Suppression séance, suppression compte | Dialog de confirmation + undo temporaire (toast 5s) |
| **Formulaire progressif** | Saisie séance, onboarding | Champs essentiels visibles, champs secondaires repliés sous "Plus de détails" |
| **Feedback inline** | Après saisie, modification, suppression | Toast/snackbar en bas de l'écran, disparaît après 3-5s. Non intrusif |
| **Wizard par étapes** | Onboarding | Un choix par écran, barre de progression, navigation avant/arrière |

### Flow Optimization Principles

1. **Minimum de taps pour la valeur** — L'information la plus utile est visible sans interaction. Chaque tap supplémentaire apporte de la profondeur, jamais une étape obligatoire
2. **Pré-remplissage intelligent** — Sport, date, et à terme les données importées sont pré-remplies. L'utilisateur confirme plutôt qu'il saisit
3. **Undo plutôt que confirmation** — Pour les actions non critiques, pas de "Êtes-vous sûr ?". On exécute et on offre un "Annuler" temporaire. Exception : suppression = confirmation requise
4. **Contexte préservé** — Le bottom sheet et la modale gardent le dashboard visible en arrière-plan. L'utilisateur ne perd jamais son repère spatial
5. **Feedback immédiat et discret** — Chaque action est confirmée par un toast non intrusif. Pas de page de succès, pas de popup bloquant

## Component Strategy

### Design System Components

**Composants fournis par le design system headless (comportement + accessibilité) :**

| Composant | Usage dans Sporty |
|-----------|-------------------|
| **Button** | Enregistrer, Suivant, Modifier, Supprimer, actions CTA |
| **Input / NumberInput** | Champs de saisie (durée, distance, FC) |
| **Select / Dropdown** | Choix du sport, filtres |
| **DatePicker** | Sélection de date de séance |
| **Dialog / Modal** | Modale de saisie (desktop), confirmations de suppression |
| **Sheet (Bottom Sheet)** | Formulaire de saisie de séance (mobile) |
| **Toast / Snackbar** | Feedbacks inline ("Séance ajoutée", "Séance supprimée") |
| **Tabs** | Navigation bottom tab bar, onglets de période |
| **Avatar** | Icône utilisateur dans le header |
| **Form / Label** | Structure des formulaires, labels accessibles |
| **Toggle** | Préférences (unités, paramètres) |
| **Skeleton** | États de chargement des cartes et graphiques |

### Custom Components

**Composants spécifiques à Sporty (à construire sur mesure) :**

#### HeroMetric
**Purpose :** Afficher LE chiffre clé motivant du dashboard
**Anatomy :** Label (uppercase, muted) + Valeur (display, bold) + Unité (muted) + Trend badge (vert/neutre) + Mini-graphique sparkline
**States :** Chargement (skeleton) · Données disponibles · Aucune donnée ("—")
**Variants :** Centré (variante A) · Compact avec mini-graphique à droite (variante B, retenue)
**Responsive :** Mobile = aligné gauche + sparkline droite · Desktop = plus grand dans la grille hero

#### QuickStatCard
**Purpose :** Mini-carte de métrique secondaire (volume, FC, séances)
**Anatomy :** Valeur (gros, bold) + Unité (caption) + Label (caption, muted) + Trend (petit, coloré)
**States :** Chargement · Données · Aucune donnée
**Variants :** Standard (3 en ligne sur mobile)
**Responsive :** Mobile = 1/3 de largeur · Desktop = dans la grille hero à côté du HeroMetric

#### TimelineItem
**Purpose :** Un élément dans la timeline unifiée (séance passée ou planifiée)
**Anatomy :** Rail (dot + ligne) + Carte (date + titre + méta + résultats optionnels)
**States :** Futur (opacity réduite, dot pointillé bleu) · Today (dot bleu plein, surbrillance) · Passé (dot vert ✓, résultats affichés)
**Actions :** Tap → vue détail de la séance
**Responsive :** Mobile = pleine largeur · Desktop = dans le panneau timeline latéral

#### TimelineDivider
**Purpose :** Séparateur visuel entre les sections "À venir" et "Passé"
**Anatomy :** Label texte (ex: "Passé") + ligne horizontale
**States :** Unique (pas de variante)

#### SparklineChart
**Purpose :** Mini-graphique de tendance (barres verticales)
**Anatomy :** Conteneur + Barres proportionnelles + Labels d'axe optionnels
**States :** Chargement · Données · Aucune donnée (message "Pas assez de données")
**Variants :** Inline (dans HeroMetric, petit) · Card (dans une carte dédiée, plus grand avec labels)
**Interaction :** Hover/tap sur une barre = tooltip avec la valeur

#### SessionForm
**Purpose :** Formulaire de saisie/modification d'une séance
**Anatomy :** Champs principaux (sport, date, durée, distance) + Section repliable "Plus de détails" (FC, allure auto-calculée, ressenti emoji, notes) + Bouton Enregistrer
**States :** Création (champs vides, pré-remplissage intelligent) · Édition (champs pré-remplis)
**Container :** Bottom sheet (mobile) · Modale (desktop)
**Validation :** Durée et distance obligatoires, le reste optionnel

#### SessionDetail
**Purpose :** Vue complète d'une séance avec toutes les métriques
**Anatomy :** Header (sport + date) + Métriques en grille (durée, distance, allure, FC, ressenti) + Notes + Actions (Modifier, Supprimer)
**States :** Consultation · Supprimée (dans la corbeille, avec option "Restaurer")

#### OnboardingWizard
**Purpose :** Wizard en 4 étapes pour le premier login
**Anatomy :** Barre de progression (4 dots) + Contenu de l'étape + Boutons (Retour / Suivant)
**Steps :** Sport (grille icônes) → Niveau (3 cartes) → Objectif (choix multiples) → Préférences (toggles)

#### EmptyState
**Purpose :** État vide du dashboard quand aucune séance n'existe
**Anatomy :** Illustration/icône + Message encourageant + CTA ("Saisir ma première séance")
**Ton :** Accueillant, pas de pression. "Commence quand tu veux"

#### FAB (Floating Action Button)
**Purpose :** Bouton d'ajout rapide de séance, toujours accessible
**Anatomy :** Cercle bleu + icône "+"
**States :** Repos · Hover/pressed (scale + shadow)
**Position :** Fixed, bas-droite, au-dessus de la tab bar (mobile uniquement)

### Component Implementation Strategy

- **Foundation first** — Configurer les tokens de design (couleurs, typo, espacements) avant tout composant
- **Headless + style** — Chaque composant utilise un composant headless pour le comportement et Tailwind pour le style
- **Mobile-first** — Construire la version mobile d'abord, ajouter les variantes desktop via breakpoints
- **Composition** — Les composants complexes (dashboard, timeline) sont composés de composants simples (HeroMetric + QuickStatCard + TimelineItem)
- **Props minimales** — Chaque composant reçoit uniquement les données nécessaires. Pas de configuration excessive

### Implementation Roadmap

**Phase 1 — MVP 0-1 (squelette + saisie) :**
- Tokens de design (couleurs, typo, espacements)
- Layout principal (header, tab bar, page container)
- SessionForm (bottom sheet + modale)
- SessionDetail
- EmptyState
- Toast/feedback
- OnboardingWizard

**Phase 2 — MVP 2 (progression) :**
- HeroMetric
- QuickStatCard
- SparklineChart (inline + card)
- Dashboard layout complet (variante B)

**Phase 3 — MVP 3-4 (timeline + plans) :**
- TimelineItem (futur, today, passé)
- TimelineDivider
- Timeline unifiée complète
- FAB

**Logique :** On construit d'abord ce qui permet de saisir et consulter des séances (MVP 1), puis ce qui permet de visualiser la progression (MVP 2), puis ce qui unifie plan et historique (MVP 3-4).
