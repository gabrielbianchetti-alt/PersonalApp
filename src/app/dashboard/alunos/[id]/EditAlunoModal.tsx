'use client'

import { useState } from 'react'
import { StepDadosPessoais } from '@/components/alunos/steps/StepDadosPessoais'
import { StepTreino } from '@/components/alunos/steps/StepTreino'
import { StepSaude } from '@/components/alunos/steps/StepSaude'
import type { AlunoFormData, HorarioDia } from '@/types/aluno'
import { updateAlunoAction } from './actions'

const TABS = ['Pessoal', 'Treino', 'Saúde']

function validateAll(data: AlunoFormData): Record<string, string> {
  const errs: Record<string, string> = {}
  // Personal
  if (!data.nome.trim()) errs.nome = 'Nome é obrigatório'
  const digits = data.whatsapp.replace(/\D/g, '')
  if (digits.length < 11) errs.whatsapp = 'WhatsApp inválido (DDD + 9 dígitos)'
  if (!data.data_nascimento) errs.data_nascimento = 'Data de nascimento é obrigatória'
  if (!data.data_inicio) errs.data_inicio = 'Data de início é obrigatória'
  // Training
  if (data.horarios.length === 0) errs.horarios = 'Selecione ao menos um dia'
  data.horarios.forEach(h => { if (!h.horario) errs[`horarios_${h.dia}`] = 'Informe o horário' })
  if (!data.local) errs.local = 'Local é obrigatório'
  const valorNum = parseFloat(data.valor)
  if (!data.valor || isNaN(valorNum) || valorNum <= 0) errs.valor = 'Informe um valor válido'
  // Health
  if (data.objetivos.length === 0) errs.objetivos = 'Selecione ao menos um objetivo'
  return errs
}

function tabHasErrors(tabIdx: number, errors: Record<string, string>): boolean {
  if (tabIdx === 0) return !!(errors.nome || errors.whatsapp || errors.data_nascimento || errors.data_inicio)
  if (tabIdx === 1) return !!(errors.horarios || errors.local || errors.valor || Object.keys(errors).some(k => k.startsWith('horarios_')))
  if (tabIdx === 2) return !!errors.objetivos
  return false
}

interface Props {
  alunoId: string
  initialData: AlunoFormData
  onClose: () => void
  onSaved: () => void
}

