'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TabBar } from '@/components/dashboard/TabBar'
import { TabSkeleton } from '@/components/ui/TabSkeleton'
import type { PacoteComAluno } from '../pacotes/actions'
import type { CustoRow, ReceitaExtraRow, HistoricoMes } from './actions'

// Cada aba vira um chunk separado — só baixa quando selecionada
const CalculoMensal = dynamic(
  () => import('../calculo/CalculoMensal').then(m => ({ default: m.CalculoMensal })),
  { loading: () => <TabSkeleton /> },
)
const CobrancaMensal = dynamic(
  () => import('../cobranca/CobrancaMensal').then(m => ({ default: m.CobrancaMensal })),
  { loading: () => <TabSkeleton /> },
)
const CustosLucro = dynamic(
  () => import('./Financeiro').then(m => ({ default: m.Financeiro })),
  { loading: () => <TabSkeleton /> },
)
const PacotesHub = dynamic(
  () => import('../pacotes/PacotesHub').then(m => ({ default: m.PacotesHub })),
  { loading: () => <TabSkeleton /> },
)

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoCalculo {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
  modelo_cobranca: string
  valor: number
  forma_pagamento: string
}

interface AlunoCobranca {
  id: string
  nome: string
  whatsapp: string
  horarios: { dia: string; horario: string }[]
  modelo_cobranca: string
  valor: number
  forma_pagamento: string
  dia_cobranca: number
}

interface CobrancaRow {
  id: string
  aluno_id: string
  mes_referencia: string
  valor: number
  status: 'pendente' | 'enviado' | 'pago'
  mensagem: string | null
}

interface Preferencias {
  chave_pix: string | null
  favorecido_pix: string | null
  link_cartao: string | null
  modelo_mensagem: string | null
  tipo_data_cobranca?: string | null
}

interface AlunoFin {
  id: string
  nome: string
  modelo_cobranca: 'mensalidade' | 'por_aula'
  valor: number
  horarios: { dia: string; horario: string }[]
}

export type FinanceiroTab = 'calculo' | 'cobranca' | 'custos' | 'pacotes'

interface Props {
  initialTab: FinanceiroTab
  // Cálculo Mensal
  alunosCalculo: AlunoCalculo[]
  // Cobrança
  alunosCobranca: AlunoCobranca[]
  cobrancasIniciais: CobrancaRow[]
  preferencias: Preferencias | null
  creditosPorAluno: Record<string, number>
  mesInicial: string
  // Custos e Lucro
  alunosCustos: AlunoFin[]
  custosIniciais: CustoRow[]
  receitasExtrasIniciais: ReceitaExtraRow[]
  historicoIniciais: HistoricoMes[]
  // Pacotes
  pacotes: PacoteComAluno[]
}

const TABS = [
  { key: 'calculo',  label: 'Cálculo Mensal',  shortLabel: 'Cálculo' },
  { key: 'cobranca', label: 'Cobrança' },
  { key: 'custos',   label: 'Custos e Lucro',  shortLabel: 'Custos' },
  { key: 'pacotes',  label: 'Pacotes' },
]

// ─── component ────────────────────────────────────────────────────────────────

export function FinanceiroHub({
  initialTab,
  alunosCalculo,
  alunosCobranca,
  cobrancasIniciais,
  preferencias,
  creditosPorAluno,
  mesInicial,
  alunosCustos,
  custosIniciais,
  receitasExtrasIniciais,
  historicoIniciais,
  pacotes,
}: Props) {
  const [tab, setTab] = useState<FinanceiroTab>(initialTab)
  // Mantém as abas já visitadas montadas (hidden) para evitar re-fetch/re-render
  // ao alternar. Só monta cada chunk na primeira visita à aba.
  const [visited, setVisited] = useState<Set<FinanceiroTab>>(new Set([initialTab]))

  function go(next: FinanceiroTab) {
    setTab(next)
    if (!visited.has(next)) setVisited(prev => new Set(prev).add(next))
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
        <TabBar tabs={TABS} active={tab} onChange={(k) => go(k as FinanceiroTab)} />
      </div>

      {/* Tab content — abas visitadas ficam montadas (com display:none) pra preservar
          estado ao alternar; abas não-visitadas ainda não baixaram o chunk. */}
      <div className="flex-1">
        {visited.has('calculo') && (
          <div style={{ display: tab === 'calculo' ? 'block' : 'none' }}>
            <CalculoMensal alunos={alunosCalculo} pacotes={pacotes} preferencias={preferencias} />
          </div>
        )}
        {visited.has('cobranca') && (
          <div style={{ display: tab === 'cobranca' ? 'block' : 'none' }}>
            <CobrancaMensal
              alunos={alunosCobranca}
              cobrancasIniciais={cobrancasIniciais}
              preferencias={preferencias}
              mesInicial={mesInicial}
              creditosPorAluno={creditosPorAluno}
              pacotes={pacotes}
            />
          </div>
        )}
        {visited.has('custos') && (
          <div style={{ display: tab === 'custos' ? 'block' : 'none' }}>
            <CustosLucro
              alunos={alunosCustos}
              custosIniciais={custosIniciais}
              receitasExtrasIniciais={receitasExtrasIniciais}
              historicoIniciais={historicoIniciais}
              mesInicial={mesInicial}
            />
          </div>
        )}
        {visited.has('pacotes') && (
          <div style={{ display: tab === 'pacotes' ? 'block' : 'none' }}>
            <PacotesHub pacotes={pacotes} initialError={null} embedded />
          </div>
        )}
      </div>
    </div>
  )
}
