import { Page } from '@playwright/test'

export const TEST_EMAIL = 'teste@personalhub.com'
export const TEST_PASS  = 'Teste123456'

/** Navigate to login, fill credentials and wait for redirect to /dashboard */
export async function loginAs(page: Page, email = TEST_EMAIL, password = TEST_PASS) {
  await page.goto('/login')
  await page.waitForLoadState('networkidle')
  await page.locator('input[type="email"]').fill(email)
  await page.locator('input[type="password"]').fill(password)
  await page.locator('button[type="submit"]').click()
  await page.waitForURL('**/dashboard**', { timeout: 20_000 })
}

/** Expect the page to already be at /dashboard (uses stored auth state) */
export async function goDashboard(page: Page) {
  await page.goto('/dashboard')
  await page.waitForLoadState('networkidle')
}
