'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Stepper } from '@/components/alunos/Stepper'
import { StepDadosPessoais } from '@/components/alunos/steps/StepDadosPessoais'
import { StepTreino } from '@/components/alunos/steps/StepTreino'
import { StepSaude } from '@/components/alunos/steps/StepSaude'
import { StepRevisao } from '@/components/alunos/steps/StepRevisao'
import { Button } from '@/components/ui/Button'
import { Alert } from '@/components/ui/Alert'
import { AlunoFormData, HorarioDia, initialFormData } from '@/types/aluno'
import { criarAlunoAction } from './actions'

const STEPS = ['Dados Pessoais', 'Treino', 'Saúde', 'Revisão']

function validateStep(step: number, data: AlunoFormData): Record<string, string> {
  const errors: Record<string, string> = {}

  if (step === 0) {
    if (!data.nome.trim()) errors.nome = 'Nome é obrigatório'
    const digits = data.whatsapp.replace(/\D/g, '')
    if (digits.length < 11) errors.whatsapp = 'WhatsApp inválido (DDD + 9 dígitos)'
    if (!data.data_nascimento) errors.data_nascimento = 'Data de nascimento é obrigatória'
    if (!data.data_inicio) errors.data_inicio = 'Data de início é obrigatória'
  }

  if (step === 1) {
    if (data.horarios.length === 0) errors.horarios = 'Selecione ao menos um dia'
    // Check each selected day has a horario
    data.horarios.forEach(h => {
      if (!h.horario) errors[`horarios_${h.dia}`] = 'Informe o horário'
    })
    if (!data.local) errors.local = 'Local é obrigatório'
    const valorNum = parseFloat(data.valor)
    if (!data.valor || isNaN(valorNum) || valorNum <= 0) errors.valor = 'Informe um valor válido'
  }

  if (step === 2) {
    if (data.objetivos.length === 0) errors.objetivos = 'Selecione ao menos um objetivo'
  }

  return errors
}

export function NovoAlunoForm() {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const [formData, setFormData] = useState<AlunoFormData>(initialFormData())
  const [errors, setErrors] = useState<Record<string, string>>({})
  const [saveError, setSaveError] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  function handleChange(field: keyof AlunoFormData, value: string | string[] | HorarioDia[]) {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) setErrors((prev) => { const e = { ...prev }; delete e[field]; return e })
  }

  function handleNext() {
    const errs = validateStep(step, formData)
    if (Object.keys(errs).length > 0) {
      setErrors(errs)
      return
    }
    setErrors({})
    setStep((s) => s + 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleBack() {
    setErrors({})
    setStep((s) => s - 1)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  function handleEdit(targetStep: number) {
    setErrors({})
    setStep(targetStep)
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  async function handleSave() {
    setLoading(true)
    setSaveError(null)
    const result = await criarAlunoAction(formData)
    if (result?.error) {
      setSaveError(result.error)
      setLoading(false)
      return
    }
    router.push('/dashboard/alunos?success=1')
  }

  return (
    <div className="min-h-screen p-4 md:p-8" style={{ background: 'var(--bg-base)' }}>
      <div className="max-w-2xl mx-auto">
        {/* Back link */}
        <button
          type="button"
          onClick={() => router.push('/dashboard/alunos')}
          className="flex items-center gap-2 mb-6 text-sm transition-colors cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.color = 'var(--text-primary)')}
          onMouseLeave={(e) => (e.currentTarget.style.color = 'var(--text-secondary)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6" />
          </svg>
          Voltar para Alunos
        </button>

        <div className="mb-8">
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Novo Aluno
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--text-secondary)' }}>
            Preencha as informações em 4 etapas
          </p>
        </div>

        {/* Stepper */}
        <div className="mb-8">
          <Stepper steps={STEPS} current={step} />
        </div>

        {/* Card */}
        <div
          className="rounded-2xl p-6 md:p-8 mb-6"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
        >
          {step === 0 && (
            <StepDadosPessoais data={formData} errors={errors} onChange={handleChange} />
          )}
          {step === 1 && (
            <StepTreino data={formData} errors={errors} onChange={handleChange} />
          )}
          {step === 2 && (
            <StepSaude data={formData} errors={errors} onChange={handleChange} />
          )}
          {step === 3 && (
            <StepRevisao data={formData} onEdit={handleEdit} />
          )}
        </div>

        {/* Save error */}
        {saveError && (
          <div className="mb-4">
            <Alert type="error" message={saveError} />
          </div>
        )}

        {/* Navigation buttons */}
        <div className="flex gap-3">
          {step > 0 && (
            <Button variant="ghost" onClick={handleBack} className="flex-1" disabled={loading}>
              Voltar
            </Button>
          )}
          {step < STEPS.length - 1 ? (
            <Button onClick={handleNext} className="flex-1">
              Próximo
            </Button>
          ) : (
            <Button onClick={handleSave} loading={loading} className="flex-1">
              Salvar Aluno
            </Button>
          )}
        </div>
      </div>
    </div>
  )
}
