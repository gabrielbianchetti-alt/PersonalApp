'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TabBar } from '@/components/dashboard/TabBar'
import { TabSkeleton } from '@/components/ui/TabSkeleton'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { PacoteComAluno } from '../pacotes/actions'

// Cada aba vira um chunk separado — só baixa quando selecionada
const CalculoMensal = dynamic(
  () => import('../calculo/CalculoMensal').then(m => ({ default: m.CalculoMensal })),
  { loading: () => <TabSkeleton /> },
)
const CobrancaMensal = dynamic(
  () => import('../cobranca/CobrancaMensal').then(m => ({ default: m.CobrancaMensal })),
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

export type FinanceiroTab = 'calculo' | 'cobranca' | 'pacotes'

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
  // Pacotes
  pacotes: PacoteComAluno[]
  /** Cobranças com status=pendente cuja data já passou — alimenta o banner. */
  cobrancasVencidasCount?: number
}

const ALL_TABS = [
  { key: 'calculo',  label: 'Cálculo Mensal',  shortLabel: 'Cálculo' },
  { key: 'cobranca', label: 'Cobrança' },
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
  pacotes,
  cobrancasVencidasCount = 0,
}: Props) {
  const [tab, setTab] = useState<FinanceiroTab>(initialTab)
  // Mantém as abas já visitadas montadas (hidden) para evitar re-fetch/re-render
  // ao alternar. Só monta cada chunk na primeira visita à aba.
  const [visited, setVisited] = useState<Set<FinanceiroTab>>(new Set([initialTab]))

  // Live updates: tudo que afeta cálculo/cobrança/pacotes vem via
  // realtime e dispara router.refresh sem precisar trocar de aba.
  useRealtimeRefresh('eventos_agenda,cobrancas,alunos,faltas,pacotes,feriados_decisoes,preferencias_cobranca')

  // Aba "Pacotes" só faz sentido quando há pacotes ou alunos do tipo pacote
  // — Progressive Disclosure: esconde até existir contexto.
  const hasPacoteContext =
    pacotes.length > 0 ||
    alunosCobranca.some(a => a.modelo_cobranca === 'pacote') ||
    alunosCalculo.some(a => a.modelo_cobranca === 'pacote')

  const TABS = ALL_TABS.filter(t => t.key !== 'pacotes' || hasPacoteContext)

  // Se a tab inicial era "pacotes" mas não há contexto, cai pra "calculo"
  const safeTab: FinanceiroTab = tab === 'pacotes' && !hasPacoteContext ? 'calculo' : tab

  function go(next: FinanceiroTab) {
    setTab(next)
    if (!visited.has(next)) setVisited(prev => new Set(prev).add(next))
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Banner contextual — só fora da aba Cobrança (lá já vai resolver). */}
      {cobrancasVencidasCount > 0 && safeTab !== 'cobranca' && (
        <AlertBanner
          message={
            cobrancasVencidasCount === 1
              ? '1 cobrança vencida precisa de atenção.'
              : `${cobrancasVencidasCount} cobranças vencidas precisam de atenção.`
          }
          action={{ label: 'Ver cobranças', onClick: () => go('cobranca') }}
        />
      )}

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Cobrança</h1>
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
        {hasPacoteContext && visited.has('pacotes') && (
          <div style={{ display: safeTab === 'pacotes' ? 'block' : 'none' }}>
            <PacotesHub pacotes={pacotes} initialError={null} embedded />
          </div>
        )}
      </div>
    </div>
  )
}
