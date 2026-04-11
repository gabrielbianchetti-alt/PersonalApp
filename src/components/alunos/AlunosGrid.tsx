'use client'

import Link from 'next/link'
import { formatCurrency } from '@/types/aluno'

interface Aluno {
  id: string
  nome: string
  local: string
  status: string
  dias_semana: string[]
  horario_inicio: string
  duracao: number
  valor: number
  modelo_cobranca: string
}

interface Props {
  alunos: Aluno[]
  diasSemana: { key: string; label: string }[]
  duracaoOpcoes: { value: string; label: string }[]
}

export function AlunosGrid({ alunos, diasSemana, duracaoOpcoes }: Props) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {alunos.map((aluno) => {
        const duracaoLabel =
          duracaoOpcoes.find((d) => d.value === String(aluno.duracao))?.label ?? `${aluno.duracao}min`
        const diasLabels = (aluno.dias_semana as string[]).map(
          (d) => diasSemana.find((s) => s.key === d)?.label ?? d
        )

        return (
          <Link
            key={aluno.id}
            href={`/dashboard/alunos/${aluno.id}`}
            className="p-5 rounded-2xl flex flex-col gap-4 transition-all duration-150 cursor-pointer"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'rgba(0,230,118,0.3)')}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
          >
            {/* Top row */}
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <div
                  className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
                >
                  {aluno.nome.slice(0, 2).toUpperCase()}
                </div>
                <div>
                  <p className="font-semibold text-sm leading-tight" style={{ color: 'var(--text-primary)' }}>
                    {aluno.nome}
                  </p>
                  <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                    {aluno.local}
                  </p>
                </div>
              </div>
              <span
                className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0"
                style={
                  aluno.status === 'ativo'
                    ? { background: 'var(--green-muted)', color: 'var(--green-primary)' }
                    : { background: 'var(--bg-input)', color: 'var(--text-muted)' }
                }
              >
                {aluno.status}
              </span>
            </div>

            {/* Dias chips */}
            <div className="flex flex-wrap gap-1">
              {diasLabels.map((dia) => (
                <span
                  key={dia}
                  className="text-xs px-2 py-0.5 rounded-md font-medium"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                >
                  {dia}
                </span>
              ))}
            </div>

            {/* Info row */}
            <div
              className="flex items-center justify-between pt-3"
              style={{ borderTop: '1px solid var(--border-subtle)' }}
            >
              <div className="flex items-center gap-1.5" style={{ color: 'var(--text-secondary)' }}>
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <circle cx="12" cy="12" r="10" /><polyline points="12 6 12 12 16 14" />
                </svg>
                <span className="text-xs">
                  {String(aluno.horario_inicio).slice(0, 5)} · {duracaoLabel}
                </span>
              </div>
              <span className="text-sm font-semibold" style={{ color: 'var(--green-primary)' }}>
                {formatCurrency(Number(aluno.valor))}
                <span className="text-xs font-normal ml-0.5" style={{ color: 'var(--text-muted)' }}>
                  /{aluno.modelo_cobranca === 'mensalidade' ? 'mês' : 'aula'}
                </span>
              </span>
            </div>
          </Link>
        )
      })}
    </div>
  )
}
