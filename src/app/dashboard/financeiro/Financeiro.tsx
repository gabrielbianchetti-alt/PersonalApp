'use client'

import { useState, useEffect, useRef } from 'react'
import {
  createCustoAction,
  updateCustoAction,
  deleteCustoAction,
  getCustosForMesAction,
  ensureFixosForMesAction,
  type CustoRow,
} from './actions'

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIAS_PADRAO = ['Academia', 'Transporte', 'Alimentação', 'Equipamentos', 'Outros']

const CAT_COLOR: Record<string, string> = {
  Academia:     '#00E676',
  Transporte:   '#40C4FF',
  Alimentação:  '#FFAB00',
  Equipamentos: '#CE93D8',
  Outros:       '#9E9E9E',
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const DAY_TO_KEY: Record<number, string> = { 1:'seg',2:'ter',3:'qua',4:'qui',5:'sex',6:'sab',0:'dom' }

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoFin {
  id: string
  nome: string
  modelo_cobranca: 'mensalidade' | 'por_aula'
  valor: number
  horarios: { dia: string; horario: string }[]
}

interface Props {
  alunos: AlunoFin[]
  custosIniciais: CustoRow[]
  mesInicial: string // "YYYY-MM"
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function parseMes(m: string): { year: number; month: number } {
  const [y, mo] = m.split('-').map(Number)
  return { year: y, month: mo - 1 } // month 0-indexed
}

function formatMes(year: number, month: number): string {
  return `${year}-${String(month + 1).padStart(2, '0')}`
}

function calcFaturamento(alunos: AlunoFin[], year: number, month: number): number {
  return alunos.reduce((sum, a) => {
    if (a.modelo_cobranca === 'mensalidade') return sum + Number(a.valor)
    const days = new Date(year, month + 1, 0).getDate()
    let aulas = 0
    for (let d = 1; d <= days; d++) {
      const key = DAY_TO_KEY[new Date(year, month, d).getDay()]
      const dias = a.horarios.map(h => h.dia)
      if (key && dias.includes(key)) aulas++
    }
    return sum + aulas * Number(a.valor)
  }, 0)
}

function fmtCurrency(v: number): string {
  return v.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' })
}

function fmtDate(iso: string): string {
  if (!iso) return ''
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function getCatColor(cat: string): string {
  return CAT_COLOR[cat] ?? '#64B5F6'
}

function marginColor(pct: number): string {
  if (pct >= 50) return '#00E676'
  if (pct >= 30) return '#FFAB00'
  return '#FF5252'
}

// ─── CustoFormModal ────────────────────────────────────────────────────────────

function CustoFormModal({
  tipo: tipoInicial,
  custo,
  mes,
  onClose,
  onSaved,
}: {
  tipo?: 'fixo' | 'variavel'
  custo?: CustoRow
  mes: string
  onClose: () => void
  onSaved: (row: CustoRow) => void
}) {
  const editing = !!custo
  const [nome,      setNome]      = useState(custo?.nome ?? '')
  const [valor,     setValor]     = useState(custo ? String(custo.valor) : '')
  const [tipo,      setTipo]      = useState<'fixo'|'variavel'>(custo?.tipo ?? tipoInicial ?? 'fixo')
  const [catSelect, setCatSelect] = useState(
    custo ? (CATEGORIAS_PADRAO.includes(custo.categoria) ? custo.categoria : '__custom__') : CATEGORIAS_PADRAO[0]
  )
  const [customCat, setCustomCat] = useState(
    custo && !CATEGORIAS_PADRAO.includes(custo.categoria) ? custo.categoria : ''
  )
  const [data,      setData]      = useState(custo?.data ?? '')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  const isCustom    = catSelect === '__custom__'
  const categoria   = isCustom ? customCat.trim() : catSelect
  const { year, month } = parseMes(mes)

  async function save() {
    if (!nome.trim())               { setErr('Informe o nome do custo.');    return }
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0)
                                    { setErr('Informe um valor válido.');     return }
    if (!categoria)                 { setErr('Informe a categoria.');         return }
    if (tipo === 'variavel' && !data) { setErr('Informe a data.');            return }

    setSaving(true); setErr('')

    const payload = {
      nome:          nome.trim(),
      valor:         Number(valor),
      tipo,
      categoria,
      data:          tipo === 'variavel' ? data : null,
      mes_referencia: tipo === 'variavel' ? data.slice(0, 7) : mes,
    }

    const res = editing
      ? await updateCustoAction(custo!.id, payload)
      : await createCustoAction(payload)

    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res.data!)
  }

  const titleLabel = editing ? 'Editar custo' : tipo === 'fixo' ? 'Novo custo fixo' : 'Novo custo variável'

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={(e) => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>{titleLabel}</p>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Tipo selector (only on new) */}
          {!editing && !tipoInicial && (
            <div className="grid grid-cols-2 gap-2">
              {(['fixo','variavel'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className="py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                  style={{
                    background: tipo === t ? (t === 'fixo' ? 'var(--green-muted)' : 'rgba(64,196,255,0.1)') : 'var(--bg-card)',
                    color: tipo === t ? (t === 'fixo' ? 'var(--green-primary)' : '#40C4FF') : 'var(--text-secondary)',
                    border: `1px solid ${tipo === t ? (t === 'fixo' ? 'rgba(0,230,118,0.25)' : 'rgba(64,196,255,0.25)') : 'var(--border-subtle)'}`,
                  }}>
                  {t === 'fixo' ? '🔁 Fixo' : '📌 Variável'}
                </button>
              ))}
            </div>
          )}

          {/* Nome */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Nome</label>
            <input value={nome} onChange={e => setNome(e.target.value)} placeholder="Ex: Academia, Combustível..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
            <input type="number" min="0" step="0.01" value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
          </div>

          {/* Categoria */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Categoria</label>
            <div className="flex flex-wrap gap-1.5 mb-2">
              {CATEGORIAS_PADRAO.map(c => (
                <button key={c} onClick={() => setCatSelect(c)}
                  className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                  style={{
                    background: catSelect === c ? getCatColor(c) + '22' : 'var(--bg-card)',
                    color: catSelect === c ? getCatColor(c) : 'var(--text-secondary)',
                    border: `1px solid ${catSelect === c ? getCatColor(c) : 'var(--border-subtle)'}`,
                  }}>
                  {c}
                </button>
              ))}
              <button onClick={() => setCatSelect('__custom__')}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                style={{
                  background: isCustom ? 'rgba(100,181,246,0.15)' : 'var(--bg-card)',
                  color: isCustom ? '#64B5F6' : 'var(--text-secondary)',
                  border: `1px solid ${isCustom ? '#64B5F6' : 'var(--border-subtle)'}`,
                }}>
                + Personalizada
              </button>
            </div>
            {isCustom && (
              <input value={customCat} onChange={e => setCustomCat(e.target.value)} placeholder="Nome da categoria"
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-focus)', color: 'var(--text-primary)' }} />
            )}
          </div>

          {/* Data (variável only) */}
          {tipo === 'variavel' && (
            <div>
              <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Data</label>
              <input type="date" value={data} onChange={e => setData(e.target.value)}
                defaultValue={`${year}-${String(month + 1).padStart(2, '0')}-${String(new Date().getDate()).padStart(2, '0')}`}
                className="w-full px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
                onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
                onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
            </div>
          )}

          {tipo === 'fixo' && !editing && (
            <p className="text-xs px-3 py-2.5 rounded-xl" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
              🔁 Este custo será replicado automaticamente para os próximos meses.
            </p>
          )}

          {err && <p className="text-xs text-center" style={{ color: '#FF5252' }}>{err}</p>}

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'var(--green-primary)', color: '#000' }}>
            {saving ? 'Salvando...' : editing ? 'Salvar alterações' : 'Adicionar custo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export function Financeiro({ alunos, custosIniciais, mesInicial }: Props) {
  const [mes,        setMes]        = useState(mesInicial)
  const [custos,     setCustos]     = useState<CustoRow[]>(custosIniciais)
  const [loading,    setLoading]    = useState(false)
  const [modal,      setModal]      = useState<
    | { type: 'add-fixo' }
    | { type: 'add-variavel' }
    | { type: 'edit'; custo: CustoRow }
    | null
  >(null)
  const [filterTipo, setFilterTipo] = useState<'todos'|'fixo'|'variavel'>('todos')
  const [filterCat,  setFilterCat]  = useState<string>('')
  const isFirstMount                = useRef(true)

  const { year, month } = parseMes(mes)

  // Fetch + seed when month changes
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setLoading(true)
    ;(async () => {
      await ensureFixosForMesAction(mes)
      const res = await getCustosForMesAction(mes)
      setCustos(res.data ?? [])
      setLoading(false)
    })()
  }, [mes])

  // ── navigation ──────────────────────────────────────────────────────────────

  function prevMes() {
    const m = month === 0 ? 11 : month - 1
    const y = month === 0 ? year - 1 : year
    setMes(formatMes(y, m))
  }
  function nextMes() {
    const m = month === 11 ? 0 : month + 1
    const y = month === 11 ? year + 1 : year
    setMes(formatMes(y, m))
  }

  // ── data mutators ────────────────────────────────────────────────────────────

  function addCusto(row: CustoRow) {
    if (row.mes_referencia === mes) setCustos(prev => [row, ...prev])
    setModal(null)
  }
  function replaceCusto(row: CustoRow) {
    setCustos(prev => prev.map(c => c.id === row.id ? row : c))
    setModal(null)
  }
  async function handleDelete(id: string) {
    if (!confirm('Remover este custo?')) return
    await deleteCustoAction(id)
    setCustos(prev => prev.filter(c => c.id !== id))
  }

  // ── computed ─────────────────────────────────────────────────────────────────

  const faturamento  = calcFaturamento(alunos, year, month)
  const totalCustos  = custos.reduce((s, c) => s + Number(c.valor), 0)
  const lucro        = faturamento - totalCustos
  const margem       = faturamento > 0 ? (lucro / faturamento) * 100 : 0
  const mColor       = marginColor(margem)

  // Category totals
  const allCats = Array.from(new Set(custos.map(c => c.categoria)))
  const catTotals = allCats
    .map(cat => ({ cat, total: custos.filter(c => c.categoria === cat).reduce((s, c) => s + Number(c.valor), 0) }))
    .sort((a, b) => b.total - a.total)

  // Filtered list
  const listCustos = custos.filter(c => {
    if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false
    if (filterCat && c.categoria !== filterCat) return false
    return true
  })

  const totalFixo     = custos.filter(c => c.tipo === 'fixo').reduce((s, c) => s + Number(c.valor), 0)
  const totalVariavel = custos.filter(c => c.tipo === 'variavel').reduce((s, c) => s + Number(c.valor), 0)

  // ── render ───────────────────────────────────────────────────────────────────

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">

      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>Custos operacionais e rentabilidade</p>
        </div>
        <div className="flex gap-2">
          <button onClick={() => setModal({ type: 'add-fixo' })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
            + Fixo
          </button>
          <button onClick={() => setModal({ type: 'add-variavel' })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(64,196,255,0.1)', color: '#40C4FF', border: '1px solid rgba(64,196,255,0.2)' }}>
            + Variável
          </button>
        </div>
      </div>

      {/* Month selector */}
      <div className="flex items-center justify-center gap-4 mb-6">
        <button onClick={prevMes} aria-label="Mês anterior"
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="15 18 9 12 15 6"/></svg>
        </button>
        <div className="text-center min-w-44">
          <p className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>{MESES[month]}</p>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>{year}</p>
        </div>
        <button onClick={nextMes} aria-label="Próximo mês"
          className="w-9 h-9 rounded-xl flex items-center justify-center cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={e => e.currentTarget.style.borderColor = 'var(--border-focus)'}
          onMouseLeave={e => e.currentTarget.style.borderColor = 'var(--border-subtle)'}>
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><polyline points="9 18 15 12 9 6"/></svg>
        </button>
      </div>

      {loading && (
        <div className="flex items-center justify-center gap-2 py-8">
          <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none">
            <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
            <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
          </svg>
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Carregando...</span>
        </div>
      )}

      {!loading && (
        <>
          {/* ── 4 summary cards ── */}
          <div className="grid grid-cols-2 gap-3 mb-6">

            {/* Faturamento bruto */}
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl"
              style={{ background: 'var(--green-muted)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--green-primary)' }}>Faturamento bruto</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--green-primary)' }}>{fmtCurrency(faturamento)}</p>
              <p className="text-xs mt-1" style={{ color: 'var(--green-primary)', opacity: 0.7 }}>
                {alunos.length} aluno{alunos.length !== 1 ? 's' : ''} ativos
              </p>
            </div>

            {/* Total custos */}
            <div className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total de custos</p>
              <p className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(totalCustos)}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--green-primary)' }}>F: {fmtCurrency(totalFixo)}</span>
                <span className="text-xs" style={{ color: '#40C4FF' }}>V: {fmtCurrency(totalVariavel)}</span>
              </div>
            </div>

            {/* Lucro líquido */}
            <div className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: `1px solid ${lucro >= 0 ? 'var(--border-subtle)' : 'rgba(255,82,82,0.2)'}` }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Lucro líquido</p>
              <p className="text-2xl font-bold" style={{ color: lucro >= 0 ? 'var(--text-primary)' : '#FF5252' }}>
                {fmtCurrency(lucro)}
              </p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                {faturamento > 0 ? `${Math.abs(margem).toFixed(1)}% de margem` : '—'}
              </p>
            </div>

            {/* Margem de lucro */}
            <div className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Margem de lucro</p>
                <span className="text-sm font-bold" style={{ color: mColor }}>
                  {faturamento > 0 ? `${margem.toFixed(1)}%` : '—'}
                </span>
              </div>
              <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                <div className="h-2 rounded-full transition-all duration-500"
                  style={{ width: `${Math.min(100, Math.max(0, margem))}%`, background: mColor }} />
              </div>
              <div className="flex justify-between mt-1.5">
                <span className="text-[10px]" style={{ color: '#FF5252' }}>0%</span>
                <span className="text-[10px]" style={{ color: '#FFAB00' }}>30%</span>
                <span className="text-[10px]" style={{ color: '#00E676' }}>50%+</span>
              </div>
            </div>
          </div>

          {/* ── Category chart ── */}
          {catTotals.length > 0 && (
            <div className="p-5 rounded-2xl mb-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-sm font-semibold mb-4" style={{ color: 'var(--text-primary)' }}>
                Custo por categoria
              </p>
              <div className="flex flex-col gap-3">
                {catTotals.map(({ cat, total }) => {
                  const pct = totalCustos > 0 ? (total / totalCustos) * 100 : 0
                  const color = getCatColor(cat)
                  return (
                    <div key={cat}>
                      <div className="flex items-center justify-between mb-1">
                        <div className="flex items-center gap-2">
                          <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>{cat}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{pct.toFixed(1)}%</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                            {fmtCurrency(total)}
                          </span>
                        </div>
                      </div>
                      <div className="h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-input)' }}>
                        <div className="h-2 rounded-full transition-all duration-500"
                          style={{ width: `${pct}%`, background: color }} />
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {/* ── Filters + list ── */}
          <div className="flex flex-col gap-3">
            {/* Filter bar */}
            <div className="flex items-center gap-2 flex-wrap">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {([
                  { id: 'todos',    label: 'Todos' },
                  { id: 'fixo',     label: '🔁 Fixos' },
                  { id: 'variavel', label: '📌 Variáveis' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFilterTipo(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      background: filterTipo === f.id ? 'var(--green-primary)' : 'transparent',
                      color: filterTipo === f.id ? '#000' : 'var(--text-secondary)',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>

              {/* Category filter */}
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs cursor-pointer outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <option value="">Todas categorias</option>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>

              <span className="ml-auto text-xs" style={{ color: 'var(--text-muted)' }}>
                {listCustos.length} item{listCustos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Mobile add buttons */}
            <div className="sm:hidden flex gap-2">
              <button onClick={() => setModal({ type: 'add-fixo' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}>
                + Custo fixo
              </button>
              <button onClick={() => setModal({ type: 'add-variavel' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'rgba(64,196,255,0.1)', color: '#40C4FF', border: '1px solid rgba(64,196,255,0.2)' }}>
                + Custo variável
              </button>
            </div>

            {/* List */}
            {listCustos.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-14 rounded-2xl"
                style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum custo registrado</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Adicione custos fixos ou variáveis para calcular sua rentabilidade
                </p>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {listCustos.map(custo => {
                  const color = getCatColor(custo.categoria)
                  return (
                    <div key={custo.id}
                      className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                      {/* Color dot */}
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {custo.nome}
                          </p>
                          <span className="text-[10px] px-1.5 py-px rounded-full font-semibold shrink-0"
                            style={{
                              background: custo.tipo === 'fixo' ? 'var(--green-muted)' : 'rgba(64,196,255,0.1)',
                              color: custo.tipo === 'fixo' ? 'var(--green-primary)' : '#40C4FF',
                            }}>
                            {custo.tipo === 'fixo' ? 'Fixo' : 'Variável'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 mt-0.5">
                          <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{custo.categoria}</span>
                          {custo.data && (
                            <>
                              <span style={{ color: 'var(--border-subtle)' }}>·</span>
                              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtDate(custo.data)}</span>
                            </>
                          )}
                        </div>
                      </div>

                      {/* Value */}
                      <p className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {fmtCurrency(Number(custo.valor))}
                      </p>

                      {/* Actions */}
                      <div className="flex items-center gap-1 shrink-0">
                        <button onClick={() => setModal({ type: 'edit', custo })}
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'var(--bg-input)'; e.currentTarget.style.color = 'var(--text-primary)' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                          </svg>
                        </button>
                        <button onClick={() => handleDelete(custo.id)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,82,82,0.1)'; e.currentTarget.style.color = '#FF5252' }}
                          onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                            <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                          </svg>
                        </button>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </>
      )}

      {/* Modals */}
      {modal?.type === 'add-fixo' && (
        <CustoFormModal tipo="fixo" mes={mes} onClose={() => setModal(null)} onSaved={addCusto} />
      )}
      {modal?.type === 'add-variavel' && (
        <CustoFormModal tipo="variavel" mes={mes} onClose={() => setModal(null)} onSaved={addCusto} />
      )}
      {modal?.type === 'edit' && (
        <CustoFormModal custo={modal.custo} mes={mes} onClose={() => setModal(null)} onSaved={replaceCusto} />
      )}
    </div>
  )
}
