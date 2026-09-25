import { test } from '@japa/runner'
import { OpenWearablesSportMapper } from '#connectors/open_wearables/open_wearables_sport_mapper'

test.group('OpenWearablesSportMapper', () => {
  const mapper = new OpenWearablesSportMapper()

  test('{type} → swimming / {subType}')
    .with([
      { type: 'swimming', subType: null, label: 'Natation' },
      { type: 'pool_swimming', subType: 'pool', label: 'Natation en piscine' },
      { type: 'open_water_swimming', subType: 'open_water', label: 'Natation en eau libre' },
    ])
    .run(({ assert }, { type, subType, label }) => {
      assert.equal(mapper.map(type), 'swimming')
      assert.equal(mapper.subType(type), subType)
      assert.equal(mapper.label(type), label)
    })

  test('type inconnu → other, libellé brut', ({ assert }) => {
    assert.equal(mapper.map('curling'), 'other')
    assert.isNull(mapper.subType('curling'))
    assert.equal(mapper.label('curling'), 'curling')
  })
})
