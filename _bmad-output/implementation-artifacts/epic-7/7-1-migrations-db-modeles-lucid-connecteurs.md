# Story 7.1 : Migrations DB & modeles Lucid connecteurs

Status: draft

## Story

As a **dev (Luka)**,
I want **les tables connectors et import_activities, et les colonnes imported_from/external_id sur sessions**,
so that **le modele de donnees est pret pour tout le systeme d'import**.

## Acceptance Criteria

1. **Given** la base de donnees existante **When** je lance `node ace migration:run` **Then** la table `connectors` est creee avec : id, user_id (FK users), provider (enum: strava), status (enum: connected/error/disconnected), encrypted_access_token, encrypted_refresh_token, token_expires_at, auto_import_enabled (boolean, defaut false), polling_interval_minutes (integer, defaut 15), last_sync_at (nullable), timestamps
2. **Given** la table `connectors` **When** je verifie les contraintes **Then** la contrainte unique `(user_id, provider)` est en place
3. **Given** la migration s'execute **When** je verifie les tables **Then** la table `import_activities` est creee avec : id, connector_id (FK connectors), external_id, status (enum: new/imported/ignored), raw_data (JSONB), imported_session_id (FK sessions, nullable), timestamps
4. **Given** la table `import_activities` **When** je verifie les contraintes **Then** la contrainte unique `(connector_id, external_id)` est en place
5. **Given** la migration s'execute **When** je verifie la table `sessions` **Then** les nouvelles colonnes `imported_from` (nullable) et `external_id` (nullable) existent
6. **Given** les tables sont creees **When** je verifie les modeles Lucid **Then** `Connector` et `ImportActivity` existent avec les relations (belongsTo User, hasMany ImportActivity / belongsTo Connector)
7. **Given** le modele `Connector` **When** je lis/ecris les champs token **Then** les getter/setter transparents chiffrent/dechiffrent via le service `TokenEncryption` (AES-256-GCM)
8. **Given** le service `TokenEncryption` **When** il chiffre une valeur **Then** le format est `base64(iv):base64(ciphertext):base64(authTag)` avec IV unique par operation
9. **Given** la variable d'env `CONNECTOR_ENCRYPTION_KEY` **When** elle est absente **Then** l'application echoue au demarrage (fail-fast) si des connecteurs sont actifs
10. **Given** les migrations sont appliquees **When** je lance `node ace migration:rollback` **Then** les tables et colonnes sont supprimees proprement

## Tasks / Subtasks

- [ ] Task 1 : Creer la migration `connectors` (AC: #1, #2)
  - [ ] Table avec tous les champs specifies
  - [ ] Contrainte unique `(user_id, provider)`
  - [ ] FK vers `users`
- [ ] Task 2 : Creer la migration `import_activities` (AC: #3, #4)
  - [ ] Table avec tous les champs specifies
  - [ ] Contrainte unique `(connector_id, external_id)`
  - [ ] FK vers `connectors` et `sessions`
- [ ] Task 3 : Migration d'evolution `sessions` (AC: #5)
  - [ ] Ajouter colonnes `imported_from` et `external_id` (nullable)
- [ ] Task 4 : Modeles Lucid (AC: #6)
  - [ ] Creer `Connector` avec relations
  - [ ] Creer `ImportActivity` avec relations
  - [ ] Mettre a jour `Session` avec les nouveaux champs
  - [ ] Mettre a jour `User` avec la relation `hasMany Connector`
- [ ] Task 5 : Service TokenEncryption (AC: #7, #8)
  - [ ] Implementer `encrypt(plaintext): string` et `decrypt(ciphertext): string`
  - [ ] AES-256-GCM, IV aleatoire 12 bytes par operation
  - [ ] Format sortie : `base64(iv):base64(ciphertext):base64(authTag)`
- [ ] Task 6 : Getter/setter transparents sur Connector (AC: #7)
  - [ ] `encrypted_access_token` et `encrypted_refresh_token` chiffres/dechiffres automatiquement
- [ ] Task 7 : Validation env CONNECTOR_ENCRYPTION_KEY (AC: #9)
  - [ ] Ajout dans `start/env.ts` avec validation conditionnelle
- [ ] Task 8 : Verifier rollback (AC: #10)

## Dev Notes

### Schema de la table `connectors`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | serial | PK |
| user_id | integer | FK users, NOT NULL |
| provider | varchar | NOT NULL (enum: strava) |
| status | varchar | NOT NULL (enum: connected/error/disconnected) |
| encrypted_access_token | text | nullable |
| encrypted_refresh_token | text | nullable |
| token_expires_at | timestamp | nullable |
| auto_import_enabled | boolean | NOT NULL, defaut false |
| polling_interval_minutes | integer | NOT NULL, defaut 15 |
| last_sync_at | timestamp | nullable |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### Schema de la table `import_activities`

| Colonne | Type | Contraintes |
|---------|------|-------------|
| id | serial | PK |
| connector_id | integer | FK connectors, NOT NULL |
| external_id | varchar | NOT NULL |
| status | varchar | NOT NULL (enum: new/imported/ignored) |
| raw_data | jsonb | nullable |
| imported_session_id | integer | FK sessions, nullable |
| created_at | timestamp | NOT NULL |
| updated_at | timestamp | NOT NULL |

### Format chiffrement TokenEncryption

```
base64(iv):base64(ciphertext):base64(authTag)
```

- IV : 12 bytes aleatoires (crypto.randomBytes)
- Algorithme : AES-256-GCM
- Cle : derivee de `CONNECTOR_ENCRYPTION_KEY` (32 bytes / 256 bits)
- AuthTag : 16 bytes

### References

- [Source: _bmad-output/planning-artifacts/architecture-import-connectors.md]
- [Source: _bmad-output/planning-artifacts/epics-import-connectors.md#Story 7.1]
