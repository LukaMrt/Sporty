# Story 11.7 : Metriques calculees (zones FC, drift, TRIMP)

Status: pending

## Story

As a **utilisateur connecte avec FC max configuree**,
I want **voir les metriques derivees de mes seances**,
so that **je comprends la qualite et la charge de mes entrainements**.

## Acceptance Criteria

1. **Given** j'ai configure ma FC max dans mon profil (ex: 190 bpm) **When** une seance a des donnees FC (manuelles ou GPX) **Then** les zones FC sont calculees : Z1 (50-60%), Z2 (60-70%), Z3 (70-80%), Z4 (80-90%), Z5 (90-100% FC max)
2. **Given** une seance a une courbe FC(t) (depuis GPX) **When** les zones sont calculees **Then** elles indiquent le pourcentage de temps passe dans chaque zone
3. **Given** une seance a seulement FC moy (saisie manuelle) **When** les zones sont calculees **Then** seule la zone correspondant a la FC moy est indiquee (pas de repartition temporelle)
4. **Given** une seance a une courbe FC(t) **When** le drift cardiaque est calcule **Then** drift = (FC moy 2e moitie - FC moy 1re moitie) / FC moy 1re moitie × 100 **And** un drift > 5% est signale comme "fatigue significative"
5. **Given** une seance a des donnees FC + duree **When** le TRIMP est calcule **Then** TRIMP = duree (min) × coefficient de zone (Z1=1, Z2=2, Z3=3, Z4=4, Z5=5) **And** la valeur est stockee dans `sportMetrics.trimp`

## Tasks / Subtasks

- [ ] Task 1 : Service domain — calcul zones FC (AC: #1, #2, #3)
  - [ ] Creer `app/domain/services/heart_rate_zone_service.ts`
  - [ ] Methode `calculateZones(fcMax: number, heartRateCurve: DataPoint[]): HeartRateZones` — repartition temporelle
  - [ ] Methode `getZoneForHr(fcMax: number, hr: number): number` — zone unique pour FC moy
  - [ ] Zones : Z1=50-60%, Z2=60-70%, Z3=70-80%, Z4=80-90%, Z5=90-100%
- [ ] Task 2 : Service domain — drift cardiaque (AC: #4)
  - [ ] Methode `calculateDrift(heartRateCurve: DataPoint[]): number`
  - [ ] Diviser la courbe en 2 moities egales par duree
  - [ ] Retourner le % de drift
- [ ] Task 3 : Service domain — TRIMP (AC: #5)
  - [ ] Methode `calculateTrimp(durationMinutes: number, hrZones: HeartRateZones): number`
  - [ ] Ponderation : temps Z1×1 + temps Z2×2 + temps Z3×3 + temps Z4×4 + temps Z5×5
  - [ ] Si pas de courbe FC : utiliser la zone de la FC moy × duree totale
- [ ] Task 4 : Integration — calcul automatique a la sauvegarde (AC: #1, #4, #5)
  - [ ] Etendre les use cases de creation/modification/enrichissement de seance
  - [ ] Si FC max profil disponible : calculer zones + drift + TRIMP
  - [ ] Stocker dans `sportMetrics` au format `RunMetrics`
- [ ] Task 5 : Tests unitaires
  - [ ] Test zones FC avec courbe connue → verifier repartition %
  - [ ] Test drift : courbe plate → drift ~0%, courbe montante → drift > 0%
  - [ ] Test TRIMP : seance Z2 pure 60min → TRIMP = 120

## Dev Notes

### Zones FC (methode Karvonen simplifiee)

| Zone | Nom | % FC max | Couleur suggeree |
|------|-----|----------|-----------------|
| Z1 | Recuperation | 50-60% | Gris |
| Z2 | Endurance | 60-70% | Bleu |
| Z3 | Tempo | 70-80% | Vert |
| Z4 | Seuil | 80-90% | Orange |
| Z5 | VMA | 90-100% | Rouge |

### Drift cardiaque

Le drift cardiaque est un indicateur de fatigue cardiovasculaire. Un drift > 5% sur une sortie a allure constante indique que le corps a du mal a maintenir le debit cardiaque — signe de deshydratation ou de fatigue accumulee.

### TRIMP simplifie

On utilise une version simplifiee du TRIMP (Training Impulse) de Banister. La version complete utilise un coefficient exponentiel par sexe, mais pour un usage personnel la version lineaire par zone est suffisante et plus intuitive.

### Placement dans l'architecture

Les calculs sont dans `app/domain/services/` car ce sont des regles metier pures sans dependance externe. Ils sont appeles par les use cases, pas directement par les controllers.

### Dependances

- Story 11.3 (types `RunMetrics`, `HeartRateZones`, `DataPoint`)
- Story 11.1 (FC max dans le profil)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.7]
- Banister TRIMP : Banister EW. "Modeling elite athletic performance." 1991.
