import { configApp, RULES_LIST } from '@adonisjs/eslint-config'

export default configApp(
  // Enforce no-console in all TS files (not in RULES_LIST by default)
  {
    files: ['**/*.ts'],
    rules: {
      'no-console': ['error'],
    },
  },
  // Support React TSX files with PascalCase filenames (components) and camelCase (pages)
  {
    files: ['**/*.tsx'],
    rules: {
      ...RULES_LIST,
      'no-console': ['error'],
      '@unicorn/filename-case': ['error', { cases: { pascalCase: true, camelCase: true } }],
    },
  }
)
