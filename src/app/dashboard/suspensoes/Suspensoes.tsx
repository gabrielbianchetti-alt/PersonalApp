'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import {
  criarSuspensaoAction,
  reativarAlunoAction,
  checkConflitosAction,
} from './actions'
import type { SuspensaoRow, SuspensaoTipo, AcaoHorario, Conflitante } from './types'
import { DIAS_LABEL } from '@/types/aluno'

// ─── helpers ──────────────────────────────────────────────────────────────────

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

function fmtDate(iso: string | null): string {
  if (!iso) return '—'
  const [y, m, d] = iso.split('-')
  return `${d}/${m}/${y}`
}

function diasLabel(dias: string[]): string {
  return dias.map(d => DIAS_LABEL[d] ?? d).join(', ')
}

function tipoLabel(tipo: SuspensaoTipo): { label: string; color: string; bg: string; icon: string } {
  return tipo === 'suspensao'
    ? { label: 'Suspensão', color: '#FFAB00', bg: 'rgba(255,171,0,0.12)', icon: '⏸' }
    : { label: 'Atestado',  color: '#40C4FF', bg: 'rgba(64,196,255,0.12)', icon: '🩺' }
}

function acaoLabel(acao: AcaoHorario): { label: string; desc: string; color: string } {
  switch (acao) {
    case 'disponivel': return { label: 'Disponível',         desc: 'Horário liberado na agenda',          color: '#00E676' }
    case 'bloqueado':  return { label: 'Bloqueado',          desc: 'Horário bloqueado durante a pausa',   color: '#FF5252' }
    case 'reposicoes': return { label: 'Para reposições',    desc: 'Horário reservado para reposições',   color: '#CE93D8' }
  }
}

function duracao(inicio: string, fim?: string | null): string {
  const start = new Date(inicio + 'T12:00:00')
  const end   = fim ? new Date(fim + 'T12:00:00') : new Date()
  const dias  = Math.ceil((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24))
  return dias === 1 ? '1 dia' : `${dias} dias`
}

// ─── NovaSuspensaoModal ───────────────────────────────────────────────────────

