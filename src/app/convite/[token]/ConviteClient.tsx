'use client'

import { useState, useTransition } from 'react'
import { CheckCircle2, Clock, AlertTriangle, X } from 'lucide-react'
import { DIAS_LABEL, formatCurrency } from '@/types/aluno'
import { submeterConviteAction, type ConvitePublico } from '@/app/dashboard/convites/actions'

const OBJETIVOS = [
  'Emagrecimento', 'Hipertrofia', 'Saúde',
  'Condicionamento', 'Reabilitação', 'Flexibilidade', 'Outro',
]

function maskWhatsApp(v: string): string {
  const d = v.replace(/\D/g, '').slice(0, 11)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0,2)}) ${d.slice(2)}`
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`
}

// ─── Shell público (fundo claro tipo landing) ────────────────────────────────

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen" style={{ background: '#F9FAFB' }}>
      <header className="px-5 py-4 flex items-center gap-2"
        style={{ borderBottom: '1px solid #E5E7EB' }}>
        <img src="/logo-1024x1024.png" alt="PersonalHub"
          style={{ width: 30, height: 30, borderRadius: 8 }} />
        <span className="text-sm font-bold" style={{ color: '#111827' }}>PersonalHub</span>
      </header>
      <main className="px-5 py-6" style={{ maxWidth: 480, margin: '0 auto' }}>
        {children}
      </main>
    </div>
  )
}

// ─── Página principal ────────────────────────────────────────────────────────

export function ConviteClient({
  convite, error,
}: {
  convite: ConvitePublico | null
  error:   string | null
}) {
  const [sent, setSent] = useState(false)

  if (error || !convite) {
    return <Shell><StateCard icon="error" title="Convite não encontrado"
      body="Verifique o link ou peça um novo ao seu professor." /></Shell>
  }
  if (convite.status === 'expirado') {
    return <Shell><StateCard icon="warn" title="Este convite expirou"
      body="Peça um novo link ao seu professor para continuar o cadastro." /></Shell>
  }
  if (convite.status !== 'pendente') {
    return <Shell><StateCard icon="check" title="Convite já utilizado"
      body="Seus dados já foram enviados. Seu professor irá revisar e confirmar em breve." /></Shell>
  }
  if (sent) {
    return <Shell><StateCard icon="check"
      title="Dados enviados com sucesso!"
      body="Seu professor irá revisar e confirmar seu cadastro. Em breve entrará em contato." /></Shell>
  }
  return <Shell><FormConvite convite={convite} onSent={() => setSent(true)} /></Shell>
}

// ─── Formulário ──────────────────────────────────────────────────────────────

