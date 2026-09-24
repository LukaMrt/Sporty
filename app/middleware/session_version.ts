import type { HttpContext } from '@adonisjs/core/http'
import { SESSION_VERSION_KEY } from '#lib/session_version'

/**
 * Déconnecte l'utilisateur si sa session a été ouverte avant son dernier
 * changement de mot de passe (reset admin ou changement volontaire).
 * Renvoie `true` si la session était périmée.
 */
export async function logoutIfStaleSession(ctx: HttpContext): Promise<boolean> {
  const user = ctx.auth.user
  if (!user) return false
  const sessionVersion = Number(ctx.session.get(SESSION_VERSION_KEY, 0))
  if (sessionVersion === (user.sessionVersion ?? 0)) return false
  await ctx.auth.use('web').logout()
  return true
}