function NovaSuspensaoModal({
  alunos,
  onClose,
  onSaved,
}: {
  alunos: { id: string; nome: string; horarios: { dia: string; horario: string }[] }[]
  onClose: () => void
  onSaved: (s: SuspensaoRow) => void
}) {
  const [alunoId,      setAlunoId]      = useState(alunos[0]?.id ?? '')
  const [tipo,         setTipo]         = useState<SuspensaoTipo>('suspensao')
  const [dataInicio,   setDataInicio]   = useState(today())
  const [dataRetorno,  setDataRetorno]  = useState('')
  const [motivo,       setMotivo]       = useState('')
  const [acaoHorario,  setAcaoHorario]  = useState<AcaoHorario>('disponivel')
  const [saving,       setSaving]       = useState(false)
  const [error,        setError]        = useState('')

  const alunoSel = alunos.find(a => a.id === alunoId)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!alunoId) { setError('Selecione um aluno.'); return }
    setSaving(true)
    const res = await criarSuspensaoAction({
      aluno_id:    alunoId,
      tipo,
      data_inicio: dataInicio,
      data_retorno: dataRetorno || null,
      motivo:      motivo || null,
      acao_horario: acaoHorario,
    })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved(res.data!)
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={onClose}>
      <div
        className="w-full max-w-lg rounded-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '92vh', overflowY: 'auto' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Nova Suspensão / Atestado</h2>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>O aluno será pausado e sairá da agenda e cobrança do período</p>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4 p-5">

          {/* Aluno */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Aluno</label>
            <select
              value={alunoId}
              onChange={e => setAlunoId(e.target.value)}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            >
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            {alunoSel && (
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                📅 {alunoSel.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')}
              </p>
            )}
          </div>

          {/* Tipo */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Tipo</label>
            <div className="grid grid-cols-2 gap-2">
              {([
                { value: 'suspensao', label: 'Suspensão', desc: 'Pausa voluntária', icon: '⏸' },
                { value: 'atestado',  label: 'Atestado',  desc: 'Motivo médico',    icon: '🩺' },
              ] as const).map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setTipo(t.value)}
                  className="flex flex-col items-start gap-0.5 p-3 rounded-xl text-left transition-colors"
                  style={tipo === t.value
                    ? { background: 'var(--green-muted)', border: '1px solid rgba(0,230,118,0.3)', color: 'var(--green-primary)' }
                    : { background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }
                  }
                >
                  <span className="text-base">{t.icon}</span>
                  <span className="text-sm font-semibold">{t.label}</span>
                  <span className="text-xs opacity-70">{t.desc}</span>
                </button>
              ))}
            </div>
          </div>

          {/* Datas */}
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                required
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex flex-col gap-1">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Retorno previsto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="date"
                value={dataRetorno}
                min={dataInicio}
                onChange={e => setDataRetorno(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Ação para o horário */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Horário liberado — o que fazer?</label>
            <div className="flex flex-col gap-1.5">
              {([
                { value: 'disponivel', icon: '🟢', label: 'Disponível',       desc: 'Aceitar novos alunos neste horário' },
                { value: 'bloqueado',  icon: '🔴', label: 'Bloqueado',        desc: 'Reservar para o retorno deste aluno' },
                { value: 'reposicoes', icon: '🔵', label: 'Para reposições',  desc: 'Usar apenas para aulas de reposição' },
              ] as const).map(op => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setAcaoHorario(op.value)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                  style={acaoHorario === op.value
                    ? { background: 'var(--green-muted)', border: '1px solid rgba(0,230,118,0.3)' }
                    : { background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  <span className="text-base shrink-0">{op.icon}</span>
                  <div>
                    <p className="text-sm font-medium" style={{ color: acaoHorario === op.value ? 'var(--green-primary)' : 'var(--text-primary)' }}>{op.label}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{op.desc}</p>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Motivo */}
          <div className="flex flex-col gap-1">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Motivo <span style={{ fontWeight: 400 }}>(opcional)</span></label>
            <textarea
              value={motivo}
              onChange={e => setMotivo(e.target.value)}
              rows={2}
              placeholder="Ex: Viagem, cirurgia, motivo pessoal…"
              className="rounded-lg px-3 py-2 text-sm outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

          <div className="flex gap-2 pt-1">
            <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
            <button type="submit" disabled={saving || !alunoId} className="flex-1 py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
              {saving ? 'Pausando…' : 'Suspender Aluno'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

// ─── ReativarModal ────────────────────────────────────────────────────────────

type ReativarStep =
  | { type: 'checking' }
  | { type: 'livre' }
  | { type: 'conflito'; conflitantes: Conflitante[] }
  | { type: 'confirmando'; opcao: 'mesmo_assim' | 'reagendar' | 'mover_atual'; conflitantes?: Conflitante[] }
  | { type: 'success'; msg: string }

function ReativarModal({
  suspensao,
  onClose,
  onReativado,
}: {
  suspensao: SuspensaoRow
  onClose: () => void
  onReativado: (id: string) => void
}) {
  const [step,    setStep]    = useState<ReativarStep>({ type: 'checking' })
  const [saving,  setSaving]  = useState(false)
  const [error,   setError]   = useState('')

  useEffect(() => {
    checkConflitosAction(suspensao.aluno_id).then(res => {
      if (res.error) { setStep({ type: 'livre' }); return }
      if (res.conflitantes.length > 0) {
        setStep({ type: 'conflito', conflitantes: res.conflitantes })
      } else {
        setStep({ type: 'livre' })
      }
    })
  }, [suspensao.aluno_id])

  async function handleReativar(msg: string) {
    setSaving(true)
    const res = await reativarAlunoAction(suspensao.id, suspensao.aluno_id)
    setSaving(false)
    if (res.error) { setError(res.error); return }
    setStep({ type: 'success', msg })
    onReativado(suspensao.id)
  }

  const nome = suspensao.aluno_nome ?? 'Aluno'
  const horarios = suspensao.aluno_horarios ?? []
  const diasHorarioLabel = horarios.length > 0
    ? horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')
    : '—'

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.6)' }} onClick={step.type === 'success' ? onClose : undefined}>
      <div
        className="w-full max-w-md rounded-xl p-5 flex flex-col gap-4"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Aluno header */}
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
            {nome.slice(0, 2).toUpperCase()}
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{nome}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{diasHorarioLabel}</p>
          </div>
        </div>

        {/* ── CHECKING ── */}
        {step.type === 'checking' && (
          <div className="flex flex-col items-center gap-3 py-6">
            <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
              <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".2" strokeWidth="3"/>
              <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
            </svg>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Verificando conflitos na agenda…</p>
          </div>
        )}

        {/* ── LIVRE ── */}
        {step.type === 'livre' && (
          <>
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'var(--green-muted)', border: '1px solid rgba(0,230,118,0.2)' }}>
              <span className="text-lg">✅</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>Horário disponível!</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {diasHorarioLabel} — nenhum aluno ocupa este horário. A reativação pode ser feita imediatamente.
                </p>
              </div>
            </div>
            {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}
            <div className="flex gap-2">
              <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
              <button
                onClick={() => handleReativar(`${nome} foi reativado com sucesso.`)}
                disabled={saving}
                className="flex-[2] py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Reativando…' : '✓ Confirmar Reativação'}
              </button>
            </div>
          </>
        )}

        {/* ── CONFLITO ── */}
        {step.type === 'conflito' && (
          <>
            <div className="flex items-start gap-3 p-3 rounded-xl" style={{ background: 'rgba(255,171,0,0.1)', border: '1px solid rgba(255,171,0,0.25)' }}>
              <span className="text-lg">⚠️</span>
              <div>
                <p className="text-sm font-semibold" style={{ color: '#FFAB00' }}>Conflito de horário</p>
                <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {step.conflitantes.length === 1
                    ? `${step.conflitantes[0].nome} ocupa o mesmo horário (${step.conflitantes[0].horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')}).`
                    : `${step.conflitantes.length} alunos ocupam o mesmo horário.`
                  }
                </p>
              </div>
            </div>

            <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Como resolver?</p>

            <div className="flex flex-col gap-2">
              {/* Opção 1: Reagendar o retornante */}
              <button
                onClick={() => setStep({ type: 'confirmando', opcao: 'reagendar', conflitantes: step.conflitantes })}
                className="flex items-start gap-3 p-3 rounded-xl text-left"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-base mt-0.5">📅</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Reagendar {nome}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reativar o aluno e atualizar o horário dele na tela de Alunos</p>
                </div>
              </button>

              {/* Opção 2: Mover o aluno atual */}
              <button
                onClick={() => setStep({ type: 'confirmando', opcao: 'mover_atual', conflitantes: step.conflitantes })}
                className="flex items-start gap-3 p-3 rounded-xl text-left"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-base mt-0.5">🔀</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Mover {step.conflitantes[0]?.nome}</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reativar e renegociar o horário com o aluno atual</p>
                </div>
              </button>

              {/* Opção 3: Resolver manualmente */}
              <button
                onClick={() => setStep({ type: 'confirmando', opcao: 'mesmo_assim', conflitantes: step.conflitantes })}
                className="flex items-start gap-3 p-3 rounded-xl text-left"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
              >
                <span className="text-base mt-0.5">🛠</span>
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Resolver manualmente</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Reativar agora e resolver o conflito diretamente na Agenda</p>
                </div>
              </button>
            </div>

            <button onClick={onClose} className="py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
              Cancelar
            </button>
          </>
        )}

        {/* ── CONFIRMANDO ── */}
        {step.type === 'confirmando' && (
          <>
            {step.opcao === 'reagendar' && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(64,196,255,0.1)', border: '1px solid rgba(64,196,255,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#40C4FF' }}>📅 Próximo passo</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Após reativar, acesse o perfil de <strong>{nome}</strong> em <em>Alunos</em> e atualize os dias e horário para evitar sobreposição.
                </p>
              </div>
            )}
            {step.opcao === 'mover_atual' && step.conflitantes && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(206,147,216,0.1)', border: '1px solid rgba(206,147,216,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#CE93D8' }}>🔀 Próximo passo</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  Após reativar, acesse o perfil de <strong>{step.conflitantes[0]?.nome}</strong> em <em>Alunos</em> e renegocie o horário com ele.
                </p>
              </div>
            )}
            {step.opcao === 'mesmo_assim' && (
              <div className="p-3 rounded-xl" style={{ background: 'rgba(255,171,0,0.08)', border: '1px solid rgba(255,171,0,0.2)' }}>
                <p className="text-sm font-semibold" style={{ color: '#FFAB00' }}>🛠 Resolução manual</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
                  {nome} será reativado com o horário original. Acesse a <em>Agenda</em> para ajustar o conflito manualmente.
                </p>
              </div>
            )}

            {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

            <div className="flex gap-2">
              <button onClick={() => setStep({ type: 'conflito', conflitantes: step.conflitantes ?? [] })} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                Voltar
              </button>
              <button
                onClick={() => handleReativar(
                  step.opcao === 'mesmo_assim'
                    ? `${nome} reativado. Resolva o conflito na Agenda.`
                    : `${nome} reativado. Lembre-se de atualizar o horário.`
                )}
                disabled={saving}
                className="flex-[2] py-2.5 rounded-lg text-sm font-semibold"
                style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}
              >
                {saving ? 'Reativando…' : 'Confirmar e Reativar'}
              </button>
            </div>
          </>
        )}

        {/* ── SUCCESS ── */}
        {step.type === 'success' && (
          <>
            <div className="flex flex-col items-center gap-3 py-4 text-center">
              <div className="w-12 h-12 rounded-full flex items-center justify-center text-xl" style={{ background: 'var(--green-muted)' }}>✓</div>
              <p className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>{step.msg}</p>
            </div>
            {(step.msg.includes('Reagendar') || step.msg.includes('horário')) && (
              <div className="flex gap-2">
                <button onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                  Fechar
                </button>
                <Link
                  href="/dashboard/alunos"
                  className="flex-1 py-2.5 rounded-lg text-sm font-semibold text-center"
                  style={{ background: 'var(--green-primary)', color: '#000' }}
                  onClick={onClose}
                >
                  Ir para Alunos
                </Link>
              </div>
            )}
            {!step.msg.includes('horário') && !step.msg.includes('Reagendar') && (
              <button onClick={onClose} className="w-full py-2.5 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000' }}>
                Fechar
              </button>
            )}
          </>
        )}
      </div>
    </div>
  )
}

// ─── SuspensaoCard ────────────────────────────────────────────────────────────

function SuspensaoCard({
  suspensao,
  onReativar,
}: {
  suspensao: SuspensaoRow
  onReativar: (s: SuspensaoRow) => void
}) {
  const ti   = tipoLabel(suspensao.tipo)
  const acao = acaoLabel(suspensao.acao_horario)
  const dur  = duracao(suspensao.data_inicio, suspensao.status === 'encerrada' ? (suspensao.data_retorno ?? undefined) : undefined)

  return (
    <div className="rounded-xl p-4 flex flex-col gap-3" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            {(suspensao.aluno_nome ?? '?').slice(0, 2).toUpperCase()}
          </div>
          <div className="min-w-0">
            <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{suspensao.aluno_nome}</p>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              {suspensao.aluno_horarios && suspensao.aluno_horarios.length > 0
                ? suspensao.aluno_horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')
                : '—'}
            </p>
          </div>
        </div>
        <span className="text-xs font-semibold px-2 py-0.5 rounded-full shrink-0" style={{ color: ti.color, background: ti.bg }}>
          {ti.icon} {ti.label}
        </span>
      </div>

      {/* Datas */}
      <div className="grid grid-cols-3 gap-2">
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-input)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Início</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{fmtDate(suspensao.data_inicio)}</p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-input)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Retorno</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: suspensao.data_retorno ? 'var(--text-primary)' : 'var(--text-muted)' }}>
            {fmtDate(suspensao.data_retorno)}
          </p>
        </div>
        <div className="rounded-lg p-2.5" style={{ background: 'var(--bg-input)' }}>
          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Duração</p>
          <p className="text-xs font-semibold mt-0.5" style={{ color: 'var(--text-primary)' }}>{dur}</p>
        </div>
      </div>

      {/* Ação horário */}
      <div className="flex items-center gap-2">
        <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ color: acao.color, background: `${acao.color}18` }}>
          {acao.label}
        </span>
        <span className="text-xs" style={{ color: 'var(--text-muted)' }}>{acao.desc}</span>
      </div>

      {/* Motivo */}
      {suspensao.motivo && (
        <p className="text-xs italic" style={{ color: 'var(--text-muted)' }}>"{suspensao.motivo}"</p>
      )}

      {/* Actions */}
      {suspensao.status === 'ativa' && (
        <button
          onClick={() => onReativar(suspensao)}
          className="w-full py-2 rounded-lg text-sm font-semibold transition-colors"
          style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}
        >
          ▶ Reativar Aluno
        </button>
      )}
    </div>
  )
}

