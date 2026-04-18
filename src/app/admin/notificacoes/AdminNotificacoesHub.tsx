'use client'

import { useState, useEffect, useTransition } from 'react'
import {
  criarNotificacaoAdminAction,
  fetchAdminNotificacoesAction,
  excluirNotificacaoAdminAction,
  fetchAllProfessoresAction,
  type CriarNotifAdminInput,
  type AdminNotifHistorico,
} from './admin-notif-actions'

const TIPO_OPTIONS = [
  { value: 'info', label: '🔵 Informativo', color: '#2196F3' },
  { value: 'importante', label: '🟡 Importante', color: '#FFB300' },
  { value: 'urgente', label: '🔴 Urgente', color: '#FF5252' },
]

const DEST_OPTIONS = [
  { value: 'todos', label: 'Todos os usuários' },
  { value: 'assinantes', label: 'Apenas assinantes' },
  { value: 'trial', label: 'Apenas trial' },
  { value: 'manual', label: 'Selecionar manualmente' },
]

export function AdminNotificacoesHub() {
  const [historico, setHistorico] = useState<AdminNotifHistorico[]>([])
  const [professores, setProfessores] = useState<{ id: string; email: string; nome: string }[]>([])
  const [loading, setLoading] = useState(true)
  const [, startTransition] = useTransition()

  // Form state
  const [titulo, setTitulo] = useState('')
  const [mensagem, setMensagem] = useState('')
  const [categoria, setCategoria] = useState<'info' | 'importante' | 'urgente'>('info')
  const [destinatarios, setDestinatarios] = useState<'todos' | 'assinantes' | 'trial' | 'manual'>('todos')
  const [selectedUsers, setSelectedUsers] = useState<string[]>([])
  const [submitting, setSubmitting] = useState(false)
  const [successMsg, setSuccessMsg] = useState('')
  const [errorMsg, setErrorMsg] = useState('')

  useEffect(() => {
    Promise.all([
      fetchAdminNotificacoesAction(),
      fetchAllProfessoresAction(),
    ]).then(([hist, profs]) => {
      setHistorico(hist.data ?? [])
      setProfessores(profs.data ?? [])
      setLoading(false)
    })
  }, [])

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!titulo.trim() || !mensagem.trim()) {
      setErrorMsg('Título e mensagem são obrigatórios.')
      return
    }
    if (destinatarios === 'manual' && selectedUsers.length === 0) {
      setErrorMsg('Selecione ao menos um destinatário.')
      return
    }
    setSubmitting(true)
    setErrorMsg('')
    const input: CriarNotifAdminInput = {
      titulo: titulo.trim(),
      mensagem: mensagem.trim(),
      categoria,
      destinatarios,
      usuariosManual: destinatarios === 'manual' ? selectedUsers : undefined,
    }
    const result = await criarNotificacaoAdminAction(input)
    setSubmitting(false)
    if (result.error) {
      setErrorMsg(result.error)
    } else {
      setSuccessMsg(`Notificação enviada para ${result.count} usuário${result.count !== 1 ? 's' : ''}!`)
      setTitulo('')
      setMensagem('')
      setCategoria('info')
      setDestinatarios('todos')
      setSelectedUsers([])
      // Refresh history
      const { data } = await fetchAdminNotificacoesAction()
      setHistorico(data ?? [])
      setTimeout(() => setSuccessMsg(''), 5000)
    }
  }

  function handleDelete(id: string) {
    startTransition(async () => {
      await excluirNotificacaoAdminAction(id)
      setHistorico(prev => prev.filter(n => n.id !== id))
    })
  }

  function toggleUser(id: string) {
    setSelectedUsers(prev =>
      prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id]
    )
  }

  const selectedTipo = TIPO_OPTIONS.find(t => t.value === categoria)

  return (
    <div className="space-y-8">
      {/* Create Form */}
      <div className="rounded-2xl p-6"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <h2 className="text-base font-semibold mb-5" style={{ color: 'var(--text-primary)' }}>
          Enviar Nova Notificação
        </h2>
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Titulo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Título *
            </label>
            <input
              value={titulo}
              onChange={e => setTitulo(e.target.value)}
              placeholder="Ex: Atualização importante do sistema"
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Mensagem */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Mensagem *
            </label>
            <textarea
              value={mensagem}
              onChange={e => setMensagem(e.target.value)}
              placeholder="Escreva a mensagem detalhada aqui..."
              rows={4}
              className="w-full px-3 py-2.5 rounded-xl text-sm outline-none resize-none"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)', color: 'var(--text-primary)' }}
            />
          </div>

          {/* Tipo */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Tipo
            </label>
            <div className="flex gap-2 flex-wrap">
              {TIPO_OPTIONS.map(t => (
                <button
                  key={t.value}
                  type="button"
                  onClick={() => setCategoria(t.value as typeof categoria)}
                  className="px-4 py-2 rounded-xl text-sm font-medium cursor-pointer transition-all"
                  style={categoria === t.value
                    ? { background: `${t.color}20`, color: t.color, border: `1px solid ${t.color}50` }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          {/* Destinatários */}
          <div>
            <label className="block text-xs font-medium mb-1.5" style={{ color: 'var(--text-secondary)' }}>
              Destinatários
            </label>
            <div className="flex gap-2 flex-wrap">
              {DEST_OPTIONS.map(d => (
                <button
                  key={d.value}
                  type="button"
                  onClick={() => setDestinatarios(d.value as typeof destinatarios)}
                  className="px-3 py-1.5 rounded-lg text-sm cursor-pointer transition-all"
                  style={destinatarios === d.value
                    ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(224, 176, 102,0.3)' }
                    : { background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }
                  }
                >
                  {d.label}
                </button>
              ))}
            </div>
          </div>

          {/* Manual user selection */}
          {destinatarios === 'manual' && (
            <div className="rounded-xl p-3 max-h-48 overflow-y-auto"
              style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-2 px-1">
                <span className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  {selectedUsers.length} selecionado{selectedUsers.length !== 1 ? 's' : ''}
                </span>
                <button type="button" onClick={() => setSelectedUsers(professores.map(p => p.id))}
                  className="text-xs cursor-pointer" style={{ color: 'var(--green-primary)' }}>
                  Selecionar todos
                </button>
              </div>
              {professores.map(p => (
                <label key={p.id}
                  className="flex items-center gap-3 px-2 py-1.5 rounded-lg cursor-pointer hover:bg-[var(--bg-card)] transition-colors">
                  <input
                    type="checkbox"
                    checked={selectedUsers.includes(p.id)}
                    onChange={() => toggleUser(p.id)}
                    className="w-4 h-4 accent-[var(--green-primary)]"
                  />
                  <div>
                    <p className="text-sm" style={{ color: 'var(--text-primary)' }}>{p.nome}</p>
                    <p className="text-xs" style={{ color: 'var(--text-muted)' }}>{p.email}</p>
                  </div>
                </label>
              ))}
            </div>
          )}

          {/* Error / Success */}
          {errorMsg && (
            <p className="text-sm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(255,82,82,0.1)', color: '#FF5252', border: '1px solid rgba(255,82,82,0.2)' }}>
              {errorMsg}
            </p>
          )}
          {successMsg && (
            <p className="text-sm px-3 py-2 rounded-lg"
              style={{ background: 'rgba(224, 176, 102,0.1)', color: 'var(--green-primary)', border: '1px solid rgba(224, 176, 102,0.2)' }}>
              ✅ {successMsg}
            </p>
          )}

          {/* Submit */}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-2.5 rounded-xl text-sm font-semibold cursor-pointer transition-opacity"
            style={{
              background: selectedTipo?.color ?? 'var(--green-primary)',
              color: '#fff',
              opacity: submitting ? 0.6 : 1,
            }}
          >
            {submitting ? 'Enviando...' : `Enviar notificação ${selectedTipo?.label ?? ''}`}
          </button>
        </form>
      </div>

      {/* History */}
      <div className="rounded-2xl overflow-hidden"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
        <div className="px-6 py-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <h2 className="text-base font-semibold" style={{ color: 'var(--text-primary)' }}>
            Histórico de Notificações Enviadas
          </h2>
        </div>
        {loading ? (
          <div className="flex justify-center py-10">
            <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
              style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
          </div>
        ) : historico.length === 0 ? (
          <div className="py-10 text-center">
            <p style={{ color: 'var(--text-muted)' }}>Nenhuma notificação enviada ainda.</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                  {['Data', 'Título', 'Tipo', 'Enviado', 'Lido', 'Ações'].map(h => (
                    <th key={h} className="px-4 py-3 text-left font-medium"
                      style={{ color: 'var(--text-muted)' }}>
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {historico.map(n => (
                  <tr key={n.id} style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                    <td className="px-4 py-3 whitespace-nowrap" style={{ color: 'var(--text-muted)' }}>
                      {new Date(n.created_at).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })}
                    </td>
                    <td className="px-4 py-3">
                      <p className="font-medium" style={{ color: 'var(--text-primary)' }}>{n.titulo}</p>
                      <p className="text-xs mt-0.5 line-clamp-1" style={{ color: 'var(--text-secondary)' }}>{n.mensagem}</p>
                    </td>
                    <td className="px-4 py-3">
                      <span className="px-2 py-0.5 rounded-full text-xs font-medium"
                        style={{
                          background: n.categoria === 'urgente' ? 'rgba(255,82,82,0.15)' : n.categoria === 'importante' ? 'rgba(255,179,0,0.15)' : 'rgba(33,150,243,0.15)',
                          color: n.categoria === 'urgente' ? '#FF5252' : n.categoria === 'importante' ? '#FFB300' : '#2196F3',
                        }}>
                        {n.categoria}
                      </span>
                    </td>
                    <td className="px-4 py-3" style={{ color: 'var(--text-secondary)' }}>{n.total_enviado}</td>
                    <td className="px-4 py-3">
                      <span style={{ color: 'var(--green-primary)' }}>{n.total_lido}</span>
                      <span style={{ color: 'var(--text-muted)' }}>/{n.total_enviado}</span>
                    </td>
                    <td className="px-4 py-3">
                      <button
                        onClick={() => handleDelete(n.id)}
                        className="text-xs px-3 py-1 rounded-lg cursor-pointer transition-colors"
                        style={{ color: '#FF5252', border: '1px solid rgba(255,82,82,0.3)' }}
                        onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'rgba(255,82,82,0.1)' }}
                        onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = 'transparent' }}
                      >
                        Excluir
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  )
}
