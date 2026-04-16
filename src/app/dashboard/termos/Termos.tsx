'use client'

import { useState, useEffect, useMemo } from 'react'
import {
  registrarEnvioAction,
  saveModeloAction,
  deleteModeloAction,
  getHistoricoAction,
} from './actions'
import type { ModeloTermo, TermoEnviado, ModeloTipo } from './types'
import { DIAS_LABEL, formatCurrency, formatDate } from '@/types/aluno'

// ─── types ────────────────────────────────────────────────────────────────────

export interface AlunoTermo {
  id: string
  nome: string
  whatsapp: string
  horarios: { dia: string; horario: string }[]
  local: string
  valor: number
  modelo_cobranca: 'por_aula' | 'mensalidade'
  data_inicio: string
}

// ─── helpers ──────────────────────────────────────────────────────────────────

function fmtEnviadoEm(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function resolveVars(template: string, aluno: AlunoTermo): string {
  const dias = aluno.horarios
    .map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`)
    .join(', ')

  const valor = aluno.modelo_cobranca === 'mensalidade'
    ? `${formatCurrency(Number(aluno.valor))}/mês`
    : `${formatCurrency(Number(aluno.valor))}/aula`

  return template
    .replace(/{nome}/g, aluno.nome.split(' ')[0])
    .replace(/{dias}/g, dias)
    .replace(/{horario}/g, aluno.horarios[0]?.horario ?? '')
    .replace(/{local}/g, aluno.local)
    .replace(/{valor}/g, valor)
    .replace(/{inicio}/g, formatDate(aluno.data_inicio))
}

function modeloLabel(tipo: ModeloTipo): string {
  switch (tipo) {
    case 'formal': return 'Formal'
    case 'descontraido': return 'Descontraído'
    case 'personalizado': return 'Personalizado'
  }
}

function modeloColor(tipo: ModeloTipo): { color: string; bg: string; border: string } {
  switch (tipo) {
    case 'formal':        return { color: '#40C4FF', bg: 'rgba(64,196,255,0.1)', border: 'rgba(64,196,255,0.25)' }
    case 'descontraido':  return { color: '#FFAB00', bg: 'rgba(255,171,0,0.1)',  border: 'rgba(255,171,0,0.25)' }
    case 'personalizado': return { color: '#CE93D8', bg: 'rgba(206,147,216,0.1)', border: 'rgba(206,147,216,0.25)' }
  }
}

// ─── EditModeloModal ──────────────────────────────────────────────────────────

function EditModeloModal({
  modelo,
  onClose,
  onSaved,
}: {
  modelo: ModeloTermo
  onClose: () => void
  onSaved: (m: ModeloTermo) => void
}) {
  const [nome, setNome] = useState(modelo.nome)
  const [conteudo, setConteudo] = useState(modelo.conteudo)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')

  async function handleSave() {
    if (!conteudo.trim()) { setError('O conteúdo não pode ser vazio.'); return }
    setSaving(true)
    const res = await saveModeloAction({ id: modelo.id, nome, conteudo, tipo: modelo.tipo })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onSaved(res.data!)
  }

  const VARS = ['{nome}', '{dias}', '{horario}', '{local}', '{valor}', '{inicio}']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Editar Modelo</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Use as variáveis abaixo para inserir dados do aluno automaticamente
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Variables chips */}
        <div className="px-5 py-3 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {VARS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setConteudo(c => c + v)}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--green-primary)', border: '1px solid rgba(252,110,32,0.2)' }}
              title={`Inserir ${v}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Nome */}
        <div className="px-5 pt-4 flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nome do modelo</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
          />
        </div>

        {/* Conteúdo */}
        <div className="px-5 pt-3 pb-4 flex flex-col gap-1 flex-1 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Conteúdo</label>
          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none resize-none font-mono flex-1"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              minHeight: '280px',
            }}
          />
        </div>

        {error && <p className="px-5 pb-2 text-xs" style={{ color: '#FF5252' }}>{error}</p>}

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleSave} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Salvando…' : 'Salvar Modelo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── NewModeloModal ───────────────────────────────────────────────────────────

