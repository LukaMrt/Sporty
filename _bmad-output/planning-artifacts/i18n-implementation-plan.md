# Plan d'implémentation i18n — Sporty

> **Approche** : Server-driven via `@adonisjs/i18n` + Inertia shared props
> **Langues cibles** : Français (défaut), Anglais
> **Date** : 2026-02-27

---

## Vue d'ensemble

Les traductions vivent côté serveur dans `resources/lang/{locale}/*.json`. Elles sont transmises au front React via les shared props Inertia. Un hook React `useTranslation()` expose une fonction `t()` pour consommer les clés.

### Phases

| Phase                        | Étapes    | Objectif                                                      |
| ---------------------------- | --------- | ------------------------------------------------------------- |
| **Phase 1 — Infrastructure** | 1 → 4 + 9 | Plomberie i18n en place, extraction des chaînes FR hardcodées |
| **Phase 2 — Multi-langue**   | 5 → 8     | Switch de langue, persistance utilisateur, traductions EN     |

---

## Phase 1 — Infrastructure i18n

### Étape 1 — Installer et configurer `@adonisjs/i18n`

**Commande :**

```bash
node ace add @adonisjs/i18n
```

**Résultat attendu :**

- Création de `config/i18n.ts`
- Enregistrement du provider dans `adonisrc.ts`
- Création du dossier `resources/lang/`

**Configuration (`config/i18n.ts`) :**

```typescript
import app from '@adonisjs/core/services/app'
import { defineConfig, formatters, loaders } from '@adonisjs/i18n'

const i18nConfig = defineConfig({
  defaultLocale: 'fr',
  supportedLocales: ['fr', 'en'],

  formatter: formatters.icu(),

  loaders: [
    loaders.fs({
      location: app.languageFilesPath(),
    }),
  ],
})

export default i18nConfig
```

**Fichiers impactés :**

| Action  | Fichier                        |
| ------- | ------------------------------ |
| Créé    | `config/i18n.ts`               |
| Modifié | `adonisrc.ts` (ajout provider) |

---

### Étape 2 — Créer les fichiers de traduction

**Structure :**

```
resources/lang/
├── fr/
│   ├── common.json        # Navigation, boutons, labels génériques
│   ├── auth.json          # Connexion, inscription, déconnexion
│   ├── dashboard.json     # Métriques, graphiques, états vides
│   ├── sessions.json      # Séances sportives (CRUD, filtres, tri)
│   ├── profile.json       # Profil utilisateur, préférences
│   ├── onboarding.json    # Flux d'onboarding
│   ├── admin.json         # Administration utilisateurs
│   └── validation.json    # Messages d'erreur VineJS
├── en/
│   └── (même structure — Phase 2)
```

**Exemple `resources/lang/fr/common.json` :**

```json
{
  "nav": {
    "home": "Accueil",
    "sessions": "Séances",
    "planning": "Planning",
    "profile": "Profil",
    "admin": "Administration",
    "logout": "Se déconnecter"
  },
  "actions": {
    "save": "Enregistrer",
    "cancel": "Annuler",
    "delete": "Supprimer",
    "edit": "Modifier",
    "create": "Créer",
    "back": "Retour"
  }
}
```

**Exemple `resources/lang/fr/auth.json` :**

```json
{
  "login": {
    "title": "Se connecter",
    "email": "Adresse e-mail",
    "password": "Mot de passe",
    "submit": "Se connecter",
    "submitting": "Connexion...",
    "invalidCredentials": "Identifiants incorrects"
  },
  "register": {
    "title": "Créer un compte",
    "fullName": "Nom complet",
    "email": "Adresse e-mail",
    "password": "Mot de passe",
    "submit": "S'inscrire",
    "submitting": "Inscription..."
  }
}
```

**Exemple `resources/lang/fr/dashboard.json` :**

```json
{
  "title": "Accueil",
  "empty": {
    "title": "Saisis ta première séance pour commencer",
    "description": "Suis tes entraînements et vois ta progression au fil du temps.",
    "cta": "Saisir ma première séance"
  },
  "stats": {
    "weeklyVolume": "Volume semaine",
    "avgHeartRate": "FC moyenne",
    "sessions": "Séances",
    "thisWeek": "cette sem."
  },
  "chart": {
    "evolution": "Évolution"
  }
}
```

**Fichiers créés :** `resources/lang/fr/*.json` (8 fichiers)

---

### Étape 3 — Partager les traductions via Inertia

**Fichier modifié : `config/inertia.ts`**

Ajouter dans `sharedData` :

```typescript
sharedData: {
  // ... (auth, flash, userPreferences existants)

  locale: (ctx) => ctx.i18n.locale,
  translations: (ctx) => {
    const locale = ctx.i18n.locale
    const messages = ctx.i18n.messages(locale)
    return messages
  },
},
```

