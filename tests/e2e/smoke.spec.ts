import { test, expect } from './fixtures'

test.describe('Login flow (non authentifié)', () => {
  test.use({ storageState: { cookies: [], origins: [] } })

  test('GET /login affiche le formulaire', async ({ page }) => {
    await page.goto('/login')
    await expect(page.locator('#email')).toBeVisible()
    await expect(page.locator('#password')).toBeVisible()
    await expect(page.getByRole('button', { name: /se connecter|sign in/i })).toBeVisible()
  })

  test('credentials valides → redirige vers le dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('user@example.com')
    await page.locator('#password').fill('password123')
    await page.getByRole('button', { name: /se connecter|sign in/i }).click()
    await expect(page).toHaveURL('/')
  })

  test('credentials invalides → reste sur /login', async ({ page }) => {
    await page.goto('/login')
    await page.locator('#email').fill('user@example.com')
    await page.locator('#password').fill('mauvais-mot-de-passe')
    await page.getByRole('button', { name: /se connecter|sign in/i }).click()
    await expect(page).toHaveURL('/login')
  })
})

test.describe('Dashboard (authentifié)', () => {
  test('GET / affiche le dashboard', async ({ page }) => {
    await page.goto('/')
    await expect(page).toHaveURL('/')
    await expect(page.locator('main, [role="main"]').first()).toBeVisible()
  })

  test('GET / sans session → redirige vers /login', async ({ page }) => {
    await page.context().clearCookies()
    await page.goto('/')
    await expect(page).toHaveURL('/login')
  })
})
