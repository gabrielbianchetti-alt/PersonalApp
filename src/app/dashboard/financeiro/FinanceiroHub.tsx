'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TabBar } from '@/components/dashboard/TabBar'
import { TabSkeleton } from '@/components/ui/TabSkeleton'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
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
}

interface AlunoCobranca {
  id: string
  nome: string
  whatsapp: string
  horarios: { dia: string; horario: string }[]
  modelo_cobranca: string
  valor: number
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
  forma_pagamento_padrao?: 'pix' | 'cartao' | 'ambos' | null
  cobra_adiantado?: boolean | null
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

const ALL_TABS = [
  { key: 'calculo',  label: 'Cálculo Mensal',  shortLabel: 'Cálculo' },
  { key: 'cobranca', label: 'Cobrança' },
  { key: 'custos',   label: 'Custos e Lucro',  shortLabel: 'Custos' },
  { key: 'pacotes',  label: 'Pacotes' },
] as const

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

  // Live updates: tudo que afeta cálculo/cobrança/custos/pacotes vem via
  // realtime e dispara router.refresh sem precisar trocar de aba.
  useRealtimeRefresh('eventos_agenda,cobrancas,alunos,faltas,pacotes,custos,receitas_extras,feriados_decisoes,preferencias_cobranca')

  // Aba "Pacotes" só faz sentido quando há pacotes ou alunos do tipo pacote
  // — Progressive Disclosure: esconde até existir contexto.
  const hasPacoteContext =
    pacotes.length > 0 ||
    alunosCobranca.some(a => a.modelo_cobranca === 'pacote') ||
    alunosCalculo.some(a => a.modelo_cobranca === 'pacote') ||
    alunosCustos.some(a => (a as { modelo_cobranca?: string }).modelo_cobranca === 'pacote')

  const TABS = ALL_TABS.filter(t => t.key !== 'pacotes' || hasPacoteContext)

  // Se a tab inicial era "pacotes" mas não há contexto, cai pra "calculo"
  const safeTab: FinanceiroTab = tab === 'pacotes' && !hasPacoteContext ? 'calculo' : tab

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
        <TabBar tabs={TABS} active={safeTab} onChange={(k) => go(k as FinanceiroTab)} />
      </div>

      {/* Tab content — abas visitadas ficam montadas (com display:none) pra preservar
          estado ao alternar; abas não-visitadas ainda não baixaram o chunk. */}
      <div className="flex-1">
        {visited.has('calculo') && (
          <div style={{ display: safeTab === 'calculo' ? 'block' : 'none' }}>
            <CalculoMensal alunos={alunosCalculo} pacotes={pacotes} preferencias={preferencias} />
          </div>
        )}
        {visited.has('cobranca') && (
          <div style={{ display: safeTab === 'cobranca' ? 'block' : 'none' }}>
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
          <div style={{ display: safeTab === 'custos' ? 'block' : 'none' }}>
            <CustosLucro
              alunos={alunosCustos}
              custosIniciais={custosIniciais}
              receitasExtrasIniciais={receitasExtrasIniciais}
              historicoIniciais={historicoIniciais}
              mesInicial={mesInicial}
            />
          </div>
        )}
        {hasPacoteContext && visited.has('pacotes') && (
          <div style={{ display: safeTab === 'pacotes' ? 'block' : 'none' }}>
            <PacotesHub pacotes={pacotes} initialError={null} embedded />
          </div>
        )}
      </div>
    </div>
  )
}