// ─── Main component ───────────────────────────────────────────────────────────

interface Props {
  alunosAtivos:   { id: string; nome: string; horarios: { dia: string; horario: string }[] }[]
  alunosPausados: { id: string; nome: string; horarios: { dia: string; horario: string }[] }[]
  suspensoesIniciais: SuspensaoRow[]
}

type Tab    = 'ativos' | 'historico'
type Modal  = { type: 'nova' } | { type: 'reativar'; suspensao: SuspensaoRow }

export function Suspensoes({ alunosAtivos, alunosPausados, suspensoesIniciais }: Props) {
  const [suspensoes, setSuspensoes] = useState<SuspensaoRow[]>(suspensoesIniciais)
  const [tab,    setTab]    = useState<Tab>('ativos')
  const [modal,  setModal]  = useState<Modal | null>(null)

  const ativas    = suspensoes.filter(s => s.status === 'ativa')
  const historico = suspensoes.filter(s => s.status === 'encerrada')

  // Stats
  const totalSuspensao = ativas.filter(s => s.tipo === 'suspensao').length
  const totalAtestado  = ativas.filter(s => s.tipo === 'atestado').length

  function handleSaved(s: SuspensaoRow) {
    // Enrich with aluno info from alunosAtivos
    const aluno = alunosAtivos.find(a => a.id === s.aluno_id)
    const enriched: SuspensaoRow = {
      ...s,
      aluno_nome:     aluno?.nome ?? '—',
      aluno_horarios: aluno?.horarios ?? [],
    }
    setSuspensoes(prev => [enriched, ...prev])
    setModal(null)
  }

  function handleReativado(suspensaoId: string) {
    setSuspensoes(prev => prev.map(s =>
      s.id === suspensaoId ? { ...s, status: 'encerrada' } : s
    ))
    // Close modal after a short delay to show success state
    setTimeout(() => setModal(null), 2200)
  }

  const canNovaSuspensao = alunosAtivos.length > 0

  return (
    <>
      <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div>
            <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Suspensões e Atestados</h1>
            <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Pause alunos sem perder o cadastro. Reative com verificação de conflito.</p>
          </div>
          <button
            onClick={() => canNovaSuspensao ? setModal({ type: 'nova' }) : undefined}
            disabled={!canNovaSuspensao}
            className="flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-semibold"
            style={{ background: 'var(--green-primary)', color: '#000', opacity: canNovaSuspensao ? 1 : 0.4, cursor: canNovaSuspensao ? 'pointer' : 'not-allowed' }}
            title={canNovaSuspensao ? undefined : 'Nenhum aluno ativo'}
          >
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
              <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
            </svg>
            Nova Suspensão
          </button>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          {[
            { label: 'Pausados agora',  value: ativas.length,        color: '#FFAB00' },
            { label: 'Suspensões',      value: totalSuspensao,       color: '#FFAB00' },
            { label: 'Atestados',       value: totalAtestado,        color: '#40C4FF' },
            { label: 'Histórico total', value: historico.length,     color: 'var(--text-secondary)' },
          ].map(s => (
            <div key={s.label} className="rounded-xl p-4" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{s.label}</p>
              <p className="text-2xl font-bold mt-0.5" style={{ color: s.color }}>{s.value}</p>
            </div>
          ))}
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {([
            { key: 'ativos',   label: `Suspensos agora (${ativas.length})` },
            { key: 'historico', label: `Histórico (${historico.length})` },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
              style={tab === t.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: ATIVOS ── */}
        {tab === 'ativos' && (
          <div className="flex flex-col gap-3">
            {ativas.length === 0 ? (
              <div className="text-center py-16 rounded-2xl" style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)' }}>
                <p className="text-2xl mb-2">✅</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Nenhum aluno suspenso</p>
                <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>Todos os alunos estão ativos</p>
              </div>
            ) : (
              ativas.map(s => (
                <SuspensaoCard
                  key={s.id}
                  suspensao={s}
                  onReativar={s => setModal({ type: 'reativar', suspensao: s })}
                />
              ))
            )}
          </div>
        )}

        {/* ── TAB: HISTÓRICO ── */}
        {tab === 'historico' && (
          <div className="flex flex-col gap-3">
            {historico.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhuma suspensão encerrada</p>
              </div>
            ) : (
              historico.map(s => (
                <SuspensaoCard
                  key={s.id}
                  suspensao={s}
                  onReativar={s => setModal({ type: 'reativar', suspensao: s })}
                />
              ))
            )}
          </div>
        )}

      </div>

      {/* Modals */}
      {modal?.type === 'nova' && (
        <NovaSuspensaoModal
          alunos={alunosAtivos}
          onClose={() => setModal(null)}
          onSaved={handleSaved}
        />
      )}
      {modal?.type === 'reativar' && (
        <ReativarModal
          suspensao={modal.suspensao}
          onClose={() => setModal(null)}
          onReativado={handleReativado}
        />
      )}
    </>
  )
}
