'use client'

import { useState, useTransition } from 'react'
import { Copy, Check, X, Send, Link2 } from 'lucide-react'
import { DIAS_SEMANA, DURACAO_OPCOES, LOCAL_OPCOES, formatCurrency, addDays } from '@/types/aluno'
import { createConviteAction, type ConviteRow } from '../convites/actions'

interface Props {
  onClose:  () => void
  onCreated: (c: ConviteRow) => void
}

/** Formulário curto que o professor preenche para gerar o link. */
export function ConvidarAlunoModal({ onClose, onCreated }: Props) {
  const [modelo, setModelo] = useState<'por_aula' | 'mensalidade' | 'pacote'>('por_aula')
  const [horarios, setHorarios] = useState<{ dia: string; horario: string }[]>([])
  const [duracao, setDuracao] = useState('60')
  const [local, setLocal] = useState('Academia')
  const [valor, setValor] = useState('')

  // Pacote
  const hoje = new Date().toISOString().split('T')[0]
  const [pacoteTipo, setPacoteTipo] = useState<'fixo' | 'alternado'>('alternado')
  const [pacoteQtd, setPacoteQtd] = useState('10')
  const [pacoteVal, setPacoteVal] = useState('30')
  const [pacoteIni, setPacoteIni] = useState(hoje)
  const [pacoteCob, setPacoteCob] = useState(hoje)

  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()
  const [created, setCreated] = useState<ConviteRow | null>(null)

  const isPacote     = modelo === 'pacote'
  const isPacoteFixo = isPacote && pacoteTipo === 'fixo'
  const showHorarios = !isPacote || isPacoteFixo

  function toggleDia(k: string) {
    const found = horarios.find(h => h.dia === k)
    if (found) setHorarios(horarios.filter(h => h.dia !== k))
    else       setHorarios([...horarios, { dia: k, horario: '' }])
  }
  function setHorario(k: string, v: string) {
    setHorarios(horarios.map(h => h.dia === k ? { ...h, horario: v } : h))
  }

  function handleSubmit() {
    setErr('')
    const val = parseFloat(valor)
    if (isNaN(val) || val <= 0) return setErr('Informe um valor válido.')
    if (showHorarios && horarios.length === 0) return setErr('Selecione ao menos um dia.')
    if (showHorarios && horarios.some(h => !h.horario)) return setErr('Preencha todos os horários.')

    startTransition(async () => {
      const res = await createConviteAction({
        modelo_cobranca: modelo,
        horarios:        showHorarios ? horarios : [],
        duracao:         parseInt(duracao) || 60,
        local,
        valor:           val,
        dados_pacote:    isPacote ? {
          quantidade_total: parseInt(pacoteQtd) || 10,
          validade_dias:    parseInt(pacoteVal) || 30,
          data_inicio:      pacoteIni,
          data_cobranca:    pacoteCob,
          tipo_pacote:      pacoteTipo,
        } : null,
      })
      if (res.error) { setErr(res.error); return }
      if (res.data)  { setCreated(res.data); onCreated(res.data) }
    })
  }

  return (
    <div className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-3"
      style={{ background: 'rgba(0,0,0,0.65)' }}
      onClick={onClose}>
      <div className="w-full sm:max-w-md rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}>

        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h3 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
            {created ? 'Link de convite gerado' : 'Convidar aluno'}
          </h3>
          <button type="button" onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer"
            style={{ color: 'var(--text-muted)' }}>
            <X size={14} strokeWidth={2.5} aria-hidden />
          </button>
        </div>

        {created ? (
          <LinkResult convite={created} onClose={onClose} />
        ) : (
          <div className="p-5 flex flex-col gap-4 overflow-y-auto" style={{ maxHeight: '75vh' }}>
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Configure os dados da cobrança. O aluno preencherá os dados pessoais (nome, contato, objetivos) por um link que você envia.
            </p>

            {/* Modelo */}
            <div className="flex flex-col gap-2">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Modelo de cobrança *</label>
              <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
                {([
                  { v: 'por_aula', l: 'Por aula' },
                  { v: 'mensalidade', l: 'Mensalidade' },
                  { v: 'pacote', l: 'Pacote' },
                ] as const).map(opt => (
                  <button key={opt.v} type="button" onClick={() => setModelo(opt.v)}
                    className="flex-1 py-2.5 text-sm font-medium cursor-pointer"
                    style={modelo === opt.v
                      ? { background: 'var(--green-primary)', color: '#000' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                    {opt.l}
                  </button>
                ))}
              </div>
            </div>

            {/* Sub-pills tipo de pacote (só quando modelo='pacote') */}
            {isPacote && (
              <div className="flex flex-col gap-2">
                <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Tipo de pacote *</label>
                <div className="grid grid-cols-2 gap-2">
                  {([
                    { v: 'fixo'      as const, l: 'Fixo',      d: 'Dias e horários definidos agora' },
                    { v: 'alternado' as const, l: 'Alternado', d: 'Marca as aulas quando quiser' },
                  ]).map(opt => {
                    const sel = pacoteTipo === opt.v
                    return (
                      <button key={opt.v} type="button" onClick={() => setPacoteTipo(opt.v)}
                        className="flex flex-col gap-1 px-3 py-3 rounded-xl text-left cursor-pointer"
                        style={{
                          background: sel ? 'var(--green-muted)' : 'var(--bg-input)',
                          border: `1px solid ${sel ? 'rgba(16, 185, 129, 0.35)' : 'var(--border-subtle)'}`,
                          color: sel ? 'var(--green-primary)' : 'var(--text-secondary)',
                        }}>
                        <span className="text-sm font-bold">{opt.l}</span>
                        <span className="text-[11px]" style={{ color: 'var(--text-muted)' }}>{opt.d}</span>
                      </button>
                    )
                  })}
                </div>
              </div>
            )}

            {/* Dias + horários — visíveis para por_aula, mensalidade e pacote fixo */}
            {showHorarios && (
              <>
                <div className="flex flex-col gap-2">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Dias da semana *</label>
                  <div className="flex gap-2 flex-wrap">
                    {DIAS_SEMANA.map(d => {
                      const sel = horarios.some(h => h.dia === d.key)
                      return (
                        <button key={d.key} type="button" onClick={() => toggleDia(d.key)}
                          className="w-11 h-11 rounded-xl text-sm font-semibold cursor-pointer"
                          style={sel
                            ? { background: 'var(--green-primary)', color: '#000' }
                            : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                          {d.label}
                        </button>
                      )
                    })}
                  </div>
                </div>

                {horarios.length > 0 && (
                  <div className="flex flex-col gap-2">
                    <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Horários por dia *</label>
                    {DIAS_SEMANA.filter(d => horarios.some(h => h.dia === d.key)).map(d => {
                      const h = horarios.find(x => x.dia === d.key)!
                      return (
                        <div key={d.key} className="flex items-center gap-2">
                          <span className="w-10 text-sm font-semibold text-center"
                            style={{ color: 'var(--text-secondary)' }}>{d.label}</span>
                          <input type="time" value={h.horario}
                            onChange={e => setHorario(d.key, e.target.value)}
                            className="flex-1 h-10 rounded-xl px-3 text-sm outline-none min-w-0 w-full"
                            style={{
                              background: 'var(--bg-input)',
                              border: '1px solid var(--border-subtle)',
                              color: 'var(--text-primary)',
                            }} />
                        </div>
                      )
                    })}
                  </div>
                )}

                <div className="flex flex-col gap-1.5">
                  <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Duração</label>
                  <div className="flex gap-2">
                    {DURACAO_OPCOES.map(opt => (
                      <button key={opt.value} type="button" onClick={() => setDuracao(opt.value)}
                        className="flex-1 h-11 rounded-xl text-xs font-semibold cursor-pointer"
                        style={duracao === opt.value
                          ? { background: 'var(--green-primary)', color: '#000' }
                          : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                        {opt.label}
                      </button>
                    ))}
                  </div>
                </div>
              </>
            )}

            {/* Local */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Local *</label>
              <div className="flex flex-wrap gap-2">
                {LOCAL_OPCOES.map(l => (
                  <button key={l} type="button" onClick={() => setLocal(l)}
                    className="px-4 h-10 rounded-xl text-sm font-medium cursor-pointer"
                    style={local === l
                      ? { background: 'var(--green-primary)', color: '#000' }
                      : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                    {l}
                  </button>
                ))}
              </div>
            </div>

            {/* Valor */}
            <div className="flex flex-col gap-1.5">
              <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                {modelo === 'mensalidade' ? 'Valor da mensalidade *'
                  : isPacote ? 'Valor do pacote *'
                  : 'Valor por aula *'}
              </label>
              <input type="number" min="0" step="0.01" placeholder="150,00"
                value={valor} onChange={e => setValor(e.target.value)}
                className="h-12 rounded-xl px-4 text-sm outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }} />
            </div>

            {/* Campos pacote */}
            {isPacote && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Qtd. de aulas *</label>
                    <input type="number" min="1" value={pacoteQtd}
                      onChange={e => setPacoteQtd(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 text-sm outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Validade (dias) *</label>
                    <input type="number" min="1" value={pacoteVal}
                      onChange={e => setPacoteVal(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 text-sm outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Início do pacote *</label>
                    <input type="date" value={pacoteIni}
                      onChange={e => setPacoteIni(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 text-sm outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                  </div>
                  <div className="flex flex-col gap-1.5 min-w-0">
                    <label className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>Data de cobrança *</label>
                    <input type="date" value={pacoteCob}
                      onChange={e => setPacoteCob(e.target.value)}
                      className="w-full h-11 rounded-xl px-3 text-sm outline-none"
                      style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }} />
                  </div>
                </div>
                <div className="px-3 py-2 rounded-lg text-xs"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                  Vence em <strong>{addDays(pacoteIni, parseInt(pacoteVal) || 30).split('-').reverse().join('/')}</strong>
                </div>
              </>
            )}

            {err && <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>}

            <div className="flex gap-2 mt-2">
              <button type="button" onClick={onClose} disabled={pending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer"
                style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                Cancelar
              </button>
              <button type="button" onClick={handleSubmit} disabled={pending}
                className="flex-1 py-3 rounded-xl text-sm font-semibold cursor-pointer inline-flex items-center justify-center gap-1.5"
                style={{ background: 'var(--green-primary)', color: '#000' }}>
                <Link2 size={14} strokeWidth={2} aria-hidden />
                {pending ? 'Gerando…' : 'Gerar link'}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

// ─── Tela de sucesso com link gerado ──────────────────────────────────────────

function LinkResult({ convite, onClose }: { convite: ConviteRow; onClose: () => void }) {
  const [copied, setCopied] = useState(false)
  const base = typeof window !== 'undefined' ? window.location.origin : ''
  const link = `${base}/convite/${convite.link_token}`

  async function copyLink() {
    try {
      await navigator.clipboard.writeText(link)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // ignored
    }
  }

  function shareWhatsApp() {
    const msg = encodeURIComponent(`Olá! Preencha seus dados para começarmos os treinos: ${link}`)
    window.open(`https://wa.me/?text=${msg}`, '_blank')
  }

  const expiraEm = new Date(convite.data_expiracao).toLocaleDateString('pt-BR', {
    day: '2-digit', month: 'short',
  })

  return (
    <div className="p-5 flex flex-col gap-4">
      <div className="rounded-xl p-3 flex flex-col gap-1"
        style={{ background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129, 0.3)' }}>
        <p className="text-xs font-semibold" style={{ color: 'var(--green-primary)' }}>
          Link criado com sucesso
        </p>
        <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
          {convite.modelo_cobranca === 'mensalidade' ? 'Mensalidade' : convite.modelo_cobranca === 'pacote' ? 'Pacote' : 'Por aula'}
          {' · '}
          {formatCurrency(convite.valor)}
          {' · Expira em '}
          {expiraEm}
        </p>
      </div>

      {/* Link box */}
      <div className="flex items-center gap-2 p-3 rounded-xl"
        style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
        <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
          {link}
        </span>
        <button type="button" onClick={copyLink}
          className="shrink-0 h-8 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 cursor-pointer"
          style={{
            background: copied ? 'var(--green-muted)' : 'var(--bg-card)',
            color: copied ? 'var(--green-primary)' : 'var(--text-secondary)',
            border: '1px solid var(--border-subtle)',
          }}>
          {copied ? <><Check size={12} strokeWidth={2.5} aria-hidden /> Copiado</>
                  : <><Copy size={12} strokeWidth={2} aria-hidden /> Copiar</>}
        </button>
      </div>

      {/* Ações */}
      <div className="flex flex-col sm:flex-row gap-2">
        <button type="button" onClick={copyLink}
          className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
          <Copy size={14} strokeWidth={1.75} aria-hidden />
          Copiar link
        </button>
        <button type="button" onClick={shareWhatsApp}
          className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2 cursor-pointer"
          style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36630' }}>
          <Send size={14} strokeWidth={1.75} aria-hidden />
          Enviar WhatsApp
        </button>
      </div>

      <button type="button" onClick={onClose}
        className="h-11 rounded-xl text-sm font-semibold cursor-pointer mt-1"
        style={{ background: 'var(--green-primary)', color: '#000' }}>
        Concluir
      </button>
    </div>
  )
}
