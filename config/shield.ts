import { defineConfig } from '@adonisjs/shield'
import app from '@adonisjs/core/services/app'

const shieldConfig = defineConfig({
  /**
   * Content Security Policy — en mode rapport d'abord (les violations sont
   * signalées dans la console du navigateur sans rien bloquer). Passer
   * `reportOnly` à false une fois la console propre.
   * `@nonce` est remplacé par le nonce de la requête (`cspNonce` dans Edge).
   */
  csp: {
    enabled: true,
    reportOnly: true,
    directives: {
      defaultSrc: [`'self'`],
      scriptSrc: [`'self'`, '@nonce', ...(app.inDev ? [`'unsafe-eval'`] : [])],
      styleSrc: [`'self'`, `'unsafe-inline'`, 'https://fonts.bunny.net'],
      fontSrc: [`'self'`, 'https://fonts.bunny.net', 'data:'],
      // Tuiles Leaflet (carte des séances)
      imgSrc: [`'self'`, 'data:', 'blob:', 'https://*.tile.openstreetmap.org'],
      // HMR Vite en développement
      connectSrc: [`'self'`, ...(app.inDev ? ['ws:', 'http://localhost:*'] : [])],
      frameAncestors: [`'none'`],
      objectSrc: [`'none'`],
      baseUri: [`'self'`],
      formAction: [`'self'`, 'https://www.strava.com'],
    },
  },

  /**
   * Configure CSRF protection options. Refer documentation
   * to learn more
   */
  csrf: {
    enabled: process.env.NODE_ENV !== 'test',
    exceptRoutes: [],
    enableXsrfCookie: true,
    methods: ['POST', 'PUT', 'PATCH', 'DELETE'],
  },

  /**
   * Control how your website should be embedded inside
   * iFrames
   */
  xFrame: {
    enabled: true,
    action: 'DENY',
  },

  /**
   * Force browser to always use HTTPS
   */
  hsts: {
    enabled: true,
    maxAge: '180 days',
  },

  /**
   * Disable browsers from sniffing the content type of a
   * response and always rely on the "content-type" header.
   */
  contentTypeSniffing: {
    enabled: true,
  },
})

export default shieldConfig
