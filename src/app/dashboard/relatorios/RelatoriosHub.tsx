'use client'

import { useState } from 'react'
import {
  getFinanceiroReportData,
  getProdutividadeReportData,
  getPrevisaoReportData,
  type FinanceiroReportData,
  type ProdutividadeReportData,
  type PrevisaoReportData,
} from './actions'

// ── Helpers ───────────────────────────────────────────────────────────────────

const MESES_PT = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]

function mesLabel(mesRef: string) {
  const [y, m] = mesRef.split('-').map(Number)
  return `${MESES_PT[m - 1]} ${y}`
}

function brl(val: number) {
  return val.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function getMonthOptions(mesAtual: string) {
  const opts: { value: string; label: string }[] = []
  const [y, m] = mesAtual.split('-').map(Number)
  for (let i = 0; i < 13; i++) {
    const d   = new Date(y, m - 1 - i, 1)
    const ref = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    opts.push({ value: ref, label: mesLabel(ref) })
  }
  return opts
}

// ── PDF text helpers ──────────────────────────────────────────────────────────

/** Remove all accents, diacritics and non-ASCII chars (incl. emoji) so jsPDF
 *  (which only ships WinAnsi-encoded fonts) renders text correctly. */
function t(str: string): string {
  return str
    .replace(/[—–]/g, '-')          // em/en dash → hyphen
    .replace(/['']/g, "'")           // smart apostrophes
    .replace(/[""]/g, '"')           // smart quotes
    .normalize('NFD')                // decompose accented chars
    .replace(/[\u0300-\u036f]/g, '') // strip combining diacritical marks
    .replace(/[^\x00-\x7F]/g, '')   // remove any remaining non-ASCII (emoji, etc.)
}

/** ASCII-safe BRL currency: "R$ 1.234,56" with no non-breaking spaces. */
function brlPDF(val: number): string {
  const sign   = val < 0 ? '-' : ''
  const abs    = Math.abs(val)
  const cents  = Math.round(abs * 100)
  const intPart = Math.floor(cents / 100)
  const decPart = cents % 100
  const intStr  = intPart.toString().replace(/\B(?=(\d{3})+(?!\d))/g, '.')
  return `${sign}R$ ${intStr},${String(decPart).padStart(2, '0')}`
}

/** Apply t() to every cell in autoTable head/body/foot rows. */
function tRows(rows: string[][]): string[][] {
  return rows.map(row => row.map(t))
}

// ── PDF Generators ─────────────────────────────────────────────────────────────

async function generateFinanceiroPDF(data: FinanceiroReportData): Promise<Blob> {
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = 0

  // ── Header ──
  doc.setFillColor(0, 180, 82)
  doc.rect(0, 0, W, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(0, 0, 0)
  doc.text('PersonalHub', 14, 11)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatorio Financeiro', 14, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(t(mesLabel(data.mesRef)), W - 14, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - 14, 18, { align: 'right' })

  y = 34
  doc.setFontSize(8)
  doc.setFont('helvetica', 'normal')
  doc.setTextColor(100, 100, 100)
  doc.text(
    t(`Professor: ${data.professorNome}   |   ${data.professorEmail}   |   Periodo: ${mesLabel(data.mesRef)}`),
    14, y,
  )
  y += 2
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y, W - 14, y)
  y += 8

  // ── Section: ENTRADAS ──
  const sectionHeader = (title: string, currY: number, lineLen: number) => {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(title, 14, currY)
    doc.setDrawColor(0, 180, 82)
    doc.setLineWidth(0.7)
    doc.line(14, currY + 1.8, 14 + lineLen, currY + 1.8)
    doc.setLineWidth(0.2)
  }

  const statusLabel: Record<string, string> = { pendente: 'Pendente', enviado: 'Enviado', pago: 'Pago' }
  const modeloLabel: Record<string, string>  = { mensalidade: 'Mensalidade', por_aula: 'Por Aula' }

  sectionHeader('ENTRADAS', y, 32)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Aluno', 'Modelo', 'Valor Unit.', 'Total Mes', 'Status']]),
    body: data.alunos.length
      ? tRows(data.alunos.map(a => [
          a.nome,
          modeloLabel[a.modelo_cobranca] ?? a.modelo_cobranca,
          brlPDF(a.valor),
          brlPDF(a.valorMensal),
          statusLabel[a.status ?? 'pendente'] ?? '-',
        ]))
      : tRows([['Nenhum aluno ativo', '', '', '', '']]),
    foot: data.alunos.length
      ? tRows([['', '', 'Faturamento Bruto', brlPDF(data.faturamentoBruto), '']])
      : undefined,
    styles:              { fontSize: 9, cellPadding: 2.5 },
    headStyles:          { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles:          { fillColor: [230, 245, 235], fontStyle: 'bold', textColor: [20, 20, 20] },
    alternateRowStyles:  { fillColor: [248, 252, 250] },
    columnStyles: {
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
      4: { halign: 'center' },
    },
    margin: { left: 14, right: 14 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // ── Section: SAIDAS ──
  sectionHeader('SAIDAS', y, 22)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Nome', 'Categoria', 'Tipo', 'Valor']]),
    body: data.custos.length
      ? tRows(data.custos.map(c => [
          c.nome,
          c.categoria,
          c.tipo === 'fixo' ? 'Fixo' : 'Variavel',
          brlPDF(c.valor),
        ]))
      : tRows([['Nenhum custo registrado', '', '', '']]),
    foot: data.custos.length
      ? tRows([
          ['', 'Custos Fixos',    '', brlPDF(data.totalFixos)],
          ['', 'Custos Variaveis', '', brlPDF(data.totalVariaveis)],
          ['', 'TOTAL SAIDAS',    '', brlPDF(data.totalCustos)],
        ])
      : undefined,
    styles:             { fontSize: 9, cellPadding: 2.5 },
    headStyles:         { fillColor: [30, 30, 30], textColor: [255, 255, 255], fontStyle: 'bold' },
    footStyles:         { fillColor: [245, 235, 235], fontStyle: 'bold', textColor: [20, 20, 20] },
    alternateRowStyles: { fillColor: [250, 248, 248] },
    columnStyles:       { 3: { halign: 'right' } },
    margin:             { left: 14, right: 14 },
  })

  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // Check if we need a new page for summary
  if (y > 240) { doc.addPage(); y = 20 }

  // ── Section: RESUMO ──
  sectionHeader('RESUMO', y, 26)
  y += 8

  const summaryItems = [
    { label: 'Faturamento Bruto', value: brlPDF(data.faturamentoBruto), color: [0, 0, 0] as [number, number, number] },
    { label: 'Total de Custos',   value: brlPDF(data.totalCustos),       color: [0, 0, 0] as [number, number, number] },
    { label: 'Lucro Liquido',     value: brlPDF(data.lucroLiquido),      color: data.lucroLiquido >= 0 ? [0, 150, 60] as [number, number, number] : [200, 0, 0] as [number, number, number] },
    { label: 'Margem de Lucro',   value: `${data.margemLucro}%`,         color: data.margemLucro >= 0 ? [0, 150, 60] as [number, number, number] : [200, 0, 0] as [number, number, number] },
  ]

  const boxW = (W - 28 - 9) / 2
  for (let i = 0; i < summaryItems.length; i++) {
    const col = i % 2
    const row = Math.floor(i / 2)
    const bx  = 14 + col * (boxW + 3)
    const by  = y + row * 20

    doc.setFillColor(245, 248, 246)
    doc.setDrawColor(210, 230, 220)
    doc.roundedRect(bx, by, boxW, 16, 2, 2, 'FD')

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(t(summaryItems[i].label), bx + 4, by + 6)

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    const [r, g, b] = summaryItems[i].color
    doc.setTextColor(r, g, b)
    doc.text(summaryItems[i].value, bx + boxW - 4, by + 13, { align: 'right' })
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    const fY = doc.internal.pageSize.getHeight() - 8
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Gerado pelo PersonalHub em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}   |   Pagina ${p} de ${pageCount}`,
      W / 2, fY, { align: 'center' },
    )
    doc.setDrawColor(200, 200, 200)
    doc.line(14, fY - 3, W - 14, fY - 3)
  }

  return doc.output('blob')
}

async function generateProdutividadePDF(data: ProdutividadeReportData): Promise<Blob> {
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = 0

  // ── Header ──
  doc.setFillColor(0, 120, 200)
  doc.rect(0, 0, W, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('PersonalHub', 14, 11)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Relatorio de Produtividade', 14, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text(t(mesLabel(data.mesRef)), W - 14, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - 14, 18, { align: 'right' })

  y = 34
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y, W - 14, y)
  y += 8

  const sectionHeader = (title: string, currY: number, lineLen: number, r = 0, g = 120, b = 200) => {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(title, 14, currY)
    doc.setDrawColor(r, g, b)
    doc.setLineWidth(0.7)
    doc.line(14, currY + 1.8, 14 + lineLen, currY + 1.8)
    doc.setLineWidth(0.2)
  }

  // ── Visao Geral — metric boxes ──
  sectionHeader('VISAO GERAL', y, 34)
  y += 8

  const metrics = [
    { label: 'Alunos Ativos',   value: String(data.totalAlunosAtivos) },
    { label: 'Aulas no Mes',    value: String(data.totalAulasNoMes) },
    { label: 'Horas Trabalhadas', value: `${data.horasTrabalhadas}h` },
    { label: 'Media Aulas/Dia', value: String(data.mediaAulasPorDia) },
  ]

  const mBoxW = (W - 28 - 9) / 4
  for (let i = 0; i < metrics.length; i++) {
    const bx = 14 + i * (mBoxW + 3)
    doc.setFillColor(235, 243, 252)
    doc.setDrawColor(190, 215, 240)
    doc.roundedRect(bx, y, mBoxW, 18, 2, 2, 'FD')
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(14)
    doc.setTextColor(0, 100, 180)
    doc.text(metrics[i].value, bx + mBoxW / 2, y + 10, { align: 'center' })
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7)
    doc.setTextColor(80, 80, 80)
    doc.text(t(metrics[i].label), bx + mBoxW / 2, y + 15.5, { align: 'center' })
  }
  y += 26

  // ── Faltas ──
  sectionHeader('FALTAS', y, 20)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Metrica', 'Quantidade']]),
    body: tRows([
      ['Total de Faltas no Mes', String(data.totalFaltas)],
      ['Por culpa do Aluno',     String(data.faltasCulpaAluno)],
      ['Por culpa do Professor', String(data.faltasCulpaProfessor)],
      ['Taxa de Presenca',       data.totalAulasNoMes > 0
        ? `${Math.round(((data.totalAulasNoMes - data.totalFaltas) / data.totalAulasNoMes) * 100)}%`
        : '-'],
    ]),
    styles:             { fontSize: 9, cellPadding: 2.5 },
    headStyles:         { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles:       { 1: { halign: 'center', fontStyle: 'bold' } },
    margin:             { left: 14, right: 14 },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 6

  // Faltas por aluno table (if any)
  if (data.faltasPorAluno.length > 0) {
    autoTable(doc, {
      startY: y,
      head: tRows([['Aluno', 'Faltas']]),
      body: tRows(data.faltasPorAluno.map(f => [f.nome, String(f.total)])),
      styles:             { fontSize: 8, cellPadding: 2 },
      headStyles:         { fillColor: [60, 60, 60], textColor: [255, 255, 255] },
      alternateRowStyles: { fillColor: [248, 248, 248] },
      columnStyles:       { 1: { halign: 'center' } },
      margin:             { left: 14, right: 14 },
    })
    y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10
  } else {
    y += 4
  }

  // ── Reposicoes ──
  sectionHeader('REPOSICOES', y, 32)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Status', 'Quantidade']]),
    body: tRows([
      ['Realizadas no Mes', String(data.reposicoesRealizadas)],
      ['Pendentes',         String(data.reposicoesPendentes)],
      ['Vencidas',          String(data.reposicoesVencidas)],
    ]),
    styles:             { fontSize: 9, cellPadding: 2.5 },
    headStyles:         { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [245, 248, 252] },
    columnStyles:       { 1: { halign: 'center', fontStyle: 'bold' } },
    margin:             { left: 14, right: 14 },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // ── Destaques ──
  sectionHeader('DESTAQUES DO MES', y, 48)
  y += 8

  const destaquesData = [
    ['Aluno com mais faltas', data.alunoMaisFaltas],
    ['Dia da semana mais cheio', data.diaMaisCheio],
  ]
  const dBoxW = (W - 28 - 3) / 2
  for (let i = 0; i < destaquesData.length; i++) {
    const bx = 14 + i * (dBoxW + 3)
    doc.setFillColor(248, 248, 248)
    doc.setDrawColor(220, 220, 220)
    doc.roundedRect(bx, y, dBoxW, 16, 2, 2, 'FD')
    doc.setFont('helvetica', 'normal')
    doc.setFontSize(8)
    doc.setTextColor(100, 100, 100)
    doc.text(t(destaquesData[i][0]), bx + 4, y + 6)
    doc.setFont('helvetica', 'bold')
    doc.setFontSize(10)
    doc.setTextColor(20, 20, 20)
    doc.text(t(destaquesData[i][1]), bx + 4, y + 13)
  }

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    const fY = doc.internal.pageSize.getHeight() - 8
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Gerado pelo PersonalHub em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}   |   Pagina ${p} de ${pageCount}`,
      W / 2, fY, { align: 'center' },
    )
    doc.setDrawColor(200, 200, 200)
    doc.line(14, fY - 3, W - 14, fY - 3)
  }

  return doc.output('blob')
}

