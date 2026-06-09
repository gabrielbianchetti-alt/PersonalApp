'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { NovaSuspensaoModal } from '../../suspensoes/NovaSuspensaoModal'

interface Props {
  alunoId: string
  alunoNome: string
  alunoHorarios: { dia: string; horario: string }[]
}

export function SuspenderAlunoButton({ alunoId, alunoNome, alunoHorarios }: Props) {
  const [open, setOpen] = useState(false)
  const router = useRouter()

  function handleSaved() {
    setOpen(false)
    router.refresh()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="flex flex-col items-center gap-2 p-4 rounded-xl transition-colors cursor-pointer w-full"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
      >
        <div className="w-10 h-10 rounded-xl flex items-center justify-center" style={{ background: 'rgba(245, 158, 11,0.12)' }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#F59E0B" strokeWidth="2">
            <rect x="6" y="5" width="4" height="14" rx="1" />
            <rect x="14" y="5" width="4" height="14" rx="1" />
          </svg>
        </div>
        <div className="text-center">
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Suspender</p>
          <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>Pausar sem perder cadastro</p>
        </div>
      </button>

      {open && (
        <NovaSuspensaoModal
          alunos={[{ id: alunoId, nome: alunoNome, horarios: alunoHorarios }]}
          onClose={() => setOpen(false)}
          onSaved={handleSaved}
        />
      )}
    </>
  )
}