export function EditAlunoModal({ alunoId, initialData, onClose, onSaved }: Props) {
  const [tab, setTab] = useState(0)
  const [formData, setFormData] = useState<AlunoFormData>(initialData)
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saving, setSaving] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  function handleChange(field: keyof AlunoFormData, value: string | string[] | HorarioDia[]) {
    setFormData(prev => ({ ...prev, [field]: value }))
    const key = field as string
    if (errors[key]) setErrors(prev => { const e = { ...prev }; delete e[key]; return e })
    // also clear per-day horario errors when horarios change
    if (field === 'horarios') {
      setErrors(prev => {
        const e = { ...prev }
        Object.keys(e).filter(k => k.startsWith('horarios_')).forEach(k => delete e[k])
        return e
      })
    }
  }

  async function handleSave() {
    const errs = validateAll(formData)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      // jump to first tab with errors
      if (tabHasErrors(0, errs)) setTab(0)
      else if (tabHasErrors(1, errs)) setTab(1)
      else setTab(2)
      return
    }
    setSaving(true)
    setSaveError(null)
    const result = await updateAlunoAction(alunoId, formData)
    setSaving(false)
    if (result.error) { setSaveError(result.error); return }
    onSaved()
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center p-0 sm:p-4"
      style={{ background: 'rgba(0,0,0,0.65)', backdropFilter: 'blur(4px)' }}
      onClick={onClose}
    >
      <div
        className="w-full sm:max-w-2xl rounded-t-2xl sm:rounded-2xl flex flex-col"
        style={{
          background: 'var(--bg-surface)',
          border: '1px solid var(--border-subtle)',
          maxHeight: '92vh',
          boxShadow: '0 24px 64px rgba(0,0,0,0.4)',
        }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div
          className="flex items-center justify-between px-5 py-4 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          <div>
            <h2 className="text-base font-bold" style={{ color: 'var(--text-primary)' }}>
              Editar aluno
            </h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Alterações refletem na agenda, cálculo e cobrança
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg flex items-center justify-center cursor-pointer text-lg leading-none"
            style={{ background: 'var(--bg-input)', color: 'var(--text-muted)', border: '1px solid var(--border-subtle)' }}
            aria-label="Fechar"
          >
            ×
          </button>
        </div>

        {/* Tabs */}
        <div
          className="flex shrink-0 px-5 gap-1 pt-2"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}
        >
          {TABS.map((t, i) => (
            <button
              key={t}
              onClick={() => setTab(i)}
              className="relative px-4 py-2.5 text-sm font-semibold cursor-pointer"
              style={{
                background: 'transparent',
                border: 'none',
                borderBottom: tab === i ? '2px solid var(--green-primary)' : '2px solid transparent',
                color: tab === i ? 'var(--green-primary)' : 'var(--text-muted)',
                fontFamily: 'inherit',
                transition: 'color 0.15s',
              }}
            >
              {t}
              {tabHasErrors(i, errors) && (
                <span
                  className="absolute top-2 right-1.5 w-1.5 h-1.5 rounded-full"
                  style={{ background: '#EF4444' }}
                />
              )}
            </button>
          ))}
        </div>

        {/* Scrollable body */}
        <div className="flex-1 overflow-y-auto px-5 py-5 min-h-0">
          {saveError && (
            <div
              className="mb-4 px-4 py-3 rounded-xl text-sm"
              style={{
                background: 'rgba(239, 68, 68,0.08)',
                border: '1px solid rgba(239, 68, 68,0.25)',
                color: '#EF4444',
              }}
            >
              {saveError}
            </div>
          )}
          {tab === 0 && (
            <StepDadosPessoais
              data={formData}
              errors={errors}
              onChange={handleChange as (field: keyof AlunoFormData, value: string) => void}
            />
          )}
          {tab === 1 && (
            <StepTreino
              data={formData}
              errors={errors}
              onChange={handleChange}
            />
          )}
          {tab === 2 && (
            <StepSaude
              data={formData}
              errors={errors}
              onChange={handleChange as (field: keyof AlunoFormData, value: string | string[]) => void}
            />
          )}
        </div>

        {/* Footer */}
        <div
          className="flex items-center justify-between gap-3 px-5 py-4 shrink-0"
          style={{ borderTop: '1px solid var(--border-subtle)' }}
        >
          <div className="flex items-center gap-2 text-xs" style={{ color: 'var(--text-muted)' }}>
            {tab < 2 && (
              <button
                onClick={() => setTab(t => t + 1)}
                className="text-xs cursor-pointer"
                style={{ background: 'none', border: 'none', color: 'var(--text-muted)', fontFamily: 'inherit' }}
              >
                Próximo →
              </button>
            )}
          </div>
          <div className="flex gap-3">
            <button
              onClick={onClose}
              className="px-5 py-2.5 rounded-xl text-sm font-semibold cursor-pointer"
              style={{
                background: 'var(--bg-input)',
                color: 'var(--text-secondary)',
                border: '1px solid var(--border-subtle)',
                fontFamily: 'inherit',
              }}
            >
              Cancelar
            </button>
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-6 py-2.5 rounded-xl text-sm font-bold cursor-pointer"
              style={{
                background: 'var(--green-primary)',
                color: '#000',
                opacity: saving ? 0.7 : 1,
                border: 'none',
                fontFamily: 'inherit',
                transition: 'opacity 0.15s',
              }}
            >
              {saving ? 'Salvando...' : 'Salvar alterações'}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
