import { defineConfig } from '@adonisjs/inertia'
import type { InferSharedProps } from '@adonisjs/inertia/types'
import app from '@adonisjs/core/services/app'
import { UserProfileRepository } from '#domain/interfaces/user_profile_repository'
import { DEFAULT_USER_PREFERENCES } from '#domain/entities/user_preferences'

const inertiaConfig = defineConfig({
  /**
   * Path to the Edge view that will be used as the root view for Inertia responses
   */
  rootView: 'inertia_layout',

  /**
   * Data that should be shared with all rendered pages
   */
  sharedData: {
    auth: (ctx) =>
      ctx.inertia.always(() => ({
        user: ctx.auth?.user
          ? { id: ctx.auth.user.id, fullName: ctx.auth.user.fullName, role: ctx.auth.user.role }
          : null,
      })),
    flash: (ctx) =>
      ctx.inertia.always(() => (ctx.session?.flashMessages.all() ?? {}) as Record<string, string>),
    userPreferences: async (ctx) => {
      if (!ctx.auth?.user) return null
      const repo = await app.container.make(UserProfileRepository)
      const profile = await repo.findByUserId(ctx.auth.user.id)
      return profile?.preferences ?? DEFAULT_USER_PREFERENCES
    },
  },

  /**
   * Options for the server-side rendering
   */
  ssr: {
    enabled: false,
    entrypoint: 'inertia/app/ssr.tsx',
  },
})

export default inertiaConfig

declare module '@adonisjs/inertia/types' {
  export interface SharedProps extends InferSharedProps<typeof inertiaConfig> {}
}
