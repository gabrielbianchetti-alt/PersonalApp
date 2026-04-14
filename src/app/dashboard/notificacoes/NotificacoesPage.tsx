'use client'

import { useState, useEffect, useTransition } from 'react'
import { useRouter } from 'next/navigation'
import { fetchNotificacoesAction, marcarLidaAction, marcarTodasLidasAction } from './actions'
import type { NotificacaoComLeitura } from '@/types/notificacao'

function timeAgo(iso: string): string {
  const diff = Date.now() - new Date(iso).getTime()
  const mins = Math.floor(diff / 60000)
  if (mins < 1) return 'agora'
  if (mins < 60) return `há ${mins}min`
  const hrs = Math.floor(mins / 60)
  if (hrs < 24) return `há ${hrs}h`
  const days = Math.floor(hrs / 24)
  if (days === 1) return 'ontem'
  if (days < 7) return `há ${days} dias`
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
}

const CATEGORIA_LABELS: Record<string, string> = {
  aula: 'Aula', cobranca: 'Cobrança', reposicao: 'Reposição',
  aniversario: 'Aniversário', churn: 'Alerta', custo: 'Custo',
  info: 'Info', importante: 'Importante', urgente: 'Urgente',
}

const CATEGORIA_ICONS: Record<string, string> = {
  aula: '📅', cobranca: '💰', reposicao: '🔄', aniversario: '🎂',
  churn: '⚠️', custo: '📊', info: 'ℹ️', importante: '⚡', urgente: '🚨',
}

const CATEGORIA_COLORS: Record<string, string> = {
  urgente: '#FF5252', importante: '#FFB300', cobranca: '#FF9800',
  churn: '#FF7043', aniversario: '#E91E63', aula: 'var(--green-primary)',
  reposicao: '#2196F3', custo: '#9C27B0', info: '#2196F3',
}

export function NotificacoesPage() {
  const router = useRouter()
  const [notifications, setNotifications] = useState<NotificacaoComLeitura[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState<'todas' | 'nao-lidas'>('todas')
  const [, startTransition] = useTransition()

  useEffect(() => {
    fetchNotificacoesAction().then(({ data }) => {
      setNotifications(data ?? [])
      setLoading(false)
    })
  }, [])

  const unreadCount = notifications.filter(n => !n.lida).length
  const filtered = filter === 'nao-lidas' ? notifications.filter(n => !n.lida) : notifications

  function handleMarkRead(n: NotificacaoComLeitura) {
    if (!n.lida) {
      startTransition(async () => {
        await marcarLidaAction(n.id)
        setNotifications(prev => prev.map(x => x.id === n.id ? { ...x, lida: true } : x))
      })
    }
    if (n.notificacao?.link) {
      router.push(n.notificacao.link)
    }
  }

  function handleMarkAllRead() {
    startTransition(async () => {
      await marcarTodasLidasAction()
      setNotifications(prev => prev.map(x => ({ ...x, lida: true })))
    })
  }

  return (
    <div className="p-4 md:p-8 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold" style={{ color: 'var(--text-primary)' }}>
            Notificações
          </h1>
          {unreadCount > 0 && (
            <p className="text-sm mt-0.5" style={{ color: 'var(--text-muted)' }}>
              {unreadCount} não lida{unreadCount > 1 ? 's' : ''}
            </p>
          )}
        </div>
        {unreadCount > 0 && (
          <button
            onClick={handleMarkAllRead}
            className="text-sm px-4 py-2 rounded-lg cursor-pointer"
            style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.2)' }}
          >
            Marcar todas como lidas
          </button>
        )}
      </div>

      {/* Filter tabs */}
      <div className="flex gap-1 p-1 rounded-xl mb-4"
        style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)', width: 'fit-content' }}>
        {(['todas', 'nao-lidas'] as const).map(f => (
          <button
            key={f}
            onClick={() => setFilter(f)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium transition-colors cursor-pointer"
            style={filter === f
              ? { background: 'var(--green-primary)', color: '#000' }
              : { color: 'var(--text-secondary)' }
            }
          >
            {f === 'todas' ? 'Todas' : `Não lidas${unreadCount > 0 ? ` (${unreadCount})` : ''}`}
          </button>
        ))}
      </div>

      {/* List */}
      {loading ? (
        <div className="flex justify-center py-16">
          <div className="w-8 h-8 rounded-full border-2 border-t-transparent animate-spin"
            style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
        </div>
      ) : filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 gap-3 rounded-2xl"
          style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
          <span style={{ fontSize: '3rem' }}>🔔</span>
          <p style={{ color: 'var(--text-muted)' }}>
            {filter === 'nao-lidas' ? 'Nenhuma notificação não lida' : 'Nenhuma notificação'}
          </p>
        </div>
      ) : (
        <div className="flex flex-col gap-2">
          {filtered.map(n => (
            <button
              key={n.id}
              onClick={() => handleMarkRead(n)}
              className="flex items-start gap-4 p-4 rounded-2xl text-left w-full cursor-pointer transition-all duration-150"
              style={{
                background: !n.lida ? 'var(--bg-card)' : 'var(--bg-surface)',
                border: !n.lida ? '1px solid rgba(0,230,118,0.2)' : '1px solid var(--border-subtle)',
              }}
              onMouseEnter={e => { (e.currentTarget as HTMLElement).style.opacity = '0.85' }}
              onMouseLeave={e => { (e.currentTarget as HTMLElement).style.opacity = '1' }}
            >
              {/* Icon */}
              <div className="shrink-0 w-12 h-12 rounded-2xl flex items-center justify-center text-xl"
                style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                {CATEGORIA_ICONS[n.notificacao?.categoria] ?? '🔔'}
              </div>
              {/* Content */}
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-xs font-medium px-2 py-0.5 rounded-full"
                    style={{
                      background: `${CATEGORIA_COLORS[n.notificacao?.categoria] ?? '#2196F3'}20`,
                      color: CATEGORIA_COLORS[n.notificacao?.categoria] ?? '#2196F3',
                    }}>
                    {CATEGORIA_LABELS[n.notificacao?.categoria] ?? n.notificacao?.categoria}
                  </span>
                  {!n.lida && (
                    <span className="w-2 h-2 rounded-full" style={{ background: '#FF5252' }} />
                  )}
                </div>
                <p className="text-sm font-semibold leading-snug" style={{ color: 'var(--text-primary)' }}>
                  {n.notificacao?.titulo}
                </p>
                <p className="text-sm mt-0.5" style={{ color: 'var(--text-secondary)' }}>
                  {n.notificacao?.mensagem}
                </p>
                <p className="text-xs mt-1.5" style={{ color: 'var(--text-muted)' }}>
                  {timeAgo(n.created_at)}
                  {n.notificacao?.link && (
                    <span style={{ color: 'var(--green-primary)' }}> · Ver →</span>
                  )}
                </p>
              </div>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