function NewModeloModal({
  templateConteudo,
  onClose,
  onCreated,
}: {
  templateConteudo: string
  onClose: () => void
  onCreated: (m: ModeloTermo) => void
}) {
  const [nome, setNome]       = useState('')
  const [conteudo, setConteudo] = useState(templateConteudo)
  const [saving, setSaving]   = useState(false)
  const [error, setError]     = useState('')

  async function handleCreate() {
    if (!nome.trim()) { setError('Informe um nome para o modelo.'); return }
    if (!conteudo.trim()) { setError('O conteúdo não pode ser vazio.'); return }
    setSaving(true)
    const res = await saveModeloAction({ nome: nome.trim(), conteudo, tipo: 'personalizado' })
    setSaving(false)
    if (res.error) { setError(res.error); return }
    onCreated(res.data!)
  }

  const VARS = ['{nome}', '{dias}', '{horario}', '{local}', '{valor}', '{inicio}']

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '90vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div>
            <h2 className="font-semibold text-base" style={{ color: 'var(--text-primary)' }}>Criar Novo Modelo</h2>
            <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
              Use as variáveis abaixo para inserir dados do aluno automaticamente
            </p>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg" style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Variables chips */}
        <div className="px-5 py-3 flex flex-wrap gap-1.5" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {VARS.map(v => (
            <button
              key={v}
              type="button"
              onClick={() => setConteudo(c => c + v)}
              className="px-2.5 py-1 rounded-full text-xs font-mono font-medium transition-colors"
              style={{ background: 'var(--bg-input)', color: 'var(--green-primary)', border: '1px solid rgba(252,110,32,0.2)' }}
              title={`Inserir ${v}`}
            >
              {v}
            </button>
          ))}
        </div>

        {/* Nome */}
        <div className="px-5 pt-4 flex flex-col gap-1">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Nome do modelo</label>
          <input
            value={nome}
            onChange={e => setNome(e.target.value)}
            placeholder="Ex: Contrato VIP, Modelo Academia…"
            className="rounded-lg px-3 py-2 text-sm outline-none"
            style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            onFocus={e => { e.target.style.borderColor = 'var(--border-focus)' }}
            onBlur={e => { e.target.style.borderColor = 'var(--border-subtle)' }}
          />
        </div>

        {/* Conteúdo */}
        <div className="px-5 pt-3 pb-4 flex flex-col gap-1 flex-1 min-h-0">
          <label className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Conteúdo</label>
          <textarea
            value={conteudo}
            onChange={e => setConteudo(e.target.value)}
            className="rounded-lg px-3 py-2.5 text-sm outline-none resize-none font-mono flex-1"
            style={{
              background: 'var(--bg-input)',
              border: '1px solid var(--border-subtle)',
              color: 'var(--text-primary)',
              lineHeight: '1.6',
              minHeight: '280px',
            }}
          />
        </div>

        {error && <p className="px-5 pb-2 text-xs" style={{ color: '#FF5252' }}>{error}</p>}

        {/* Footer */}
        <div className="flex gap-2 px-5 pb-5">
          <button type="button" onClick={onClose} className="flex-1 py-2 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
            Cancelar
          </button>
          <button type="button" onClick={handleCreate} disabled={saving} className="flex-1 py-2 rounded-lg text-sm font-semibold" style={{ background: 'var(--green-primary)', color: '#000', opacity: saving ? 0.6 : 1 }}>
            {saving ? 'Criando…' : 'Criar Modelo'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── ConfirmDeleteModeloModal ─────────────────────────────────────────────────

function ConfirmDeleteModeloModal({
  modelo,
  onClose,
  onDeleted,
}: {
  modelo: ModeloTermo
  onClose: () => void
  onDeleted: (id: string) => void
}) {
  const [deleting, setDeleting] = useState(false)
  const [error, setError]       = useState('')

  async function handleDelete() {
    setDeleting(true)
    const res = await deleteModeloAction(modelo.id)
    setDeleting(false)
    if (res.error) { setError(res.error); return }
    onDeleted(modelo.id)
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      style={{ background: 'rgba(0,0,0,0.7)' }}
      onClick={onClose}
    >
      <div
        className="w-full max-w-sm rounded-xl flex flex-col gap-4 p-6"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)' }}
        onClick={e => e.stopPropagation()}
      >
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
            style={{ background: 'rgba(255,82,82,0.12)' }}>
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#FF5252" strokeWidth="2">
              <polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
              <path d="M10 11v6"/><path d="M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
            </svg>
          </div>
          <div>
            <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>
              Excluir modelo?
            </p>
            <p className="text-xs mt-1" style={{ color: 'var(--text-secondary)' }}>
              O modelo <span className="font-semibold" style={{ color: 'var(--text-primary)' }}>{modelo.nome}</span> será excluído permanentemente.
            </p>
          </div>
        </div>

        {error && <p className="text-xs" style={{ color: '#FF5252' }}>{error}</p>}

        <div className="flex gap-2">
          <button
            onClick={onClose}
            className="flex-1 py-2.5 rounded-xl text-sm font-medium cursor-pointer"
            style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}
          >
            Cancelar
          </button>
          <button
            onClick={handleDelete}
            disabled={deleting}
            className="flex-1 py-2.5 rounded-xl text-sm font-semibold cursor-pointer disabled:opacity-50"
            style={{ background: 'rgba(255,82,82,0.15)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.3)' }}
          >
            {deleting ? 'Excluindo…' : 'Excluir'}
          </button>
        </div>
      </div>
    </div>
  )
}

