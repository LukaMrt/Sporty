import { describe, expect, it } from 'vitest'
import { estimatedSwolf, swimLaps } from './swim'

describe('swimLaps', () => {
  it('privilégie le nombre de longueurs fourni par la montre', () => {
    expect(swimLaps({ laps: 58, subType: 'pool', poolLengthM: 25 }, 1.5)).toBe(58)
  })

  it('déduit les longueurs en piscine : distance / bassin', () => {
    expect(swimLaps({ subType: 'pool', poolLengthM: 25 }, 1.5)).toBe(60)
  })

  it('aucune longueur en eau libre ou sans bassin', () => {
    expect(swimLaps({ subType: 'open_water' }, 1.5)).toBeNull()
    expect(swimLaps({ subType: 'pool' }, 1.5)).toBeNull()
  })
})

describe('estimatedSwolf', () => {
  it('secondes + mouvements par longueur', () => {
    // 30 min, 60 longueurs → 30 s/longueur ; 1 200 mouvements → 20/longueur
    expect(estimatedSwolf({ strokes: 1200 }, 30, 60)).toBe(50)
  })

  it('null sans mouvements ou sans longueurs', () => {
    expect(estimatedSwolf({}, 30, 60)).toBeNull()
    expect(estimatedSwolf({ strokes: 1200 }, 30, null)).toBeNull()
  })
})