Mettre à jour la déclaration `SharedProps` pour le typage :

```typescript
declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {
    locale: string
    translations: Record<string, unknown>
  }
}
```

**Fichiers impactés :**

| Action  | Fichier             |
| ------- | ------------------- |
| Modifié | `config/inertia.ts` |

---

### Étape 4 — Créer le hook React `useTranslation()`

**Fichier créé : `inertia/hooks/use_translation.ts`**

```typescript
import { usePage } from '@inertiajs/react'

interface TranslationProps {
  locale: string
  translations: Record<string, unknown>
}

/**
 * Résout une clé imbriquée (ex: 'nav.home') dans l'objet de traductions.
 * Supporte l'interpolation : t('greeting', { name: 'Luka' })
 * → "Bonjour {name}" devient "Bonjour Luka"
 */
function resolve(obj: Record<string, unknown>, key: string): string {
  const value = key.split('.').reduce<unknown>((acc, part) => {
    if (acc && typeof acc === 'object') return (acc as Record<string, unknown>)[part]
    return undefined
  }, obj)
  return typeof value === 'string' ? value : key
}

function interpolate(template: string, params: Record<string, string | number>): string {
  return Object.entries(params).reduce(
    (result, [key, value]) => result.replace(new RegExp(`\\{${key}\\}`, 'g'), String(value)),
    template
  )
}

export function useTranslation() {
  const { locale, translations } = usePage<TranslationProps>().props

  function t(key: string, params?: Record<string, string | number>): string {
    const value = resolve(translations as Record<string, unknown>, key)
    if (params) return interpolate(value, params)
    return value
  }

  return { t, locale }
}
```

**Usage dans un composant :**

```tsx
const { t } = useTranslation()
// ...
<h2>{t('auth.login.title')}</h2>
<Button>{processing ? t('auth.login.submitting') : t('auth.login.submit')}</Button>
```

**Fichiers créés :**

| Action | Fichier                            |
| ------ | ---------------------------------- |
| Créé   | `inertia/hooks/use_translation.ts` |

---

### Étape 9 — Remplacer les chaînes hardcodées

Ordre de remplacement recommandé :

#### 9a — Layouts

| Fichier          | Chaînes à extraire                                                                                    |
| ---------------- | ----------------------------------------------------------------------------------------------------- |
| `MainLayout.tsx` | Labels de navigation (`Accueil`, `Séances`, `Planning`, `Profil`, `Administration`, `Se déconnecter`) |
| `AuthLayout.tsx` | Aucune chaîne visible (juste le nom "Sporty")                                                         |

**Avant :**

```tsx
{ href: '/', label: 'Accueil', icon: Home },
```

**Après :**

```tsx
{ href: '/', labelKey: 'common.nav.home', icon: Home },
// ... dans le rendu :
const { t } = useTranslation()
<span>{t(item.labelKey)}</span>
```

#### 9b — Pages d'authentification

| Fichier             | Chaînes à extraire                                               |
| ------------------- | ---------------------------------------------------------------- |
| `Auth/Login.tsx`    | `Se connecter`, `Adresse e-mail`, `Mot de passe`, `Connexion...` |
| `Auth/Register.tsx` | `Créer un compte`, `Nom complet`, etc.                           |

#### 9c — Dashboard

| Fichier         | Chaînes à extraire                                         |
| --------------- | ---------------------------------------------------------- |
| `Dashboard.tsx` | Titre Head, labels métriques, état vide, labels graphiques |

#### 9d — Autres pages

| Fichier            | Chaînes à extraire                            |
| ------------------ | --------------------------------------------- |
| `Sessions/*.tsx`   | CRUD séances, filtres, tri, labels formulaire |
| `Profile/*.tsx`    | Labels profil, préférences                    |
| `Onboarding/*.tsx` | Textes d'onboarding                           |
| `Admin/*.tsx`      | Administration                                |
| `Planning/*.tsx`   | Planning                                      |

#### 9e — Controllers (messages flash serveur)

| Fichier               | Chaînes à extraire                                                          |
| --------------------- | --------------------------------------------------------------------------- |
| `login_controller.ts` | `'Identifiants incorrects'` → `ctx.i18n.t('auth.login.invalidCredentials')` |
| Autres controllers    | Tout message flash hardcodé                                                 |

---

## Phase 2 — Multi-langue

### Étape 5 — Migration DB : ajouter `locale` au User

**Fichier créé : `database/migrations/*_add_locale_to_users.ts`**

