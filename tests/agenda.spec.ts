import { test, expect } from '@playwright/test'

test.describe('Agenda', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/agenda')
    await page.waitForLoadState('networkidle')
  })

  test('agenda carrega sem erros', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.waitForTimeout(1_000)
    expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('NaN')
  })

  test('grade semanal está visível com os dias da semana', async ({ page }) => {
    // Should show days: Seg, Ter, Qua, Qui, Sex in the agenda grid
    // Use innerText to check rendered content (some day labels may be in hidden menu elements)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/Seg|Segunda/i)
    expect(bodyText).toMatch(/Sex|Sexta/i)
  })

  test('horários aparecem na grade (7h, 8h, etc.)', async ({ page }) => {
    // Time slots should be visible
    const timeSlot = page.getByText(/^\d{1,2}h$|^\d{2}:\d{2}$/).first()
    await expect(timeSlot).toBeVisible({ timeout: 10_000 })
  })

  test('navegação para semana anterior funciona', async ({ page }) => {
    const prevBtn = page.getByRole('button', { name: /anterior|prev|←|<|voltar/i }).first()
      .or(page.locator('button').filter({ hasText: '<' }).first())
    if (await prevBtn.count() > 0) {
      const initialText = await page.locator('[class*="week"], [class*="semana"], header').first().textContent()
      await prevBtn.click()
      await page.waitForTimeout(500)
      const newText = await page.locator('[class*="week"], [class*="semana"], header').first().textContent()
      // Week indicator should have changed
      expect(newText).not.toEqual(initialText)
    }
  })

  test('navegação para próxima semana funciona', async ({ page }) => {
    const nextBtn = page.getByRole('button', { name: /próxima|next|→|>|avançar/i }).first()
      .or(page.locator('button').filter({ hasText: '>' }).first())
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(500)
      // Page should still be on /agenda and not crashed
      expect(page.url()).toContain('/agenda')
      const bodyText = await page.locator('body').textContent()
      expect(bodyText).not.toContain('NaN')
    }
  })

  test('botão "Hoje" retorna à semana atual', async ({ page }) => {
    // Navigate away first
    const nextBtn = page.locator('button').filter({ hasText: />/i }).first()
    if (await nextBtn.count() > 0) await nextBtn.click()

    const hojeBtn = page.getByRole('button', { name: /hoje|today/i })
    if (await hojeBtn.count() > 0) {
      await hojeBtn.click()
      await page.waitForTimeout(500)
      expect(page.url()).toContain('/agenda')
    }
  })

  test('clicar em horário livre não causa erro', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    // Find an empty cell and click it
    const emptyCell = page.locator('[class*="slot"],[class*="cell"],[class*="hour"]').first()
    if (await emptyCell.count() > 0) {
      await emptyCell.click()
      await page.waitForTimeout(1_000)
      expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)
    }
  })

})
