# Epic 11 : Donnees de Course Enrichies & Import GPX

L'utilisateur enrichit ses seances de course avec des metriques detaillees (FC, cadence, denivele) et peut importer un fichier GPX pour obtenir automatiquement courbes, splits, carte et metriques calculees. Il configure ses parametres physiologiques (FC max, VMA) dans son profil pour debloquer les zones FC et les allures cibles.

**Objectif strategique :** Poser les fondations data necessaires a l'epic Planning (future epic) en enrichissant la connaissance de chaque seance de course.

**Includes :** Profil physiologique (FC max, VMA), schema RunMetrics standardise, formulaire saisie enrichi, parser GPX, upload fichier, stockage fichier GPX, courbes FC/allure dans detail seance, carte GPS (Leaflet), splits automatiques, zones FC, drift cardiaque, TRIMP, enrichissement retroactif, page explicative methodes de mesure

---

## Decisions d'architecture

- **Format supporte :** GPX uniquement (pas de FIT)
- **Stockage fichier :** Le fichier GPX original est conserve sur disque (`storage/gpx/{userId}/{sessionId}.gpx`) uniquement pour les imports manuels. Les imports Strava ne stockent pas de fichier brut.
- **Donnees extraites :** Stockees dans `sportMetrics` (JSONB) — c'est la source de verite pour l'affichage
- **Sampling courbes :** Reechantillonnage toutes les 15 secondes depuis les trackpoints GPX
- **Extensions GPX optionnelles :** Le parser gere gracieusement l'absence de `hr`, `cad` ou `ele`
- **Splits manuels :** Non — l'objectif est de reduire la saisie manuelle, pas de l'augmenter
- **Carte GPS :** Leaflet (open source, pas de cle API requise — coherent avec le self-hosted)

---

## Story 11.1 : Profil physiologique (FC max, VMA)

As a **utilisateur connecte**,
I want **renseigner ma FC max et ma VMA dans mon profil**,
So that **le systeme peut calculer mes zones FC et mes allures cibles**.

**Acceptance Criteria:**

**Given** je suis sur ma page de profil
**When** je regarde la section "Parametres physiologiques"
**Then** je vois deux champs : FC max (bpm) et VMA (km/h), avec les valeurs actuelles ou vides

**Given** je renseigne ma FC max (ex: 190 bpm) et ma VMA (ex: 16 km/h)
**When** je sauvegarde
**Then** les valeurs sont persistees dans mon profil
**And** un feedback confirme "Profil mis a jour"

**Given** je n'ai pas renseigne ma FC max
**When** le systeme tente de calculer mes zones FC
**Then** les zones ne sont pas affichees et un message invite a configurer la FC max dans le profil

**Given** je clique sur "Comment mesurer ?" a cote d'un champ
**When** la page d'aide s'ouvre
**Then** je vois des explications basees sur des methodes scientifiques (voir Story 11.2)

**Comment tu valides :** Profil → renseigne FC max = 190, VMA = 16 → sauvegarde → rafraichis → les valeurs sont la.

---

## Story 11.2 : Page explicative — Mesurer FC max et VMA

As a **utilisateur connecte**,
I want **comprendre comment mesurer ma FC max et ma VMA avec des methodes fiables**,
So that **je renseigne des valeurs precises qui rendent les calculs pertinents**.

**Acceptance Criteria:**

**Given** je clique sur "Comment mesurer ?" depuis mon profil
**When** la page s'affiche
**Then** je vois des sections claires et illustrees :

**FC max :**
- Formule estimative (Tanaka : 208 - 0.7 × age) avec avertissement que c'est une approximation
- Protocole de test terrain (echauffement 15min → 3 cotes de 2min a effort maximal → FC pic = FC max)
- Conseil : privilegier un test reel sur la formule

**VMA :**
- Explication simple de ce qu'est la VMA
- Test demi-Cooper (6 minutes) : distance parcourue × 10 = VMA en km/h
- Test Cooper (12 minutes) : distance / 12 × 60 = VMA
- Test VAMEVAL si acces piste

**And** le ton est pedagogique et accessible (pas de jargon medical)
**And** des liens vers des sources scientifiques sont fournis

**Comment tu valides :** Profil → "Comment mesurer ?" → tu vois les protocoles de test avec des explications claires.

---

## Story 11.3 : Schema RunMetrics & migration

As a **dev (Luka)**,
I want **standardiser le schema `RunMetrics` dans le domain et migrer les colonnes du profil**,
So that **toutes les donnees de course suivent un format previsible et les parametres physiologiques sont stockes**.