async function generatePrevisaoPDF(data: PrevisaoReportData): Promise<Blob> {
  const { default: jsPDF }    = await import('jspdf')
  const { default: autoTable } = await import('jspdf-autotable')

  const doc = new jsPDF({ orientation: 'portrait', unit: 'mm', format: 'a4' })
  const W   = doc.internal.pageSize.getWidth()
  let y     = 0

  // ── Header ──
  doc.setFillColor(130, 50, 220)
  doc.rect(0, 0, W, 26, 'F')
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(16)
  doc.setTextColor(255, 255, 255)
  doc.text('PersonalHub', 14, 11)
  doc.setFontSize(10)
  doc.setFont('helvetica', 'normal')
  doc.text('Previsao Financeira', 14, 18)
  doc.setFont('helvetica', 'bold')
  doc.setFontSize(12)
  doc.text('Proximos 3 Meses', W - 14, 11, { align: 'right' })
  doc.setFont('helvetica', 'normal')
  doc.setFontSize(9)
  doc.text(new Date().toLocaleDateString('pt-BR'), W - 14, 18, { align: 'right' })

  y = 34
  doc.setDrawColor(220, 220, 220)
  doc.line(14, y, W - 14, y)
  y += 8

  const sectionHeader = (title: string, currY: number, lineLen: number) => {
    doc.setFontSize(11)
    doc.setFont('helvetica', 'bold')
    doc.setTextColor(20, 20, 20)
    doc.text(title, 14, currY)
    doc.setDrawColor(130, 50, 220)
    doc.setLineWidth(0.7)
    doc.line(14, currY + 1.8, 14 + lineLen, currY + 1.8)
    doc.setLineWidth(0.2)
  }

  // ── Previsao por Mes ──
  sectionHeader('PREVISAO POR MES', y, 44)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Mes', 'Faturamento Previsto', 'Custos Fixos', 'Lucro Previsto']]),
    body: tRows(data.meses.map((m, i) => [
      i === 0 ? `${m.label} (atual)` : m.label,
      brlPDF(m.faturamentoPrevisto),
      brlPDF(m.custosPrevisto),
      brlPDF(m.lucroPrevisto),
    ])),
    styles:             { fontSize: 9, cellPadding: 3 },
    headStyles:         { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    columnStyles: {
      1: { halign: 'right' },
      2: { halign: 'right' },
      3: { halign: 'right', fontStyle: 'bold' },
    },
    margin: { left: 14, right: 14 },
  })
  y = (doc as unknown as { lastAutoTable: { finalY: number } }).lastAutoTable.finalY + 10

  // ── Cenarios ──
  sectionHeader(t(`CENARIOS - ${data.meses[1]?.label ?? 'Proximo Mes'}`), y, 60)
  y += 8

  const scenarios = [
    { label: 'Pessimista', sublabel: 'Perda de 2 alunos', value: data.pessimista, color: [200, 50, 50] as [number, number, number], bg: [255, 240, 240] as [number, number, number], border: [230, 180, 180] as [number, number, number] },
    { label: 'Atual',      sublabel: 'Mantem carteira',   value: data.atual,      color: [80, 80, 80]  as [number, number, number], bg: [245, 245, 245] as [number, number, number], border: [200, 200, 200] as [number, number, number] },
    { label: 'Otimista',   sublabel: 'Ganho de 2 alunos', value: data.otimista,   color: [0, 150, 60]  as [number, number, number], bg: [235, 252, 242] as [number, number, number], border: [160, 220, 185] as [number, number, number] },
  ]

  const sBoxW = (W - 28 - 6) / 3
  for (let i = 0; i < scenarios.length; i++) {
    const sc = scenarios[i]
    const bx = 14 + i * (sBoxW + 3)
    doc.setFillColor(sc.bg[0], sc.bg[1], sc.bg[2])
    doc.setDrawColor(sc.border[0], sc.border[1], sc.border[2])
    doc.roundedRect(bx, y, sBoxW, 26, 2, 2, 'FD')

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(9)
    doc.setTextColor(40, 40, 40)
    doc.text(sc.label, bx + sBoxW / 2, y + 6, { align: 'center' })

    doc.setFont('helvetica', 'normal')
    doc.setFontSize(7.5)
    doc.setTextColor(100, 100, 100)
    doc.text(sc.sublabel, bx + sBoxW / 2, y + 11, { align: 'center' })

    doc.setFont('helvetica', 'bold')
    doc.setFontSize(11)
    doc.setTextColor(sc.color[0], sc.color[1], sc.color[2])
    doc.text(brlPDF(sc.value), bx + sBoxW / 2, y + 21, { align: 'center' })
  }
  y += 34

  // ── Ticket médio ──
  sectionHeader('INDICADORES', y, 36)
  y += 6

  autoTable(doc, {
    startY: y,
    head: tRows([['Indicador', 'Valor']]),
    body: tRows([
      ['Ticket Medio por Aluno', brlPDF(data.ticketMedio)],
      ...(data.metaLucro > 0 ? [
        ['Meta de Lucro Mensal', brlPDF(data.metaLucro)],
        ['Alunos necessarios para atingir a meta',
          data.alunosNecessarios > 0 ? `+${data.alunosNecessarios} alunos` : 'Meta ja atingida!'],
      ] : []),
    ]),
    styles:             { fontSize: 9, cellPadding: 3 },
    headStyles:         { fillColor: [30, 30, 30], textColor: [255, 255, 255] },
    alternateRowStyles: { fillColor: [248, 245, 255] },
    columnStyles:       { 1: { halign: 'right', fontStyle: 'bold' } },
    margin:             { left: 14, right: 14 },
  })

  // ── Footer ──
  const pageCount = doc.getNumberOfPages()
  for (let p = 1; p <= pageCount; p++) {
    doc.setPage(p)
    const fY = doc.internal.pageSize.getHeight() - 8
    doc.setFontSize(7)
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(160, 160, 160)
    doc.text(
      `Gerado pelo PersonalHub em ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}   |   Pagina ${p} de ${pageCount}`,
      W / 2, fY, { align: 'center' },
    )
    doc.setDrawColor(200, 200, 200)
    doc.line(14, fY - 3, W - 14, fY - 3)
  }

  return doc.output('blob')
}

