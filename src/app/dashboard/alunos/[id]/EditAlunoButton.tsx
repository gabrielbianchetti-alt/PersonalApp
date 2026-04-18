'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { EditAlunoModal } from './EditAlunoModal'
import type { AlunoFormData, ModeloCobranca } from '@/types/aluno'

export interface AlunoRow {
  id: string
  nome: string
  whatsapp: string | null
  data_nascimento: string | null
  data_inicio: string | null
  emergencia_nome: string | null
  emergencia_telefone: string | null
  emergencia_parentesco: string | null
  horarios: { dia: string; horario: string }[] | null
  duracao: number | null
  local: string | null
  endereco: string | null
  modelo_cobranca: ModeloCobranca | null
  valor: number | null
  forma_pagamento: 'pix' | 'cartao' | null
  dia_cobranca: number | null
  objetivos: string[] | null
  restricoes: string | null
  observacoes: string | null
  /** Pacote ativo, se existir (carregado junto no server) */
  pacoteAtivo?: {
    quantidade_total: number
    validade_dias: number
    data_inicio: string
    data_cobranca: string
  } | null
}

function maskPhone(raw: string | null, length: 11 | 10 = 11): string {
  if (!raw) return ''
  const d = raw.replace(/\D/g, '').slice(0, length)
  if (d.length <= 2) return d.length ? `(${d}` : ''
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`
  if (d.length <= 10) return `(${d.slice(0, 2)}) ${d.slice(2, 6)}-${d.slice(6)}`
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`
}

function alunoToFormData(aluno: AlunoRow): AlunoFormData {
  const hoje = new Date().toISOString().split('T')[0]
  return {
    nome: aluno.nome ?? '',
    whatsapp: maskPhone(aluno.whatsapp),
    data_nascimento: aluno.data_nascimento ?? '',
    data_inicio: aluno.data_inicio ?? '',
    emergencia_nome: aluno.emergencia_nome ?? '',
    emergencia_telefone: maskPhone(aluno.emergencia_telefone),
    emergencia_parentesco: aluno.emergencia_parentesco ?? '',
    horarios: aluno.horarios ?? [],
    duracao: aluno.duracao ? String(aluno.duracao) : '60',
    local: aluno.local ?? '',
    endereco: aluno.endereco ?? '',
    modelo_cobranca: aluno.modelo_cobranca ?? 'por_aula',
    valor: aluno.valor != null ? String(aluno.valor) : '',
    forma_pagamento: aluno.forma_pagamento ?? 'pix',
    dia_cobranca: aluno.dia_cobranca ? String(aluno.dia_cobranca) : '1',
    pacote_quantidade:    aluno.pacoteAtivo ? String(aluno.pacoteAtivo.quantidade_total) : '10',
    pacote_validade_dias: aluno.pacoteAtivo ? String(aluno.pacoteAtivo.validade_dias) : '30',
    pacote_data_inicio:   aluno.pacoteAtivo?.data_inicio ?? hoje,
    pacote_data_cobranca: aluno.pacoteAtivo?.data_cobranca ?? hoje,
    objetivos: aluno.objetivos ?? [],
    restricoes: aluno.restricoes ?? '',
    observacoes: aluno.observacoes ?? '',
  }
}

export function EditAlunoButton({ aluno }: { aluno: AlunoRow }) {
  const [open, setOpen] = useState(false)
  const [toast, setToast] = useState(false)
  const router = useRouter()

  function handleSaved() {
    setOpen(false)
    setToast(true)
    setTimeout(() => setToast(false), 3500)
    router.refresh()
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-sm font-semibold cursor-pointer"
        style={{
          background: 'var(--bg-input)',
          color: 'var(--text-secondary)',
          border: '1px solid var(--border-subtle)',
          fontFamily: 'inherit',
        }}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
        </svg>
        Editar
      </button>

      {open && (
        <EditAlunoModal
          alunoId={aluno.id}
          initialData={alunoToFormData(aluno)}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}

      {toast && (
        <div
          className="fixed bottom-6 right-6 z-[200] flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-semibold shadow-2xl"
          style={{
            background: '#0f172a',
            border: '1px solid #10B981',
            color: '#fff',
            animation: 'fadeInUp 0.25s ease',
          }}
        >
          <span
            className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(16, 185, 129,0.15)', color: '#10B981', fontSize: 12, fontWeight: 700 }}
          >
            ✓
          </span>
          Aluno atualizado com sucesso
        </div>
      )}
    </>
  )
}
