import adonisConfig from '@adonisjs/prettier-config'

export default {
  ...adonisConfig,
  plugins: [...(adonisConfig.plugins || []), 'prettier-plugin-tailwindcss'],
}
