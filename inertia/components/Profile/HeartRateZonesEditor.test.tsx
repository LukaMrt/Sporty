import { describe, expect, it, vi } from 'vitest'
import { fireEvent, render, screen } from '@testing-library/react'
import HeartRateZonesEditor from '~/components/Profile/HeartRateZonesEditor'

describe('HeartRateZonesEditor', () => {
  it('aperçu en direct et méthode Karvonen indisponible sans FC repos', () => {
    render(
      <HeartRateZonesEditor
        maxHeartRate={190}
        restingHeartRate={null}
        value={{ method: 'auto', lthr: null, customBounds: null }}
        onChange={() => {}}
      />
    )
    // % FCmax 190 : Z1 95–114
    expect(screen.getAllByText('Z1 95–114').length).toBeGreaterThan(0)
    expect(screen.getByText('profile.hrZones.errors.missing_resting_hr')).toBeTruthy()
  })

  it('sélection au clavier et personnalisation à partir d’une méthode', () => {
    const onChange = vi.fn()
    render(
      <HeartRateZonesEditor
        maxHeartRate={190}
        restingHeartRate={50}
        value={{ method: 'auto', lthr: null, customBounds: null }}
        onChange={onChange}
      />
    )
    const radios = screen.getAllByRole('radio')
    fireEvent.keyDown(radios[2], { key: 'Enter' })
    expect(onChange).toHaveBeenLastCalledWith({
      method: 'percent_max',
      lthr: null,
      customBounds: null,
    })

    fireEvent.click(screen.getAllByText('profile.hrZones.customizeFrom')[1]) // Karvonen
    expect(onChange).toHaveBeenLastCalledWith({
      method: 'custom',
      lthr: null,
      customBounds: [120, 134, 148, 162, 176, 190],
    })
  })

  it('bornes personnalisées invalides → message', () => {
    render(
      <HeartRateZonesEditor
        maxHeartRate={190}
        restingHeartRate={50}
        value={{ method: 'custom', lthr: null, customBounds: [120, 110, 148, 162, 176, 190] }}
        onChange={() => {}}
      />
    )
    expect(screen.getAllByText('profile.hrZones.errors.invalid_bounds').length).toBeGreaterThan(0)
  })
})
