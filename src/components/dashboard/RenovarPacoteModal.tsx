'use client'

import { useState, useTransition } from 'react'
import { formatCurrency, formatDate, addDays, DIAS_SEMANA, DIAS_LABEL } from '@/types/aluno'
import { renovarPacoteAction, type PacoteComAluno } from '@/app/dashboard/pacotes/actions'
import { upsertCobrancaAction } from '@/app/dashboard/cobranca/actions'

export interface AlunoForRenovar {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
  forma_pagamento: string
}

export interface PrefsForRenovar {
  chave_pix: string | null
  favorecido_pix: string | null
  link_cartao: string | null
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function buildPaymentBlock(forma: string, prefs: PrefsForRenovar | null): string {
  if (!prefs) return '⚙️ Configure as preferências de cobrança'
  if (forma === 'pix') {
    if (!prefs.chave_pix) return '⚙️ Configure sua chave Pix em Preferências'
    let block = `💳 *Pix:* ${prefs.chave_pix}`
    if (prefs.favorecido_pix) block += `\n👤 Favorecido: ${prefs.favorecido_pix}`
    return block
  }
  if (!prefs.link_cartao) return '⚙️ Configure o link de pagamento em Preferências'
  return `💳 *Cartão:* ${prefs.link_cartao}`
}

function formatHorariosFixo(horarios: { dia: string; horario: string }[]): string {
  if (horarios.length === 0) return ''
  const byHora = new Map<string, string[]>()
  for (const h of horarios) {
    const arr = byHora.get(h.horario) ?? []
    arr.push(DIAS_SEMANA.find(s => s.key === h.dia)?.label ?? h.dia)
    byHora.set(h.horario, arr)
  }
  return [...byHora.entries()].map(([hora, dias]) => `${dias.join('/')} ${hora}`).join(', ')
}

export function buildPacoteMessage(
  aluno: AlunoForRenovar,
  pacote: PacoteComAluno,
  prefs: PrefsForRenovar | null,
): string {
  const horariosTrecho =
    pacote.tipo_pacote === 'fixo' && aluno.horarios.length > 0
      ? ` (${formatHorariosFixo(aluno.horarios)})`
      : ''
  const tipoLabel = pacote.tipo_pacote === 'fixo' ? 'Fixo' : 'Alternado'
  const inicioFmt = formatDate(pacote.data_inicio).slice(0, 5)
  const vencFmt   = formatDate(pacote.data_vencimento)

  return `Olá, ${aluno.nome.split(' ')[0]}! 👋

Segue sua cobrança referente ao seu Pacote de Aulas:

📦 Pacote ${tipoLabel}: ${pacote.quantidade_total} aulas${horariosTrecho}
📅 Validade: ${inicioFmt} até ${vencFmt}
💰 Valor: *${formatCurrency(pacote.valor)}*

${buildPaymentBlock(aluno.forma_pagamento, prefs)}`
}

// ─── component ────────────────────────────────────────────────────────────────

export function RenovarPacoteModal({
  aluno,
  pacote,
  mesRef,
  preferencias,
  onClose,
  onSuccess,
}: {
  aluno: AlunoForRenovar
  pacote: PacoteComAluno
  mesRef: string
  preferencias: PrefsForRenovar | null
  onClose: () => void
  onSuccess: () => void
}) {
  const [pending, startTransition] = useTransition()
  const sugInicio = addDays(pacote.data_vencimento, 1)
  const today     = new Date().toISOString().split('T')[0]
  const inicioInicial = sugInicio < today ? today : sugInicio

  const [tipo,       setTipo]       = useState<'fixo' | 'alternado'>(pacote.tipo_pacote ?? 'alternado')
  const [qtd,        setQtd]        = useState(String(pacote.quantidade_total))
  const [valor,      setValor]      = useState(String(pacote.valor))
  const [validade,   setValidade]   = useState(String(pacote.validade_dias))
  const [inicio,     setInicio]     = useState(inicioInicial)
  const [transferir, setTransferir] = useState(false)
  const [horarios,   setHorarios]   = useState<{ dia: string; horario: string }[]>(
    pacote.tipo_pacote === 'fixo' ? [...aluno.horarios] : []
  )
  const [err, setErr] = useState('')

  const saldo = Math.max(0, pacote.quantidade_total - pacote.quantidade_usada)
  const vencimento = addDays(inicio, parseInt(validade) || 30)

  function toggleDia(dia: string) {
    setHorarios(prev => {
      const exists = prev.find(h => h.dia === dia)
      if (exists) return prev.filter(h => h.dia !== dia)
      return [...prev, { dia, horario: '08:00' }]
    })
  }

  function setHora(dia: string, horario: string) {
    setHorarios(prev => prev.map(h => h.dia === dia ? { ...h, horario } : h))
  }

  function handleSave() {
    startTransition(async () => {
      setErr('')
      const cobrancaDate = inicio < mesRef + '-01'
        ? `${mesRef}-01`
        : (inicio.startsWith(mesRef) ? inicio : `${mesRef}-01`)

      const res = await renovarPacoteAction({
        pacoteAnteriorId: pacote.id,
        quantidade_total: parseInt(qtd) || 0,
        valor:            parseFloat(valor) || 0,
        validade_dias:    parseInt(validade) || 30,
        data_inicio:      inicio,
        data_cobranca:    cobrancaDate,
        transferir_saldo: transferir,
      })
      if (res.error) { setErr(res.error); return }

      const novoPacote: PacoteComAluno = {
        ...pacote,
        quantidade_total: parseInt(qtd) || 0,
        valor:            parseFloat(valor) || 0,
        validade_dias:    parseInt(validade) || 30,
        data_inicio:      inicio,
        data_vencimento:  vencimento,
        data_cobranca:    cobrancaDate,
        tipo_pacote:      tipo,
        quantidade_usada: 0,
        status:           'ativo',
      }
      const alunoComHorarios: AlunoForRenovar =
        tipo === 'fixo' ? { ...aluno, horarios } : aluno
      const mensagem = buildPacoteMessage(alunoComHorarios, novoPacote, preferencias)

      await upsertCobrancaAction({
        aluno_id:       aluno.id,
        mes_referencia: mesRef,
        valor:          parseFloat(valor) || 0,
        status:         'pendente',
        mensagem,
      })

      onSuccess()
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.65)' }} onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden max-h-[92vh] overflow-y-auto"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}>

        <div className="flex items-center justify-between px-5 py-4 sticky top-0 z-10"
          style={{ borderBottom: '1px solid var(--border-subtle)', background: 'var(--bg-surface)' }}>
          <div>
            <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>Renovar pacote</h3>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{aluno.nome}</p>
          </div>
          <button onClick={onClose} className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)' }}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        <div className="p-5 flex flex-col gap-3">
          {/* Tipo de pacote */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo de pacote</label>
            <div className="flex gap-2">
              {(['fixo', 'alternado'] as const).map(t => (
                <button key={t} onClick={() => setTipo(t)}
                  className="flex-1 py-2 rounded-lg text-sm font-semibold cursor-pointer"
                  style={{
                    background: tipo === t ? 'var(--green-primary)' : 'var(--bg-input)',
                    color:      tipo === t ? '#000' : 'var(--text-secondary)',
                    border:     '1px solid var(--border-subtle)',
                  }}>
                  {t === 'fixo' ? 'Fixo' : 'Alternado'}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <LabeledInput label="Quantidade de aulas" type="number" value={qtd} onChange={setQtd} />
            <LabeledInput label="Validade (dias)"     type="number" value={validade} onChange={setValidade} />
          </div>
          <LabeledInput label="Valor (R$)" type="number" step="0.01" value={valor} onChange={setValor} />
          <LabeledInput label="Data de início" type="date" value={inicio} onChange={setInicio} />

          {tipo === 'fixo' && (
            <div className="flex flex-col gap-2">
              <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Dias e horários</label>
              <div className="flex flex-wrap gap-1.5">
                {DIAS_SEMANA.map(d => {
                  const hor = horarios.find(h => h.dia === d.key)
                  const active = !!hor
                  return (
                    <button key={d.key} onClick={() => toggleDia(d.key)}
                      className="px-2.5 py-1.5 rounded-lg text-xs font-semibold cursor-pointer"
                      style={{
                        background: active ? 'var(--green-muted)' : 'var(--bg-input)',
                        color:      active ? 'var(--green-primary)' : 'var(--text-secondary)',
                        border:     `1px solid ${active ? 'rgba(16,185,129,0.3)' : 'var(--border-subtle)'}`,
                      }}
                      title={DIAS_LABEL[d.key]}>
                      {d.label}
                    </button>
                  )
                })}
              </div>
              {horarios.length > 0 && (
                <div className="flex flex-col gap-1.5 mt-1">
                  {horarios.map(h => (
                    <div key={h.dia} className="flex items-center gap-2">
                      <span className="text-xs w-12" style={{ color: 'var(--text-secondary)' }}>
                        {DIAS_SEMANA.find(s => s.key === h.dia)?.label}
                      </span>
                      <input type="time" value={h.horario} onChange={e => setHora(h.dia, e.target.value)}
                        className="flex-1 h-9 rounded-lg px-2 text-sm outline-none"
                        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {saldo > 0 && (
            <label className="flex items-center gap-2 cursor-pointer py-2 rounded-lg">
              <input type="checkbox" checked={transferir} onChange={e => setTransferir(e.target.checked)}
                className="cursor-pointer"
                style={{ accentColor: 'var(--green-primary)' }} />
              <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Transferir {saldo} aula{saldo === 1 ? '' : 's'} restante{saldo === 1 ? '' : 's'} do pacote anterior
              </span>
            </label>
          )}

          <div className="px-3 py-2 rounded-lg text-xs" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
            Novo pacote vence em <strong>{formatDate(vencimento)}</strong>
          </div>

          {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}

          <div className="flex gap-2 mt-2">
            <button onClick={onClose} disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
              Cancelar
            </button>
            <button onClick={handleSave} disabled={pending}
              className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{ background: 'var(--green-primary)', color: '#000' }}>
              {pending ? 'Renovando…' : 'Confirmar renovação'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}

function LabeledInput({
  label, type = 'text', value, onChange, step,
}: {
  label: string; type?: string; value: string; onChange: (v: string) => void; step?: string
}) {
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>{label}</label>
      <input type={type} step={step} value={value} onChange={e => onChange(e.target.value)}
        className="w-full h-11 rounded-xl px-3 text-sm outline-none"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }} />
    </div>
  )
}