```typescript
import { BaseSchema } from '@adonisjs/lucid/schema'

export default class extends BaseSchema {
  protected tableName = 'users'

  async up() {
    this.schema.alterTable(this.tableName, (table) => {
      table.string('locale', 5).notNullable().defaultTo('fr')
    })
  }

  async down() {
    this.schema.alterTable(this.tableName, (table) => {
      table.dropColumn('locale')
    })
  }
}
```

**Fichier modifié : `app/models/user.ts`**

```typescript
@column()
declare locale: string
```

---

### Étape 6 — Détection de locale (middleware)

Configurer l'ordre de détection dans `config/i18n.ts` ou via un middleware dédié.

**Ordre de priorité :**

1. `ctx.auth.user.locale` (utilisateur connecté)
2. Cookie `locale`
3. Header `Accept-Language`
4. Fallback : `fr`

**Implémentation dans un middleware ou dans le hook `sharedData` :**

```typescript
// Exemple dans config/inertia.ts sharedData ou middleware dédié
const locale = ctx.auth?.user?.locale
  ?? ctx.request.cookie('locale')
  ?? ctx.i18n.locale  // détecté via Accept-Language par @adonisjs/i18n
  ?? 'fr'

ctx.i18n.switchLocale(locale)
```

---

### Étape 7 — Traductions VineJS

`@adonisjs/i18n` s'intègre automatiquement avec VineJS. Les messages de validation utilisent les clés du fichier `validation.json`.

**Fichier `resources/lang/fr/validation.json` :**

```json
{
  "required": "Le champ {field} est requis",
  "email": "L'adresse e-mail n'est pas valide",
  "minLength": "Le champ {field} doit contenir au moins {min} caractères",
  "maxLength": "Le champ {field} ne doit pas dépasser {max} caractères"
}
```

**Fichier `resources/lang/en/validation.json` :**

```json
{
  "required": "The {field} field is required",
  "email": "The email address is not valid",
  "minLength": "The {field} field must be at least {min} characters",
  "maxLength": "The {field} field must not exceed {max} characters"
}
```

---

### Étape 8 — Composant `LocaleSwitcher`

**Fichier créé : `app/controllers/locale_controller.ts`**

```typescript
import type { HttpContext } from '@adonisjs/core/http'

export default class LocaleController {
  async update({ request, response, auth, session }: HttpContext) {
    const locale = request.input('locale', 'fr')

    // Persister dans le cookie (30 jours)
    response.cookie('locale', locale, { maxAge: 60 * 60 * 24 * 30 })

    // Persister en DB si connecté
    if (auth.user) {
      auth.user.locale = locale
      await auth.user.save()
    }

    return response.redirect().back()
  }
}
```

**Route à ajouter dans `start/routes.ts` :**

```typescript
router.post('/locale', [LocaleController, 'update']).as('locale.update')
```

**Fichier créé : `inertia/components/shared/LocaleSwitcher.tsx`**

Composant select FR/EN qui POST vers `/locale`.

**Fichier modifié : `MainLayout.tsx`**

Intégrer `<LocaleSwitcher />` dans la sidebar et le header mobile.

---

### Étape 8b — Créer les traductions anglaises

Dupliquer tous les fichiers `resources/lang/fr/*.json` vers `resources/lang/en/` et traduire.

---

## Résumé des fichiers

### Fichiers créés

| Fichier                                        | Étape |
| ---------------------------------------------- | ----- |
| `config/i18n.ts`                               | 1     |
| `resources/lang/fr/common.json`                | 2     |
| `resources/lang/fr/auth.json`                  | 2     |
| `resources/lang/fr/dashboard.json`             | 2     |
| `resources/lang/fr/sessions.json`              | 2     |
| `resources/lang/fr/profile.json`               | 2     |
| `resources/lang/fr/onboarding.json`            | 2     |
| `resources/lang/fr/admin.json`                 | 2     |
| `resources/lang/fr/validation.json`            | 2     |
| `inertia/hooks/use_translation.ts`             | 4     |
| `database/migrations/*_add_locale_to_users.ts` | 5     |
| `app/controllers/locale_controller.ts`         | 8     |
| `inertia/components/shared/LocaleSwitcher.tsx` | 8     |
| `resources/lang/en/*.json` (8 fichiers)        | 8b    |

### Fichiers modifiés

| Fichier                                   | Étape |
| ----------------------------------------- | ----- |
| `adonisrc.ts`                             | 1     |
| `config/inertia.ts`                       | 3     |
| `app/models/user.ts`                      | 5     |
| `config/i18n.ts`                          | 6     |
| `start/routes.ts`                         | 8     |
| `inertia/layouts/MainLayout.tsx`          | 8, 9a |
| Toutes les pages `inertia/pages/**/*.tsx` | 9b-9d |
| Controllers avec messages flash           | 9e    |
