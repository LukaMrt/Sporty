import { test } from '@japa/runner'
import { loadContribution } from '#domain/services/sport_load_contribution'

test.group('loadContribution', () => {
  test('réduit la marche et la randonnée', ({ assert }) => {
    assert.equal(loadContribution('walking'), 0.3)
    assert.equal(loadContribution('hiking'), 0.6)
  })

  test('les autres sports et un sport inconnu comptent pleinement', ({ assert }) => {
    for (const slug of ['running', 'cycling', 'swimming', 'other', 'inconnu', undefined]) {
      assert.equal(loadContribution(slug), 1)
    }
  })
})
