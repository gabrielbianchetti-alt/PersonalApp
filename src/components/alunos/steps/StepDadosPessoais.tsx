'use client'

import { useState } from 'react'
import { Input } from '@/components/ui/Input'
import { AlunoFormData } from '@/types/aluno'

function maskWhatsApp(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 7) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 11)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
  return value
}

function maskPhone(value: string): string {
  const digits = value.replace(/\D/g, '').slice(0, 11)
  if (digits.length <= 2) return digits.length ? `(${digits}` : ''
  if (digits.length <= 6) return `(${digits.slice(0, 2)}) ${digits.slice(2)}`
  if (digits.length <= 10)
    return `(${digits.slice(0, 2)}) ${digits.slice(2, 6)}-${digits.slice(6)}`
  return `(${digits.slice(0, 2)}) ${digits.slice(2, 7)}-${digits.slice(7)}`
}

interface Props {
  data: AlunoFormData
  errors: Record<string, string>
  onChange: (field: keyof AlunoFormData, value: string) => void
}

export function StepDadosPessoais({ data, errors, onChange }: Props) {
  const [showEmergencia, setShowEmergencia] = useState(
    !!(data.emergencia_nome || data.emergencia_telefone)
  )

  function calcularAniversario(dataNasc: string): string {
    if (!dataNasc) return ''
    const hoje = new Date()
    const nasc = new Date(dataNasc + 'T00:00:00')
    const proximoAniv = new Date(hoje.getFullYear(), nasc.getMonth(), nasc.getDate())
    if (proximoAniv < hoje) proximoAniv.setFullYear(hoje.getFullYear() + 1)
    const diff = Math.ceil((proximoAniv.getTime() - hoje.getTime()) / (1000 * 60 * 60 * 24))
    if (diff === 0) return '🎂 Hoje é o aniversário!'
    if (diff === 1) return '🎂 Aniversário amanhã!'
    return `🎂 Aniversário em ${diff} dias`
  }

  const aniversarioInfo = calcularAniversario(data.data_nascimento)

  return (
    <div className="flex flex-col gap-5">
      <div>
        <h2 className="text-lg font-bold" style={{ color: 'var(--text-primary)' }}>
          Dados Pessoais
        </h2>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
          Informações básicas do aluno
        </p>
      </div>

      <Input
        id="nome"
        label="Nome completo *"
        type="text"
        placeholder="João Silva"
        value={data.nome}
        onChange={(e) => onChange('nome', e.target.value)}
        error={errors.nome}
        autoComplete="off"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
            <circle cx="12" cy="7" r="4" />
          </svg>
        }
      />

      <Input
        id="whatsapp"
        label="WhatsApp *"
        type="tel"
        placeholder="(11) 9 9999-9999"
        value={data.whatsapp}
        onChange={(e) => onChange('whatsapp', maskWhatsApp(e.target.value))}
        error={errors.whatsapp}
        autoComplete="off"
        icon={
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07A19.5 19.5 0 0 1 4.69 12 19.79 19.79 0 0 1 1.61 3.41 2 2 0 0 1 3.6 1.22h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L7.91 8.89a16 16 0 0 0 6 6l.86-.86a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 21.5 16.1z" />
          </svg>
        }
      />

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div className="flex flex-col gap-1.5">
          <Input
            id="data_nascimento"
            label="Data de nascimento *"
            type="date"
            value={data.data_nascimento}
            onChange={(e) => onChange('data_nascimento', e.target.value)}
            error={errors.data_nascimento}
          />
          {aniversarioInfo && (
            <p className="text-xs px-1" style={{ color: 'var(--green-primary)' }}>
              {aniversarioInfo}
            </p>
          )}
        </div>

        <Input
          id="data_inicio"
          label="Data de início *"
          type="date"
          value={data.data_inicio}
          onChange={(e) => onChange('data_inicio', e.target.value)}
          error={errors.data_inicio}
        />
      </div>

      {/* Contato de emergência */}
      <div
        className="rounded-xl overflow-hidden"
        style={{ border: '1px solid var(--border-subtle)' }}
      >
        <button
          type="button"
          onClick={() => setShowEmergencia((v) => !v)}
          className="w-full flex items-center justify-between px-4 py-3 cursor-pointer"
          style={{ background: 'var(--bg-input)' }}
        >
          <span className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>
            Contato de emergência{' '}
            <span className="font-normal" style={{ color: 'var(--text-muted)' }}>
              (opcional)
            </span>
          </span>
          <svg
            width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
            style={{
              color: 'var(--text-muted)',
              transform: showEmergencia ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.15s',
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </button>

        {showEmergencia && (
          <div className="flex flex-col gap-4 p-4" style={{ background: 'var(--bg-card)' }}>
            <Input
              id="emergencia_nome"
              label="Nome"
              type="text"
              placeholder="Maria Silva"
              value={data.emergencia_nome}
              onChange={(e) => onChange('emergencia_nome', e.target.value)}
            />
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <Input
                id="emergencia_telefone"
                label="Telefone"
                type="tel"
                placeholder="(11) 9999-9999"
                value={data.emergencia_telefone}
                onChange={(e) => onChange('emergencia_telefone', maskPhone(e.target.value))}
              />
              <Input
                id="emergencia_parentesco"
                label="Parentesco"
                type="text"
                placeholder="Mãe, Cônjuge..."
                value={data.emergencia_parentesco}
                onChange={(e) => onChange('emergencia_parentesco', e.target.value)}
              />
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
