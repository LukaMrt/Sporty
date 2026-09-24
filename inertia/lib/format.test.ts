import { describe, expect, it } from 'vitest'
import fc from 'fast-check'
import {
  formatBlockDuration,
  formatDuration,
  formatPace,
  formatPaceMinSec,
  kmToMiles,
  paceToKmh,
  toMinSec,
} from '~/lib/format'

describe('format', () => {
  it('toMinSec ne produit jamais 60 secondes', () => {
    expect(toMinSec(4.999)).toEqual({ minutes: 5, seconds: 0 })
    fc.assert(
      fc.property(fc.double({ min: 0, max: 600, noNaN: true }), (value) => {
        const { seconds } = toMinSec(value)
        return seconds >= 0 && seconds < 60
      })
    )
  })

  it('durées lisibles', () => {
    expect(formatDuration(45)).toBe('45min')
    expect(formatDuration(60)).toBe('1h')
    expect(formatDuration(95)).toBe('1h35')
    expect(formatBlockDuration(0.5)).toBe('30s')
    expect(formatBlockDuration(1.5)).toBe('1min 30s')
  })

  it('allures et conversions', () => {
    expect(formatPace(50, 10)).toBe("5'00/km")
    expect(formatPace(50, null)).toBeNull()
    expect(formatPaceMinSec(4.5)).toBe("4'30")
    expect(paceToKmh(5)).toBe(12)
    expect(kmToMiles(10)).toBeCloseTo(6.21371)
  })
})
