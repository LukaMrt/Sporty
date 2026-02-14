# Epic 6 : Dashboard & Visualisation de Progression

L'utilisateur ouvre l'app et VOIT sa progression. Le moment "aha".

**FRs couverts :** FR18, FR19, FR20, FR21
**Includes :** HeroMetric, QuickStatCard, SparklineChart, Recharts, zoom semaine/mois, conversion unites

---

## Story 6.1 : Dashboard - HeroMetric

As a **utilisateur connecte avec des seances**,
I want **voir mon chiffre cle de progression des l'ouverture de l'app**,
So that **je comprends immediatement ou j'en suis** (FR18).

**Acceptance Criteria:**

**Given** j'ai des seances enregistrees
**When** j'arrive sur la page d'accueil
**Then** le composant HeroMetric affiche ma metrique cle (ex: allure moyenne) en grand et bold
**And** un badge de tendance indique l'evolution recente (ex: "-18s/km ce mois")
**And** un mini-graphique sparkline a droite montre la tendance visuelle

**Given** j'ai moins de 2 seances
**When** j'arrive sur la page d'accueil
**Then** le HeroMetric affiche "—" avec un message "Pas assez de donnees"

**Given** la tendance est positive
**When** je regarde le badge
**Then** il est affiche en vert doux (couleur success)

**Given** la tendance est neutre ou negative
**When** je regarde le badge
**Then** il est affiche en gris neutre (jamais de rouge)

**Comment tu valides :** Saisis 5 seances avec des allures variees -> accueil -> tu vois l'allure moyenne en gros avec la tendance et le sparkline.

---

## Story 6.2 : Dashboard - QuickStatCards

As a **utilisateur connecte avec des seances**,
I want **voir mes metriques secondaires en un coup d'oeil**,
So that **j'ai une vue rapide sur mon volume, ma FC et ma frequence d'entrainement** (FR18).

**Acceptance Criteria:**

**Given** j'ai des seances enregistrees
**When** j'arrive sur la page d'accueil
**Then** 3 QuickStatCards s'affichent en ligne sous le HeroMetric :
- Volume hebdomadaire (km)
- FC moyenne
- Nombre de seances (cette semaine)
**And** chaque carte affiche la valeur, l'unite et une tendance

**Given** je suis sur mobile (< 768px)
**When** je regarde les QuickStatCards
**Then** elles occupent chacune 1/3 de la largeur, compactes

**Given** je suis sur desktop
**When** je regarde le dashboard
**Then** les QuickStatCards sont integrees dans la grille a cote du HeroMetric

**Comment tu valides :** Accueil -> tu vois 3 mini-cartes avec volume, FC et nombre de seances. Redimensionne mobile/desktop -> le layout s'adapte.

---

## Story 6.3 : Graphiques d'evolution

As a **utilisateur connecte avec des seances**,
I want **visualiser l'evolution de mes donnees sur le temps**,
So that **je VOIS ma progression concretement** (FR19).

**Acceptance Criteria:**

**Given** j'ai des seances sur plusieurs semaines
**When** je scroll sous les QuickStatCards sur la page d'accueil
**Then** un graphique Recharts affiche l'evolution de l'allure moyenne par seance (courbe)
**And** je peux basculer entre les metriques : allure, FC moyenne, volume (distance cumulee)

**Given** je survole (desktop) ou tape (mobile) sur un point du graphique
**When** le tooltip s'affiche
**Then** il montre la date et la valeur exacte de cette seance

**Given** j'ai peu de donnees (< 3 seances)
**When** le graphique se charge
**Then** il affiche les points disponibles sans message d'erreur

**Given** j'ai beaucoup de donnees (~500 seances)
**When** le graphique se charge
**Then** il s'affiche de maniere fluide en moins de 2 secondes (NFR2)

**Comment tu valides :** Saisis 10 seances sur 3 semaines -> accueil -> tu vois la courbe d'allure. Bascule sur FC -> la courbe change. Survole un point -> tooltip avec la valeur.

---

## Story 6.4 : Zoom temporel

As a **utilisateur connecte**,
I want **zoomer sur une periode (semaine ou mois) sur mes graphiques**,
So that **je peux analyser ma progression sur la periode qui m'interesse** (FR20).

**Acceptance Criteria:**

**Given** je suis sur le graphique d'evolution
**When** je selectionne "Semaine"
**Then** le graphique affiche uniquement les donnees de la semaine en cours
**And** les QuickStatCards se mettent a jour pour refleter la periode selectionnee

**Given** je selectionne "Mois"
**When** le graphique se met a jour
**Then** il affiche les donnees du mois en cours

**Given** je suis sur mobile
**When** je swipe horizontalement sur le selecteur de periode
**Then** je bascule entre Semaine et Mois de maniere fluide

**Given** je change de periode
**When** les donnees se rechargent
**Then** la transition est fluide (pas de flash blanc ni de layout shift)

**Comment tu valides :** Graphique -> selectionne "Semaine" -> seules les donnees de la semaine apparaissent. Selectionne "Mois" -> le graphique s'elargit a tout le mois. Les stats se mettent a jour.

---

## Story 6.5 : Affichage dans les unites configurees

As a **utilisateur connecte**,
I want **voir toutes mes donnees affichees dans les unites que j'ai choisies**,
So that **les metriques sont dans le format qui me parle** (FR21).

**Acceptance Criteria:**

**Given** j'ai configure mes unites en "min/km" dans mon profil
**When** je consulte le dashboard (HeroMetric, QuickStatCards, graphiques)
**Then** toutes les allures sont affichees en min/km

**Given** j'ai configure mes unites en "km/h"
**When** je consulte le dashboard
**Then** toutes les allures sont affichees en km/h

**Given** je change mes unites dans le profil de min/km a km/h
**When** je reviens sur le dashboard
**Then** toutes les valeurs sont immediatement converties dans la nouvelle unite
**And** les donnees stockees en base ne sont pas modifiees (conversion a l'affichage uniquement)

**Given** je consulte le detail d'une seance ou la liste des seances
**When** les donnees s'affichent
**Then** les unites respectent egalement ma preference

**Comment tu valides :** Configure "min/km" -> dashboard affiche "5'12/km". Change en "km/h" -> dashboard affiche "11.5 km/h". Verifie en base -> la valeur stockee n'a pas change.
