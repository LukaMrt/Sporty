import { test as setup } from '@playwright/test'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import fs from 'node:fs'

const dir = path.dirname(fileURLToPath(import.meta.url))
const USER_AUTH_FILE = path.join(dir, '.auth/user.json')
const ADMIN_AUTH_FILE = path.join(dir, '.auth/admin.json')

const SEEDED_USER_EMAIL = 'user@example.com'
const SEEDED_ADMIN_EMAIL = 'admin@example.com'
const SEEDED_PASSWORD = 'password123'

setup.beforeAll(() => {
  fs.mkdirSync(path.join(dir, '.auth'), { recursive: true })
})

setup('authenticate as user', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill(SEEDED_USER_EMAIL)
  await page.locator('#password').fill(SEEDED_PASSWORD)
  await page.getByRole('button', { name: /se connecter|sign in/i }).click()
  await page.waitForURL('/')
  await page.context().storageState({ path: USER_AUTH_FILE })
})

setup('authenticate as admin', async ({ page }) => {
  await page.goto('/login')
  await page.locator('#email').fill(SEEDED_ADMIN_EMAIL)
  await page.locator('#password').fill(SEEDED_PASSWORD)
  await page.getByRole('button', { name: /se connecter|sign in/i }).click()
  await page.waitForURL('/')
  await page.context().storageState({ path: ADMIN_AUTH_FILE })
})
