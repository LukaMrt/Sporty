import { BaseSeeder } from '@adonisjs/lucid/seeders'
import Sport from '#models/sport'

export default class SportSeeder extends BaseSeeder {
  async run() {
    await Sport.updateOrCreate(
      { slug: 'running' },
      {
        name: 'Course à pied',
        slug: 'running',
        defaultMetrics: {
          pace_per_km: { type: 'duration', unit: 'min/km', label: 'Allure' },
          cadence: { type: 'number', unit: 'spm', label: 'Cadence' },
        },
      }
    )
    await Sport.updateOrCreate(
      { slug: 'swimming' },
      {
        name: 'Natation',
        slug: 'swimming',
        defaultMetrics: {
          pace_per_100m: { type: 'duration', unit: 'min/100m', label: 'Allure' },
        },
      }
    )
    for (const { name, slug } of [
      { name: 'Marche', slug: 'walking' },
      { name: 'Randonnée', slug: 'hiking' },
    ]) {
      await Sport.updateOrCreate(
        { slug },
        {
          name,
          slug,
          defaultMetrics: {
            pace_per_km: { type: 'duration', unit: 'min/km', label: 'Allure' },
          },
        }
      )
    }
    // Sans métrique d'allure : vitesse (vélo) et renfo n'ont pas de min/km
    for (const { name, slug } of [
      { name: 'Vélo', slug: 'cycling' },
      { name: 'Renforcement', slug: 'strength' },
    ]) {
      await Sport.updateOrCreate({ slug }, { name, slug, defaultMetrics: {} })
    }
  }
}
