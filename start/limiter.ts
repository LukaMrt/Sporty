/*
|--------------------------------------------------------------------------
| Limiteurs HTTP
|--------------------------------------------------------------------------
|
| Le login n'utilise pas de middleware : il est limité par `penalize` dans
| le controller, pour ne compter que les échecs et remettre le compteur à
| zéro après une connexion réussie.
|
*/

import limiter from '@adonisjs/limiter/services/main'

/** Inscription : très peu d'appels légitimes attendus */
export const registerThrottle = limiter.define('register', (ctx) => {
  return limiter.allowRequests(5).every('15 minutes').usingKey(`register_${ctx.request.ip()}`)
})

/** Connexion d'un connecteur par clé API : évite de servir d'oracle de test de clés */
export const connectorConnectThrottle = limiter.define('connector_connect', (ctx) => {
  return limiter
    .allowRequests(10)
    .every('15 minutes')
    .usingKey(`connector_connect_${ctx.auth.user?.id ?? ctx.request.ip()}`)
})

/** 5 échecs de connexion par couple (IP, email) sur 15 minutes */
export const loginLimiter = () =>
  limiter.use({ requests: 5, duration: '15 minutes', blockDuration: '15 minutes' })
