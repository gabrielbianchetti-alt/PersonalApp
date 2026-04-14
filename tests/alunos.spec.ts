import { test, expect } from '@playwright/test'

const NOVO_ALUNO_NOME = `[TESTE] Aluno Playwright ${Date.now()}`

test.describe('Alunos', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/alunos')
    await page.waitForLoadState('networkidle')
  })

  test('lista de alunos carrega sem erros', async ({ page }) => {
    // Either shows aluno cards or an empty state — both are valid
    const hasAlunos    = await page.locator('[data-testid="aluno-card"]').count()
    const hasEmptyState = await page.getByText(/nenhum aluno|adicione seu primeiro/i).count()
    expect(hasAlunos + hasEmptyState).toBeGreaterThan(0)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('NaN')
  })

  test('botão Novo Aluno está visível e abre o formulário', async ({ page }) => {
    // "Novo Aluno" is a tab (label: '+ Novo Aluno') — click it and verify form appears
    const btn = page.getByRole('button', { name: /novo aluno/i }).first()
      .or(page.getByText(/\+ Novo Aluno/i).first())
    await expect(btn).toBeVisible()
    await btn.click()
    await page.waitForTimeout(1_000)
    // NovoAlunoForm renders with id="nome" input and heading "Novo Aluno"
    const hasFormInput = await page.locator('input#nome').count()
    const hasHeading   = await page.getByText(/Preencha as informações em 4 etapas/i).count()
    expect(hasFormInput + hasHeading).toBeGreaterThan(0)
  })

  test('formulário de novo aluno — 4 etapas estão presentes', async ({ page }) => {
    // Navigate to novo tab via URL
    await page.goto('/dashboard/alunos?tab=novo')
    await page.waitForLoadState('networkidle')

    // Step 1 should render with nome input and Próximo button
    const nomeField = page.locator('input#nome')
    await expect(nomeField).toBeVisible({ timeout: 10_000 })

    // Stepper should show all 4 steps
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/Preencha as informações em 4 etapas/i)

    // Navigation button exists
    const nextBtn = page.locator('button').filter({ hasText: 'Próximo' }).first()
    await expect(nextBtn).toBeVisible()

    // Page should not have errors
    expect(bodyText).not.toContain('NaN')
  })

  test('validação de campo obrigatório: nome não pode ser vazio', async ({ page }) => {
    await page.goto('/dashboard/alunos?tab=novo')
    await page.waitForLoadState('networkidle')

    // Try to advance without filling nome
    const nextBtn = page.locator('button').filter({ hasText: 'Próximo' }).first()
    if (await nextBtn.count() > 0) {
      await nextBtn.click()
      await page.waitForTimeout(1_000)
      // Should still be on step 1 (nome field still visible or error shown)
      const nomeField = page.locator('input#nome')
      const errorMsg  = page.getByText(/obrigatório|required|preencha/i)
      const stillStep1 = await nomeField.count() > 0 || await errorMsg.count() > 0
      expect(stillStep1).toBeTruthy()
    }
  })

  test('aba Termos de Serviço carrega', async ({ page }) => {
    // Termos is a tab within /dashboard/alunos, not a separate page
    await page.goto('/dashboard/alunos?tab=termos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText.length).toBeGreaterThan(100)
    expect(bodyText).not.toContain('NaN')
  })

  test('aba Suspensos carrega', async ({ page }) => {
    // Suspensos is a tab within /dashboard/alunos, not a separate page
    await page.goto('/dashboard/alunos?tab=suspensos')
    await page.waitForLoadState('networkidle')
    await page.waitForTimeout(1_000)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('NaN')
    // Should show the suspensoes tab content
    const hasSuspensos = bodyText.match(/suspenso|pausado|suspensão/i)
    const hasEmpty     = bodyText.match(/nenhum|sem aluno/i)
    expect(hasSuspensos || hasEmpty).toBeTruthy()
  })

})
