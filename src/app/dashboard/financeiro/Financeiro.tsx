'use client'

import { useState, useEffect, useRef } from 'react'
import { RefreshCw, Pin, Info } from 'lucide-react'
import {
  createCustoAction,
  updateCustoAction,
  deleteCustoAction,
  getCustosForMesAction,
  ensureFixosForMesAction,
  createReceitaExtraAction,
  getReceitasExtrasForMesAction,
  deleteReceitaExtraAction,
  getHistoricoFinanceiroAction,
  type CustoRow,
  type ReceitaExtraRow,
  type HistoricoMes,
} from './actions'

// ─── constants ────────────────────────────────────────────────────────────────

const CATEGORIAS_PADRAO = ['Academia', 'Transporte', 'Alimentação', 'Equipamentos', 'Outros']

const CAT_COLOR: Record<string, string> = {
  Academia:     '#10B981',
  Transporte:   '#38BDF8',
  Alimentação:  '#F59E0B',
  Equipamentos: '#CE93D8',
  Outros:       '#9E9E9E',
}

const MESES = [
  'Janeiro','Fevereiro','Março','Abril','Maio','Junho',
  'Julho','Agosto','Setembro','Outubro','Novembro','Dezembro',
]

const MESES_SHORT = ['Jan','Fev','Mar','Abr','Mai','Jun','Jul','Ago','Set','Out','Nov','Dez']

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
  receitasExtrasIniciais: ReceitaExtraRow[]
  historicoIniciais: HistoricoMes[]
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
  if (pct >= 50) return '#10B981'
  if (pct >= 30) return '#F59E0B'
  return '#EF4444'
}

/** Returns the last N months ending at (and including) endMes, oldest first. */
function useCountUp(target: number, duration = 700): number {
  const [display, setDisplay] = useState(0)
  const fromRef = useRef(0)

  useEffect(() => {
    const from  = fromRef.current
    const start = performance.now()
    let raf: number
    function step(now: number) {
      const t = Math.min(1, (now - start) / duration)
      const eased = 1 - Math.pow(1 - t, 3)
      setDisplay(from + (target - from) * eased)
      if (t < 1) {
        raf = requestAnimationFrame(step)
      } else {
        fromRef.current = target
      }
    }
    raf = requestAnimationFrame(step)
    return () => cancelAnimationFrame(raf)
  }, [target, duration])

  return display
}

function InfoTooltip({ children, label }: { children: React.ReactNode; label: string }) {
  const [open, setOpen] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!ref.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onDocClick)
    return () => document.removeEventListener('mousedown', onDocClick)
  }, [open])

  return (
    <div ref={ref} className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        onMouseEnter={() => setOpen(true)}
        aria-label={label}
        className="inline-flex items-center justify-center w-5 h-5 rounded-full cursor-pointer transition-colors"
        style={{ color: 'var(--text-muted)' }}
      >
        <Info size={14} strokeWidth={1.75} aria-hidden />
      </button>
      {open && (
        <div
          role="tooltip"
          className="absolute z-20 text-xs leading-relaxed rounded-xl p-3 shadow-xl"
          style={{
            top:    '120%',
            left:   '50%',
            transform: 'translateX(-50%)',
            width:  260,
            background: '#0F172A',
            border: '1px solid #374151',
            color:  '#E5E7EB',
          }}
        >
          {children}
        </div>
      )}
    </div>
  )
}

function getLastNMonths(endMes: string, n: number): string[] {
  const { year, month } = parseMes(endMes)
  const result: string[] = []
  for (let i = n - 1; i >= 0; i--) {
    let m = month - i
    let y = year
    while (m < 0) { m += 12; y-- }
    result.push(formatMes(y, m))
  }
  return result
}

// ─── HistoricoChart ───────────────────────────────────────────────────────────

