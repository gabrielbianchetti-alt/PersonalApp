'use client'

import { useState } from 'react'
import { TabBar } from '@/components/dashboard/TabBar'
import { AgendaSemanal } from './AgendaSemanal'
import { Faltas } from '../faltas/Faltas'
import type { EventoAgendaRow } from './actions'
import type { FaltaRow, PrefsF } from '../faltas/actions'

// ─── types ────────────────────────────────────────────────────────────────────

interface AlunoAgenda {
  id: string
  nome: string
  dias_semana: string[]
  horario_inicio: string
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
}

const TABS = [
  { key: 'grade',  label: 'Grade Semanal' },
  { key: 'faltas', label: 'Faltas e Reposições' },
]

// ─── component ────────────────────────────────────────────────────────────────

export function AgendaHub({
  initialTab,
  alunos,
  eventosIniciais,
  alunosFaltas,
  faltasIniciais,
  prefsIniciais,
}: Props) {
  const [tab, setTab] = useState<AgendaTab>(initialTab)

  return (
    <div className="flex flex-col min-h-full">

      {/* Section header + tabs */}
      <div
        className="px-4 md:px-6 pt-5 shrink-0"
        style={{ background: 'var(--bg-surface)' }}
      >
        <h1 className="text-xl font-bold mb-4" style={{ color: 'var(--text-primary)' }}>Agenda</h1>
        <TabBar tabs={TABS} active={tab} onChange={(k) => setTab(k as AgendaTab)} />
      </div>

      {/* Tab content */}
      <div className="flex-1">

        {/* ── Grade Semanal ── */}
        {tab === 'grade' && (
          <AgendaSemanal
            alunos={alunos}
            eventosIniciais={eventosIniciais}
          />
        )}

        {/* ── Faltas e Reposições ── */}
        {tab === 'faltas' && (
          <Faltas
            alunos={alunosFaltas}
            faltasIniciais={faltasIniciais}
            prefsIniciais={prefsIniciais}
          />
        )}

      </div>
    </div>
  )
}