function FormConvite({
  convite, onSent,
}: {
  convite: ConvitePublico
  onSent:  () => void
}) {
  const [nome,            setNome]            = useState('')
  const [whatsapp,        setWhatsapp]        = useState('')
  const [dataNasc,        setDataNasc]        = useState('')
  const [emergNome,       setEmergNome]       = useState('')
  const [emergTel,        setEmergTel]        = useState('')
  const [emergPar,        setEmergPar]        = useState('')
  const [objetivos,       setObjetivos]       = useState<string[]>([])
  const [restricoes,      setRestricoes]      = useState('')
  const [observacoes,     setObservacoes]     = useState('')
  const [showEmerg,       setShowEmerg]       = useState(false)

  const [err, setErr] = useState('')
  const [pending, startTransition] = useTransition()

  function toggleObj(o: string) {
    setObjetivos(prev => prev.includes(o) ? prev.filter(x => x !== o) : [...prev, o])
  }

  function submit() {
    setErr('')
    if (!nome.trim()) return setErr('Informe seu nome completo.')
    const d = whatsapp.replace(/\D/g, '')
    if (d.length < 11) return setErr('WhatsApp inválido. Use DDD + 9 dígitos.')
    if (!dataNasc) return setErr('Informe a data de nascimento.')

    startTransition(async () => {
      const res = await submeterConviteAction({
        token:                  convite.link_token,
        nome,
        whatsapp,
        data_nascimento:        dataNasc,
        emergencia_nome:        emergNome,
        emergencia_telefone:    emergTel,
        emergencia_parentesco:  emergPar,
        objetivos,
        restricoes,
        observacoes,
      })
      if (res.error) { setErr(res.error); return }
      onSent()
    })
  }

  // Resumo do que o professor configurou
  const resumoHor = convite.horarios.length > 0
    ? convite.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(' · ')
    : null

  return (
    <>
      <div className="mb-5">
        <p className="text-xs font-semibold uppercase tracking-wider"
          style={{ color: '#10B981' }}>
          Convite do professor
        </p>
        <h1 className="text-2xl font-bold mt-1" style={{ color: '#111827' }}>
          {convite.professor_nome} convidou você
        </h1>
        <p className="text-sm mt-1" style={{ color: '#6B7280' }}>
          Preencha seus dados para começar.
        </p>
      </div>

      {/* Resumo dos combinados */}
      <div className="rounded-2xl p-4 mb-5"
        style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
        <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: '#6B7280' }}>
          Combinado com seu professor
        </p>
        <div className="flex flex-wrap gap-x-4 gap-y-1.5 text-sm" style={{ color: '#111827' }}>
          <span>
            <strong>{convite.modelo_cobranca === 'mensalidade' ? 'Mensalidade' : convite.modelo_cobranca === 'pacote' ? 'Pacote' : 'Por aula'}</strong>
            {' · '}{formatCurrency(convite.valor)}
          </span>
          {resumoHor && <span>{resumoHor}</span>}
          <span>{convite.local}</span>
          {convite.modelo_cobranca === 'pacote' && convite.dados_pacote && (
            <span>
              {convite.dados_pacote.quantidade_total} aulas ·
              {' '}{convite.dados_pacote.validade_dias} dias
            </span>
          )}
        </div>
      </div>

      {/* Campos obrigatórios */}
      <div className="flex flex-col gap-4">
        <Field label="Nome completo *" value={nome} onChange={setNome}
          placeholder="João Silva" />

        <Field label="WhatsApp *" value={whatsapp}
          onChange={v => setWhatsapp(maskWhatsApp(v))}
          placeholder="(11) 9 9999-9999" type="tel" />

        <Field label="Data de nascimento *" value={dataNasc}
          onChange={setDataNasc} type="date" />

        {/* Emergência — collapsible */}
        <div className="rounded-xl overflow-hidden" style={{ border: '1px solid #E5E7EB' }}>
          <button type="button" onClick={() => setShowEmerg(v => !v)}
            className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
            style={{ background: '#FFFFFF' }}>
            <span className="text-sm font-medium" style={{ color: '#111827' }}>
              Contato de emergência <span className="font-normal" style={{ color: '#9CA3AF' }}>(opcional)</span>
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#9CA3AF" strokeWidth="2"
              style={{ transform: showEmerg ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
              <polyline points="6 9 12 15 18 9" />
            </svg>
          </button>
          {showEmerg && (
            <div className="p-4 flex flex-col gap-3" style={{ background: '#F9FAFB' }}>
              <Field label="Nome" value={emergNome} onChange={setEmergNome} placeholder="Maria Silva" />
              <Field label="Telefone" value={emergTel}
                onChange={v => setEmergTel(maskWhatsApp(v))} placeholder="(11) 9999-9999" type="tel" />
              <Field label="Parentesco" value={emergPar} onChange={setEmergPar} placeholder="Mãe, Cônjuge…" />
            </div>
          )}
        </div>

        {/* Objetivos */}
        <div>
          <label className="text-sm font-medium block mb-2" style={{ color: '#6B7280' }}>
            Objetivos <span className="font-normal" style={{ color: '#9CA3AF' }}>(opcional, pode escolher vários)</span>
          </label>
          <div className="flex flex-wrap gap-2">
            {OBJETIVOS.map(o => {
              const sel = objetivos.includes(o)
              return (
                <button key={o} type="button" onClick={() => toggleObj(o)}
                  className="px-3 h-9 rounded-full text-sm font-medium cursor-pointer"
                  style={sel
                    ? { background: '#10B981', color: '#FFFFFF' }
                    : { background: '#FFFFFF', color: '#6B7280', border: '1px solid #E5E7EB' }}>
                  {o}
                </button>
              )
            })}
          </div>
        </div>

        {/* Restrições / Observações */}
        <Field label="Restrições físicas" value={restricoes} onChange={setRestricoes}
          placeholder="Lesões, problemas médicos…" textarea />
        <Field label="Observações" value={observacoes} onChange={setObservacoes}
          placeholder="Algo que seu professor precisa saber?" textarea />

        {err && (
          <div className="rounded-lg p-3 flex items-start gap-2"
            style={{ background: 'rgba(239, 68, 68, 0.08)', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
            <AlertTriangle size={14} strokeWidth={1.75} className="shrink-0 mt-0.5" style={{ color: '#EF4444' }} aria-hidden />
            <p className="text-xs" style={{ color: '#EF4444' }}>{err}</p>
          </div>
        )}

        <button type="button" onClick={submit} disabled={pending}
          className="h-12 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-60 mt-2"
          style={{ background: '#10B981', color: '#FFFFFF' }}>
          {pending ? 'Enviando…' : 'Enviar dados'}
        </button>
      </div>
    </>
  )
}

// ─── Sub-components ──────────────────────────────────────────────────────────

function Field({
  label, value, onChange, placeholder, type = 'text', textarea,
}: {
  label: string; value: string; onChange: (v: string) => void
  placeholder?: string; type?: string; textarea?: boolean
}) {
  const common = {
    className: 'w-full h-12 rounded-xl px-4 text-sm outline-none min-w-0',
    style: {
      background: '#FFFFFF',
      border: '1px solid #E5E7EB',
      color: '#111827',
    } as React.CSSProperties,
    placeholder,
    value,
    onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => onChange(e.target.value),
  }
  return (
    <div className="flex flex-col gap-1.5 min-w-0">
      <label className="text-sm font-medium" style={{ color: '#6B7280' }}>{label}</label>
      {textarea ? (
        <textarea rows={3} {...common}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none min-w-0 resize-none" />
      ) : (
        <input type={type} {...common} />
      )}
    </div>
  )
}

function StateCard({
  icon, title, body,
}: {
  icon: 'check' | 'warn' | 'error'; title: string; body: string
}) {
  const Icon = icon === 'check' ? CheckCircle2 : icon === 'warn' ? Clock : X
  const color = icon === 'check' ? '#10B981' : icon === 'warn' ? '#F59E0B' : '#EF4444'
  const bg    = icon === 'check' ? 'rgba(16, 185, 129, 0.1)'
               : icon === 'warn' ? 'rgba(245, 158, 11, 0.1)'
               : 'rgba(239, 68, 68, 0.1)'
  return (
    <div className="rounded-2xl p-8 flex flex-col items-center gap-3 text-center"
      style={{ background: '#FFFFFF', border: '1px solid #E5E7EB' }}>
      <div className="w-14 h-14 rounded-full flex items-center justify-center"
        style={{ background: bg }}>
        <Icon size={28} strokeWidth={1.75} style={{ color }} aria-hidden />
      </div>
      <h2 className="text-lg font-bold" style={{ color: '#111827' }}>{title}</h2>
      <p className="text-sm" style={{ color: '#6B7280' }}>{body}</p>
    </div>
  )
}