// ── Download & Share helpers ──────────────────────────────────────────────────

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob)
  const a   = document.createElement('a')
  a.href    = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

async function shareWhatsApp(blob: Blob, filename: string, message: string) {
  const file = new File([blob], filename, { type: 'application/pdf' })
  if (
    typeof navigator !== 'undefined' &&
    navigator.share &&
    navigator.canShare?.({ files: [file] })
  ) {
    try {
      await navigator.share({ files: [file], text: message })
      return
    } catch {
      // fallback
    }
  }
  // Desktop fallback: download + open wa.me
  downloadBlob(blob, filename)
  window.open(`https://wa.me/?text=${encodeURIComponent(message)}`, '_blank')
}

// ── Report Card Component ─────────────────────────────────────────────────────

interface ReportCardProps {
  title: string
  description: string
  icon: React.ReactNode
  accentColor: string
  accentBg: string
  accentBorder: string
  mes?: string
  setMes?: (v: string) => void
  monthOptions?: { value: string; label: string }[]
  loading: boolean
  pdfBlob: Blob | null
  pdfFilename: string
  error: string | null
  onGerar: () => void
  onReset: () => void
  whatsappMessage: string
}

function ReportCard({
  title, description, icon, accentColor, accentBg, accentBorder,
  mes, setMes, monthOptions,
  loading, pdfBlob, pdfFilename, error,
  onGerar, onReset, whatsappMessage,
}: ReportCardProps) {
  return (
    <div
      className="rounded-xl p-5 flex flex-col gap-4"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      {/* Card header */}
      <div className="flex items-start gap-3">
        <div
          className="w-10 h-10 rounded-lg flex items-center justify-center shrink-0"
          style={{ background: accentBg, border: `1px solid ${accentBorder}`, color: accentColor }}
        >
          {icon}
        </div>
        <div>
          <h3 className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{title}</h3>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{description}</p>
        </div>
      </div>

      {/* Month selector */}
      {setMes && monthOptions && (
        <select
          value={mes}
          onChange={e => { setMes(e.target.value); onReset() }}
          className="w-full rounded-lg px-3 py-2 text-sm"
          style={{
            background: 'var(--bg-input)', border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)', outline: 'none',
          }}
        >
          {monthOptions.map(o => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      )}

      {/* Error */}
      {error && (
        <p className="text-xs px-3 py-2 rounded-lg" style={{ background: 'rgba(255,80,80,0.1)', color: '#ff5252' }}>
          {error}
        </p>
      )}

      {/* Actions */}
      {!pdfBlob ? (
        <button
          onClick={onGerar}
          disabled={loading}
          className="w-full py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2 transition-opacity"
          style={{
            background: accentColor, color: '#fff',
            opacity: loading ? 0.7 : 1,
            cursor: loading ? 'not-allowed' : 'pointer',
          }}
        >
          {loading ? (
            <>
              <svg className="animate-spin" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 12a9 9 0 1 1-6.219-8.56" />
              </svg>
              Gerando...
            </>
          ) : (
            <>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                <polyline points="14 2 14 8 20 8" />
              </svg>
              Gerar PDF
            </>
          )}
        </button>
      ) : (
        <div className="flex flex-col gap-2">
          <div
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-xs"
            style={{ background: 'rgba(0,200,100,0.08)', color: '#00c864', border: '1px solid rgba(0,200,100,0.2)' }}
          >
            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <polyline points="20 6 9 17 4 12" />
            </svg>
            PDF gerado com sucesso!
          </div>
          <div className="flex gap-2">
            <button
              onClick={() => downloadBlob(pdfBlob, pdfFilename)}
              className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5 transition-colors"
              style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onMouseEnter={e => (e.currentTarget.style.borderColor = accentColor)}
              onMouseLeave={e => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                <polyline points="7 10 12 15 17 10" />
                <line x1="12" y1="15" x2="12" y2="3" />
              </svg>
              Baixar PDF
            </button>
            <button
              onClick={() => shareWhatsApp(pdfBlob, pdfFilename, whatsappMessage)}
              className="flex-1 py-2 rounded-lg text-xs font-medium flex items-center justify-center gap-1.5"
              style={{ background: '#25D366', color: '#fff' }}
            >
              <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 0 1-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 0 1-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 0 1 2.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0 0 12.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 0 0 5.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 0 0-3.48-8.413z" />
              </svg>
              WhatsApp
            </button>
          </div>
          <button
            onClick={onReset}
            className="text-xs text-center py-1 transition-colors"
            style={{ color: 'var(--text-muted)' }}
            onMouseEnter={e => (e.currentTarget.style.color = 'var(--text-secondary)')}
            onMouseLeave={e => (e.currentTarget.style.color = 'var(--text-muted)')}
          >
            Gerar novo
          </button>
        </div>
      )}
    </div>
  )
}

// ── Main Component ─────────────────────────────────────────────────────────────

export function RelatoriosHub({ mesAtual }: { mesAtual: string }) {
  const monthOptions = getMonthOptions(mesAtual)

  // ── Financeiro state ──
  const [mesF, setMesF] = useState(mesAtual)
  const [loadingF, setLoadingF]     = useState(false)
  const [pdfF, setPdfF]             = useState<Blob | null>(null)
  const [errorF, setErrorF]         = useState<string | null>(null)

  // ── Produtividade state ──
  const [mesP, setMesP] = useState(mesAtual)
  const [loadingP, setLoadingP]     = useState(false)
  const [pdfP, setPdfP]             = useState<Blob | null>(null)
  const [errorP, setErrorP]         = useState<string | null>(null)

  // ── Previsão state ──
  const [loadingPrev, setLoadingPrev] = useState(false)
  const [pdfPrev, setPdfPrev]         = useState<Blob | null>(null)
  const [errorPrev, setErrorPrev]     = useState<string | null>(null)

  // ── Handlers ──
  async function handleGerarFinanceiro() {
    setLoadingF(true); setErrorF(null)
    try {
      const { data, error } = await getFinanceiroReportData(mesF)
      if (error || !data) { setErrorF(error ?? 'Erro ao buscar dados.'); return }
      const blob = await generateFinanceiroPDF(data)
      setPdfF(blob)
    } catch (e) {
      setErrorF('Erro ao gerar PDF.')
      console.error(e)
    } finally {
      setLoadingF(false)
    }
  }

  async function handleGerarProdutividade() {
    setLoadingP(true); setErrorP(null)
    try {
      const { data, error } = await getProdutividadeReportData(mesP)
      if (error || !data) { setErrorP(error ?? 'Erro ao buscar dados.'); return }
      const blob = await generateProdutividadePDF(data)
      setPdfP(blob)
    } catch (e) {
      setErrorP('Erro ao gerar PDF.')
      console.error(e)
    } finally {
      setLoadingP(false)
    }
  }

  async function handleGerarPrevisao() {
    setLoadingPrev(true); setErrorPrev(null)
    try {
      const { data, error } = await getPrevisaoReportData()
      if (error || !data) { setErrorPrev(error ?? 'Erro ao buscar dados.'); return }
      const blob = await generatePrevisaoPDF(data)
      setPdfPrev(blob)
    } catch (e) {
      setErrorPrev('Erro ao gerar PDF.')
      console.error(e)
    } finally {
      setLoadingPrev(false)
    }
  }

  return (
    <div className="flex flex-col gap-6 p-4 md:p-6 max-w-4xl">
      {/* Page Header */}
      <div>
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Relatórios</h1>
        <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
          Gere relatórios profissionais em PDF para compartilhar ou arquivar
        </p>
      </div>

      {/* Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">

        {/* Card 1 — Financeiro */}
        <ReportCard
          title="Relatório Financeiro"
          description="Entradas, saídas, lucro e margem do mês. Ideal para enviar ao contador."
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="12" y1="1" x2="12" y2="23" />
              <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
            </svg>
          }
          accentColor="#00b852"
          accentBg="rgba(0,184,82,0.12)"
          accentBorder="rgba(0,184,82,0.3)"
          mes={mesF}
          setMes={setMesF}
          monthOptions={monthOptions}
          loading={loadingF}
          pdfBlob={pdfF}
          pdfFilename={`relatorio-financeiro-${mesF}.pdf`}
          error={errorF}
          onGerar={handleGerarFinanceiro}
          onReset={() => setPdfF(null)}
          whatsappMessage={`Segue o Relatório Financeiro de ${mesLabel(mesF)} gerado pelo PersonalHub 📊`}
        />

        {/* Card 2 — Produtividade */}
        <ReportCard
          title="Relatório de Produtividade"
          description="Aulas, faltas, reposições e horas trabalhadas no mês."
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <polyline points="22 12 18 12 15 21 9 3 6 12 2 12" />
            </svg>
          }
          accentColor="#0078c8"
          accentBg="rgba(0,120,200,0.12)"
          accentBorder="rgba(0,120,200,0.3)"
          mes={mesP}
          setMes={setMesP}
          monthOptions={monthOptions}
          loading={loadingP}
          pdfBlob={pdfP}
          pdfFilename={`relatorio-produtividade-${mesP}.pdf`}
          error={errorP}
          onGerar={handleGerarProdutividade}
          onReset={() => setPdfP(null)}
          whatsappMessage={`Segue o Relatório de Produtividade de ${mesLabel(mesP)} gerado pelo PersonalHub 📈`}
        />

        {/* Card 3 — Previsão */}
        <ReportCard
          title="Previsão Financeira"
          description="Faturamento previsto para os próximos 3 meses com cenários e metas."
          icon={
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="12" cy="12" r="10" />
              <polyline points="12 6 12 12 16 14" />
            </svg>
          }
          accentColor="#8232dc"
          accentBg="rgba(130,50,220,0.12)"
          accentBorder="rgba(130,50,220,0.3)"
          loading={loadingPrev}
          pdfBlob={pdfPrev}
          pdfFilename={`previsao-financeira-${mesAtual}.pdf`}
          error={errorPrev}
          onGerar={handleGerarPrevisao}
          onReset={() => setPdfPrev(null)}
          whatsappMessage={`Segue a Previsão Financeira dos próximos 3 meses gerada pelo PersonalHub 🚀`}
        />

      </div>

      {/* Info note */}
      <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
        💡 Os PDFs são gerados localmente no seu dispositivo e não são armazenados nos servidores do PersonalHub.
      </p>
    </div>
  )
}
