import { BaseSeeder } from '@adonisjs/lucid/seeders'
import { DateTime } from 'luxon'
import Session from '#models/session'
import User from '#models/user'
import Sport from '#models/sport'
import { SEEDED_USER_EMAIL, SEEDED_USER_2_EMAIL, SEEDED_ADMIN_EMAIL } from './2_user_seeder.js'

/**
 * Realistic running sessions over ~3 months for multiple users.
 * Covers: easy runs, long runs, intervals, tempo, recovery, races, and edge cases.
 */
export default class SessionSeeder extends BaseSeeder {
  async run() {
    const user = await User.findByOrFail('email', SEEDED_USER_EMAIL)
    const user2 = await User.findByOrFail('email', SEEDED_USER_2_EMAIL)
    const admin = await User.findByOrFail('email', SEEDED_ADMIN_EMAIL)
    const running = await Sport.findByOrFail('slug', 'running')

    const now = DateTime.now()

    // ─── User 1: coureur régulier intermédiaire (~4 séances/semaine) ───

    const user1Sessions = [
      // Semaine -12 (reprise)
      {
        date: now.minus({ weeks: 12 }).set({ weekday: 2 }),
        durationMinutes: 30,
        distanceKm: 5.2,
        avgHeartRate: 145,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:46', cadence: 168 },
        notes: 'Reprise après 2 semaines de repos. Sensations correctes.',
      },
      {
        date: now.minus({ weeks: 12 }).set({ weekday: 4 }),
        durationMinutes: 35,
        distanceKm: 5.8,
        avgHeartRate: 148,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '6:02', cadence: 166 },
        notes: null,
      },
      // Semaine -11
      {
        date: now.minus({ weeks: 11 }).set({ weekday: 1 }),
        durationMinutes: 40,
        distanceKm: 7.0,
        avgHeartRate: 142,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:43', cadence: 170 },
        notes: 'Footing tranquille, beau temps.',
      },
      {
        date: now.minus({ weeks: 11 }).set({ weekday: 3 }),
        durationMinutes: 45,
        distanceKm: 7.5,
        avgHeartRate: 155,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '6:00', cadence: 172 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 11 }).set({ weekday: 6 }),
        durationMinutes: 65,
        distanceKm: 11.0,
        avgHeartRate: 140,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:54', cadence: 169 },
        notes: 'Sortie longue. Derniers km un peu durs.',
      },
      // Semaine -10
      {
        date: now.minus({ weeks: 10 }).set({ weekday: 2 }),
        durationMinutes: 25,
        distanceKm: 4.5,
        avgHeartRate: 130,
        perceivedEffort: 2,
        sportMetrics: { pace_per_km: '5:33', cadence: 165 },
        notes: 'Récupération active.',
      },
      {
        date: now.minus({ weeks: 10 }).set({ weekday: 4 }),
        durationMinutes: 50,
        distanceKm: 8.5,
        avgHeartRate: 162,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:53', cadence: 175 },
        notes: 'Fractionné : 6x1000m à 4:30. Bonnes sensations.',
      },
      {
        date: now.minus({ weeks: 10 }).set({ weekday: 6 }),
        durationMinutes: 55,
        distanceKm: 9.5,
        avgHeartRate: 144,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:47', cadence: 170 },
        notes: null,
      },
      // Semaine -9
      {
        date: now.minus({ weeks: 9 }).set({ weekday: 1 }),
        durationMinutes: 35,
        distanceKm: 6.0,
        avgHeartRate: 138,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '5:50', cadence: 168 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 9 }).set({ weekday: 3 }),
        durationMinutes: 48,
        distanceKm: 9.0,
        avgHeartRate: 158,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:20', cadence: 176 },
        notes: 'Tempo run. Allure soutenue sur 6 km.',
      },
      {
        date: now.minus({ weeks: 9 }).set({ weekday: 5 }),
        durationMinutes: 30,
        distanceKm: 5.0,
        avgHeartRate: 132,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '6:00', cadence: 164 },
        notes: 'Footing léger.',
      },
      {
        date: now.minus({ weeks: 9 }).set({ weekday: 7 }),
        durationMinutes: 75,
        distanceKm: 13.0,
        avgHeartRate: 143,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '5:46', cadence: 170 },
        notes: 'Sortie longue. Ravitaillement eau au km 8.',
      },
      // Semaine -8
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 2 }),
        durationMinutes: 40,
        distanceKm: 7.2,
        avgHeartRate: 140,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:33', cadence: 171 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 4 }),
        durationMinutes: 55,
        distanceKm: 10.0,
        avgHeartRate: 165,
        perceivedEffort: 8,
        sportMetrics: { pace_per_km: '5:30', cadence: 178 },
        notes: 'Fractionné pyramide : 400-800-1200-800-400. Très intense.',
      },
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 6 }),
        durationMinutes: 45,
        distanceKm: 8.0,
        avgHeartRate: 138,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:37', cadence: 169 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 7 }),
        durationMinutes: 80,
        distanceKm: 14.5,
        avgHeartRate: 145,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:31', cadence: 171 },
        notes: 'Sortie longue record. Mur au km 12, bien géré.',
      },
      // Semaine -7 (semaine de récup)
      {
        date: now.minus({ weeks: 7 }).set({ weekday: 2 }),
        durationMinutes: 25,
        distanceKm: 4.0,
        avgHeartRate: 128,
        perceivedEffort: 2,
        sportMetrics: { pace_per_km: '6:15', cadence: 162 },
        notes: 'Semaine de récupération.',
      },
      {
        date: now.minus({ weeks: 7 }).set({ weekday: 5 }),
        durationMinutes: 30,
        distanceKm: 5.5,
        avgHeartRate: 135,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '5:27', cadence: 166 },
        notes: null,
      },
      // Semaine -6
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 1 }),
        durationMinutes: 42,
        distanceKm: 7.8,
        avgHeartRate: 142,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:23', cadence: 172 },
        notes: 'Bonne reprise post-récup.',
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 3 }),
        durationMinutes: 50,
        distanceKm: 9.2,
        avgHeartRate: 160,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:26', cadence: 176 },
        notes: 'Fractionné : 8x400m à 4:10. Dernier interval très dur.',
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 5 }),
        durationMinutes: 35,
        distanceKm: 6.0,
        avgHeartRate: 136,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '5:50', cadence: 167 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 7 }),
        durationMinutes: 85,
        distanceKm: 15.5,
        avgHeartRate: 146,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:29', cadence: 171 },
        notes: 'Nouveau record sortie longue. Fin en progression.',
      },
      // Semaine -5
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 2 }),
        durationMinutes: 38,
        distanceKm: 7.0,
        avgHeartRate: 140,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:26', cadence: 170 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 4 }),
        durationMinutes: 60,
        distanceKm: 10.5,
        avgHeartRate: 158,
        perceivedEffort: 7,
        sportMetrics: { pace_per_km: '5:43', cadence: 174 },
        notes: 'Tempo + fractionné combo. 3km tempo + 5x600m.',
      },
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 6 }),
        durationMinutes: 30,
        distanceKm: 5.2,
        avgHeartRate: 132,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '5:46', cadence: 166 },
        notes: 'Footing relâché.',
      },
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 7 }),
        durationMinutes: 90,
        distanceKm: 16.0,
        avgHeartRate: 147,
        perceivedEffort: 8,
        sportMetrics: { pace_per_km: '5:37', cadence: 172 },
        notes: 'Sortie longue. Ravito gel au km 10. Crampe mollet km 14.',
      },
      // Semaine -4
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 1 }),
        durationMinutes: 40,
        distanceKm: 7.5,
        avgHeartRate: 141,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:20', cadence: 172 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 3 }),
        durationMinutes: 55,
        distanceKm: 10.0,
        avgHeartRate: 163,
        perceivedEffort: 8,
        sportMetrics: { pace_per_km: '5:30', cadence: 177 },
        notes: '10x400m à 4:05. PB sur les 3 derniers intervals !',
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 5 }),
        durationMinutes: 30,
        distanceKm: 5.0,
        avgHeartRate: 130,
        perceivedEffort: 2,
        sportMetrics: { pace_per_km: '6:00', cadence: 164 },
        notes: 'Récupération.',
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 7 }),
        durationMinutes: 70,
        distanceKm: 12.5,
        avgHeartRate: 142,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:36', cadence: 170 },
        notes: 'Sortie longue réduite (affûtage pré-course).',
      },
      // Semaine -3 (semaine de course)
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 2 }),
        durationMinutes: 20,
        distanceKm: 3.5,
        avgHeartRate: 125,
        perceivedEffort: 2,
        sportMetrics: { pace_per_km: '5:43', cadence: 165 },
        notes: 'Trot léger pré-course.',
      },
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 4 }),
        durationMinutes: 25,
        distanceKm: 5.0,
        avgHeartRate: 135,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:00', cadence: 174 },
        notes: 'Quelques accélérations pour rester vif.',
      },
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 7 }),
        durationMinutes: 47,
        distanceKm: 10.0,
        avgHeartRate: 172,
        perceivedEffort: 9,
        sportMetrics: { pace_per_km: '4:42', cadence: 182 },
        notes: '10km officiel ! PB : 47min. Négatif split de 30s. Euphorie !',
      },
      // Semaine -2 (post-course récup)
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 3 }),
        durationMinutes: 25,
        distanceKm: 4.0,
        avgHeartRate: 128,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '6:15', cadence: 160 },
        notes: 'Reprise douce post-course. Jambes encore lourdes.',
      },
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 5 }),
        durationMinutes: 35,
        distanceKm: 6.0,
        avgHeartRate: 138,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:50', cadence: 167 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 7 }),
        durationMinutes: 50,
        distanceKm: 9.0,
        avgHeartRate: 140,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:33', cadence: 170 },
        notes: 'Ça revient. Bonnes sensations retrouvées.',
      },
      // Semaine -1
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 1 }),
        durationMinutes: 40,
        distanceKm: 7.5,
        avgHeartRate: 141,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '5:20', cadence: 172 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 3 }),
        durationMinutes: 50,
        distanceKm: 9.0,
        avgHeartRate: 157,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '5:33', cadence: 175 },
        notes: 'Fractionné : 5x1000m à 4:25. En forme !',
      },
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 5 }),
        durationMinutes: 30,
        distanceKm: 5.5,
        avgHeartRate: 134,
        perceivedEffort: 3,
        sportMetrics: { pace_per_km: '5:27', cadence: 168 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 7 }),
        durationMinutes: 80,
        distanceKm: 14.0,
        avgHeartRate: 144,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '5:43', cadence: 171 },
        notes: 'Sortie longue. Allure régulière, bien gérée.',
      },
      // Cette semaine
      {
        date: now.minus({ days: 2 }),
        durationMinutes: 42,
        distanceKm: 8.0,
        avgHeartRate: 143,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:15', cadence: 173 },
        notes: null,
      },
      // Séance sans distance (tapis, pas de GPS)
      {
        date: now.minus({ weeks: 7 }).set({ weekday: 4 }),
        durationMinutes: 35,
        distanceKm: null,
        avgHeartRate: 150,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: null, cadence: 170 },
        notes: 'Tapis en salle. Pas de GPS.',
      },
      // Séance sans cardio (montre oubliée)
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 1 }),
        durationMinutes: 40,
        distanceKm: 7.2,
        avgHeartRate: null,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '5:33', cadence: null },
        notes: 'Montre oubliée, données partielles.',
      },
      // Séance minimale (juste durée)
      {
        date: now.minus({ weeks: 10 }).set({ weekday: 7 }),
        durationMinutes: 20,
        distanceKm: null,
        avgHeartRate: null,
        perceivedEffort: null,
        sportMetrics: {},
        notes: 'Échauffement pour un match de foot entre amis.',
      },
    ]

    // ─── User 2: coureur débutant (~2 séances/semaine) ───

    const user2Sessions = [
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 3 }),
        durationMinutes: 20,
        distanceKm: 2.5,
        avgHeartRate: 160,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '8:00', cadence: 155 },
        notes: 'Premier footing. Dur mais content !',
      },
      {
        date: now.minus({ weeks: 8 }).set({ weekday: 6 }),
        durationMinutes: 25,
        distanceKm: 3.0,
        avgHeartRate: 158,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '8:20', cadence: 154 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 7 }).set({ weekday: 3 }),
        durationMinutes: 25,
        distanceKm: 3.2,
        avgHeartRate: 156,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:49', cadence: 156 },
        notes: 'Un peu mieux que la semaine dernière.',
      },
      {
        date: now.minus({ weeks: 7 }).set({ weekday: 6 }),
        durationMinutes: 30,
        distanceKm: 3.8,
        avgHeartRate: 155,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:54', cadence: 157 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 2 }),
        durationMinutes: 28,
        distanceKm: 3.5,
        avgHeartRate: 154,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '8:00', cadence: 156 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 6 }),
        durationMinutes: 35,
        distanceKm: 4.5,
        avgHeartRate: 152,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:47', cadence: 158 },
        notes: 'Premier footing > 4 km ! 🎉',
      },
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 3 }),
        durationMinutes: 30,
        distanceKm: 4.0,
        avgHeartRate: 150,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '7:30', cadence: 160 },
        notes: 'Ça commence à devenir naturel.',
      },
      {
        date: now.minus({ weeks: 5 }).set({ weekday: 7 }),
        durationMinutes: 40,
        distanceKm: 5.0,
        avgHeartRate: 153,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '8:00', cadence: 158 },
        notes: '5 km pour la première fois !',
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 2 }),
        durationMinutes: 30,
        distanceKm: 4.2,
        avgHeartRate: 148,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '7:09', cadence: 161 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 6 }),
        durationMinutes: 42,
        distanceKm: 5.5,
        avgHeartRate: 151,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:38', cadence: 160 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 3 }),
        durationMinutes: 32,
        distanceKm: 4.5,
        avgHeartRate: 147,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '7:07', cadence: 162 },
        notes: 'FC qui baisse, bonne progression.',
      },
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 7 }),
        durationMinutes: 45,
        distanceKm: 6.0,
        avgHeartRate: 150,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:30', cadence: 161 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 3 }),
        durationMinutes: 35,
        distanceKm: 5.0,
        avgHeartRate: 146,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '7:00', cadence: 163 },
        notes: 'Passé sous les 7 min/km !',
      },
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 6 }),
        durationMinutes: 48,
        distanceKm: 6.5,
        avgHeartRate: 149,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '7:23', cadence: 161 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 3 }),
        durationMinutes: 35,
        distanceKm: 5.2,
        avgHeartRate: 145,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '6:44', cadence: 164 },
        notes: null,
      },
    ]

    // ─── Admin: coureur occasionnel (~1-2 séances/semaine) ───

    const adminSessions = [
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 6 }),
        durationMinutes: 35,
        distanceKm: 5.5,
        avgHeartRate: 148,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '6:22', cadence: 165 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 4 }).set({ weekday: 7 }),
        durationMinutes: 40,
        distanceKm: 6.0,
        avgHeartRate: 150,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '6:40', cadence: 164 },
        notes: 'Footing du week-end.',
      },
      {
        date: now.minus({ weeks: 3 }).set({ weekday: 4 }),
        durationMinutes: 30,
        distanceKm: 5.0,
        avgHeartRate: 145,
        perceivedEffort: 4,
        sportMetrics: { pace_per_km: '6:00', cadence: 166 },
        notes: null,
      },
      {
        date: now.minus({ weeks: 2 }).set({ weekday: 6 }),
        durationMinutes: 45,
        distanceKm: 7.0,
        avgHeartRate: 152,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '6:26', cadence: 167 },
        notes: 'Essai parcours plus long.',
      },
      {
        date: now.minus({ weeks: 1 }).set({ weekday: 7 }),
        durationMinutes: 50,
        distanceKm: 8.0,
        avgHeartRate: 149,
        perceivedEffort: 5,
        sportMetrics: { pace_per_km: '6:15', cadence: 168 },
        notes: null,
      },
    ]

    // ─── Séance soft-deleted (user 1) ───

    const softDeletedSessions = [
      {
        date: now.minus({ weeks: 11 }).set({ weekday: 5 }),
        durationMinutes: 15,
        distanceKm: 1.0,
        avgHeartRate: 120,
        perceivedEffort: 1,
        sportMetrics: { pace_per_km: '15:00', cadence: 140 },
        notes: 'Erreur de saisie, pas une vraie séance.',
        deletedAt: now.minus({ weeks: 11 }).set({ weekday: 6 }),
      },
      {
        date: now.minus({ weeks: 6 }).set({ weekday: 4 }),
        durationMinutes: 45,
        distanceKm: 8.0,
        avgHeartRate: 155,
        perceivedEffort: 6,
        sportMetrics: { pace_per_km: '5:37', cadence: 173 },
        notes: 'Doublon supprimé.',
        deletedAt: now.minus({ weeks: 6 }).set({ weekday: 4 }),
      },
    ]

    // ─── Insert all sessions ───

    interface SessionData {
      date: DateTime
      durationMinutes: number
      distanceKm: number | null
      avgHeartRate: number | null
      perceivedEffort: number | null
      sportMetrics: Record<string, unknown>
      notes: string | null
      deletedAt?: DateTime
    }

    const createSessions = async (userId: number, sportId: number, sessions: SessionData[]) => {
      for (const s of sessions) {
        const session = await Session.updateOrCreate(
          { userId, sportId, date: s.date },
          {
            userId,
            sportId,
            date: s.date,
            durationMinutes: s.durationMinutes,
            distanceKm: s.distanceKm ?? null,
            avgHeartRate: s.avgHeartRate ?? null,
            perceivedEffort: s.perceivedEffort ?? null,
            sportMetrics: s.sportMetrics,
            notes: s.notes ?? null,
          }
        )

        if (s.deletedAt) {
          session.deletedAt = s.deletedAt
          await session.save()
        }
      }
    }

    await createSessions(user.id, running.id, user1Sessions)
    await createSessions(user2.id, running.id, user2Sessions)
    await createSessions(admin.id, running.id, adminSessions)
    await createSessions(user.id, running.id, softDeletedSessions)
  }
}
