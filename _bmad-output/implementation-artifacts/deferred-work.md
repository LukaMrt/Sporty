
## Deferred from: code review of 12-15-recalibration (2026-04-05)

- Double fetch du plan dans `RecalibratePlanListener` (`findById`) suivi de `RecalibratePlan.execute` (`findActiveByUserId`) — deux requêtes DB pour le même objet. Refactor potentiel : passer l'entité plan directement au use case, ou vérifier `autoRecalibrate` et transmettre le planId au lieu de refetch.
