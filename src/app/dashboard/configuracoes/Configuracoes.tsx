'use client'

import { useState, useEffect, useRef } from 'react'
import { createClient } from '@/lib/supabase/client'
import { applyTheme } from '@/lib/color'
import { saveNomeAction, saveFotoUrlAction, saveCorTemaAction } from './actions'
import { COR_PRESETS } from './types'
import type { ProfessorPerfil } from './types'

// ─── section wrapper ─────────────────────────────────────────────────────────

function Section({ title, icon, children }: { title: string; icon: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <div className="flex items-center gap-2 px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
        <span className="text-base">{icon}</span>
        <h2 className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</h2>
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

// ─── save button ─────────────────────────────────────────────────────────────

function SaveBtn({ loading, done, onClick, label = 'Salvar alterações' }: {
  loading: boolean; done: boolean; onClick: () => void; label?: string
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="h-10 px-5 rounded-xl text-sm font-semibold transition-all"
      style={{ background: done ? 'var(--green-muted)' : 'var(--green-primary)', color: done ? 'var(--green-primary)' : '#000', opacity: loading ? 0.7 : 1 }}
    >
      {loading ? 'Salvando…' : done ? '✓ Salvo!' : label}
    </button>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

interface Props {
  perfil: ProfessorPerfil
  email: string
}

export function Configuracoes({ perfil, email }: Props) {
  // ── perfil ──────────────────────────────────────────────────────────────────
  const [nome, setNome] = useState(perfil.nome)
  const [fotoUrl, setFotoUrl] = useState<string | null>(perfil.foto_url)
  const [previewUrl, setPreviewUrl] = useState<string | null>(null)
  const [nomeLoading, setNomeLoading] = useState(false)
  const [nomeDone, setNomeDone] = useState(false)
  const [fotoLoading, setFotoLoading] = useState(false)
  const [fotoError, setFotoError] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  // ── tema ────────────────────────────────────────────────────────────────────
  const [corSalva, setCorSalva] = useState(perfil.cor_tema || '#00E676')
  const [corPreview, setCorPreview] = useState(perfil.cor_tema || '#00E676')
  const [corLoading, setCorLoading] = useState(false)
  const [corDone, setCorDone] = useState(false)
  const [customCor, setCustomCor] = useState(
    COR_PRESETS.some(p => p.value === perfil.cor_tema) ? '' : (perfil.cor_tema || '')
  )

  // ── indicação ───────────────────────────────────────────────────────────────
  const [copied, setCopied] = useState(false)
  // Start with a relative URL (same on server and client) to avoid hydration mismatch.
  // Upgrade to the full absolute URL after mount so it's correct for copy/share.
  const [referralLink, setReferralLink] = useState(`/register?ref=${perfil.codigo_indicacao}`)
  useEffect(() => {
    setReferralLink(`${window.location.origin}/register?ref=${perfil.codigo_indicacao}`)
  }, [perfil.codigo_indicacao])

  // Apply theme preview in real-time
  useEffect(() => {
    applyTheme(corPreview)
  }, [corPreview])

  // ── handlers: perfil ─────────────────────────────────────────────────────────

  async function handleSaveNome() {
    if (!nome.trim()) return
    setNomeLoading(true)
    const res = await saveNomeAction(nome)
    setNomeLoading(false)
    if (!res.error) { setNomeDone(true); setTimeout(() => setNomeDone(false), 3000) }
  }

  async function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    setFotoError('')

    // Validate
    if (!file.type.startsWith('image/')) { setFotoError('Selecione uma imagem válida.'); return }
    if (file.size > 5 * 1024 * 1024) { setFotoError('A imagem deve ter no máximo 5 MB.'); return }

    // Local preview
    const local = URL.createObjectURL(file)
    setPreviewUrl(local)
    setFotoLoading(true)

    const supabase = createClient()
    const { data: { user } } = await supabase.auth.getUser()
    if (!user) { setFotoError('Sessão expirada.'); setFotoLoading(false); return }

    const ext = file.name.split('.').pop()?.toLowerCase() ?? 'jpg'
    const path = `${user.id}/avatar.${ext}`

    const { error: uploadError } = await supabase.storage
      .from('avatars')
      .upload(path, file, { upsert: true, contentType: file.type })

    if (uploadError) {
      console.error('upload:', uploadError)
      setFotoError('Erro ao fazer upload. Verifique o bucket "avatars".')
      setFotoLoading(false)
      return
    }

    const { data: { publicUrl } } = supabase.storage.from('avatars').getPublicUrl(path)
    // Cache-bust so the browser reloads the new photo
    const urlWithBust = publicUrl + '?t=' + Date.now()

    const res = await saveFotoUrlAction(urlWithBust)
    if (res.error) { setFotoError(res.error) }
    else { setFotoUrl(urlWithBust) }
    setFotoLoading(false)
    setPreviewUrl(null)
  }

  function handleRemoveFoto() {
    setPreviewUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
  }

  // ── handlers: tema ───────────────────────────────────────────────────────────

  async function handleSaveCor() {
    setCorLoading(true)
    const res = await saveCorTemaAction(corPreview)
    setCorLoading(false)
    if (!res.error) {
      setCorSalva(corPreview)
      setCorDone(true)
      setTimeout(() => setCorDone(false), 3000)
    }
  }

  // ── handlers: indicação ──────────────────────────────────────────────────────

  async function handleCopy() {
    await navigator.clipboard.writeText(referralLink)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  function handleWhatsApp() {
    const msg = encodeURIComponent(
      `Oi! 👋 Uso o PersonalHub para gerenciar meus alunos e recomendo muito.\nCadastre-se pelo meu link: ${referralLink}`
    )
    window.open(`https://api.whatsapp.com/send?text=${msg}`, '_blank')
  }

  // ─── render ─────────────────────────────────────────────────────────────────

  const avatarSrc = previewUrl ?? fotoUrl
  const initials = nome.trim() ? nome.trim()[0].toUpperCase() : '?'

  return (
    <div className="p-4 md:p-6 max-w-2xl mx-auto flex flex-col gap-5">

      <div className="mb-1">
        <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Configurações</h1>
        <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>Personalize seu perfil e o sistema</p>
      </div>

      {/* ── Perfil ──────────────────────────────────────────────────────────── */}
      <Section title="Perfil do Professor" icon="👤">
        {/* Avatar */}
        <div className="flex items-center gap-4 mb-5">
          <div className="relative shrink-0">
            {avatarSrc ? (
              <img
                src={avatarSrc}
                alt="Foto de perfil"
                className="w-20 h-20 rounded-full object-cover"
                style={{ border: '2px solid var(--green-primary)' }}
              />
            ) : (
              <div
                className="w-20 h-20 rounded-full flex items-center justify-center text-2xl font-bold"
                style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '2px solid var(--green-primary)' }}
              >
                {initials}
              </div>
            )}
            {fotoLoading && (
              <div className="absolute inset-0 rounded-full flex items-center justify-center" style={{ background: 'rgba(0,0,0,0.6)' }}>
                <svg className="animate-spin" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="var(--green-primary)" strokeWidth="2">
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" />
                </svg>
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={fotoLoading}
              className="h-9 px-4 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
            >
              {fotoLoading ? 'Enviando…' : 'Alterar foto'}
            </button>
            {(previewUrl || fotoUrl) && !fotoLoading && (
              <button
                onClick={handleRemoveFoto}
                className="text-xs"
                style={{ color: 'var(--text-muted)' }}
              >
                Remover foto
              </button>
            )}
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>JPG, PNG ou WebP · máx 5 MB</p>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="hidden"
            onChange={handleFileChange}
          />
        </div>
        {fotoError && <p className="text-xs mb-4" style={{ color: '#FF5252' }}>{fotoError}</p>}

        {/* Nome */}
        <div className="flex flex-col gap-1.5 mb-4">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Nome</label>
          <input
            type="text"
            value={nome}
            onChange={e => { setNome(e.target.value); setNomeDone(false) }}
            onKeyDown={e => e.key === 'Enter' && handleSaveNome()}
            className="h-11 rounded-xl px-4 text-sm outline-none w-full"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-focus)'; e.target.style.boxShadow = '0 0 0 3px rgba(0,230,118,0.08)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)'; e.target.style.boxShadow = 'none' }}
          />
        </div>

        {/* Email (read-only) */}
        <div className="flex flex-col gap-1.5 mb-5">
          <label className="text-sm font-medium" style={{ color: 'var(--text-secondary)' }}>Email</label>
          <div className="h-11 rounded-xl px-4 flex items-center text-sm" style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}>
            {email}
          </div>
        </div>

        <SaveBtn loading={nomeLoading} done={nomeDone} onClick={handleSaveNome} />
      </Section>

      {/* ── Tema e Cores ────────────────────────────────────────────────────── */}
      <Section title="Tema e Cores" icon="🎨">
        <p className="text-xs mb-4" style={{ color: 'var(--text-muted)' }}>
          A cor escolhida é aplicada em todo o sistema em tempo real.
        </p>

        {/* Preset chips */}
        <div className="flex flex-wrap gap-2 mb-4">
          {COR_PRESETS.map(p => (
            <button
              key={p.value}
              title={p.label}
              onClick={() => { setCorPreview(p.value); setCustomCor(''); setCorDone(false) }}
              className="relative w-10 h-10 rounded-full transition-transform hover:scale-110"
              style={{ background: p.value, border: corPreview === p.value ? '3px solid var(--text-primary)' : '3px solid transparent' }}
            >
              {corPreview === p.value && (
                <span className="absolute inset-0 flex items-center justify-center">
                  <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#000" strokeWidth="3">
                    <polyline points="20 6 9 17 4 12" />
                  </svg>
                </span>
              )}
            </button>
          ))}
          {/* Custom color picker */}
          <label
            title="Cor personalizada"
            className="relative w-10 h-10 rounded-full overflow-hidden cursor-pointer transition-transform hover:scale-110 flex items-center justify-center"
            style={{
              background: customCor || 'conic-gradient(red,yellow,lime,aqua,blue,magenta,red)',
              border: customCor && corPreview === customCor ? '3px solid var(--text-primary)' : '3px solid var(--border-subtle)',
            }}
          >
            <input
              type="color"
              value={customCor || '#ffffff'}
              onChange={e => { setCustomCor(e.target.value); setCorPreview(e.target.value); setCorDone(false) }}
              className="absolute opacity-0 w-full h-full cursor-pointer"
            />
            {!customCor && <span className="text-xs font-bold" style={{ color: '#fff', textShadow: '0 1px 2px rgba(0,0,0,0.7)' }}>+</span>}
          </label>
        </div>

        {/* Preview */}
        <div
          className="flex flex-wrap items-center gap-3 p-4 rounded-xl mb-4"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Preview:</span>
          <button className="h-8 px-4 rounded-lg text-xs font-bold" style={{ background: 'var(--green-primary)', color: '#000' }}>
            Botão
          </button>
          <span className="text-xs px-2 py-0.5 rounded-full font-medium" style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
            Badge
          </span>
          <div className="flex-1 min-w-[80px] h-2 rounded-full overflow-hidden" style={{ background: 'var(--bg-card)' }}>
            <div className="h-full w-3/4 rounded-full" style={{ background: 'var(--green-primary)' }} />
          </div>
          <span className="text-xs" style={{ color: 'var(--green-primary)' }}>Link</span>
        </div>

        {corPreview !== corSalva && (
          <p className="text-xs mb-3" style={{ color: 'var(--text-muted)' }}>
            Cor selecionada: <span className="font-mono font-bold" style={{ color: corPreview }}>{corPreview}</span>
          </p>
        )}

        <SaveBtn loading={corLoading} done={corDone} onClick={handleSaveCor} label="Salvar cor" />
      </Section>

      {/* ── Indicação ───────────────────────────────────────────────────────── */}
      <Section title="Indique o PersonalHub" icon="🔗">
        <p className="text-sm mb-4" style={{ color: 'var(--text-secondary)' }}>
          Compartilhe seu link para indicar o PersonalHub para outros professores.
        </p>

        {/* Link display */}
        <div
          className="flex items-center gap-2 p-3 rounded-xl mb-4"
          style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        >
          <span className="flex-1 text-xs font-mono truncate" style={{ color: 'var(--text-muted)' }}>
            {referralLink}
          </span>
          <button
            onClick={handleCopy}
            className="shrink-0 h-7 px-3 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-all"
            style={{
              background: copied ? 'var(--green-muted)' : 'var(--bg-card)',
              color: copied ? 'var(--green-primary)' : 'var(--text-secondary)',
              border: '1px solid var(--border-subtle)',
            }}
          >
            {copied ? (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <polyline points="20 6 9 17 4 12" />
                </svg>
                Copiado!
              </>
            ) : (
              <>
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <rect x="9" y="9" width="13" height="13" rx="2" />
                  <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
                </svg>
                Copiar
              </>
            )}
          </button>
        </div>

        {/* Actions */}
        <div className="flex flex-col sm:flex-row gap-2">
          <button
            onClick={handleCopy}
            className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="9" y="9" width="13" height="13" rx="2" />
              <path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1" />
            </svg>
            {copied ? 'Copiado!' : 'Copiar link'}
          </button>
          <button
            onClick={handleWhatsApp}
            className="flex-1 h-11 rounded-xl text-sm font-semibold flex items-center justify-center gap-2"
            style={{ background: '#25D36620', color: '#25D366', border: '1px solid #25D36630' }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347z"/>
              <path d="M11.5 2C6.262 2 2 6.263 2 11.5c0 1.9.522 3.678 1.432 5.193L2 22l5.432-1.407A9.448 9.448 0 0 0 11.5 21.999C16.737 22 21 17.737 21 12.5 21 7.262 16.738 2 11.5 2zm0 17.273a7.752 7.752 0 0 1-4.017-1.12l-.288-.172-2.983.772.793-2.905-.188-.299A7.723 7.723 0 0 1 3.727 11.5c0-4.29 3.483-7.773 7.773-7.773S19.273 7.21 19.273 11.5s-3.484 7.773-7.773 7.773z"/>
            </svg>
            Compartilhar no WhatsApp
          </button>
        </div>

        <div
          className="flex items-center gap-3 mt-4 p-3 rounded-xl"
          style={{ background: 'var(--bg-input)' }}
        >
          <span className="text-2xl font-bold" style={{ color: 'var(--green-primary)' }}>0</span>
          <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
            pessoas cadastradas pelo seu link
          </p>
        </div>
      </Section>

    </div>
  )
}
