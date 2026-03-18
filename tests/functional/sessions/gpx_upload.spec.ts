import { test } from '@japa/runner'
import testUtils from '@adonisjs/core/services/test_utils'
import { DateTime } from 'luxon'
import Sport from '#models/sport'
import Session from '#models/session'
import { getUser } from '#tests/helpers'

// Fichier GPX minimal valide
const VALID_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1" creator="test">
  <trk>
    <trkseg>
      <trkpt lat="48.8566" lon="2.3522">
        <ele>35</ele>
        <time>2026-03-01T08:00:00Z</time>
      </trkpt>
      <trkpt lat="48.8600" lon="2.3560">
        <ele>38</ele>
        <time>2026-03-01T08:05:00Z</time>
      </trkpt>
      <trkpt lat="48.8640" lon="2.3600">
        <ele>40</ele>
        <time>2026-03-01T08:10:00Z</time>
      </trkpt>
    </trkseg>
  </trk>
</gpx>`

const INVALID_GPX = `<?xml version="1.0" encoding="UTF-8"?>
<gpx version="1.1">
  <trk></trk>
</gpx>`

test.group('GPX upload', (group) => {
  group.each.setup(() => testUtils.db().wrapInGlobalTransaction())

  // --- POST /sessions/parse-gpx ---

  test('POST /sessions/parse-gpx non connecté → redirect /login', async ({ client }) => {
    const response = await client
      .post('/sessions/parse-gpx')
      .file('gpx_file', Buffer.from(VALID_GPX), { filename: 'run.gpx', contentType: 'text/xml' })
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/login')
  })

  test('POST /sessions/parse-gpx GPX valide → retourne les données parsées (AC#1, #2)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()

    const response = await client
      .post('/sessions/parse-gpx')
      .file('gpx_file', Buffer.from(VALID_GPX), { filename: 'run.gpx', contentType: 'text/xml' })
      .loginAs(user)

    response.assertStatus(200)

    const body = response.body() as Record<string, unknown>
    assert.isDefined(body['tempId'])
    assert.isDefined(body['startDate'])
    assert.isDefined(body['durationMinutes'])
    assert.isDefined(body['distanceKm'])
    assert.isDefined(body['sportMetrics'])
  })

  test('POST /sessions/parse-gpx GPX invalide → 400 avec message erreur (AC#5)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()

    const response = await client
      .post('/sessions/parse-gpx')
      .file('gpx_file', Buffer.from(INVALID_GPX), {
        filename: 'invalid.gpx',
        contentType: 'text/xml',
      })
      .loginAs(user)

    response.assertStatus(400)
    const body = response.body() as Record<string, unknown>
    assert.isDefined(body['error'])
  })

  // --- POST /sessions/:id/enrich-gpx ---

  test('POST /sessions/:id/enrich-gpx → enrichit la séance et redirige (AC#4)', async ({
    client,
    assert,
  }) => {
    const user = await getUser()
    const sport = await Sport.firstOrFail()

    // Créer une séance sans GPX
    const session = await Session.create({
      userId: user.id,
      sportId: sport.id,
      date: DateTime.fromISO('2026-01-15'),
      durationMinutes: 30,
    })

    const response = await client
      .post(`/sessions/${session.id}/enrich-gpx`)
      .file('gpx_file', Buffer.from(VALID_GPX), { filename: 'run.gpx', contentType: 'text/xml' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', `/sessions/${session.id}`)

    const updated = await Session.findOrFail(session.id)
    assert.isNotNull(updated.gpxFilePath)
    assert.include(updated.gpxFilePath!, String(user.id))
  })

  test('POST /sessions/:id/enrich-gpx séance inexistante → redirect /sessions', async ({
    client,
  }) => {
    const user = await getUser()

    const response = await client
      .post('/sessions/99999/enrich-gpx')
      .file('gpx_file', Buffer.from(VALID_GPX), { filename: 'run.gpx', contentType: 'text/xml' })
      .loginAs(user)
      .redirects(0)

    response.assertStatus(302)
    response.assertHeader('location', '/sessions')
  })
})
