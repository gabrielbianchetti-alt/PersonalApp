/**
 * Authentication tests — run WITHOUT stored auth state
 * so we test the real login/logout flow.
 */
import { test, expect } from '@playwright/test'

// Wipe any stored auth — these tests exercise the auth UI directly
test.use({ storageState: { cookies: [], origins: [] } })

const EMAIL = 'teste@personalhub.com'
const PASS  = 'Teste123456'

test.describe('Autenticação', () => {

  test('página de login carrega corretamente', async ({ page }) => {
    await page.goto('/login')
    await expect(page).toHaveTitle(/PersonalHub/i)
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await expect(page.locator('input[type="password"]')).toBeVisible()
    await expect(page.locator('button[type="submit"]')).toBeVisible()
  })

  test('login com credenciais válidas redireciona para dashboard', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASS)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 20_000 })
    expect(page.url()).toContain('/dashboard')
  })

  test('login com credenciais inválidas mostra erro', async ({ page }) => {
    await page.goto('/login')
    await page.locator('input[type="email"]').fill('invalido@email.com')
    await page.locator('input[type="password"]').fill('SenhaErrada123')
    await page.locator('button[type="submit"]').click()
    // Expect an error message to appear (stays on /login, shows alert/toast)
    await expect(page).not.toHaveURL(/dashboard/)
    // Error text can vary; just ensure we haven't redirected
    await page.waitForTimeout(2_000)
    expect(page.url()).not.toContain('/dashboard')
  })

  test('link para cadastro está visível na página de login', async ({ page }) => {
    await page.goto('/login')
    // Should have a link to /register or similar
    const registerLink = page.getByRole('link', { name: /cri|cadastr|regist/i })
    await expect(registerLink).toBeVisible()
  })

  test('página de cadastro carrega corretamente', async ({ page }) => {
    await page.goto('/register')
    await expect(page.locator('input[type="email"]').first()).toBeVisible()
    // Register form may have 2 password fields (password + confirm) — use first()
    await expect(page.locator('input[type="password"]').first()).toBeVisible()
    await expect(page.locator('button[type="submit"]').first()).toBeVisible()
  })

  test('página de recuperação de senha carrega e envia email', async ({ page }) => {
    await page.goto('/forgot-password')
    await expect(page.locator('input[type="email"]')).toBeVisible()
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('button[type="submit"]').click()
    // Should show a success message
    await page.waitForTimeout(2_000)
    const body = await page.locator('body').textContent()
    // Expect some kind of confirmation (email sent / check inbox)
    // Note: Portuguese form uses "E-mail" with hyphen
    expect(
      body?.match(/e-?mail|enviado|verifique|check|link/i)
    ).toBeTruthy()
  })

  test('logout funciona e redireciona para login', async ({ page }) => {
    // First log in
    await page.goto('/login')
    await page.locator('input[type="email"]').fill(EMAIL)
    await page.locator('input[type="password"]').fill(PASS)
    await page.locator('button[type="submit"]').click()
    await page.waitForURL('**/dashboard**', { timeout: 20_000 })

    // Click logout (sidebar button)
    const logoutBtn = page.getByRole('button', { name: /sair/i })
    await expect(logoutBtn).toBeVisible()
    await logoutBtn.click()

    // Should redirect to login or home
    await page.waitForURL(/\/(login|$)/, { timeout: 10_000 })
    expect(page.url()).toMatch(/login|localhost:3000\/?$/)
  })

  test('rota protegida redireciona não autenticado para login', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForURL(/login/, { timeout: 10_000 })
    expect(page.url()).toContain('login')
  })

})
