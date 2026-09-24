import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { test, expect } from './fixtures'

const GPX_FIXTURE = path.resolve(
  path.dirname(fileURLToPath(import.meta.url)),
  '../unit/services/fixtures/gpx_fixture.gpx'
)

test.describe('Séances', () => {
  test('création manuelle → séance ajoutée', async ({ page }) => {
    await page.goto('/sessions/create')
    await page.locator('#duration_minutes').fill('42')
    await page.locator('#distance_km').fill('8.4')
    await page.getByRole('button', { name: /enregistrer|save/i }).click()

    await expect(page).toHaveURL('/sessions')
    await expect(page.getByText(/séance ajoutée|session added/i)).toBeVisible()
  })

  test('import GPX → champs préremplis puis séance ajoutée', async ({ page }) => {
    await page.goto('/sessions/create')
    await page.locator('input[type="file"][accept=".gpx"]').setInputFiles(GPX_FIXTURE)

    // Le parsing serveur remplit la durée à partir de la trace
    await expect(page.locator('#duration_minutes')).not.toHaveValue('')
    await page.getByRole('button', { name: /enregistrer|save/i }).click()

    await expect(page).toHaveURL('/sessions')
    await expect(page.getByText(/séance ajoutée|session added/i)).toBeVisible()
  })
})

// Le plan généré sert au glisser-déposer : les deux tests s'enchaînent
test.describe.serial('Planification', () => {
  test('wizard objectif → plan généré', async ({ page }) => {
    await page.goto('/planning/goal')
    await page.getByRole('button', { name: '10K' }).click()
    await page.getByRole('button', { name: /suivant|next/i }).click()

    // Niveau estimé automatiquement (historique seedé) ou questionnaire par défaut
    await page.getByRole('button', { name: /confirmer ce niveau|confirm/i }).click()

    await page.getByRole('button', { name: /tout par défaut|defaults/i }).click()
    await page.getByRole('button', { name: /suivant|next/i }).click()
    await page.getByRole('button', { name: /générer mon plan|generate/i }).click()

    await expect(page).toHaveURL('/planning')
    await expect(page.locator('[aria-roledescription="draggable"]').first()).toBeVisible()
  })

  test('glisser-déposer une séance sur un jour de repos', async ({ page }) => {
    await page.goto('/planning')
    const card = page.locator('[aria-roledescription="draggable"]').first()
    await expect(card).toBeVisible()

    const from = (await card.boundingBox())!
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2)
    await page.mouse.down()
    // Au-delà de la contrainte d'activation (8 px) du PointerSensor
    await page.mouse.move(from.x + from.width / 2, from.y + from.height / 2 + 12, { steps: 4 })

    const restSlot = page.getByText(/^repos$|^rest$/i).first()
    await expect(restSlot).toBeVisible()
    const to = (await restSlot.boundingBox())!

    const saved = page.waitForResponse(
      (res) => res.request().method() === 'PUT' && res.url().includes('/planning/sessions/')
    )
    await page.mouse.move(to.x + to.width / 2, to.y + to.height / 2, { steps: 10 })
    await page.mouse.up()

    const response = await saved
    expect(response.status()).toBeLessThan(400)
  })
})
