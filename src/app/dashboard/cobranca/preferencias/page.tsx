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
        onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.06)' }}
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
      setPrefs(data ?? { chave_pix: null, favorecido_pix: null, link_cartao: null, modelo_mensagem: null })
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
            onFocus={(e) => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.06)' }}
            onBlur={(e) => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Error */}
        {state?.error && (
          <p className="text-sm text-center" style={{ color: '#FF5252' }}>{state.error}</p>
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
