import { describe, expect, it } from 'vitest'
import { swimLaps } from './swim'

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
