import { test } from '@japa/runner'
import { readFileSync } from 'node:fs'
import { join } from 'node:path'
import { GLOSSARY_TERM_IDS } from '../../../inertia/lib/glossary.js'

const LANG_DIR = join(import.meta.dirname, '../../../resources/lang')

test.group('i18n — glossaire', () => {
  for (const locale of ['fr', 'en']) {
    test(`chaque notion a un nom, une définition et un repère (${locale})`, ({ assert }) => {
      const glossary = JSON.parse(
        readFileSync(join(LANG_DIR, locale, 'glossary.json'), 'utf-8')
      ) as { terms: Record<string, { name?: string; short?: string; read?: string }> }

      for (const id of GLOSSARY_TERM_IDS) {
        const term = glossary.terms[id]
        assert.isString(term?.name, `${locale}: ${id}.name manquant`)
        assert.isString(term?.short, `${locale}: ${id}.short manquant`)
        assert.isString(term?.read, `${locale}: ${id}.read manquant`)
      }
    })

    test(`aucune notion orpheline dans le fichier (${locale})`, ({ assert }) => {
      const glossary = JSON.parse(
        readFileSync(join(LANG_DIR, locale, 'glossary.json'), 'utf-8')
      ) as { terms: Record<string, unknown> }
      assert.sameMembers(Object.keys(glossary.terms), GLOSSARY_TERM_IDS)
    })
  }
})
