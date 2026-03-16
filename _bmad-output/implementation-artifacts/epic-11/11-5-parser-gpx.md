# Story 11.5 : Parser GPX

Status: pending

## Story

As a **dev (Luka)**,
I want **un service de parsing GPX qui extrait toutes les donnees utiles d'un fichier GPX**,
so that **l'import GPX produit des `RunMetrics` completes**.

## Acceptance Criteria

1. **Given** un fichier GPX valide avec trackpoints **When** le parser traite le fichier **Then** il extrait : duree totale, distance totale (Haversine), splits au km, courbe FC(t) toutes les 15s, courbe allure(t) toutes les 15s (lissee fenetre 30s), courbe altitude(t) toutes les 15s, trace GPS toutes les 15s, denivele +/- (seuil bruit 2m), FC min/moy/max, cadence moyenne
2. **Given** un fichier GPX sans extensions FC **When** le parser traite le fichier **Then** les courbes FC et cadence sont absentes du resultat (pas d'erreur) **And** les donnees GPS, altitude, distance et allure sont extraites normalement
3. **Given** un fichier GPX invalide ou corrompu **When** le parser tente de le traiter **Then** une erreur explicite est retournee ("Format GPX invalide" ou "Aucun trackpoint trouve")

## Tasks / Subtasks

- [ ] Task 1 : Port domain (AC: #1, #2, #3)
  - [ ] Creer `app/domain/interfaces/gpx_parser.ts`
  - [ ] Abstract class `GpxParser` avec methode `parse(content: string): GpxParseResult`
  - [ ] Type `GpxParseResult` avec toutes les donnees extraites + metriques calculees
- [ ] Task 2 : Installer `fast-xml-parser` (AC: #1)
  - [ ] `pnpm add fast-xml-parser`
- [ ] Task 3 : Service GPX — extraction trackpoints (AC: #1, #2)
  - [ ] Creer `app/services/gpx_parser_service.ts`
  - [ ] Parser le XML avec `fast-xml-parser`
  - [ ] Extraire les trackpoints : lat, lon, ele, time, hr, cad (extensions optionnelles)
  - [ ] Gerer les cas : extensions absentes, points sans elevation, points sans timestamp
- [ ] Task 4 : Service GPX — calculs de distance et allure (AC: #1)
  - [ ] Formule Haversine pour distance entre 2 points GPS
  - [ ] Distance totale = somme des distances entre points consecutifs
  - [ ] Allure instantanee = delta temps / delta distance entre points
  - [ ] Lissage allure sur fenetre glissante de 30 secondes
- [ ] Task 5 : Service GPX — reechantillonnage (AC: #1)
  - [ ] Reechantillonner toutes les courbes a 15 secondes d'intervalle
  - [ ] Interpolation lineaire entre les deux points les plus proches du timestamp cible
  - [ ] Produire `DataPoint[]` pour FC, allure, altitude
  - [ ] Produire `GpsPoint[]` pour le trace GPS
- [ ] Task 6 : Service GPX — splits au km (AC: #1)
  - [ ] Calculer la distance cumulee point par point
  - [ ] A chaque passage de km, enregistrer le split : km, allure (secondes), FC moyenne du split, denivele du split
- [ ] Task 7 : Service GPX — denivele (AC: #1)
  - [ ] Somme des deltas positifs d'altitude = denivele +
  - [ ] Somme des deltas negatifs = denivele -
  - [ ] Seuil de bruit : ignorer les deltas < 2m pour filtrer le bruit GPS
- [ ] Task 8 : Service GPX — validation et erreurs (AC: #3)
  - [ ] Verifier la presence de `<trk>` et `<trkseg>` et `<trkpt>`
  - [ ] Erreur si < 2 trackpoints
  - [ ] Erreur si XML invalide
  - [ ] Creer `app/domain/errors/gpx_parse_error.ts`
- [ ] Task 9 : Binding IoC
  - [ ] Enregistrer `GpxParserService` dans `providers/app_provider.ts`
- [ ] Task 10 : Tests unitaires (AC: #1, #2, #3)
  - [ ] Fichier GPX de reference avec FC + cadence + elevation
  - [ ] Fichier GPX minimal (lat/lon/time seulement)
  - [ ] Fichier GPX invalide
  - [ ] Verifier : distance ±1%, FC identiques, splits corrects, denivele coherent

## Dev Notes

### Format GPX

```xml
<gpx>
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <ele>35.4</ele>
        <time>2026-03-16T08:30:15Z</time>
        <extensions>
          <gpxtpx:TrackPointExtension>
            <gpxtpx:hr>142</gpxtpx:hr>
            <gpxtpx:cad>88</gpxtpx:cad>
          </gpxtpx:TrackPointExtension>
        </extensions>
      </trkpt>
    </trkseg>
  </trk>
</gpx>
```

Les extensions Garmin utilisent le namespace `gpxtpx`, mais d'autres montres peuvent utiliser des formats differents. Le parser doit chercher `hr` et `cad` dans toutes les extensions de maniere flexible.

### Formule Haversine

```typescript
function haversine(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371000 // rayon terre en metres
  const dLat = toRad(lat2 - lat1)
  const dLon = toRad(lon2 - lon1)
  const a = Math.sin(dLat/2)**2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon/2)**2
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
}
```

### Lissage allure

L'allure instantanee est tres bruitee (GPS jitter). Appliquer une moyenne glissante sur une fenetre de 30 secondes avant le reechantillonnage.

### Seuil de bruit altitude

Les altitudes GPS sont imprecises (±5-10m). Un seuil de 2m pour le calcul du denivele evite de compter le bruit comme du denivele reel.

### Dependances

- Story 11.3 (types `RunMetrics`, `DataPoint`, `GpsPoint`, `KmSplit`)

### References

- [Source: _bmad-output/epics/epic-11-donnees-course-enrichies-gpx.md#Story 11.5]
- GPX schema : https://www.topografix.com/GPX/1/1/
