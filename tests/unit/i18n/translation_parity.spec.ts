import { test } from '@japa/runner'
import { readdirSync, readFileSync } from 'node:fs'
import { join } from 'node:path'

const LANG_DIR = join(import.meta.dirname, '../../../resources/lang')

function flatten(value: unknown, prefix = ''): string[] {
  if (value === null || typeof value !== 'object') return [prefix]
  return Object.entries(value as Record<string, unknown>).flatMap(([key, child]) =>
    flatten(child, prefix ? `${prefix}.${key}` : key)
  )
}

function keysOf(locale: string, file: string): Set<string> {
  return new Set(flatten(JSON.parse(readFileSync(join(LANG_DIR, locale, file), 'utf-8'))))
}

test.group('i18n — parité des clés FR/EN', () => {
  const files = readdirSync(join(LANG_DIR, 'fr')).filter((f) => f.endsWith('.json'))

  test('les mêmes fichiers existent dans les deux langues', ({ assert }) => {
    assert.sameMembers(
      readdirSync(join(LANG_DIR, 'en')).filter((f) => f.endsWith('.json')),
      files
    )
  })

  for (const file of files) {
    test(`${file} : mêmes clés en FR et en EN`, ({ assert }) => {
      const fr = keysOf('fr', file)
      const en = keysOf('en', file)
      assert.deepEqual(
        [...fr].filter((k) => !en.has(k)),
        [],
        `clés absentes de en/${file}`
      )
      assert.deepEqual(
        [...en].filter((k) => !fr.has(k)),
        [],
        `clés absentes de fr/${file}`
      )
    })
  }
})
