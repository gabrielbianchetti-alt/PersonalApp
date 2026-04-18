'use client'

import { useState, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { deleteAlunoAction } from './actions'

interface Props {
  alunoId: string
  alunoNome: string
}

export function DeleteAlunoButton({ alunoId, alunoNome }: Props) {
  const router = useRouter()
  const [isPending, startTransition] = useTransition()

  // step: null = closed | 'confirm' = first modal | 'type' = type-name modal
  const [step, setStep] = useState<null | 'confirm' | 'type'>(null)
  const [typed, setTyped]   = useState('')
  const [erro, setErro]     = useState('')

  const firstName = alunoNome.split(' ')[0]
  const match     = typed.trim().toLowerCase() === alunoNome.trim().toLowerCase()

  function open()  { setStep('confirm'); setTyped(''); setErro('') }
  function close() { setStep(null);     setTyped(''); setErro('') }

  function handleConfirm() {
    setStep('type')
  }

  function handleDelete() {
    if (!match) return
    startTransition(async () => {
      const res = await deleteAlunoAction(alunoId)
      if (res.error) {
        setErro(res.error)
        return
      }
      router.push('/dashboard/alunos?toast=excluido')
    })
  }

  return (
    <>
      {/* Trigger button */}
      <button
        onClick={open}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors duration-100 cursor-pointer"
        style={{ color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.2)', background: 'rgba(239, 68, 68,0.05)' }}
        onMouseEnter={e => { e.currentTarget.style.background = 'rgba(239, 68, 68,0.12)' }}
        onMouseLeave={e => { e.currentTarget.style.background = 'rgba(239, 68, 68,0.05)' }}
      >
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <polyline points="3 6 5 6 21 6" />
          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
          <path d="M10 11v6M14 11v6" />
          <path d="M9 6V4h6v2" />
        </svg>
        <span className="text-sm font-medium">Excluir aluno</span>
      </button>

      {/* ── Step 1: initial confirmation ──────────────────────────────────── */}
      {step === 'confirm' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239, 68, 68,0.3)' }}
          >
            {/* Icon */}
            <div className="flex items-center justify-center">
              <div
                className="w-14 h-14 rounded-full flex items-center justify-center"
                style={{ background: 'rgba(239, 68, 68,0.12)' }}
              >
                <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="#EF4444" strokeWidth="2">
                  <path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z" />
                  <line x1="12" y1="9" x2="12" y2="13" />
                  <line x1="12" y1="17" x2="12.01" y2="17" />
                </svg>
              </div>
            </div>

            <div className="text-center">
              <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Excluir {firstName}?
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)', lineHeight: '1.55' }}>
                Todos os dados serão apagados <strong>permanentemente</strong>: faltas, cobranças, termos, agenda e suspensões.
                <br /><br />
                Esta ação <strong>não pode ser desfeita</strong>.
              </p>
            </div>

            <div className="flex gap-2 mt-1">
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleConfirm}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
                style={{ background: 'rgba(239, 68, 68,0.15)', color: '#EF4444', border: '1px solid rgba(239, 68, 68,0.3)' }}
              >
                Continuar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── Step 2: type name to confirm ──────────────────────────────────── */}
      {step === 'type' && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={e => { if (e.target === e.currentTarget) close() }}
        >
          <div
            className="w-full max-w-sm rounded-2xl p-6 flex flex-col gap-4"
            style={{ background: 'var(--bg-surface)', border: '1px solid rgba(239, 68, 68,0.3)' }}
          >
            <div>
              <h2 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
                Confirme digitando o nome
              </h2>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Digite <strong style={{ color: 'var(--text-primary)' }}>{alunoNome}</strong> para confirmar a exclusão:
              </p>
            </div>

            <input
              type="text"
              value={typed}
              onChange={e => { setTyped(e.target.value); setErro('') }}
              placeholder={alunoNome}
              autoFocus
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{
                background: 'var(--bg-input)',
                border: `1px solid ${match ? 'rgba(239, 68, 68,0.6)' : 'var(--border-subtle)'}`,
                color: 'var(--text-primary)',
              }}
              onKeyDown={e => { if (e.key === 'Enter' && match && !isPending) handleDelete() }}
            />

            {erro && (
              <p className="text-xs" style={{ color: '#EF4444' }}>{erro}</p>
            )}

            <div className="flex gap-2">
              <button
                onClick={close}
                className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
                style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
              >
                Cancelar
              </button>
              <button
                onClick={handleDelete}
                disabled={!match || isPending}
                className="flex-1 py-2.5 rounded-xl text-sm font-bold cursor-pointer transition-opacity"
                style={{
                  background: match ? '#EF4444' : 'rgba(239, 68, 68,0.2)',
                  color: match ? '#fff' : 'rgba(239, 68, 68,0.5)',
                  opacity: isPending ? 0.7 : 1,
                  cursor: (!match || isPending) ? 'not-allowed' : 'pointer',
                }}
              >
                {isPending ? 'Excluindo…' : 'Excluir permanentemente'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
