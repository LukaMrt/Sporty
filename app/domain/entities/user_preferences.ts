export type UserPreferences = {
  speedUnit: 'min_km' | 'km_h'
  distanceUnit: 'km' | 'mi'
  weightUnit: 'kg' | 'lbs'
  weekStartsOn: 'monday' | 'sunday'
  dateFormat: 'DD/MM/YYYY' | 'MM/DD/YYYY'
  locale: 'fr' | 'en'
}

export const DEFAULT_USER_PREFERENCES: UserPreferences = {
  speedUnit: 'min_km',
  distanceUnit: 'km',
  weightUnit: 'kg',
  weekStartsOn: 'monday',
  dateFormat: 'DD/MM/YYYY',
  locale: 'fr',
}
