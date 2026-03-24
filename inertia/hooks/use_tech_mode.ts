import { useState, useCallback } from 'react'

const STORAGE_KEY = 'sporty_tech_data_visible'

export function useTechMode() {
  const [enabled, setEnabled] = useState<boolean>(() => {
    try {
      return localStorage.getItem(STORAGE_KEY) === 'true'
    } catch {
      return false
    }
  })

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev
      try {
        localStorage.setItem(STORAGE_KEY, String(next))
      } catch {
        // ignore (SSR / private browsing)
      }
      return next
    })
  }, [])

  return { techMode: enabled, toggleTechMode: toggle }
}
