'use client'

import {
  AlunoFormData,
  DIAS_LABEL,
  DURACAO_OPCOES,
  calcularPrevisaoMensal,
  formatCurrency,
  formatDate,
  DIAS_SEMANA,
} from '@/types/aluno'

interface Props {
  data: AlunoFormData
  onEdit: (step: number) => void
}

function Section({
  title,
  step,
  onEdit,
  children,
}: {
  title: string
  step: number
  onEdit: (step: number) => void
  children: React.ReactNode
}) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ border: '1px solid var(--border-subtle)' }}
    >
      <div
        className="flex items-center justify-between px-4 py-3"
        style={{ background: 'var(--bg-input)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
          {title}
        </span>
        <button
          type="button"
          onClick={() => onEdit(step)}
          className="flex items-center gap-1.5 text-xs font-medium transition-colors cursor-pointer"
          style={{ color: 'var(--green-primary)' }}
        >
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
            <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
          </svg>
          Editar
        </button>
      </div>
      <div className="p-4 flex flex-col gap-3" style={{ background: 'var(--bg-card)' }}>
        {children}
      </div>
    </div>
  )
}

function Row({ label, value }: { label: string; value: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <span className="text-xs shrink-0" style={{ color: 'var(--text-muted)' }}>
        {label}
      </span>
      <span className="text-sm text-right" style={{ color: 'var(--text-primary)' }}>
        {value}
      </span>
    </div>
  )
}

export function StepRevisao({ data, onEdit }: Props) {
  const duracaoLabel = DURACAO_OPCOES.find((d) => d.value === data.duracao)?.label ?? data.duracao
  const previsao = calcularPrevisaoMensal(data)

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Revisão
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Confirme os dados antes de salvar
        </p>
      </div>

      {/* Dados Pessoais */}
      <Section title="Dados Pessoais" step={0} onEdit={onEdit}>
        <Row label="Nome" value={data.nome} />
        <Row label="WhatsApp" value={data.whatsapp} />
        <Row label="Nascimento" value={data.data_nascimento ? formatDate(data.data_nascimento) : '—'} />
        <Row label="Início" value={formatDate(data.data_inicio)} />
        {data.emergencia_nome && (
          <Row
            label="Emergência"
            value={
              <span>
                {data.emergencia_nome}
                {data.emergencia_parentesco ? ` (${data.emergencia_parentesco})` : ''}
                {data.emergencia_telefone ? ` · ${data.emergencia_telefone}` : ''}
              </span>
            }
          />
        )}
      </Section>

      {/* Treino */}
      <Section title="Treino" step={1} onEdit={onEdit}>
        <Row label="Horários" value={
          data.horarios.length === 0 ? '—' : (
            <div className="flex flex-col gap-0.5 items-end">
              {DIAS_SEMANA
                .map(d => data.horarios.find(h => h.dia === d.key))
                .filter((h): h is NonNullable<typeof h> => h !== undefined)
                .map(h => (
                  <span key={h.dia}>{DIAS_LABEL[h.dia] ?? h.dia}: {h.horario}</span>
                ))}
            </div>
          )
        } />
        <Row label="Duração" value={duracaoLabel} />
        <Row label="Local" value={data.local ? data.local + (data.endereco ? ` — ${data.endereco}` : '') : '—'} />
        <div className="h-px" style={{ background: 'var(--border-subtle)' }} />
        <Row
          label="Cobrança"
          value={data.modelo_cobranca === 'mensalidade' ? 'Mensalidade fixa' : 'Por aula'}
        />
        <Row
          label={data.modelo_cobranca === 'mensalidade' ? 'Mensalidade' : 'Valor/aula'}
          value={
            <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
              {formatCurrency(parseFloat(data.valor) || 0)}
            </span>
          }
        />
        {data.modelo_cobranca === 'por_aula' && (
          <Row
            label="Previsão mensal"
            value={
              <span style={{ color: 'var(--green-primary)', fontWeight: 600 }}>
                {formatCurrency(previsao)}
              </span>
            }
          />
        )}
      </Section>

      {/* Saúde */}
      <Section title="Saúde e Objetivo" step={2} onEdit={onEdit}>
        <Row
          label="Objetivos"
          value={
            data.objetivos.length > 0 ? (
              <div className="flex flex-wrap gap-1 justify-end">
                {data.objetivos.map((obj) => (
                  <span
                    key={obj}
                    className="text-xs px-2 py-0.5 rounded-full"
                    style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}
                  >
                    {obj}
                  </span>
                ))}
              </div>
            ) : (
              '—'
            )
          }
        />
        {data.restricoes && <Row label="Restrições" value={data.restricoes} />}
        {data.observacoes && <Row label="Observações" value={data.observacoes} />}
      </Section>
    </div>
  )
}
