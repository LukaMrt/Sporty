import { configApp, RULES_LIST } from '@adonisjs/eslint-config'
import tseslint from 'typescript-eslint'
import reactHooks from 'eslint-plugin-react-hooks'

export default configApp(
  { ignores: ['coverage/**', '.adonisjs/**'] },
  // Enforce no-console in all TS files (not in RULES_LIST by default)
  // TypeScript strict rules (type-checked)
  ...tseslint.configs.recommendedTypeChecked.map((config) => ({
    ...config,
    files: ['**/*.ts', '**/*.tsx'],
  })),
  {
    files: ['**/*.ts', '**/*.tsx'],
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      'no-console': ['error'],

      // Force `import type` quand c'est un type pur (fixable)
      '@typescript-eslint/consistent-type-imports': [
        'error',
        { prefer: 'type-imports', fixStyle: 'inline-type-imports' },
      ],

      // Attrape les await oubliés
      '@typescript-eslint/no-floating-promises': ['error'],

      // Unused vars avec _ prefix ignoré
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],

      // Désactivé : les migrations et mocks retournent this.schema (pas await)
      '@typescript-eslint/require-await': 'off',

      // Désactivé : les configs AdonisJS générées utilisent des interfaces vides
      '@typescript-eslint/no-empty-object-type': 'off',

      // Interdit l'usage de symboles marqués @deprecated
      '@typescript-eslint/no-deprecated': 'error',
    },
  },

  // Fichiers générés par AdonisJS (bin/, middleware, exceptions)
  {
    files: ['bin/*.ts', 'app/middleware/*.ts', 'app/exceptions/*.ts', 'app/models/*.ts'],
    rules: {
      '@typescript-eslint/no-floating-promises': 'off',
      '@typescript-eslint/no-misused-promises': 'off',
      '@typescript-eslint/no-unsafe-return': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // Inertia entry point : triple-slash refs et any sont nécessaires (fichier généré)
  {
    files: ['inertia/app.tsx', 'inertia/app/app.tsx'],
    rules: {
      '@typescript-eslint/triple-slash-reference': 'off',
      '@typescript-eslint/no-unsafe-assignment': 'off',
      '@typescript-eslint/no-floating-promises': 'off',
    },
  },

  // Pages d'erreur générées par AdonisJS
  {
    files: ['inertia/pages/errors/*.tsx'],
    rules: {
      '@typescript-eslint/no-explicit-any': 'off',
      '@typescript-eslint/no-unsafe-member-access': 'off',
    },
  },

  // React hooks rules
  {
    files: ['inertia/**/*.tsx'],
    plugins: { 'react-hooks': reactHooks },
    rules: {
      'react-hooks/rules-of-hooks': 'error',
      'react-hooks/exhaustive-deps': 'error',
    },
  },

  // React TSX filenames: PascalCase or camelCase
  {
    files: ['**/*.tsx'],
    rules: {
      ...RULES_LIST,
      '@unicorn/filename-case': ['error', { cases: { pascalCase: true, camelCase: true } }],
      // Désactivé : @adonisjs/inertia n'exporte pas /react dans la version installée
      '@adonisjs/prefer-adonisjs-inertia-link': 'off',
    },
  },

  // Interdit l'import direct de models depuis les controllers
  {
    files: ['app/controllers/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            {
              group: ['#models/*'],
              message:
                'Les controllers ne doivent pas importer les models directement. Passe par un use case.',
            },
          ],
        },
      ],
    },
  }
)
