# Story 6.4: Zoom temporel

Status: ready-for-dev

## Story

As a **utilisateur connecté**,
I want **zoomer sur une période (semaine ou mois) sur mes graphiques**,
So that **je peux analyser ma progression sur la période qui m'intéresse** (FR20).

## Acceptance Criteria (BDD)

### AC1 — Sélection Semaine
**Given** je suis sur le graphique d'évolution
**When** je sélectionne "Semaine"
**Then** le graphique affiche uniquement les données de la semaine en cours
**And** les QuickStatCards se mettent à jour pour refléter la période sélectionnée

### AC2 — Sélection Mois
**Given** je sélectionne "Mois"
**When** le graphique se met à jour
**Then** il affiche les données du mois en cours

### AC3 — Sélection Tout (défaut)
**Given** j'arrive sur le dashboard
**When** aucune période n'est sélectionnée
**Then** le graphique affiche toutes les données (comportement par défaut, rolling 4 semaines pour le HeroMetric)

### AC4 — Swipe mobile
**Given** je suis sur mobile
**When** je swipe horizontalement sur le sélecteur de période
**Then** je bascule entre Semaine, Mois et Tout de manière fluide

### AC5 — Transition fluide
**Given** je change de période
**When** les données se rechargent
**Then** la transition est fluide (pas de flash blanc ni de layout shift)

## Tasks / Subtasks

- [ ] Task 1 — Filtrage côté frontend (AC: #1, #2, #3, #5)
  - [ ] Le filtrage temporel est purement frontend — toutes les données sont déjà chargées dans `chartData.points`
  - [ ] Pas de requête serveur supplémentaire, pas de changement backend
  - [ ] Filtrer `chartData.points` en JS selon la période sélectionnée :
    - "Semaine" : `points.filter(p => isCurrentWeek(p.date))`
    - "Mois" : `points.filter(p => isCurrentMonth(p.date))`
    - "Tout" : tous les points
  - [ ] **QuickStatCards** : recalculer les stats visibles uniquement pour la période sélectionnée
    - Option A (simple) : les QuickStatCards gardent toujours leurs valeurs serveur (pas de recalcul client)
    - Option B (fidèle à l'AC) : recalculer côté client en filtrant les séances
    - **Choix recommandé : Option A** pour la v1 — le recalcul côté client des projections est complexe et source d'erreurs. Les QuickStatCards restent fixes (semaine en cours pour volume/sessions, rolling 4 sem pour FC/allure). Le zoom ne s'applique qu'au graphique.

- [ ] Task 2 — Composant `PeriodSelector.tsx` (AC: #1, #2, #3, #4)
  - [ ] Créer `inertia/components/shared/PeriodSelector.tsx`
  - [ ] Props : `value: 'week' | 'month' | 'all', onChange: (period) => void`
  - [ ] 3 boutons inline : "Semaine", "Mois", "Tout"
  - [ ] Style : boutons pills avec état actif (cf. pattern `SessionFilters.tsx`)
  - [ ] Mobile : swipeable via scroll horizontal natif (`overflow-x-auto whitespace-nowrap`) — pas de lib de swipe supplémentaire

- [ ] Task 3 — Intégrer dans `Dashboard.tsx` (AC: #1-5)
  - [ ] State local : `const [period, setPeriod] = useState<'week' | 'month' | 'all'>('all')`
  - [ ] Placer `PeriodSelector` au-dessus du graphique `EvolutionChart`
  - [ ] Passer la période au graphique pour filtrer les points
  - [ ] **Transition fluide** : utiliser `key={period}` ou une transition CSS pour éviter le flash

- [ ] Task 4 — Filtrage dans `EvolutionChart.tsx` (AC: #1, #2, #3, #5)
  - [ ] Ajouter prop `period?: 'week' | 'month' | 'all'`
  - [ ] Filtrer les données avant de les passer à Recharts :
    ```typescript
    const filteredData = useMemo(() => {
      if (period === 'week') return data.filter(p => isThisWeek(p.date))
      if (period === 'month') return data.filter(p => isThisMonth(p.date))
      return data
    }, [data, period])
    ```
  - [ ] Utiliser Luxon pour la comparaison de dates : `DateTime.fromISO(date).hasSame(DateTime.now(), 'week')` / `'month'`

- [ ] Task 5 — Utilitaires dates (AC: #1, #2)
  - [ ] Ajouter dans `inertia/lib/format.ts` ou un nouveau `inertia/lib/dates.ts` :
    - `isThisWeek(isoDate: string): boolean`
    - `isThisMonth(isoDate: string): boolean`
  - [ ] Utiliser Luxon (déjà installé) pour les calculs ISO week

- [ ] Task 6 — Tests (AC: #1-5)
  - [ ] Tests unitaires (frontend, si structure de test frontend existe) :
    - Test : filtre "Semaine" ne garde que les points de la semaine ISO en cours
    - Test : filtre "Mois" ne garde que les points du mois en cours
    - Test : filtre "Tout" garde tous les points
  - [ ] Tests fonctionnels : vérifier que les props dashboard incluent toutes les données (pas de filtrage serveur)

## Dev Notes

### Architecture Compliance
- **Aucun changement backend** — tout le filtrage temporel est côté frontend
- Les données sont déjà complètes dans les props Inertia (chargées en stories 6.1-6.3)
- Le zoom est un filtre visuel frontend uniquement

### Pattern de Filtrage Frontend
- `useMemo` pour éviter le recalcul à chaque render
- Luxon `DateTime.fromISO()` pour les comparaisons de dates
- **Attention** : `hasSame(now, 'week')` utilise la semaine ISO (lundi = début) — conforme aux user preferences `weekStartsOn: 'monday'`

### Transition Fluide
- Pas de `key={period}` qui forcerait un re-mount (perte d'animation)
- Plutôt : laisser Recharts animer naturellement le changement de données
- Ou ajouter une transition CSS `opacity` sur le container si nécessaire

### Mobile Swipe
- Utiliser le scroll horizontal natif CSS (`overflow-x-auto`) plutôt qu'une lib de geste
- Le sélecteur de période est suffisamment petit pour ne pas nécessiter de vrai swipe

### Fichiers Impactés
- `inertia/components/shared/PeriodSelector.tsx` — NOUVEAU
- `inertia/components/shared/EvolutionChart.tsx` — modifier (ajout prop period + filtrage)
- `inertia/pages/Dashboard.tsx` — modifier (ajout state period + PeriodSelector)
- `inertia/lib/format.ts` ou `inertia/lib/dates.ts` — étendre (isThisWeek, isThisMonth)

### Dépendances
- **Stories 6.1, 6.2, 6.3 DOIVENT être implémentées avant**

### References
- [Source: _bmad-output/epics/epic-6-dashboard-visualisation.md#Story 6.4]
- [Source: _bmad-output/planning-artifacts/ux-design-specification.md#Swipe pour les périodes temporelles]

## Dev Agent Record

### Agent Model Used

### Debug Log References

### Completion Notes List

### File List
