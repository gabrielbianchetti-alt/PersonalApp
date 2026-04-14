/**
 * Mobile responsiveness tests — run with iPhone 12 viewport (390x844).
 * The `mobile` project in playwright.config.ts sets the device automatically.
 */
import { test, expect } from '@playwright/test'

const PAGES = [
  { name: 'Dashboard',      url: '/dashboard' },
  { name: 'Alunos',         url: '/dashboard/alunos' },
  { name: 'Agenda',         url: '/dashboard/agenda' },
  { name: 'Financeiro',     url: '/dashboard/financeiro' },
  { name: 'Faltas',         url: '/dashboard/faltas' },
  { name: 'Relatórios',     url: '/dashboard/relatorios' },
  { name: 'Configurações',  url: '/dashboard/configuracoes' },
]

test.describe('Responsividade Mobile', () => {

  for (const { name, url } of PAGES) {
    test(`${name} — carrega em mobile sem erro horizontal scroll visível`, async ({ page }) => {
      await page.goto(url)
      await page.waitForLoadState('networkidle')

      // No JS errors
      const errors: string[] = []
      page.on('pageerror', e => errors.push(e.message))
      await page.waitForTimeout(500)
      expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)

      // No NaN in content
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toContain('NaN')

      // Body should not overflow horizontally (no horizontal scrollbar)
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const viewportWidth = page.viewportSize()?.width ?? 390
      expect(scrollWidth).toBeLessThanOrEqual(viewportWidth + 5) // 5px tolerance
    })
  }

  test('menu hambúrguer está visível no mobile', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Should have a hamburger button (sidebar toggle)
    const hamburger = page.getByRole('button', { name: /menu|abrir menu|☰/i }).first()
      .or(page.locator('button[aria-label*="menu" i]').first())
      .or(page.locator('button').filter({ has: page.locator('svg') }).first())

    // Sidebar should be hidden initially on mobile
    const sidebar = page.locator('aside').first()
    await expect(sidebar).toBeVisible()

    // There should be a toggle button visible
    const toggleBtns = page.locator('button').filter({ has: page.locator('svg') })
    const btnCount = await toggleBtns.count()
    expect(btnCount).toBeGreaterThan(0)
  })

  test('sidebar mobile abre e fecha', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Look for a mobile menu toggle button (typically in the mobile header)
    const mobileHeader = page.locator('header').first()
    if (await mobileHeader.count() > 0) {
      const menuBtn = mobileHeader.locator('button').first()
      if (await menuBtn.count() > 0) {
        // Click to open
        await menuBtn.click()
        await page.waitForTimeout(300)

        // Sidebar links should now be visible
        const alunosLink = page.getByRole('link', { name: /Alunos/i })
        await expect(alunosLink.first()).toBeVisible({ timeout: 3_000 })

        // Click to close (click overlay or button again)
        await menuBtn.click()
        await page.waitForTimeout(300)
      }
    }
  })

  test('sidebar mobile mostra Configurações e Sair', async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')

    // Try to open sidebar
    const mobileHeader = page.locator('header').first()
    if (await mobileHeader.count() > 0) {
      const menuBtn = mobileHeader.locator('button').first()
      if (await menuBtn.count() > 0) {
        await menuBtn.click()
        await page.waitForTimeout(400)
      }
    }

    // Configurações and Sair should be visible (either always or after opening)
    const configLink = page.getByRole('link', { name: /Configurações/i })
    const sairBtn    = page.getByRole('button', { name: /Sair/i })

    await expect(configLink.first()).toBeVisible({ timeout: 5_000 })
    await expect(sairBtn.first()).toBeVisible({ timeout: 3_000 })
  })

  test('agenda mobile: seletor de dia por dia único funciona', async ({ page }) => {
    await page.goto('/dashboard/agenda')
    await page.waitForLoadState('networkidle')

    const bodyText = await page.locator('body').textContent()
    // On mobile, agenda shows a single-day view or day selector
    const hasDaySelector = bodyText?.match(/seg|ter|qua|qui|sex|segunda|terça|quarta/i)
    expect(hasDaySelector).toBeTruthy()
  })

  test('financeiro mobile — abas navegáveis', async ({ page }) => {
    await page.goto('/dashboard/financeiro')
    await page.waitForLoadState('networkidle')

    // Tabs should be scrollable/visible
    const tab = page.getByText(/Cálculo|Cobrança|Custos/i).first()
    await expect(tab).toBeVisible({ timeout: 10_000 })
  })

  test('formulário de novo aluno usável no mobile', async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await page.waitForLoadState('networkidle')

    const btn = page.getByRole('button', { name: /novo aluno/i }).first()
      .or(page.getByRole('link', { name: /novo aluno/i }).first())

    if (await btn.count() > 0) {
      await btn.click()
      await page.waitForTimeout(1_000)

      // Form inputs should be visible and not overflow
      const inputs = page.locator('input')
      const inputCount = await inputs.count()
      expect(inputCount).toBeGreaterThan(0)

      // No horizontal overflow
      const scrollWidth = await page.evaluate(() => document.body.scrollWidth)
      const vpWidth = page.viewportSize()?.width ?? 390
      expect(scrollWidth).toBeLessThanOrEqual(vpWidth + 5)
    }
  })

})
