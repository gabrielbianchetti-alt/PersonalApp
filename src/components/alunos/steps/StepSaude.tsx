'use client'

import { AlunoFormData, OBJETIVOS_OPCOES } from '@/types/aluno'

interface Props {
  data: AlunoFormData
  errors: Record<string, string>
  onChange: (field: keyof AlunoFormData, value: string | string[]) => void
}

export function StepSaude({ data, errors, onChange }: Props) {
  function toggleObjetivo(obj: string) {
    const current = data.objetivos
    const updated = current.includes(obj) ? current.filter((o) => o !== obj) : [...current, obj]
    onChange('objetivos', updated)
  }

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Saúde e Objetivo
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Metas e informações de saúde do aluno
        </p>
      </div>

      {/* Objetivos */}
      <div className="flex flex-col gap-2">
        <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Objetivos *{' '}
          <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
            (selecione um ou mais)
          </span>
        </label>
        <div className="flex flex-wrap gap-2">
          {OBJETIVOS_OPCOES.map((obj) => {
            const selected = data.objetivos.includes(obj)
            return (
              <button
                key={obj}
                type="button"
                onClick={() => toggleObjetivo(obj)}
                className="px-4 h-10 rounded-full text-sm font-medium transition-all duration-100 cursor-pointer"
                style={
                  selected
                    ? { background: 'var(--green-primary)', color: '#000' }
                    : {
                        background: 'var(--bg-input)',
                        color: 'var(--text-secondary)',
                        border: '1px solid var(--border-subtle)',
                      }
                }
              >
                {obj}
              </button>
            )
          })}
        </div>
        {errors.objetivos && (
          <p className="text-xs" style={{ color: '#FF5252' }}>
            {errors.objetivos}
          </p>
        )}
      </div>

      {/* Restrições */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="restricoes" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Restrições físicas{' '}
          <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
        </label>
        <textarea
          id="restricoes"
          rows={3}
          placeholder="Ex: problema no joelho, hipertensão..."
          value={data.restricoes}
          onChange={(e) => onChange('restricoes', e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(252,110,32,0.08)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
        />
      </div>

      {/* Observações */}
      <div className="flex flex-col gap-1.5">
        <label htmlFor="observacoes" className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
          Observações gerais{' '}
          <span className="font-normal" style={{ color: 'var(--text-muted)' }}>(opcional)</span>
        </label>
        <textarea
          id="observacoes"
          rows={3}
          placeholder="Informações adicionais importantes..."
          value={data.observacoes}
          onChange={(e) => onChange('observacoes', e.target.value)}
          className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none"
          style={{
            background: 'var(--bg-input)',
            border: '1px solid var(--border-subtle)',
            color: 'var(--text-primary)',
            lineHeight: '1.6',
          }}
          onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(252,110,32,0.08)' }}
          onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
        />
      </div>
    </div>
  )
}