**Acceptance Criteria:**

**Given** le fichier `app/domain/value_objects/run_metrics.ts`
**When** il est cree
**Then** il exporte une interface `RunMetrics` avec :
```typescript
export interface RunMetrics {
  // Metriques de base enrichies
  minHeartRate?: number
  maxHeartRate?: number
  cadenceAvg?: number
  elevationGain?: number
  elevationLoss?: number

  // Depuis GPX — donnees echantillonnees toutes les 15s
  splits?: KmSplit[]
  heartRateCurve?: DataPoint[]
  paceCurve?: DataPoint[]
  altitudeCurve?: DataPoint[]
  gpsTrack?: GpsPoint[]

  // Calculees
  hrZones?: HeartRateZones
  cardiacDrift?: number
  trimp?: number
  avgPacePerKm?: string
}
```

**And** une migration ajoute `max_heart_rate` (integer, nullable) et `vma` (float, nullable) a la table `user_profiles`
**And** une migration ajoute `gpx_file_path` (string, nullable) a la table `sessions`
**And** le modele Lucid `UserProfile` et l'entite domain `UserProfile` sont mis a jour

**Comment tu valides :** `node ace migration:run` → les colonnes existent. L'interface `RunMetrics` est importable dans les use cases.

---

## Story 11.4 : Formulaire de saisie enrichi

As a **utilisateur connecte**,
I want **saisir des metriques de course supplementaires lors de la creation ou modification d'une seance**,
So that **mon historique est plus complet meme sans fichier GPX**.

**Acceptance Criteria:**

**Given** je cree ou modifie une seance de course
**When** je deplie "Plus de details"
**Then** je vois les nouveaux champs en plus des existants :
- FC min (bpm)
- FC max (bpm)
- Cadence moyenne (pas/min)
- Denivele + (m)
- Denivele - (m)

**Given** je remplis ces champs et je sauvegarde
**When** la requete est traitee
**Then** les valeurs sont stockees dans `sportMetrics` au format `RunMetrics`
**And** les anciens champs (`avgHeartRate`, `perceivedEffort`, etc.) continuent de fonctionner

**Given** j'ai renseigne ma FC max dans mon profil ET je saisis FC min/moy/max pour une seance
**When** la seance est sauvegardee
**Then** les zones FC sont calculees automatiquement et stockees dans `sportMetrics.hrZones`

**Comment tu valides :** Nouvelle seance → "Plus de details" → renseigne FC min=120, FC max=175, cadence=180, D+=150 → Enregistrer → detail seance → les valeurs apparaissent.

---

## Story 11.5 : Parser GPX

As a **dev (Luka)**,
I want **un service de parsing GPX qui extrait toutes les donnees utiles d'un fichier GPX**,
So that **l'import GPX produit des `RunMetrics` completes**.

**Acceptance Criteria:**

