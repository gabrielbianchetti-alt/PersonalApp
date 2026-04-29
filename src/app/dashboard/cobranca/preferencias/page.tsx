'use client'

import { useActionState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { createClient } from '@/lib/supabase/client'
import { savePreferenciasAction } from './actions'
import React from 'react'

const DEFAULT_TEMPLATE = `Olá, {nome}! 👋

Segue sua cobrança referente a *{mes}*:

📅 Datas das aulas: dias {datas}
📊 Total de aulas: {aulas}
💰 Valor: *{total}*

{pagamento}`

function InputField({
  label,
  name,
  defaultValue,
  placeholder,
  hint,
}: {
  label: string
  name: string
  defaultValue?: string | null
  placeholder?: string
  hint?: string
}) {
  return (
    <div>
      <label className="block text-sm font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
        {label}
      </label>
      <input
        type="text"
        name={name}
        defaultValue={defaultValue ?? ''}
        placeholder={placeholder}
        className="w-full px-4 py-2.5 rounded-xl text-sm outline-none"
        style={{
          background: 'var(--bg-input)',
          border: '1px solid var(--border-subtle)',
          color: 'var(--text-primary)',
        }}
        onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.06)' }}
        onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
      />
      {hint && <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>{hint}</p>}
    </div>
  )
}

