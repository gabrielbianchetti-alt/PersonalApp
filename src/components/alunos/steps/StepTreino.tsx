'use client'

import { AlunoFormData, DIAS_SEMANA, DURACAO_OPCOES, LOCAL_OPCOES, calcularPrevisaoMensal, formatCurrency } from '@/types/aluno'

interface Props {
  data: AlunoFormData
  errors: Record<string, string>
  onChange: (field: keyof AlunoFormData, value: string | string[]) => void
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

  function toggleDia(key: string) {
    const current = data.dias_semana
    const updated = current.includes(key) ? current.filter((d) => d !== key) : [...current, key]
    onChange('dias_semana', updated)
  }

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

      {/* Dias da semana */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Dias da semana *
        </label>
        <div className="flex gap-2 flex-wrap">
          {DIAS_SEMANA.map((dia) => {
            const selected = data.dias_semana.includes(dia.key)
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
        {errors.dias_semana && (
          <p className="text-xs" style={{ color: '#FF5252' }}>{errors.dias_semana}</p>
        )}
      </div>

      {/* Horário + Duração */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <label htmlFor="horario" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Horário de início *
          </label>
          <input
            id="horario"
            type="time"
            value={data.horario_inicio}
            onChange={(e) => onChange('horario_inicio', e.target.value)}
            className="h-12 rounded-xl px-4 text-sm outline-none"
            style={{
              background: 'var(--bg-input)',
              border: `1px solid ${errors.horario_inicio ? '#FF5252' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.08)' }}
            onBlur={(e) => { e.target.style.borderColor = errors.horario_inicio ? '#FF5252' : 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
          {errors.horario_inicio && (
            <p className="text-xs" style={{ color: '#FF5252' }}>{errors.horario_inicio}</p>
          )}
        </div>

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
        {errors.local && <p className="text-xs" style={{ color: '#FF5252' }}>{errors.local}</p>}
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
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.08)' }}
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
            { value: 'mensalidade', label: 'Mensalidade fixa' },
          ]}
          value={data.modelo_cobranca}
          onChange={(v) => onChange('modelo_cobranca', v)}
        />
      </div>

      {/* Valor */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="valor" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          {data.modelo_cobranca === 'mensalidade' ? 'Valor da mensalidade *' : 'Valor por aula *'}
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
              border: `1px solid ${errors.valor ? '#FF5252' : 'var(--border-subtle)'}`,
              color: 'var(--text-primary)',
            }}
            onFocus={(e) => { e.target.style.borderColor = errors.valor ? '#FF5252' : 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.08)' }}
            onBlur={(e) => { e.target.style.borderColor = errors.valor ? '#FF5252' : 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>
        {errors.valor && <p className="text-xs" style={{ color: '#FF5252' }}>{errors.valor}</p>}
      </div>

      {/* Previsão mensal */}
      {data.valor && parseFloat(data.valor) > 0 && data.dias_semana.length > 0 && (
        <div
          className="flex items-center justify-between px-4 py-3 rounded-xl"
          style={{ background: 'var(--green-muted)', border: '1px solid rgba(0,230,118,0.2)' }}
        >
          <span className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            {data.modelo_cobranca === 'mensalidade' ? 'Valor fixo mensal' : `Previsão mensal (${data.dias_semana.length} dias × 4,3 semanas)`}
          </span>
          <span className="text-base font-bold" style={{ color: 'var(--green-primary)' }}>
            {formatCurrency(previsao)}
          </span>
        </div>
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
    </div>
  )
}
