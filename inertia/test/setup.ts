import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import { cloneElement, type ReactElement } from 'react'
import type * as InertiaReactModule from '@inertiajs/react'
import type * as RechartsModule from 'recharts'

type InertiaReact = typeof InertiaReactModule
type ChartSize = { width: number; height: number }

afterEach(() => cleanup())

// Recharts mesure son conteneur : jsdom n'a pas de ResizeObserver
class ResizeObserverStub {
  observe() {}
  unobserve() {}
  disconnect() {}
}
globalThis.ResizeObserver ??= ResizeObserverStub as unknown as typeof ResizeObserver

// Les pages lisent traductions et locale via usePage() : props minimales
vi.mock('@inertiajs/react', async (importOriginal) => {
  const actual = await importOriginal<InertiaReact>()
  return {
    ...actual,
    usePage: () => ({ props: { locale: 'fr', translations: {}, auth: { user: null }, flash: {} } }),
    router: { get: vi.fn(), post: vi.fn(), put: vi.fn(), delete: vi.fn(), visit: vi.fn() },
    // <Head> requiert le contexte de l'app Inertia, absent en test unitaire
    Head: () => null,
  }
})

// jsdom ne calcule aucune mise en page : ResponsiveContainer y mesure 0×0 et Recharts
// avertit à chaque rendu. En test, le graphique reçoit directement une taille fixe.
vi.mock('recharts', async (importOriginal) => {
  const actual = await importOriginal<typeof RechartsModule>()
  const ResponsiveContainer = ({ children }: { children: ReactElement<ChartSize> }) =>
    cloneElement(children, { width: 800, height: 400 })
  return { ...actual, ResponsiveContainer }
})