function HistoricoChart({
  data,
  alunos,
}: {
  data: HistoricoMes[]
  alunos: AlunoFin[]
}) {
  if (data.length < 2) return null

  const points = data.map(d => {
    const { year, month } = parseMes(d.mes)
    const alunoReceita = calcFaturamento(alunos, year, month)
    return {
      mes:     d.mes,
      label:   MESES_SHORT[month],
      receita: alunoReceita + d.receitas_extras,
      custos:  d.custos,
    }
  })

  const W = 560, H = 180
  const padT = 16, padB = 28, padL = 10, padR = 10
  const cW = W - padL - padR
  const cH = H - padT - padB
  const n  = points.length

  const maxVal = Math.max(...points.flatMap(p => [p.receita, p.custos]), 1)
  const roundedMax = Math.ceil(maxVal / 1000) * 1000

  const xOf = (i: number) => padL + (i / (n - 1)) * cW
  const yOf = (v: number) => padT + cH - (v / roundedMax) * cH

  const linePath = (getter: (p: (typeof points)[0]) => number) =>
    points.map((p, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(getter(p)).toFixed(1)}`).join(' ')

  const areaPath = (getter: (p: (typeof points)[0]) => number) =>
    linePath(getter) +
    ` L ${xOf(n - 1).toFixed(1)} ${(padT + cH).toFixed(1)}` +
    ` L ${xOf(0).toFixed(1)} ${(padT + cH).toFixed(1)} Z`

  return (
    <svg
      width="100%"
      viewBox={`0 0 ${W} ${H}`}
      style={{ display: 'block', overflow: 'visible' }}
      aria-label="Histórico financeiro"
    >
      {/* Horizontal gridlines */}
      {[0.25, 0.5, 0.75, 1].map(frac => {
        const gy = yOf(roundedMax * frac)
        return (
          <line
            key={frac}
            x1={padL} y1={gy} x2={W - padR} y2={gy}
            stroke="var(--border-subtle)" strokeWidth="1" strokeDasharray="4 4"
          />
        )
      })}

      {/* Area fills */}
      <path d={areaPath(p => p.receita)} fill="rgba(16, 185, 129,0.07)" />
      <path d={areaPath(p => p.custos)}  fill="rgba(245, 158, 11,0.07)" />

      {/* Lines */}
      <path
        d={linePath(p => p.receita)}
        fill="none" stroke="#10B981" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
      />
      <path
        d={linePath(p => p.custos)}
        fill="none" stroke="#F59E0B" strokeWidth="2.5"
        strokeLinejoin="round" strokeLinecap="round"
      />

      {/* Dots + tooltips */}
      {points.map((p, i) => (
        <g key={p.mes}>
          <circle cx={xOf(i)} cy={yOf(p.receita)} r="4" fill="#10B981" stroke="var(--bg-card)" strokeWidth="2">
            <title>{`Receita ${p.label}: ${fmtCurrency(p.receita)}`}</title>
          </circle>
          <circle cx={xOf(i)} cy={yOf(p.custos)} r="4" fill="#F59E0B" stroke="var(--bg-card)" strokeWidth="2">
            <title>{`Custos ${p.label}: ${fmtCurrency(p.custos)}`}</title>
          </circle>
        </g>
      ))}

      {/* Month labels */}
      {points.map((p, i) => (
        <text
          key={p.mes + '-lbl'}
          x={xOf(i)} y={H - 6}
          textAnchor="middle"
          fontSize="11"
          fill="var(--text-muted)"
          fontFamily="inherit"
        >
          {p.label}
        </text>
      ))}
    </svg>
  )
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
  const [tipoCusto, setTipoCusto] = useState<'profissional'|'pessoal'>(custo?.tipo_custo ?? 'profissional')
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
      tipo_custo:    tipoCusto,
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
                    background: tipo === t ? (t === 'fixo' ? 'var(--green-muted)' : 'rgba(56, 189, 248,0.1)') : 'var(--bg-card)',
                    color: tipo === t ? (t === 'fixo' ? 'var(--green-primary)' : '#38BDF8') : 'var(--text-secondary)',
                    border: `1px solid ${tipo === t ? (t === 'fixo' ? 'rgba(16, 185, 129,0.25)' : 'rgba(56, 189, 248,0.25)') : 'var(--border-subtle)'}`,
                  }}>
                  <span className="inline-flex items-center gap-1.5">
                    {t === 'fixo' ? <RefreshCw size={11} strokeWidth={1.75} aria-hidden /> : <Pin size={11} strokeWidth={1.75} aria-hidden />}
                    {t === 'fixo' ? 'Fixo' : 'Variável'}
                  </span>
                </button>
              ))}
            </div>
          )}

          {/* Tipo do custo: profissional vs pessoal */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Categoria do gasto
            </label>
            <div className="grid grid-cols-2 gap-2">
              {(['profissional', 'pessoal'] as const).map(tc => (
                <button key={tc} type="button" onClick={() => setTipoCusto(tc)}
                  className="py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{
                    background: tipoCusto === tc
                      ? (tc === 'profissional' ? 'var(--green-muted)' : 'rgba(139, 92, 246, 0.12)')
                      : 'var(--bg-card)',
                    color: tipoCusto === tc
                      ? (tc === 'profissional' ? 'var(--green-primary)' : '#8B5CF6')
                      : 'var(--text-secondary)',
                    border: `1px solid ${tipoCusto === tc
                      ? (tc === 'profissional' ? 'rgba(16, 185, 129, 0.25)' : 'rgba(139, 92, 246, 0.25)')
                      : 'var(--border-subtle)'}`,
                  }}>
                  {tc === 'profissional' ? 'Profissional' : 'Pessoal'}
                </button>
              ))}
            </div>
            <p className="text-[10px] mt-1.5" style={{ color: 'var(--text-muted)' }}>
              {tipoCusto === 'profissional'
                ? 'Custos do trabalho. Entram no cálculo do lucro líquido profissional.'
                : 'Gastos pessoais. Não afetam o lucro profissional, apenas o lucro total.'}
            </p>
          </div>

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
            <p className="text-xs px-3 py-2.5 rounded-xl inline-flex items-center gap-2" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
              <RefreshCw size={12} strokeWidth={1.75} aria-hidden /> Este custo será replicado automaticamente para os próximos meses.
            </p>
          )}

          {err && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{err}</p>}

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

// ─── ReceitaExtraFormModal ────────────────────────────────────────────────────

function ReceitaExtraFormModal({
  mes,
  onClose,
  onSaved,
}: {
  mes: string
  onClose: () => void
  onSaved: (row: ReceitaExtraRow) => void
}) {
  const [descricao, setDescricao] = useState('')
  const [valor,     setValor]     = useState('')
  const [data,      setData]      = useState('')
  const [saving,    setSaving]    = useState(false)
  const [err,       setErr]       = useState('')

  async function save() {
    if (!descricao.trim())                                   { setErr('Informe uma descrição.');   return }
    if (!valor || isNaN(Number(valor)) || Number(valor) <= 0){ setErr('Informe um valor válido.'); return }

    setSaving(true); setErr('')

    const res = await createReceitaExtraAction({
      descricao:      descricao.trim(),
      valor:          Number(valor),
      data:           data || null,
      mes_referencia: data ? data.slice(0, 7) : mes,
    })

    setSaving(false)
    if (res.error) { setErr(res.error); return }
    onSaved(res.data!)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3 sm:p-6"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Nova receita extra</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Outras fontes de renda</p>
          </div>
          <button onClick={onClose} className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)', background: 'var(--bg-input)' }}>
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/>
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-4">
          {/* Descrição */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Descrição</label>
            <input
              value={descricao} onChange={e => setDescricao(e.target.value)}
              placeholder="Ex: Consultoria, Venda de plano, Patrocínio..."
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
          </div>

          {/* Valor */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>Valor (R$)</label>
            <input
              type="number" min="0" step="0.01"
              value={valor} onChange={e => setValor(e.target.value)}
              placeholder="0,00"
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
          </div>

          {/* Data (opcional) */}
          <div>
            <label className="text-xs font-medium mb-1.5 block" style={{ color: 'var(--text-muted)' }}>
              Data <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span>
            </label>
            <input
              type="date" value={data} onChange={e => setData(e.target.value)}
              className="w-full px-4 py-2.5 rounded-xl text-sm outline-none cursor-pointer"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              onFocus={e => e.target.style.borderColor = 'var(--border-focus)'}
              onBlur={e => e.target.style.borderColor = 'var(--border-subtle)'} />
          </div>

          {err && <p className="text-xs text-center" style={{ color: '#EF4444' }}>{err}</p>}

          <button onClick={save} disabled={saving}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(16, 185, 129,0.15)', color: '#10B981', border: '1px solid rgba(16, 185, 129,0.25)' }}>
            {saving ? 'Salvando...' : 'Adicionar receita'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── main component ────────────────────────────────────────────────────────────

export function Financeiro({ alunos, custosIniciais, receitasExtrasIniciais, historicoIniciais, mesInicial }: Props) {
  const [mes,                  setMes]                  = useState(mesInicial)
  const [custos,               setCustos]               = useState<CustoRow[]>(custosIniciais)
  const [receitasExtras,       setReceitasExtras]       = useState<ReceitaExtraRow[]>(receitasExtrasIniciais)
  const [historico,            setHistorico]            = useState<HistoricoMes[]>(historicoIniciais)
  const [loading,              setLoading]              = useState(false)
  const [modal,                setModal]                = useState<
    | { type: 'add-fixo' }
    | { type: 'add-variavel' }
    | { type: 'edit'; custo: CustoRow }
    | null
  >(null)
  const [showReceitaModal,     setShowReceitaModal]     = useState(false)
  const [deleteConfirm,        setDeleteConfirm]        = useState<CustoRow | null>(null)
  const [deleteReceitaConfirm, setDeleteReceitaConfirm] = useState<ReceitaExtraRow | null>(null)
  const [deleting,             setDeleting]             = useState(false)
  const [filterTipo,           setFilterTipo]           = useState<'todos'|'fixo'|'variavel'>('todos')
  const [filterTipoCusto,      setFilterTipoCusto]      = useState<'todos'|'profissional'|'pessoal'>('todos')
  const [filterCat,            setFilterCat]            = useState<string>('')
  const isFirstMount                                    = useRef(true)

  const { year, month } = parseMes(mes)

  // Fetch + seed when month changes
  useEffect(() => {
    if (isFirstMount.current) { isFirstMount.current = false; return }
    setLoading(true)
    ;(async () => {
      const mesesHistorico = getLastNMonths(mes, 6)
      const [, custosRes, receitasRes, historicoRes] = await Promise.all([
        ensureFixosForMesAction(mes),
        getCustosForMesAction(mes),
        getReceitasExtrasForMesAction(mes),
        getHistoricoFinanceiroAction(mesesHistorico),
      ])
      setCustos(custosRes.data ?? [])
      setReceitasExtras(receitasRes.data ?? [])
      if (historicoRes.data) setHistorico(historicoRes.data)
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

  function requestDelete(custo: CustoRow) {
    setDeleteConfirm(custo)
  }

  async function executeDelete() {
    if (!deleteConfirm) return
    setDeleting(true)
    const id = deleteConfirm.id
    setDeleteConfirm(null)
    await deleteCustoAction(id)
    setCustos(prev => prev.filter(c => c.id !== id))
    setDeleting(false)
  }

  function addReceitaExtra(row: ReceitaExtraRow) {
    if (row.mes_referencia === mes) setReceitasExtras(prev => [row, ...prev])
    setShowReceitaModal(false)
  }

  async function executeDeleteReceita() {
    if (!deleteReceitaConfirm) return
    setDeleting(true)
    const id = deleteReceitaConfirm.id
    setDeleteReceitaConfirm(null)
    await deleteReceitaExtraAction(id)
    setReceitasExtras(prev => prev.filter(r => r.id !== id))
    setDeleting(false)
  }

  // ── computed ─────────────────────────────────────────────────────────────────

  const faturamentoAlunos   = calcFaturamento(alunos, year, month)
  const faturamentoExtras   = receitasExtras.reduce((s, r) => s + Number(r.valor), 0)
  const faturamento         = faturamentoAlunos + faturamentoExtras
  const totalCustos         = custos.reduce((s, c) => s + Number(c.valor), 0)
  // Custos por categoria (profissional / pessoal)
  const totalCustosProf     = custos
    .filter(c => (c.tipo_custo ?? 'profissional') === 'profissional')
    .reduce((s, c) => s + Number(c.valor), 0)
  const totalCustosPess     = totalCustos - totalCustosProf
  const lucroProf           = faturamento - totalCustosProf
  const lucro               = faturamento - totalCustos
  const margem              = faturamento > 0 ? (lucroProf / faturamento) * 100 : 0
  const mColor              = marginColor(margem)

  // Category totals
  const allCats = Array.from(new Set(custos.map(c => c.categoria)))
  const catTotals = allCats
    .map(cat => ({ cat, total: custos.filter(c => c.categoria === cat).reduce((s, c) => s + Number(c.valor), 0) }))
    .sort((a, b) => b.total - a.total)

  // Filtered list
  const listCustos = custos.filter(c => {
    if (filterTipo !== 'todos' && c.tipo !== filterTipo) return false
    const tc = c.tipo_custo ?? 'profissional'
    if (filterTipoCusto !== 'todos' && tc !== filterTipoCusto) return false
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
          <button onClick={() => setShowReceitaModal(true)}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(16, 185, 129,0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129,0.2)' }}>
            + Receita extra
          </button>
          <button onClick={() => setModal({ type: 'add-fixo' })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
            + Fixo
          </button>
          <button onClick={() => setModal({ type: 'add-variavel' })}
            className="hidden sm:flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold cursor-pointer"
            style={{ background: 'rgba(56, 189, 248,0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248,0.2)' }}>
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

            {/* Faturamento total */}
            <div className="col-span-2 sm:col-span-1 p-4 rounded-2xl"
              style={{ background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--green-primary)' }}>Faturamento total</p>
              <p className="text-lg font-bold leading-tight whitespace-nowrap overflow-hidden" style={{ color: 'var(--green-primary)' }}>
                {fmtCurrency(faturamento)}
              </p>
              <div className="flex flex-wrap gap-2 mt-1">
                <span className="text-xs" style={{ color: 'var(--green-primary)', opacity: 0.8 }}>
                  Alunos: {fmtCurrency(faturamentoAlunos)}
                </span>
                {faturamentoExtras > 0 && (
                  <span className="text-xs" style={{ color: 'var(--green-primary)', opacity: 0.8 }}>
                    Extra: {fmtCurrency(faturamentoExtras)}
                  </span>
                )}
              </div>
            </div>

            {/* Total custos */}
            <div className="p-4 rounded-2xl"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-medium mb-1" style={{ color: 'var(--text-muted)' }}>Total de custos</p>
              <p className="text-xl font-bold whitespace-nowrap overflow-hidden" style={{ color: 'var(--text-primary)' }}>{fmtCurrency(totalCustos)}</p>
              <div className="flex gap-2 mt-1 flex-wrap">
                <span className="text-xs" style={{ color: 'var(--green-primary)' }}>Prof: {fmtCurrency(totalCustosProf)}</span>
                {totalCustosPess > 0 && (
                  <span className="text-xs" style={{ color: '#8B5CF6' }}>Pess: {fmtCurrency(totalCustosPess)}</span>
                )}
              </div>
            </div>

            {/* Lucros Líquidos — Trabalho + No bolso */}
            <LucrosLiquidosCard lucroProf={lucroProf} lucroTotal={lucro} />


            {/* Margem de lucro */}
            <div className="col-span-2 p-4 rounded-2xl"
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
                <span className="text-[10px]" style={{ color: '#EF4444' }}>0%</span>
                <span className="text-[10px]" style={{ color: '#F59E0B' }}>30%</span>
                <span className="text-[10px]" style={{ color: '#10B981' }}>50%+</span>
              </div>
            </div>
          </div>

          {/* ── Histórico chart ── */}
          {historico.length >= 2 && (
            <div className="p-5 rounded-2xl mb-6"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-4">
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
                  Histórico financeiro
                </p>
                <div className="flex items-center gap-4">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#10B981' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Receita</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    <span className="w-2.5 h-2.5 rounded-full" style={{ background: '#F59E0B' }} />
                    <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Custos</span>
                  </div>
                </div>
              </div>
              <HistoricoChart data={historico} alunos={alunos} />
            </div>
          )}

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

          {/* ── Filters + costs list ── */}
          <div className="flex flex-col gap-3">
            {/* Tipo tabs — centered */}
            <div className="flex justify-center flex-wrap gap-2">
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {([
                  { id: 'todos',    label: 'Todos' },
                  { id: 'fixo',     label: 'Fixos' },
                  { id: 'variavel', label: 'Variáveis' },
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
              {/* Profissional / Pessoal */}
              <div className="flex gap-1 p-1 rounded-xl" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                {([
                  { id: 'todos',        label: 'Todos' },
                  { id: 'profissional', label: 'Profissional' },
                  { id: 'pessoal',      label: 'Pessoal' },
                ] as const).map(f => (
                  <button key={f.id} onClick={() => setFilterTipoCusto(f.id)}
                    className="px-3 py-1.5 rounded-lg text-xs font-semibold cursor-pointer transition-colors"
                    style={{
                      background: filterTipoCusto === f.id
                        ? (f.id === 'pessoal' ? '#8B5CF6' : 'var(--green-primary)')
                        : 'transparent',
                      color: filterTipoCusto === f.id ? '#fff' : 'var(--text-secondary)',
                    }}>
                    {f.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Mobile add buttons */}
            <div className="sm:hidden flex gap-2 flex-wrap">
              <button onClick={() => setShowReceitaModal(true)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'rgba(16, 185, 129,0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                + Receita extra
              </button>
              <button onClick={() => setModal({ type: 'add-fixo' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                + Custo fixo
              </button>
              <button onClick={() => setModal({ type: 'add-variavel' })}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'rgba(56, 189, 248,0.1)', color: '#38BDF8', border: '1px solid rgba(56, 189, 248,0.2)' }}>
                + Custo variável
              </button>
            </div>

            {/* Category filter + count — centralized below add buttons */}
            <div className="flex items-center justify-center gap-2 flex-wrap">
              <select value={filterCat} onChange={e => setFilterCat(e.target.value)}
                className="px-3 py-2 rounded-xl text-xs cursor-pointer outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}>
                <option value="">Todas categorias</option>
                {allCats.map(c => <option key={c} value={c}>{c}</option>)}
              </select>
              <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {listCustos.length} item{listCustos.length !== 1 ? 's' : ''}
              </span>
            </div>

            {/* Costs list */}
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
                      <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: color }} />
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
                            {custo.nome}
                          </p>
                          <span className="text-[10px] px-1.5 py-px rounded-full font-semibold shrink-0"
                            style={{
                              background: custo.tipo === 'fixo' ? 'var(--green-muted)' : 'rgba(56, 189, 248,0.1)',
                              color: custo.tipo === 'fixo' ? 'var(--green-primary)' : '#38BDF8',
                            }}>
                            {custo.tipo === 'fixo' ? 'Fixo' : 'Variável'}
                          </span>
                          {(custo.tipo_custo ?? 'profissional') === 'pessoal' && (
                            <span className="text-[10px] px-1.5 py-px rounded-full font-semibold shrink-0"
                              style={{ background: 'rgba(139, 92, 246, 0.12)', color: '#8B5CF6' }}>
                              Pessoal
                            </span>
                          )}
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
                      <p className="text-sm font-bold shrink-0" style={{ color: 'var(--text-primary)' }}>
                        {fmtCurrency(Number(custo.valor))}
                      </p>
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
                        <button onClick={() => requestDelete(custo)}
                          className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors"
                          style={{ color: 'var(--text-muted)' }}
                          onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68,0.1)'; e.currentTarget.style.color = '#EF4444' }}
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

          {/* ── Receitas extras section ── */}
          <div className="mt-6">
            <div className="flex items-center justify-between mb-3">
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Receitas extras</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Outras fontes de renda neste mês</p>
              </div>
              {faturamentoExtras > 0 && (
                <span className="text-sm font-bold" style={{ color: '#10B981' }}>{fmtCurrency(faturamentoExtras)}</span>
              )}
            </div>

            {receitasExtras.length === 0 ? (
              <div className="flex flex-col items-center justify-center py-10 rounded-2xl"
                style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhuma receita extra</p>
                <p className="text-xs mt-1 mb-3" style={{ color: 'var(--text-secondary)' }}>
                  Registre outras fontes de renda como consultoria, patrocínios, etc.
                </p>
                <button
                  onClick={() => setShowReceitaModal(true)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold cursor-pointer"
                  style={{ background: 'rgba(16, 185, 129,0.12)', color: '#10B981', border: '1px solid rgba(16, 185, 129,0.2)' }}>
                  + Adicionar receita extra
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {receitasExtras.map(r => (
                  <div key={r.id}
                    className="flex items-center gap-3 px-4 py-3 rounded-2xl"
                    style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                    <div className="w-2.5 h-2.5 rounded-full shrink-0" style={{ background: '#10B981' }} />
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{r.descricao}</p>
                      {r.data && (
                        <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{fmtDate(r.data)}</p>
                      )}
                    </div>
                    <p className="text-sm font-bold shrink-0" style={{ color: '#10B981' }}>
                      + {fmtCurrency(Number(r.valor))}
                    </p>
                    <button
                      onClick={() => setDeleteReceitaConfirm(r)}
                      className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer transition-colors shrink-0"
                      style={{ color: 'var(--text-muted)' }}
                      onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68,0.1)'; e.currentTarget.style.color = '#EF4444' }}
                      onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'var(--text-muted)' }}>
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                        <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </>
      )}

      {/* ── Modals ── */}

      {modal?.type === 'add-fixo' && (
        <CustoFormModal tipo="fixo" mes={mes} onClose={() => setModal(null)} onSaved={addCusto} />
      )}
      {modal?.type === 'add-variavel' && (
        <CustoFormModal tipo="variavel" mes={mes} onClose={() => setModal(null)} onSaved={addCusto} />
      )}
      {modal?.type === 'edit' && (
        <CustoFormModal custo={modal.custo} mes={mes} onClose={() => setModal(null)} onSaved={replaceCusto} />
      )}
      {showReceitaModal && (
        <ReceitaExtraFormModal mes={mes} onClose={() => setShowReceitaModal(false)} onSaved={addReceitaExtra} />
      )}

      {/* Delete custo confirmation */}
      {deleteConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDeleteConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                {deleteConfirm.tipo === 'fixo' ? 'Excluir custo fixo?' : 'Excluir custo?'}
              </p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{deleteConfirm.nome}</p>
            </div>
            {deleteConfirm.tipo === 'fixo' && (
              <div className="mx-5 mb-4 px-4 py-3 rounded-xl"
                style={{ background: 'rgba(239, 68, 68,0.08)', border: '1px solid rgba(239, 68, 68,0.2)' }}>
                <p className="text-sm" style={{ color: '#EF4444' }}>Este é um custo fixo recorrente. Ao excluir:</p>
                <ul className="mt-1.5 space-y-0.5">
                  <li className="text-xs flex gap-1.5" style={{ color: '#FF8A80' }}>
                    <span>✗</span><span>Não aparecerá mais em nenhum mês futuro</span>
                  </li>
                  <li className="text-xs flex gap-1.5" style={{ color: 'var(--text-muted)' }}>
                    <span>✓</span><span>Meses anteriores mantêm o registro histórico</span>
                  </li>
                </ul>
              </div>
            )}
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setDeleteConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button onClick={executeDelete} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'rgba(239, 68, 68,0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.3)' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete receita extra confirmation */}
      {deleteReceitaConfirm && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setDeleteReceitaConfirm(null)}>
          <div className="w-full max-w-sm rounded-2xl overflow-hidden"
            style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
            onClick={e => e.stopPropagation()}>
            <div className="px-5 pt-5 pb-4">
              <p className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>Excluir receita extra?</p>
              <p className="text-sm font-semibold" style={{ color: 'var(--text-secondary)' }}>{deleteReceitaConfirm.descricao}</p>
              <p className="text-sm mt-1" style={{ color: '#10B981' }}>{fmtCurrency(Number(deleteReceitaConfirm.valor))}</p>
            </div>
            <div className="flex gap-2 px-5 pb-5">
              <button onClick={() => setDeleteReceitaConfirm(null)}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button onClick={executeDeleteReceita} disabled={deleting}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
                style={{ background: 'rgba(239, 68, 68,0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.3)' }}>
                {deleting ? 'Excluindo...' : 'Excluir'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

// ─── Lucros Líquidos Card ─────────────────────────────────────────────────────

function LucrosLiquidosCard({ lucroProf, lucroTotal }: { lucroProf: number; lucroTotal: number }) {
  const animProf  = useCountUp(lucroProf)
  const animTotal = useCountUp(lucroTotal)

  const profColor  = lucroProf  >= 0 ? '#10B981' : '#EF4444'
  const totalColor = lucroTotal >= 0 ? '#34D399' : '#EF4444'

  return (
    <div
      className="col-span-2 rounded-2xl p-5 md:p-6"
      style={{ background: '#111827', border: '1px solid #374151' }}
    >
      {/* Header */}
      <div className="flex items-center gap-2 mb-4">
        <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          Lucros Líquidos
        </p>
        <InfoTooltip label="Sobre os lucros líquidos">
          <div className="flex flex-col gap-2">
            <div>
              <span style={{ color: '#10B981', fontWeight: 600 }}>• Trabalho:</span>{' '}
              o que seu trabalho como personal gerou de lucro (faturamento menos custos profissionais).
            </div>
            <div>
              <span style={{ color: '#34D399', fontWeight: 600 }}>• No bolso:</span>{' '}
              quanto efetivamente sobra para você depois de pagar todas as contas (incluindo custos pessoais).
            </div>
          </div>
        </InfoTooltip>
      </div>

      {/* Body — duas colunas com divisor */}
      <div className="flex flex-col min-[420px]:flex-row items-stretch gap-4 min-[420px]:gap-0">
        {/* Trabalho */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 min-[420px]:pr-6">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
            Trabalho
          </p>
          <p className="text-2xl md:text-3xl font-bold leading-tight whitespace-nowrap overflow-hidden tabular-nums"
            style={{ color: profColor }}>
            {fmtCurrency(animProf)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Lucro do seu trabalho
          </p>
        </div>

        {/* Divisor — vertical em ≥420px, horizontal em telas muito pequenas */}
        <div className="hidden min-[420px]:block w-px self-stretch" style={{ background: '#374151' }} />
        <div className="block min-[420px]:hidden h-px w-full" style={{ background: '#374151' }} />

        {/* No bolso */}
        <div className="flex-1 flex flex-col gap-1 min-w-0 min-[420px]:pl-6">
          <p className="text-xs font-medium uppercase tracking-wide" style={{ color: '#9CA3AF' }}>
            No bolso
          </p>
          <p className="text-2xl md:text-3xl font-bold leading-tight whitespace-nowrap overflow-hidden tabular-nums"
            style={{ color: totalColor }}>
            {fmtCurrency(animTotal)}
          </p>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
            Quanto sobra para você
          </p>
        </div>
      </div>
    </div>
  )
}