**Given** un fichier GPX valide avec trackpoints
**When** le parser traite le fichier
**Then** il extrait :
- Duree totale (premier → dernier timestamp)
- Distance totale (somme Haversine entre points)
- Splits au km (timestamp + allure + FC moy par km)
- Courbe FC(t) reechantillonnee toutes les 15s
- Courbe allure(t) reechantillonnee toutes les 15s (lissee sur fenetre glissante de 30s)
- Courbe altitude(t) reechantillonnee toutes les 15s
- Trace GPS (lat/lon reechantillonne toutes les 15s)
- Denivele +/- (somme des deltas d'altitude positifs/negatifs, seuil de bruit de 2m)
- FC min / moy / max
- Cadence moyenne (si disponible)

**Given** un fichier GPX sans extensions FC
**When** le parser traite le fichier
**Then** les courbes FC et zones sont absentes du resultat (pas d'erreur)
**And** les donnees GPS, altitude, distance et allure sont extraites normalement

**Given** un fichier GPX invalide ou corrompu
**When** le parser tente de le traiter
**Then** une erreur explicite est retournee ("Format GPX invalide" ou "Aucun trackpoint trouve")

**And** le parser est dans `app/services/gpx_parser_service.ts`
**And** il implemente un port `GpxParser` dans `app/domain/interfaces/gpx_parser.ts`
**And** il utilise `fast-xml-parser` pour le parsing XML

**Comment tu valides :** Test unitaire avec un fichier GPX de reference → les metriques extraites correspondent aux valeurs attendues (distance ±1%, FC identiques, splits corrects).

---

## Story 11.6 : Upload et import GPX sur une seance

As a **utilisateur connecte**,
I want **importer un fichier GPX lors de la creation d'une seance ou sur une seance existante**,
So that **ma seance est automatiquement enrichie avec toutes les donnees du fichier**.

**Acceptance Criteria:**

**Given** je cree une nouvelle seance
**When** je clique sur "Importer un GPX" dans le formulaire
**Then** un selecteur de fichier s'ouvre (accept: `.gpx`)

**Given** je selectionne un fichier GPX valide
**When** le fichier est uploade et parse
**Then** les champs du formulaire sont pre-remplis : sport (course), date, duree, distance, FC moy, FC min, FC max, cadence, denivele
**And** un apercu de la carte s'affiche dans le formulaire
**And** je peux corriger les valeurs avant de sauvegarder

**Given** je sauvegarde la seance importee depuis un GPX
**When** la requete est traitee
**Then** le fichier GPX est stocke dans `storage/gpx/{userId}/{sessionId}.gpx`
**And** les `sportMetrics` contiennent les courbes, splits et metriques calculees au format `RunMetrics`
**And** `gpxFilePath` est renseigne en base

**Given** je suis sur le detail d'une seance existante sans GPX
**When** je clique sur "Enrichir avec un GPX"
**Then** le meme flow d'upload se declenche
**And** les donnees GPX sont mergees avec les donnees existantes (les valeurs GPX ecrasent les valeurs manuelles sauf le ressenti et les notes)

**Given** je selectionne un fichier GPX invalide
**When** l'upload echoue
**Then** un message d'erreur clair s'affiche ("Format GPX invalide")

**Comment tu valides :** Nouvelle seance → "Importer un GPX" → selectionne un fichier → les champs se pre-remplissent + apercu carte → Enregistrer → detail seance → toutes les donnees sont la.

---

## Story 11.7 : Metriques calculees (zones FC, drift, TRIMP)

As a **utilisateur connecte avec FC max configuree**,
I want **voir les metriques derivees de mes seances**,
So that **je comprends la qualite et la charge de mes entrainements**.

**Acceptance Criteria:**

**Given** j'ai configure ma FC max dans mon profil (ex: 190 bpm)
**When** une seance a des donnees FC (manuelles ou GPX)
**Then** les zones FC sont calculees :
- Z1 (recuperation) : 50-60% FC max
- Z2 (endurance) : 60-70% FC max
- Z3 (tempo) : 70-80% FC max
- Z4 (seuil) : 80-90% FC max
- Z5 (VMA) : 90-100% FC max

**Given** une seance a une courbe FC(t) (depuis GPX)
**When** les zones sont calculees
**Then** elles indiquent le pourcentage de temps passe dans chaque zone

**Given** une seance a seulement FC moy (saisie manuelle, pas de courbe)
**When** les zones sont calculees
**Then** seule la zone correspondant a la FC moy est indiquee (pas de repartition temporelle)

**Given** une seance a une courbe FC(t) sur toute la duree
**When** le drift cardiaque est calcule
**Then** drift = (FC moy 2e moitie - FC moy 1re moitie) / FC moy 1re moitie × 100
**And** un drift > 5% est signale comme "fatigue significative"

**Given** une seance a des donnees FC + duree
**When** le TRIMP est calcule
**Then** TRIMP = duree (min) × coefficient de zone (Z1=1, Z2=2, Z3=3, Z4=4, Z5=5)
**And** la valeur est stockee dans `sportMetrics.trimp`

**Comment tu valides :** Configure FC max = 190 → seance avec FC moy 152 → zones affichent "Z3 (80%)" → seance GPX → repartition "Z1: 5%, Z2: 45%, Z3: 35%, Z4: 15%".

---

## Story 11.8 : Visualisation courbes FC/allure dans le detail seance

As a **utilisateur connecte**,
I want **voir les courbes de frequence cardiaque et d'allure sur la duree de ma seance**,
So that **je comprends comment mon effort a evolue pendant la sortie**.

**Acceptance Criteria:**

**Given** je consulte le detail d'une seance avec des courbes (import GPX)
**When** la page se charge
**Then** un graphique Recharts affiche :
- Courbe FC(t) en rouge/orange (axe Y gauche, bpm)
- Courbe allure(t) en bleu (axe Y droit, min/km ou km/h selon preference)
- Axe X = temps ecoule
**And** les deux courbes sont superposees sur le meme graphique

**Given** je survole (desktop) ou tape (mobile) un point du graphique
**When** le tooltip s'affiche
**Then** il montre : temps ecoule, FC (bpm), allure, altitude, km courant

**Given** la seance a aussi une courbe d'altitude
**When** le graphique s'affiche
**Then** l'altitude est representee en area chart grise en arriere-plan (profil du parcours)

**Given** la seance n'a pas de courbe FC (pas de montre cardio)
**When** le graphique s'affiche
**Then** seule la courbe d'allure est affichee (pas d'erreur)

**Given** la seance n'a aucune courbe (saisie manuelle simple)
**When** je consulte le detail
**Then** la section graphique n'est pas affichee

**Comment tu valides :** Detail d'une seance GPX → graphique avec FC en rouge + allure en bleu + altitude en fond gris. Survole un point → tooltip complet.

---

## Story 11.9 : Carte GPS du parcours

As a **utilisateur connecte**,
I want **voir la carte de mon parcours de course**,
So that **je visualise le trace de ma sortie**.

**Acceptance Criteria:**

**Given** je consulte le detail d'une seance avec des donnees GPS (import GPX)
**When** la page se charge
**Then** une carte Leaflet affiche le trace du parcours en polyline coloree
**And** la carte est auto-zoomee pour afficher tout le parcours
**And** un marqueur indique le depart (vert) et l'arrivee (rouge)

**Given** le parcours a des donnees d'altitude
**When** la carte s'affiche
**Then** la polyline est coloree par gradient selon l'altitude (ou optionnellement par allure ou FC)

**Given** je clique sur un point du trace
**When** un popup s'affiche
**Then** il montre : km, allure, FC, altitude a ce point

**Given** la seance n'a pas de donnees GPS
**When** je consulte le detail
**Then** la carte n'est pas affichee

**And** la carte utilise les tuiles OpenStreetMap (gratuit, pas de cle API)
**And** Leaflet est charge en lazy import (pas dans le bundle principal)

**Comment tu valides :** Detail d'une seance GPX → carte avec le trace bleu/colore → marqueurs depart/arrivee → clique sur un point → popup avec les metriques.

---

## Story 11.10 : Affichage zones FC et metriques calculees dans le detail

As a **utilisateur connecte**,
I want **voir les zones FC, le drift cardiaque et le TRIMP dans le detail de ma seance**,
So that **j'evalue la qualite de mon entrainement d'un coup d'oeil**.

**Acceptance Criteria:**

**Given** je consulte le detail d'une seance avec des zones FC calculees
**When** la section "Analyse" s'affiche
**Then** je vois :
- Un bar chart horizontal des zones FC (Z1 a Z5) avec le % de temps et la couleur par zone
- Le drift cardiaque en % avec un indicateur visuel (neutre si < 5%, orange si > 5%)
- Le TRIMP avec une echelle qualitative (leger / modere / dur / tres dur)
- L'allure moyenne par km (tableau des splits)

**Given** la seance a des splits
**When** le tableau des splits s'affiche
**Then** chaque ligne montre : km, allure, FC moy, denivele du split
**And** le split le plus rapide est mis en evidence

**Given** la seance n'a pas de FC max configuree dans le profil
**When** le detail s'affiche
**Then** les zones FC ne sont pas affichees
**And** un message discret invite a "Configurer la FC max dans le profil pour voir les zones"

**Comment tu valides :** Detail seance GPX avec FC max configuree → zones FC en barres colorees + drift + TRIMP + tableau splits.

---

## Ordre d'implementation recommande

| Story | Titre                         | Dependances | Effort estime |
| ----- | ----------------------------- | ----------- | ------------- |
| 11.1  | Profil physiologique          | —           | 0.5j          |
| 11.2  | Page explicative mesures      | —           | 0.5j          |
| 11.3  | Schema RunMetrics & migration | —           | 1j            |
| 11.4  | Formulaire saisie enrichi     | 11.3        | 1j            |
| 11.5  | Parser GPX                    | 11.3        | 2j            |
| 11.6  | Upload et import GPX          | 11.5        | 2j            |
| 11.7  | Metriques calculees           | 11.3, 11.1  | 1.5j          |
| 11.8  | Visualisation courbes         | 11.6        | 1.5j          |
| 11.9  | Carte GPS                     | 11.6        | 1.5j          |
| 11.10 | Affichage zones et metriques  | 11.7, 11.8  | 1j            |

**Total estime : ~12.5 jours de dev**

Stories parallelisables : 11.1 + 11.2 + 11.3 en parallele, puis 11.4 + 11.5 en parallele, puis 11.7 + 11.8 + 11.9 en parallele.
