'use client'

import { useState } from 'react'
import { Calendar } from 'lucide-react'
import { criarSuspensaoAction } from './actions'
import type { SuspensaoRow, SuspensaoTipo, AcaoHorario } from './types'
import { DIAS_LABEL } from '@/types/aluno'

function today(): string {
  return new Date().toISOString().slice(0, 10)
}

export function NovaSuspensaoModal({
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
              disabled={alunos.length === 1}
              className="rounded-lg px-3 py-2 text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)', opacity: alunos.length === 1 ? 0.7 : 1 }}
            >
              {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
            </select>
            {alunoSel && (
              <p className="text-xs mt-0.5 inline-flex items-center gap-1.5" style={{ color: 'var(--text-muted)' }}>
                <Calendar size={13} strokeWidth={1.75} aria-hidden /> {alunoSel.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')}
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
                    ? { background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.3)', color: 'var(--green-primary)' }
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
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Data de início</label>
              <input
                type="date"
                value={dataInicio}
                onChange={e => setDataInicio(e.target.value)}
                required
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
            <div className="flex flex-col gap-1 min-w-0">
              <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Retorno previsto <span style={{ color: 'var(--text-muted)', fontWeight: 400 }}>(opcional)</span></label>
              <input
                type="date"
                value={dataRetorno}
                min={dataInicio}
                onChange={e => setDataRetorno(e.target.value)}
                className="w-full rounded-lg px-3 py-2 text-sm outline-none"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>
          </div>

          {/* Ação para o horário */}
          <div className="flex flex-col gap-1.5">
            <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Horário liberado — o que fazer?</label>
            <div className="flex flex-col gap-1.5">
              {([
                { value: 'disponivel', color: '#10B981', label: 'Disponível',       desc: 'Aceitar novos alunos neste horário' },
                { value: 'bloqueado',  color: '#EF4444', label: 'Bloqueado',        desc: 'Reservar para o retorno deste aluno' },
                { value: 'reposicoes', color: '#38BDF8', label: 'Para reposições',  desc: 'Usar apenas para aulas de reposição' },
              ] as const).map(op => (
                <button
                  key={op.value}
                  type="button"
                  onClick={() => setAcaoHorario(op.value)}
                  className="flex items-center gap-3 p-3 rounded-xl text-left transition-colors"
                  style={acaoHorario === op.value
                    ? { background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.3)' }
                    : { background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  <span className="shrink-0" aria-hidden style={{ width: 10, height: 10, borderRadius: '50%', background: op.color, display: 'inline-block' }} />
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

          {error && <p className="text-xs" style={{ color: '#EF4444' }}>{error}</p>}

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