// ─── EnviarTermoModal ─────────────────────────────────────────────────────────

function EnviarTermoModal({
  aluno,
  modelos,
  onClose,
  onSent,
}: {
  aluno: AlunoTermo
  modelos: ModeloTermo[]
  onClose: () => void
  onSent: (enviado: TermoEnviado) => void
}) {
  const [selectedTipo, setSelectedTipo] = useState<ModeloTipo>('formal')
  const [texto, setTexto] = useState('')
  const [preview, setPreview] = useState(false)
  const [sending, setSending] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)

  const modeloAtual = modelos.find(m => m.tipo === selectedTipo) ?? modelos[0]

  // When modelo changes, reset text to resolved template
  useEffect(() => {
    if (modeloAtual) {
      setTexto(resolveVars(modeloAtual.conteudo, aluno))
    }
  }, [selectedTipo, modeloAtual, aluno])

  async function handleEnviar() {
    // ── 1. Validate & build WhatsApp URL synchronously (BEFORE any await) ────
    const raw   = (aluno.whatsapp ?? '').replace(/\D/g, '')
    const phone = raw.length >= 12 ? raw : `55${raw}`

    if (raw.length < 10) {
      setError('Aluno sem WhatsApp cadastrado ou número inválido. Atualize o cadastro do aluno.')
      return
    }

    const url = `https://api.whatsapp.com/send?phone=${phone}&text=${encodeURIComponent(texto)}`

    // ── 2. Open WhatsApp BEFORE the await (avoids popup blocker) ─────────────
    window.open(url, '_blank')

    // ── 3. Register the send in the background ────────────────────────────────
    setSending(true)
    const res = await registrarEnvioAction({
      aluno_id: aluno.id,
      conteudo: texto,
      modelo_usado: selectedTipo,
    })
    setSending(false)
    if (res.error) { setError(res.error); return }
    setSent(true)
    onSent(res.data!)
  }

  const tiposDisponiveis = (['formal', 'descontraido', 'personalizado'] as ModeloTipo[])
    .filter(t => modelos.some(m => m.tipo === t))

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4" style={{ background: 'rgba(0,0,0,0.7)' }} onClick={onClose}>
      <div
        className="w-full max-w-2xl rounded-xl flex flex-col"
        style={{ background: 'var(--bg-surface)', border: '1px solid var(--border-subtle)', maxHeight: '92vh' }}
        onClick={e => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between px-5 py-4 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
              {aluno.nome.slice(0, 2).toUpperCase()}
            </div>
            <div>
              <h2 className="font-semibold text-base leading-tight" style={{ color: 'var(--text-primary)' }}>
                {aluno.nome}
              </h2>
              <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                {aluno.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')}
              </p>
            </div>
          </div>
          <button onClick={onClose} className="p-1.5 rounded-lg shrink-0" style={{ color: 'var(--text-muted)' }}>
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
            </svg>
          </button>
        </div>

        {/* Modelo selector */}
        <div className="px-5 py-3 flex gap-2 shrink-0" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          {tiposDisponiveis.map(tipo => {
            const mc = modeloColor(tipo)
            return (
              <button
                key={tipo}
                type="button"
                onClick={() => setSelectedTipo(tipo)}
                className="flex-1 py-2 rounded-lg text-sm font-medium transition-colors"
                style={selectedTipo === tipo
                  ? { background: mc.bg, color: mc.color, border: `1px solid ${mc.border}` }
                  : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                }
              >
                {modeloLabel(tipo)}
              </button>
            )
          })}
        </div>

        {/* Editor / Preview toggle */}
        <div className="px-5 pt-3 flex items-center justify-between shrink-0">
          <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>
            {preview ? 'Pré-visualização' : 'Editor'}
          </p>
          <button
            type="button"
            onClick={() => setPreview(p => !p)}
            className="text-xs px-3 py-1 rounded-lg"
            style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
          >
            {preview ? '✏️ Editar' : '👁 Pré-visualizar'}
          </button>
        </div>

        {/* Text area / preview */}
        <div className="px-5 pt-2 pb-4 flex-1 min-h-0 overflow-y-auto">
          {preview ? (
            <div
              className="rounded-xl p-4 text-sm whitespace-pre-wrap h-full"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                lineHeight: '1.7',
                minHeight: '240px',
              }}
            >
              {texto}
            </div>
          ) : (
            <textarea
              value={texto}
              onChange={e => setTexto(e.target.value)}
              className="w-full rounded-xl px-4 py-3 text-sm outline-none resize-none font-mono"
              style={{
                background: 'var(--bg-input)',
                border: '1px solid var(--border-subtle)',
                color: 'var(--text-primary)',
                lineHeight: '1.6',
                minHeight: '240px',
              }}
            />
          )}
        </div>

        {error && <p className="px-5 pb-2 text-xs" style={{ color: '#FF5252' }}>{error}</p>}

        {/* Footer */}
        <div className="px-5 pb-5 flex gap-2 shrink-0" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '16px' }}>
          {sent ? (
            <button
              type="button"
              onClick={onClose}
              className="flex-1 py-2.5 rounded-lg text-sm font-semibold"
              style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(252,110,32,0.3)' }}
            >
              ✓ Enviado! Fechar
            </button>
          ) : (
            <>
              <button type="button" onClick={onClose} className="flex-1 py-2.5 rounded-lg text-sm font-medium" style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
                Cancelar
              </button>
              <button
                type="button"
                onClick={handleEnviar}
                disabled={sending || !texto.trim()}
                className="flex-[2] py-2.5 rounded-lg text-sm font-semibold flex items-center justify-center gap-2"
                style={{ background: '#25D366', color: '#fff', opacity: sending ? 0.7 : 1 }}
              >
                {/* WhatsApp icon */}
                <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
                  <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                </svg>
                {sending ? 'Abrindo WhatsApp…' : 'Enviar pelo WhatsApp'}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  )
}

