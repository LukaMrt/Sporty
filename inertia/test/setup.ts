import { afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import type * as InertiaReactModule from '@inertiajs/react'

type InertiaReact = typeof InertiaReactModule

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
