'use client'

import { AlunoFormData, DIAS_SEMANA, DURACAO_OPCOES, LOCAL_OPCOES, calcularPrevisaoMensal, formatCurrency, HorarioDia, addDays } from '@/types/aluno'

interface Props {
  data: AlunoFormData
  errors: Record<string, string>
  onChange: (field: keyof AlunoFormData, value: string | string[] | HorarioDia[]) => void
}

function ToggleGroup({
  options,
  value,
  onChange,
}: {
  options: { value: string; label: string }[]
  value: string
  onChange: (v: string) => void
}) {
  return (
    <div className="flex rounded-xl overflow-hidden" style={{ border: '1px solid var(--border-subtle)' }}>
      {options.map((opt) => {
        const active = value === opt.value
        return (
          <button
            key={opt.value}
            type="button"
            onClick={() => onChange(opt.value)}
            className="flex-1 py-2.5 text-sm font-medium transition-colors duration-100 cursor-pointer"
            style={
              active
                ? { background: 'var(--green-primary)', color: '#000' }
                : { background: 'var(--bg-input)', color: 'var(--text-secondary)' }
            }
          >
            {opt.label}
          </button>
        )
      })}
    </div>
  )
}

export function StepTreino({ data, errors, onChange }: Props) {
  const previsao = calcularPrevisaoMensal(data)
  const isPacote = data.modelo_cobranca === 'pacote'

  function toggleDia(key: string) {
    const already = data.horarios.find(h => h.dia === key)
    if (already) {
      onChange('horarios', data.horarios.filter(h => h.dia !== key))
    } else {
      onChange('horarios', [...data.horarios, { dia: key, horario: '' }])
    }
  }

  function setHorario(dia: string, horario: string) {
    onChange('horarios', data.horarios.map(h => h.dia === dia ? { ...h, horario } : h))
  }

  // Sort selected horarios in DIAS_SEMANA order
  const selectedInOrder = DIAS_SEMANA
    .map(d => data.horarios.find(h => h.dia === d.key))
    .filter((h): h is HorarioDia => h !== undefined)

  // Pacote: vencimento calculado
  const pacoteVencimento = isPacote && data.pacote_data_inicio && data.pacote_validade_dias
    ? addDays(data.pacote_data_inicio, parseInt(data.pacote_validade_dias) || 0)
    : ''

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Treino
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Frequência, horário e cobrança
        </p>
      </div>

      {/* Dias da semana (hidden para pacote — aulas são avulsas) */}
      {!isPacote && (
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Dias da semana *
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIAS_SEMANA.map((dia) => {
            const selected = data.horarios.some(h => h.dia === dia.key)
            return (
              <button
                key={dia.key}
                type="button"
                onClick={() => toggleDia(dia.key)}
                className="w-12 h-12 rounded-xl text-sm font-semibold transition-all duration-100 cursor-pointer"
                style={
                  selected
                    ? { background: 'var(--green-primary)', color: '#000' }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                }
              >
                {dia.label}
              </button>
            )
          })}
        </div>
        {errors.horarios && (
          <p className="text-xs" style={{ color: '#EF4444' }}>{errors.horarios}</p>
        )}
      </div>
      )}

      {/* Per-day time inputs */}
      {!isPacote && selectedInOrder.length > 0 && (
        <div className="flex flex-col gap-2">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Horários por dia *
          </label>
          {selectedInOrder.map((h) => {
            const diaLabel = DIAS_SEMANA.find(d => d.key === h.dia)?.label ?? h.dia
            const errKey = `horarios_${h.dia}`
            return (
              <div key={h.dia} className="flex items-center gap-3">
                <span
                  className="w-10 text-sm font-semibold text-center shrink-0"
                  style={{ color: 'var(--text-secondary)' }}
                >
                  {diaLabel}
                </span>
                <input
                  type="time"
                  value={h.horario}
                  onChange={(e) => setHorario(h.dia, e.target.value)}
                  className="flex-1 h-10 rounded-xl px-3 text-sm outline-none"
                  style={{
                    background: 'var(--bg-input)',
                    border: `1px solid ${errors[errKey] ? '#EF4444' : 'var(--border-subtle)'}`,
                    color: 'var(--text-primary)',
                  }}
                  onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.08)' }}
                  onBlur={(e) => { e.target.style.borderColor = errors[errKey] ? '#EF4444' : 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
                />
                <button
                  type="button"
                  onClick={() => toggleDia(h.dia)}
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0 cursor-pointer"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
                  title={`Remover ${diaLabel}`}
                >
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
                  </svg>
                </button>
                {errors[errKey] && (
                  <p className="text-xs" style={{ color: '#EF4444' }}>{errors[errKey]}</p>
                )}
              </div>
            )
          })}
        </div>
      )}

      {/* Duração */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Duração
        </label>
        <div className="flex gap-2">
          {DURACAO_OPCOES.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => onChange('duracao', opt.value)}
              className="flex-1 h-12 rounded-xl text-xs font-semibold transition-all duration-100 cursor-pointer"
              style={
                data.duracao === opt.value
                  ? { background: 'var(--green-primary)', color: '#000' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              }
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Local */}
      <div className="flex flex-col gap-1.5">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Local *
        </label>
        <div className="flex flex-wrap gap-2">
          {LOCAL_OPCOES.map((loc) => (
            <button
              key={loc}
              type="button"
              onClick={() => { onChange('local', loc); if (loc === 'Online') onChange('endereco', '') }}
              className="px-4 h-10 rounded-xl text-sm font-medium transition-all duration-100 cursor-pointer"
              style={
                data.local === loc
                  ? { background: 'var(--green-primary)', color: '#000' }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
              }
            >
              {loc}
            </button>
          ))}
        </div>
        {errors.local && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.local}</p>}
      </div>

      {/* Endereço (opcional, hidden se Online) */}
      {data.local && data.local !== 'Online' && (
        <div className="flex flex-col gap-1.5">
          <label htmlFor="endereco" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Endereço{' '}
            <span style={{ color: 'var(--text-muted)' }}>(opcional)</span>
          </label>
          <input
            id="endereco"
            type="text"
            placeholder="Rua, número, bairro"
            value={data.endereco}
            onChange={(e) => onChange('endereco', e.target.value)}
            className="h-12 rounded-xl px-4 text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.08)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
      )}

      {/* Separador */}
      <div className="h-px" style={{ background: 'var(--border-subtle)' }} />

      {/* Modelo de cobrança */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Modelo de cobrança *
        </label>
        <ToggleGroup
          options={[
            { value: 'por_aula', label: 'Por aula' },
            { value: 'mensalidade', label: 'Mensalidade' },
            { value: 'pacote', label: 'Pacote' },
          ]}
          value={data.modelo_cobranca}
          onChange={(v) => onChange('modelo_cobranca', v)}
        />
        {isPacote && (
          <p className="text-xs leading-relaxed" style={{ color: 'var(--text-muted)' }}>
            Aulas avulsas agendadas individualmente. Cobrança única no início do pacote.
          </p>
        )}
      </div>

      {/* Valor */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="valor" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {data.modelo_cobranca === 'mensalidade' ? 'Valor da mensalidade *'
            : data.modelo_cobranca === 'pacote' ? 'Valor do pacote *'
            : 'Valor por aula *'}
        </label>
        <div className="relative">
          <span
            className="absolute left-4 top-1/2 -translate-y-1/2 text-sm font-medium pointer-events-none"
            style={{ color: 'var(--text-muted)' }}
          >
            R$
          </span>
          <input
            id="valor"
            type="number"
            min="0"
            step="0.01"
            placeholder="150,00"
            value={data.valor}
            onChange={(e) => onChange('valor', e.target.value)}
            className="w-full h-12 rounded-xl pl-10 pr-4 text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              border: `1px solid ${errors.valor ? '#EF4444' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.target.style.borderColor = errors.valor ? '#EF4444' : 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.08)' }}
            onBlur={(e) => { e.target.style.borderColor = errors.valor ? '#EF4444' : 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        {errors.valor && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.valor}</p>}
      </div>

      {/* Previsão mensal */}
      {!isPacote && data.valor && parseFloat(data.valor) > 0 && data.horarios.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.2)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {data.modelo_cobranca === 'mensalidade' ? 'Valor fixo mensal' : `Previsão mensal (${data.horarios.length} dias × 4,3 semanas)`}
          </span>
          <span className="text-base font-bold" style={{ color: 'var(--green-primary)' }}>
            {formatCurrency(previsao)}
          </span>
        </div>
      )}

      {/* Campos do Pacote */}
      {isPacote && (
        <>
          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pacote_qtd" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Qtd. de aulas *
              </label>
              <input id="pacote_qtd" type="number" min="1" step="1" placeholder="10"
                value={data.pacote_quantidade}
                onChange={(e) => onChange('pacote_quantidade', e.target.value)}
                className="h-12 rounded-xl px-4 text-sm outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: `1px solid ${errors.pacote_quantidade ? '#EF4444' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                }}/>
              {errors.pacote_quantidade && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.pacote_quantidade}</p>}
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pacote_val" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Validade (dias) *
              </label>
              <input id="pacote_val" type="number" min="1" step="1" placeholder="30"
                value={data.pacote_validade_dias}
                onChange={(e) => onChange('pacote_validade_dias', e.target.value)}
                className="h-12 rounded-xl px-4 text-sm outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: `1px solid ${errors.pacote_validade_dias ? '#EF4444' : 'var(--border-subtle)'}`,
                  color: 'var(--text-primary)',
                }}/>
              {errors.pacote_validade_dias && <p className="text-xs" style={{ color: '#EF4444' }}>{errors.pacote_validade_dias}</p>}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pacote_ini" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Início do pacote *
              </label>
              <input id="pacote_ini" type="date"
                value={data.pacote_data_inicio}
                onChange={(e) => onChange('pacote_data_inicio', e.target.value)}
                className="h-12 rounded-xl px-4 text-sm outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}/>
            </div>
            <div className="flex flex-col gap-1.5">
              <label htmlFor="pacote_cob" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
                Data de cobrança *
              </label>
              <input id="pacote_cob" type="date"
                value={data.pacote_data_cobranca}
                onChange={(e) => onChange('pacote_data_cobranca', e.target.value)}
                className="h-12 rounded-xl px-4 text-sm outline-none"
                style={{
                  background: 'var(--bg-input)',
                  border: '1px solid var(--border-subtle)',
                  color: 'var(--text-primary)',
                }}/>
            </div>
          </div>

          {/* Resumo do pacote */}
          {data.pacote_quantidade && data.valor && parseFloat(data.valor) > 0 && pacoteVencimento && (
            <div className="flex flex-col gap-1.5 px-4 py-3 rounded-xl"
              style={{ background: 'var(--green-muted)', border: '1px solid rgba(16, 185, 129,0.2)' }}>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>Pacote</span>
                <span className="text-base font-bold" style={{ color: 'var(--green-primary)' }}>
                  {data.pacote_quantidade} aulas · {formatCurrency(parseFloat(data.valor))}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>Vencimento</span>
                <span className="text-xs font-medium" style={{ color: 'var(--text-secondary)' }}>
                  {pacoteVencimento.split('-').reverse().join('/')}
                </span>
              </div>
            </div>
          )}
        </>
      )}

      {/* Forma de pagamento */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Forma de pagamento preferida *
        </label>
        <ToggleGroup
          options={[
            { value: 'pix', label: 'Pix' },
            { value: 'cartao', label: 'Cartão' },
          ]}
          value={data.forma_pagamento}
          onChange={(v) => onChange('forma_pagamento', v)}
        />
      </div>

      {/* Dia de cobrança (hidden para pacote — usa pacote_data_cobranca) */}
      {!isPacote && (
      <div className="flex flex-col gap-1.5">
        <label htmlFor="dia_cobranca" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Dia de cobrança{' '}
          <span style={{ color: 'var(--text-muted)' }}>(1–28)</span>
        </label>
        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
          Dia do mês em que a cobrança deste aluno vence
        </p>
        <input
          id="dia_cobranca"
          type="number"
          min="1"
          max="28"
          placeholder="1"
          value={data.dia_cobranca}
          onChange={(e) => {
            const v = Math.min(28, Math.max(1, parseInt(e.target.value) || 1))
            onChange('dia_cobranca', String(v))
          }}
          className="h-12 rounded-xl px-4 text-sm outline-none w-28"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.08)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
      )}
    </div>
  )
}