// ─── HistoricoItem ────────────────────────────────────────────────────────────

function HistoricoItem({ item }: { item: TermoEnviado }) {
  const [expanded, setExpanded] = useState(false)
  const mc = modeloColor(item.modelo_usado)

  return (
    <div className="rounded-xl overflow-hidden" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
      <button
        type="button"
        onClick={() => setExpanded(e => !e)}
        className="w-full flex items-center gap-3 p-4 text-left"
      >
        <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs shrink-0"
          style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>
          {(item.aluno_nome ?? '?').slice(0, 2).toUpperCase()}
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{item.aluno_nome}</p>
          <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>{fmtEnviadoEm(item.enviado_em)}</p>
        </div>
        <span className="text-xs px-2 py-0.5 rounded-full font-medium shrink-0" style={{ color: mc.color, background: mc.bg }}>
          {modeloLabel(item.modelo_usado)}
        </span>
        <svg
          width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          className="shrink-0 transition-transform"
          style={{ color: 'var(--text-muted)', transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)' }}
        >
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>
      {expanded && (
        <div className="px-4 pb-4 text-xs whitespace-pre-wrap font-mono" style={{ borderTop: '1px solid var(--border-subtle)', paddingTop: '12px', color: 'var(--text-secondary)', lineHeight: '1.6' }}>
          {item.conteudo}
        </div>
      )}
    </div>
  )
}

// ─── Main Termos component ────────────────────────────────────────────────────

interface Props {
  alunos: AlunoTermo[]
  modelos: ModeloTermo[]
  historicoInicial: TermoEnviado[]
  alunoIdInicial?: string
}

type Tab = 'enviar' | 'historico' | 'modelos'

type Modal =
  | { type: 'enviar'; aluno: AlunoTermo }
  | { type: 'editModelo'; modelo: ModeloTermo }
  | { type: 'newModelo' }
  | { type: 'confirmDeleteModelo'; modelo: ModeloTermo }

export function Termos({ alunos, modelos: modelosIniciais, historicoInicial, alunoIdInicial }: Props) {
  const [tab, setTab] = useState<Tab>(alunoIdInicial ? 'enviar' : 'enviar')
  const [modelos, setModelos] = useState<ModeloTermo[]>(modelosIniciais)
  const [historico, setHistorico] = useState<TermoEnviado[]>(historicoInicial)
  const [modal, setModal] = useState<Modal | null>(() => {
    if (alunoIdInicial) {
      const aluno = alunos.find(a => a.id === alunoIdInicial)
      if (aluno) return { type: 'enviar', aluno }
    }
    return null
  })
  const [search, setSearch] = useState('')
  const [filterAluno, setFilterAluno] = useState('')

  // Last send per aluno
  const lastSendByAluno = useMemo(() => {
    const map: Record<string, string> = {}
    for (const h of historico) {
      if (!map[h.aluno_id] || h.enviado_em > map[h.aluno_id]) {
        map[h.aluno_id] = h.enviado_em
      }
    }
    return map
  }, [historico])

  const alunosFiltrados = alunos.filter(a =>
    !search || a.nome.toLowerCase().includes(search.toLowerCase())
  )

  const historicoFiltrado = historico.filter(h =>
    !filterAluno || h.aluno_id === filterAluno
  )

  async function handleRefreshHistorico() {
    const res = await getHistoricoAction()
    if (res.data) setHistorico(res.data)
  }

  function handleSent(enviado: TermoEnviado) {
    // Enrich with aluno name
    const aluno = alunos.find(a => a.id === enviado.aluno_id)
    const enriched = { ...enviado, aluno_nome: aluno?.nome ?? '—' }
    setHistorico(prev => [enriched, ...prev])
  }

  function handleModeloSaved(m: ModeloTermo) {
    setModelos(prev => prev.map(x => x.id === m.id ? m : x))
    setModal(null)
  }

  function handleModeloCreated(m: ModeloTermo) {
    setModelos(prev => [...prev, m])
    setModal(null)
  }

  function handleModeloDeleted(id: string) {
    setModelos(prev => prev.filter(m => m.id !== id))
    setModal(null)
  }

  return (
    <>
      <div className="flex flex-col gap-5 p-4 md:p-6 max-w-3xl mx-auto w-full">

        {/* Header */}
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>Termos de Serviço</h1>
          <p className="text-sm" style={{ color: 'var(--text-muted)' }}>
            Envie o termo de serviço pelo WhatsApp com os dados do aluno preenchidos automaticamente
          </p>
        </div>

        {/* Tabs */}
        <div className="flex gap-0.5 rounded-lg p-0.5" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          {([
            { key: 'enviar',   label: 'Enviar' },
            { key: 'historico', label: `Histórico (${historico.length})` },
            { key: 'modelos',  label: 'Modelos' },
          ] as const).map(t => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className="flex-1 py-2 rounded-md text-sm font-medium transition-colors"
              style={tab === t.key
                ? { background: 'var(--bg-surface)', color: 'var(--text-primary)' }
                : { color: 'var(--text-muted)' }
              }
            >
              {t.label}
            </button>
          ))}
        </div>

        {/* ── TAB: ENVIAR ── */}
        {tab === 'enviar' && (
          <>
            {/* Search */}
            <div className="relative">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" style={{ color: 'var(--text-muted)' }}>
                <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
              </svg>
              <input
                type="text"
                placeholder="Buscar aluno…"
                value={search}
                onChange={e => setSearch(e.target.value)}
                className="w-full rounded-lg pl-9 pr-4 py-2.5 text-sm outline-none"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
              />
            </div>

            {/* Alunos list */}
            {alunos.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhum aluno ativo cadastrado</p>
              </div>
            ) : alunosFiltrados.length === 0 ? (
              <div className="text-center py-12" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhum aluno encontrado</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {alunosFiltrados.map(aluno => {
                  const lastSend = lastSendByAluno[aluno.id]
                  const sendCount = historico.filter(h => h.aluno_id === aluno.id).length

                  return (
                    <div
                      key={aluno.id}
                      className="flex items-center gap-3 p-4 rounded-xl"
                      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
                    >
                      {/* Avatar */}
                      <div className="w-10 h-10 rounded-full flex items-center justify-center font-bold text-sm shrink-0"
                        style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                        {aluno.nome.slice(0, 2).toUpperCase()}
                      </div>

                      {/* Info */}
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>{aluno.nome}</p>
                        <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                          {aluno.horarios.map(h => `${DIAS_LABEL[h.dia] ?? h.dia} ${h.horario}`).join(', ')} · {aluno.local}
                        </p>
                      </div>

                      {/* Last send */}
                      <div className="text-right shrink-0 hidden sm:block">
                        {lastSend ? (
                          <>
                            <p className="text-xs font-medium" style={{ color: '#FC6E20' }}>✓ Enviado</p>
                            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{fmtEnviadoEm(lastSend).split(',')[0]}</p>
                          </>
                        ) : sendCount === 0 ? (
                          <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Nunca enviado</p>
                        ) : null}
                      </div>

                      {/* Button */}
                      <button
                        onClick={() => setModal({ type: 'enviar', aluno })}
                        className="flex items-center gap-1.5 px-3 py-2 rounded-lg text-sm font-semibold shrink-0 transition-opacity"
                        style={{ background: '#25D366', color: '#fff' }}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z"/>
                        </svg>
                        <span className="hidden sm:inline">Enviar</span>
                      </button>
                    </div>
                  )
                })}
              </div>
            )}
          </>
        )}

        {/* ── TAB: HISTÓRICO ── */}
        {tab === 'historico' && (
          <>
            <div className="flex gap-2 items-center">
              <select
                value={filterAluno}
                onChange={e => setFilterAluno(e.target.value)}
                className="rounded-lg px-3 py-2 text-sm outline-none flex-1"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-secondary)' }}
              >
                <option value="">Todos os alunos</option>
                {alunos.map(a => <option key={a.id} value={a.id}>{a.nome}</option>)}
              </select>
              <button
                onClick={handleRefreshHistorico}
                className="px-3 py-2 rounded-lg text-xs"
                style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', color: 'var(--text-muted)' }}
              >
                Atualizar
              </button>
            </div>

            {historicoFiltrado.length === 0 ? (
              <div className="text-center py-16" style={{ color: 'var(--text-muted)' }}>
                <p className="text-sm">Nenhum termo enviado ainda</p>
              </div>
            ) : (
              <div className="flex flex-col gap-2.5">
                {historicoFiltrado.map(item => (
                  <HistoricoItem key={item.id} item={item} />
                ))}
              </div>
            )}
          </>
        )}

        {/* ── TAB: MODELOS ── */}
        {tab === 'modelos' && (
          <div className="flex flex-col gap-3">
            <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
              Variáveis disponíveis:{' '}
              {['{nome}', '{dias}', '{horario}', '{local}', '{valor}', '{inicio}'].map(v => (
                <code key={v} className="mx-0.5 px-1.5 py-0.5 rounded text-xs font-mono" style={{ background: 'var(--bg-input)', color: 'var(--green-primary)' }}>{v}</code>
              ))}
            </p>

            {modelos.map(modelo => {
              const mc = modeloColor(modelo.tipo)
              const preview = modelo.conteudo.slice(0, 120).replace(/\n/g, ' ') + (modelo.conteudo.length > 120 ? '…' : '')
              return (
                <div key={modelo.id} className="rounded-xl p-4 flex flex-col gap-2" style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-semibold px-2 py-0.5 rounded-full" style={{ color: mc.color, background: mc.bg }}>
                        {modeloLabel(modelo.tipo)}
                      </span>
                      <span className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{modelo.nome}</span>
                    </div>
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setModal({ type: 'editModelo', modelo })}
                        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium"
                        style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}
                      >
                        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                          <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                        </svg>
                        Editar
                      </button>

                      <button
                        onClick={() => setModal({ type: 'confirmDeleteModelo', modelo })}
                        className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
                        style={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252' }}
                        title="Excluir modelo"
                      >
                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                          <polyline points="3 6 5 6 21 6"/>
                          <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/>
                          <path d="M10 11v6"/><path d="M14 11v6"/>
                          <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/>
                        </svg>
                      </button>
                    </div>
                  </div>
                  <p className="text-xs font-mono" style={{ color: 'var(--text-muted)', lineHeight: '1.5' }}>{preview}</p>
                </div>
              )
            })}

            <button
              onClick={() => setModal({ type: 'newModelo' })}
              className="flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium"
              style={{ background: 'var(--bg-card)', border: '1px dashed var(--border-subtle)', color: 'var(--text-muted)' }}
              onMouseEnter={e => { e.currentTarget.style.borderColor = 'var(--border-focus)'; e.currentTarget.style.color = 'var(--green-primary)' }}
              onMouseLeave={e => { e.currentTarget.style.borderColor = 'var(--border-subtle)'; e.currentTarget.style.color = 'var(--text-muted)' }}
            >
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
              </svg>
              Criar Novo Modelo
            </button>
          </div>
        )}

      </div>

      {/* Modals */}
      {modal?.type === 'enviar' && (
        <EnviarTermoModal
          aluno={modal.aluno}
          modelos={modelos}
          onClose={() => setModal(null)}
          onSent={handleSent}
        />
      )}
      {modal?.type === 'editModelo' && (
        <EditModeloModal
          modelo={modal.modelo}
          onClose={() => setModal(null)}
          onSaved={handleModeloSaved}
        />
      )}
      {modal?.type === 'newModelo' && (
        <NewModeloModal
          templateConteudo={modelos.find(m => m.tipo === 'formal')?.conteudo ?? ''}
          onClose={() => setModal(null)}
          onCreated={handleModeloCreated}
        />
      )}
      {modal?.type === 'confirmDeleteModelo' && (
        <ConfirmDeleteModeloModal
          modelo={modal.modelo}
          onClose={() => setModal(null)}
          onDeleted={handleModeloDeleted}
        />
      )}
    </>
  )
}
