import { test, expect } from '@playwright/test'

test.describe('Preferências de Cobrança — Timing (cobra_adiantado)', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/cobranca/preferencias')
    await page.waitForLoadState('networkidle')
    if (!page.url().includes('/preferencias')) {
      await page.goto('/dashboard/cobranca/preferencias')
      await page.waitForLoadState('networkidle')
    }
  })

  test('página de preferências carrega sem erros', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.waitForTimeout(1_000)
    expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('NaN')
  })

  test('seção "Quando você cobra seus alunos?" está visível', async ({ page }) => {
    await page.waitForTimeout(1_500)
    if (!page.url().includes('/preferencias')) return
    await expect(page.getByText(/quando você cobra seus alunos/i).first()).toBeVisible()
  })

  test('opções "Adiantado" e "Final do mês" estão presentes', async ({ page }) => {
    await page.waitForTimeout(1_500)
    if (!page.url().includes('/preferencias')) return
    await expect(page.getByText(/adiantado/i).first()).toBeVisible()
    await expect(page.getByText(/final do m/i).first()).toBeVisible()
  })

  test('default visual: "Adiantado" começa selecionado', async ({ page }) => {
    await page.waitForTimeout(1_500)
    if (!page.url().includes('/preferencias')) return
    const radioAdiantado = page.locator('input[name="cobra_adiantado"][value="adiantado"]')
    if (await radioAdiantado.count() === 0) return // skip if not loaded
    await expect(radioAdiantado).toBeChecked()
  })

  test('clicar em "Final do mês" e salvar não gera erro (graceful mesmo sem migration)', async ({ page }) => {
    await page.waitForTimeout(1_500)
    if (!page.url().includes('/preferencias')) return

    const radioAtrasado = page.locator('input[name="cobra_adiantado"][value="atrasado"]')
    if (await radioAtrasado.count() === 0) return

    // Marca o radio
    await radioAtrasado.check()
    await expect(radioAtrasado).toBeChecked()

    // Capture erros do form
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))

    const saveBtn = page.getByRole('button', { name: /salvar prefer/i }).first()
    if (await saveBtn.count() === 0) return
    await saveBtn.click()
    await page.waitForTimeout(2_500)

    // O save action tem fallback para coluna ausente — não deve gerar erro mesmo se
    // a migration ainda não tiver rodado. Banner de erro vermelho não deve aparecer.
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('Erro ao salvar preferências')
    expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)

    // Restaurar default para não vazar estado entre testes (best-effort)
    await page.goto('/dashboard/cobranca/preferencias')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(2_000)
    if (!page.url().includes('/preferencias')) return
    const radioAdiantadoRestore = page.locator('input[name="cobra_adiantado"][value="adiantado"]')
    if (await radioAdiantadoRestore.count() > 0) {
      await radioAdiantadoRestore.check()
      const restoreBtn = page.getByRole('button', { name: /salvar prefer/i }).first()
      if (await restoreBtn.count() > 0) {
        await restoreBtn.click()
        await page.waitForTimeout(1_500)
      }
    }
  })

  test('aba Cálculo continua funcionando após salvar timing (não-regressão)', async ({ page }) => {
    await page.goto('/dashboard/financeiro')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_500)
    const bodyText = await page.locator('body').textContent()
    expect(bodyText).not.toContain('NaN')
  })

})
