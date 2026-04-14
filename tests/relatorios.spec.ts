import { test, expect } from '@playwright/test'
import * as path from 'path'
import * as fs from 'fs'

test.describe('Relatórios', () => {

  test.beforeEach(async ({ page }) => {
    await page.goto('/dashboard/relatorios')
    await page.waitForLoadState('networkidle')
  })

  test('página de relatórios carrega corretamente', async ({ page }) => {
    await expect(page.getByText(/Relatórios/i).first()).toBeVisible()
    const bodyText = await page.locator('body').innerText()
    expect(bodyText).not.toContain('NaN')
    expect(bodyText).not.toContain('404')
  })

  test('três cards de relatório estão visíveis', async ({ page }) => {
    await expect(page.getByText(/Relatório Financeiro/i)).toBeVisible()
    await expect(page.getByText(/Relatório de Produtividade|Produtividade/i).first()).toBeVisible()
    await expect(page.getByText(/Previsão Financeira|Previsibilidade/i).first()).toBeVisible()
  })

  test('seletor de mês está presente nos cards com mês', async ({ page }) => {
    // Financeiro and Produtividade cards should have month selectors
    const selects = page.locator('select')
    const count = await selects.count()
    expect(count).toBeGreaterThanOrEqual(2)
  })

  test('botões Gerar PDF estão presentes', async ({ page }) => {
    const btns = page.getByRole('button', { name: /gerar pdf/i })
    const count = await btns.count()
    expect(count).toBe(3)
  })

  test('gerar PDF Financeiro — botão muda para estado loading e depois sucesso', async ({ page }) => {
    const gerarBtns = page.getByRole('button', { name: /gerar pdf/i })
    const firstBtn  = gerarBtns.first()
    await expect(firstBtn).toBeVisible()
    await firstBtn.click()

    // Should show loading state
    await expect(page.getByText(/gerando/i)).toBeVisible({ timeout: 5_000 })

    // Wait for generation to complete (max 20s for PDF generation)
    await expect(page.getByText(/pdf gerado com sucesso|baixar pdf/i).first())
      .toBeVisible({ timeout: 20_000 })
  })

  test('após gerar PDF Financeiro, botões Baixar e WhatsApp aparecem', async ({ page }) => {
    const gerarBtn = page.getByRole('button', { name: /gerar pdf/i }).first()
    await gerarBtn.click()

    await expect(page.getByRole('button', { name: /baixar pdf/i }))
      .toBeVisible({ timeout: 20_000 })
    await expect(page.getByRole('button', { name: /whatsapp/i }))
      .toBeVisible({ timeout: 5_000 })
  })

  test('download do PDF Financeiro gera arquivo', async ({ page }) => {
    const gerarBtn = page.getByRole('button', { name: /gerar pdf/i }).first()
    await gerarBtn.click()

    await page.getByRole('button', { name: /baixar pdf/i }).waitFor({ timeout: 20_000 })

    // Set up download listener
    const [download] = await Promise.all([
      page.waitForEvent('download'),
      page.getByRole('button', { name: /baixar pdf/i }).click(),
    ])

    expect(download.suggestedFilename()).toMatch(/\.pdf$/)
    // Check file is not empty
    const downloadPath = await download.path()
    if (downloadPath) {
      const stats = fs.statSync(downloadPath)
      expect(stats.size).toBeGreaterThan(1000) // PDF should be > 1KB
    }
  })

  test('gerar PDF Produtividade funciona', async ({ page }) => {
    const gerarBtns = page.getByRole('button', { name: /gerar pdf/i })
    const secondBtn = gerarBtns.nth(1)
    await secondBtn.click()

    await expect(page.getByText(/gerando/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/pdf gerado|baixar pdf/i).first())
      .toBeVisible({ timeout: 20_000 })
  })

  test('gerar PDF Previsão Financeira funciona', async ({ page }) => {
    const gerarBtns = page.getByRole('button', { name: /gerar pdf/i })
    const thirdBtn  = gerarBtns.nth(2)
    await thirdBtn.click()

    await expect(page.getByText(/gerando/i)).toBeVisible({ timeout: 5_000 })
    await expect(page.getByText(/pdf gerado|baixar pdf/i).first())
      .toBeVisible({ timeout: 20_000 })
  })

  test('botão "Gerar novo" aparece e reseta o estado', async ({ page }) => {
    const gerarBtn = page.getByRole('button', { name: /gerar pdf/i }).first()
    await gerarBtn.click()

    await page.getByRole('button', { name: /baixar pdf/i }).waitFor({ timeout: 20_000 })

    const gerarNovoBtn = page.getByText(/gerar novo/i)
    await expect(gerarNovoBtn).toBeVisible()
    await gerarNovoBtn.click()

    // Should show "Gerar PDF" button again
    await expect(page.getByRole('button', { name: /gerar pdf/i }).first())
      .toBeVisible({ timeout: 5_000 })
  })

})
