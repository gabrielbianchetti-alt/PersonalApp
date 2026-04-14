import { test, expect } from '@playwright/test'

test.describe('Dashboard', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard')
    await page.waitForLoadState('networkidle')
  })

  test('dashboard carrega sem erros de JS', async ({ page }) => {
    const errors: string[] = []
    page.on('pageerror', e => errors.push(e.message))
    await page.reload()
    await page.waitForLoadState('networkidle')
    expect(errors.filter(e => !e.includes('hydrat'))).toHaveLength(0)
  })

  test('saudação dinâmica aparece com nome do professor', async ({ page }) => {
    // The dashboard shows "Bom dia, <nome>" or similar greeting
    const greeting = page.getByText(/Bom |Boa |Olá/i)
    await expect(greeting).toBeVisible()
    // Should not be blank — must contain more than just "Bom dia, "
    const text = await greeting.first().textContent()
    expect(text?.length).toBeGreaterThan(8)
  })

  test('cards financeiros exibem valores válidos (não NaN, não vazio)', async ({ page }) => {
    // Use innerText() to get only visible rendered text (excludes <script> RSC payload)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('NaN')
    expect(bodyText).not.toContain('undefined')
    // Page loaded and shows some financial section (R$ or labels like faturamento/lucro)
    const hasFinancial = bodyText.match(/R\$|faturamento|lucro|custo/i)
    expect(hasFinancial).toBeTruthy()
  })

  test('seção de aulas do dia carrega', async ({ page }) => {
    // Dashboard shows today's commitments — label varies by implementation
    const bodyText = await page.locator('body').innerText()
    const hasSection = bodyText.match(/Compromissos do dia|Aulas de Hoje|Agenda de Hoje|hoje/i)
    expect(hasSection).toBeTruthy()
  })

  test('seção de cobranças carrega', async ({ page }) => {
    // Check page body contains cobranças section (innerText excludes script content)
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).toMatch(/Cobranças|Cobrança/i)
  })

  test('sidebar mostra todos os itens de navegação', async ({ page }) => {
    await expect(page.getByRole('link', { name: /Dashboard/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Alunos/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Agenda/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Financeiro/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Relatórios/ })).toBeVisible()
    await expect(page.getByRole('link', { name: /Configurações/ })).toBeVisible()
  })

  test('navegação para Alunos funciona', async ({ page }) => {
    await page.getByRole('link', { name: /Alunos/ }).first().click()
    await page.waitForURL('**/alunos**')
    expect(page.url()).toContain('/alunos')
  })

  test('navegação para Agenda funciona', async ({ page }) => {
    await page.getByRole('link', { name: /Agenda/ }).first().click()
    await page.waitForURL('**/agenda**')
    expect(page.url()).toContain('/agenda')
  })

  test('navegação para Financeiro funciona', async ({ page }) => {
    await page.getByRole('link', { name: /Financeiro/ }).first().click()
    await page.waitForURL('**/financeiro**')
    expect(page.url()).toContain('/financeiro')
  })

  test('navegação para Relatórios funciona', async ({ page }) => {
    await page.getByRole('link', { name: /Relatórios/ }).first().click()
    await page.waitForURL('**/relatorios**')
    expect(page.url()).toContain('/relatorios')
  })

  test('dashboard carrega sem valores inválidos', async ({ page }) => {
    // Verify no NaN or raw undefined values are rendered in the UI
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('NaN')
    expect(bodyText).not.toContain('undefined')
    // At least one financial label should be visible
    const hasFin = bodyText.match(/faturamento|lucro|custo|R\$/i)
    expect(hasFin).toBeTruthy()
  })

})
