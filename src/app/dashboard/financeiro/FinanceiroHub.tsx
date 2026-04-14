'use client'

import { useState } from 'react'
import { TabBar } from '@/components/dashboard/TabBar'
import { CalculoMensal } from '../calculo/CalculoMensal'
import { CobrancaMensal } from '../cobranca/CobrancaMensal'
import { Financeiro as CustosLucro } from './Financeiro'
import type { CustoRow } from './actions'

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

export type FinanceiroTab = 'calculo' | 'cobranca' | 'custos'

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
}

const TABS = [
  { key: 'calculo',  label: 'Cálculo Mensal' },
  { key: 'cobranca', label: 'Cobrança' },
  { key: 'custos',   label: 'Custos e Lucro' },
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
}: Props) {
  const [tab, setTab] = useState<FinanceiroTab>(initialTab)

  return (
    <div className="flex flex-col min-h-full">

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Financeiro</h1>
        <TabBar tabs={TABS} active={tab} onChange={(k) => setTab(k as FinanceiroTab)} />
      </div>

      {/* Tab content */}
      <div className="flex-1">

        {/* ── Cálculo Mensal ── */}
        {tab === 'calculo' && (
          <CalculoMensal alunos={alunosCalculo} />
        )}

        {/* ── Cobrança ── */}
        {tab === 'cobranca' && (
          <CobrancaMensal
            alunos={alunosCobranca}
            cobrancasIniciais={cobrancasIniciais}
            preferencias={preferencias}
            mesInicial={mesInicial}
            creditosPorAluno={creditosPorAluno}
          />
        )}

        {/* ── Custos e Lucro ── */}
        {tab === 'custos' && (
          <CustosLucro
            alunos={alunosCustos}
            custosIniciais={custosIniciais}
            mesInicial={mesInicial}
          />
        )}

      </div>
    </div>
  )
}
