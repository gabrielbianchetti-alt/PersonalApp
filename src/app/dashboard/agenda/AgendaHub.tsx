'use client'

import { useState } from 'react'
import dynamic from 'next/dynamic'
import { TabBar } from '@/components/dashboard/TabBar'
import { TabSkeleton } from '@/components/ui/TabSkeleton'
import { AlertBanner } from '@/components/dashboard/AlertBanner'
import { useRealtimeRefresh } from '@/hooks/useRealtimeRefresh'
import type { EventoAgendaRow } from './actions'
import type { FaltaRow, PrefsF } from '../faltas/actions'

// AgendaSemanal tem ~2.7k linhas + DnD — chunk separado reduz JS inicial.
// Faltas (1.3k linhas) também vai em chunk próprio; só carrega ao trocar aba.
const AgendaSemanal = dynamic(
  () => import('./AgendaSemanal').then(m => ({ default: m.AgendaSemanal })),
  { loading: () => <TabSkeleton /> },
)
const Faltas = dynamic(
  () => import('../faltas/Faltas').then(m => ({ default: m.Faltas })),
  { loading: () => <TabSkeleton /> },
)

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoAgenda {
  id: string
  nome: string
  horarios: { dia: string; horario: string }[]
  duracao: number
  local: string
  modelo_cobranca: string
  observacoes: string | null
}

export type AgendaTab = 'grade' | 'faltas'

interface Props {
  initialTab: AgendaTab
  // Grade Semanal
  alunos: AlunoAgenda[]
  eventosIniciais: EventoAgendaRow[]
  // Faltas
  alunosFaltas: { id: string; nome: string }[]
  faltasIniciais: FaltaRow[]
  prefsIniciais: PrefsF
  /** Faltas pendentes vencendo em 7 dias — alimenta o banner. */
  reposicoesUrgentesCount?: number
}

const TABS = [
  { key: 'grade',  label: 'Grade Semanal' },
  { key: 'faltas', label: 'Registros' },
]

// ─── component ────────────────────────────────────────────────────────────────

export function AgendaHub({
  initialTab,
  alunos,
  eventosIniciais,
  alunosFaltas,
  faltasIniciais,
  prefsIniciais,
  reposicoesUrgentesCount = 0,
}: Props) {
  const [tab, setTab] = useState<AgendaTab>(initialTab)
  const [visited, setVisited] = useState<Set<AgendaTab>>(new Set([initialTab]))

  // Live updates do banco — agenda reflete mudanças vindas de outras abas
  // ou dispositivos sem precisar reabrir o app.
  useRealtimeRefresh('eventos_agenda,alunos,faltas,pacotes')

  function go(next: AgendaTab) {
    setTab(next)
    if (!visited.has(next)) setVisited(prev => new Set(prev).add(next))
  }

  return (
    <div className="flex flex-col min-h-full">

      {/* Banner contextual — leva direto pra aba Registros, onde resolve. */}
      {reposicoesUrgentesCount > 0 && tab !== 'faltas' && (
        <AlertBanner
          message={
            reposicoesUrgentesCount === 1
              ? '1 reposição vencendo em até 7 dias.'
              : `${reposicoesUrgentesCount} reposições vencendo em até 7 dias.`
          }
          action={{ label: 'Ver registros', onClick: () => go('faltas') }}
        />
      )}

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Agenda</h1>
        <TabBar tabs={TABS} active={tab} onChange={(k) => go(k as AgendaTab)} />
      </div>

      {/* Tab content — abas visitadas ficam montadas (hidden) pra preservar estado */}
      <div className="flex-1">
        {visited.has('grade') && (
          <div style={{ display: tab === 'grade' ? 'block' : 'none' }}>
            <AgendaSemanal
              alunos={alunos}
              eventosIniciais={eventosIniciais}
              faltasIniciais={faltasIniciais}
              onGoToFaltas={() => go('faltas')}
            />
          </div>
        )}
        {visited.has('faltas') && (
          <div style={{ display: tab === 'faltas' ? 'block' : 'none' }}>
            <Faltas
              alunos={alunos}
              faltasIniciais={faltasIniciais}
              prefsIniciais={prefsIniciais}
            />
          </div>
        )}
      </div>
    </div>
  )
}