export default function PreferenciasPage() {
  const router = useRouter()
  const [prefs, setPrefs] = React.useState<{
    chave_pix: string | null
    favorecido_pix: string | null
    link_cartao: string | null
    modelo_mensagem: string | null
    tipo_data_cobranca: string | null
    forma_pagamento_padrao: 'pix' | 'cartao' | 'ambos' | null
  } | null>(null)

  const [state, formAction, isPending] = useActionState(savePreferenciasAction, null)

  useEffect(() => {
    const supabase = createClient()
    supabase.auth.getUser().then(async ({ data: { user } }) => {
      if (!user) return
      const { data } = await supabase
        .from('preferencias_cobranca')
        .select('*')
        .eq('professor_id', user.id)
        .maybeSingle()
      setPrefs(data ?? { chave_pix: null, favorecido_pix: null, link_cartao: null, modelo_mensagem: null, tipo_data_cobranca: null, forma_pagamento_padrao: null })
    })
  }, [])

  useEffect(() => {
    if (state?.success) {
      router.push('/dashboard/cobranca')
    }
  }, [state, router])

  if (prefs === null) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <svg className="animate-spin" width="24" height="24" viewBox="0 0 24 24" fill="none">
          <circle cx="12" cy="12" r="10" stroke="currentColor" strokeOpacity=".25" strokeWidth="3"/>
          <path d="M12 2a10 10 0 0 1 10 10" stroke="var(--green-primary)" strokeWidth="3" strokeLinecap="round"/>
        </svg>
      </div>
    )
  }

  return (
    <div className="p-6 md:p-8 max-w-2xl mx-auto">

      {/* Header */}
      <div className="flex items-center gap-3 mb-8">
        <button
          onClick={() => router.back()}
          className="w-9 h-9 rounded-xl flex items-center justify-center transition-colors cursor-pointer"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
          onMouseEnter={(e) => (e.currentTarget.style.borderColor = 'var(--border-focus)')}
          onMouseLeave={(e) => (e.currentTarget.style.borderColor = 'var(--border-subtle)')}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <polyline points="15 18 9 12 15 6"/>
          </svg>
        </button>
        <div>
          <h1 className="text-2xl font-bold" style={{ color: 'var(--text-primary)' }}>Preferências</h1>
          <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
            Configure dados de pagamento e mensagem padrão
          </p>
        </div>
      </div>

      <form action={formAction} className="flex flex-col gap-6">

        {/* Forma de pagamento padrão */}
        <div className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Forma de pagamento padrão</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Aplicada automaticamente em todas as mensagens de cobrança
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { value: 'pix',    label: 'Apenas Pix',     desc: 'Cobranças mostram só a chave Pix' },
              { value: 'cartao', label: 'Apenas Cartão',  desc: 'Cobranças mostram só o link de pagamento' },
              { value: 'ambos',  label: 'Pix e Cartão',   desc: 'Mostra os dois com instrução "Escolha a forma de pagamento"' },
            ].map(opt => {
              const isActive = (prefs.forma_pagamento_padrao ?? 'pix') === opt.value
              return (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    background: isActive ? 'var(--green-muted)' : 'var(--bg-input)',
                    border: `1px solid ${isActive ? 'rgba(16, 185, 129,0.25)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="forma_pagamento_padrao"
                    value={opt.value}
                    defaultChecked={isActive}
                    className="mt-0.5 accent-[#10B981]"
                    onChange={() => setPrefs(p => p ? { ...p, forma_pagamento_padrao: opt.value as 'pix' | 'cartao' | 'ambos' } : p)}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: isActive ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Pix section */}
        <div className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Pix</p>
          <InputField
            label="Chave Pix"
            name="chave_pix"
            defaultValue={prefs.chave_pix}
            placeholder="CPF, e-mail, telefone ou chave aleatória"
          />
          <InputField
            label="Nome do favorecido"
            name="favorecido_pix"
            defaultValue={prefs.favorecido_pix}
            placeholder="Seu nome ou nome do beneficiário"
          />
        </div>

        {/* Cartão section */}
        <div className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cartão / Link de pagamento</p>
          <InputField
            label="Link de pagamento"
            name="link_cartao"
            defaultValue={prefs.link_cartao}
            placeholder="https://..."
            hint="Link do Mercado Pago, PagSeguro, etc."
          />
        </div>

        {/* Data de cobrança */}
        <div className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Data de cobrança</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Como o vencimento de cada aluno é determinado
            </p>
          </div>
          <div className="flex flex-col gap-2">
            {[
              { value: 'dia_1', label: 'Cobrar no dia 1', desc: 'Todos os alunos vencem no dia 1 de cada mês' },
              { value: 'personalizado', label: 'Data personalizada por aluno', desc: 'Cada aluno tem seu próprio dia de vencimento' },
            ].map(opt => {
              const isActive = (prefs.tipo_data_cobranca ?? 'dia_1') === opt.value
              return (
                <label
                  key={opt.value}
                  className="flex items-start gap-3 px-4 py-3 rounded-xl cursor-pointer transition-colors"
                  style={{
                    background: isActive ? 'var(--green-muted)' : 'var(--bg-input)',
                    border: `1px solid ${isActive ? 'rgba(16, 185, 129,0.25)' : 'var(--border-subtle)'}`,
                  }}
                >
                  <input
                    type="radio"
                    name="tipo_data_cobranca"
                    value={opt.value}
                    defaultChecked={isActive}
                    className="mt-0.5 accent-[#10B981]"
                    onChange={() => setPrefs(p => p ? { ...p, tipo_data_cobranca: opt.value } : p)}
                  />
                  <div>
                    <p className="text-sm font-medium" style={{ color: isActive ? 'var(--green-primary)' : 'var(--text-primary)' }}>
                      {opt.label}
                    </p>
                    <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>{opt.desc}</p>
                  </div>
                </label>
              )
            })}
          </div>
        </div>

        {/* Template section */}
        <div className="rounded-2xl p-5 flex flex-col gap-4"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Modelo de mensagem</p>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Variáveis: {'{nome}'}, {'{mes}'}, {'{datas}'}, {'{aulas}'}, {'{total}'}, {'{pagamento}'}
            </p>
          </div>
          <textarea
            name="modelo_mensagem"
            rows={12}
            defaultValue={prefs.modelo_mensagem ?? DEFAULT_TEMPLATE}
            className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none font-mono"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
            }}
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(16, 185, 129,0.06)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Error */}
        {state?.error && (
          <p className="text-sm text-center" style={{ color: '#EF4444' }}>{state.error}</p>
        )}

        {/* Submit */}
        <button
          type="submit"
          disabled={isPending}
          className="w-full py-3 rounded-xl text-sm font-semibold transition-opacity disabled:opacity-50 cursor-pointer"
          style={{ background: 'var(--green-primary)', color: '#000' }}
        >
          {isPending ? 'Salvando...' : 'Salvar preferências'}
        </button>

      </form>
    </div>
  )
}
