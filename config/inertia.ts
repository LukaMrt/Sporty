import { defineConfig } from '@adonisjs/inertia'
import env from '#start/env'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Version des assets : le SHA git injecté au build Docker (APP_VERSION).
   * Chaque déploiement change la version, ce qui force les clients ouverts à recharger.
   * En dev, une valeur fixe évite de lire le manifest Vite.
   */
  assetsVersion: env.get('APP_VERSION', 'dev'),

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig
