'use client'

import React, { useState, useEffect, useRef, useTransition, useCallback, forwardRef } from 'react'
import { useRouter } from 'next/navigation'
import { fetchNotificacoesAction, marcarLidaAction, marcarTodasLidasAction, fetchUnreadCountAction } from '@/app/dashboard/notificacoes/actions'
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
  return new Date(iso).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit' })
}

function getCategoriaIcon(categoria: string): string {
  const icons: Record<string, string> = {
    aula: '📅',
    cobranca: '💰',
    reposicao: '🔄',
    aniversario: '🎂',
    churn: '⚠️',
    custo: '📊',
    info: 'ℹ️',
    importante: '⚡',
    urgente: '🚨',
  }
  return icons[categoria] ?? '🔔'
}

function getCategoriaColor(categoria: string): string {
  const colors: Record<string, string> = {
    urgente: '#FF5252',
    importante: '#FFB300',
    cobranca: '#FF9800',
    churn: '#FF7043',
    aniversario: '#E91E63',
    aula: 'var(--green-primary)',
    reposicao: '#2196F3',
    custo: '#9C27B0',
    info: '#2196F3',
  }
  return colors[categoria] ?? 'var(--text-secondary)'
}

interface Props {
  variant?: 'sidebar' | 'mobile'
}

export function NotificationBell({ variant = 'sidebar' }: Props) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [unreadCount, setUnreadCount] = useState(0)
  const [notifications, setNotifications] = useState<NotificacaoComLeitura[]>([])
  const [loading, setLoading] = useState(false)
  const [, startTransition] = useTransition()
  const panelRef = useRef<HTMLDivElement>(null)
  const buttonRef = useRef<HTMLButtonElement>(null)

  // Fetch unread count on mount and periodically
  const refreshCount = useCallback(async () => {
    const { count } = await fetchUnreadCountAction()
    setUnreadCount(count)
  }, [])

  useEffect(() => {
    refreshCount()
    const interval = setInterval(refreshCount, 60000) // refresh every minute
    return () => clearInterval(interval)
  }, [refreshCount])

  // Close on outside click
  useEffect(() => {
    if (!open) return
    function handleClick(e: MouseEvent) {
      if (
        panelRef.current && !panelRef.current.contains(e.target as Node) &&
        buttonRef.current && !buttonRef.current.contains(e.target as Node)
      ) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [open])

  async function handleOpen() {
    if (open) { setOpen(false); return }
    setOpen(true)
    setLoading(true)
    const { data } = await fetchNotificacoesAction()
    setNotifications(data ?? [])
    setLoading(false)
  }

  async function handleMarkRead(notifId: string, link: string | null) {
    startTransition(async () => {
      await marcarLidaAction(notifId)
      setNotifications(prev => prev.map(n => n.id === notifId ? { ...n, lida: true } : n))
      setUnreadCount(prev => Math.max(0, prev - 1))
    })
    if (link) {
      setOpen(false)
      router.push(link)
    }
  }

  async function handleMarkAllRead() {
    startTransition(async () => {
      await marcarTodasLidasAction()
      setNotifications(prev => prev.map(n => ({ ...n, lida: true })))
      setUnreadCount(0)
    })
  }

  const bellIcon = (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
      <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
      <path d="M13.73 21a2 2 0 0 1-3.46 0" />
    </svg>
  )

  if (variant === 'mobile') {
    return (
      <div className="relative">
        <button
          ref={buttonRef}
          onClick={handleOpen}
          className="relative p-2 rounded-lg cursor-pointer"
          style={{ color: 'var(--text-secondary)' }}
          aria-label="Notificações"
        >
          {bellIcon}
          {unreadCount > 0 && (
            <span
              className="absolute top-1 right-1 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white font-bold"
              style={{ background: '#FF5252', fontSize: '9px', padding: '0 3px' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </button>
        {open && (
          <NotificationPanel
            ref={panelRef}
            notifications={notifications}
            loading={loading}
            unreadCount={unreadCount}
            onMarkRead={handleMarkRead}
            onMarkAllRead={handleMarkAllRead}
            onClose={() => setOpen(false)}
            position="right"
          />
        )}
      </div>
    )
  }

  // Sidebar variant — rendered as a nav-item-like button
  return (
    <div className="relative px-3">
      <button
        ref={buttonRef}
        onClick={handleOpen}
        className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors duration-100 cursor-pointer"
        style={open
          ? { background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid rgba(0,230,118,0.15)' }
          : { color: 'var(--text-secondary)', background: 'transparent', border: '1px solid transparent' }
        }
        onMouseEnter={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'var(--bg-card)' }}
        onMouseLeave={e => { if (!open) (e.currentTarget as HTMLElement).style.background = 'transparent' }}
        aria-label="Notificações"
      >
        <div className="relative shrink-0">
          {bellIcon}
          {unreadCount > 0 && (
            <span
              className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 flex items-center justify-center rounded-full text-white font-bold"
              style={{ background: '#FF5252', fontSize: '9px', padding: '0 3px' }}
            >
              {unreadCount > 99 ? '99+' : unreadCount}
            </span>
          )}
        </div>
        <span className="text-sm font-medium">Notificações</span>
      </button>
      {open && (
        <NotificationPanel
          ref={panelRef}
          notifications={notifications}
          loading={loading}
          unreadCount={unreadCount}
          onMarkRead={handleMarkRead}
          onMarkAllRead={handleMarkAllRead}
          onClose={() => setOpen(false)}
          position="left"
        />
      )}
    </div>
  )
}

// ─── Notification Panel ────────────────────────────────────────────────────────

interface PanelProps {
  notifications: NotificacaoComLeitura[]
  loading: boolean
  unreadCount: number
  onMarkRead: (id: string, link: string | null) => void
  onMarkAllRead: () => void
  onClose: () => void
  position: 'left' | 'right'
}

const NotificationPanel = forwardRef<HTMLDivElement, PanelProps>(
  function NotificationPanel({ notifications, loading, unreadCount, onMarkRead, onMarkAllRead, onClose, position }, ref) {
    return (
      <div
        ref={ref}
        className="fixed md:absolute z-50 w-96 max-h-[80vh] flex flex-col rounded-2xl shadow-2xl overflow-hidden"
        style={{
          background: 'var(--bg-card)',
          border: '1px solid var(--border-subtle)',
          ...(position === 'right'
            ? { top: '56px', right: '0' }
            : { top: '0', left: '248px' }),
          maxWidth: 'calc(100vw - 16px)',
        }}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-4 py-3 shrink-0"
          style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-center gap-2">
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>
              Notificações
            </span>
            {unreadCount > 0 && (
              <span className="px-2 py-0.5 rounded-full text-xs font-bold text-white"
                style={{ background: '#FF5252' }}>
                {unreadCount}
              </span>
            )}
          </div>
          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={onMarkAllRead}
                className="text-xs cursor-pointer"
                style={{ color: 'var(--green-primary)' }}
              >
                Marcar todas
              </button>
            )}
            <button onClick={onClose} className="p-1 rounded cursor-pointer"
              style={{ color: 'var(--text-muted)' }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="w-6 h-6 rounded-full border-2 border-t-transparent animate-spin"
                style={{ borderColor: 'var(--green-primary)', borderTopColor: 'transparent' }} />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span style={{ fontSize: '2rem' }}>🔔</span>
              <p className="text-sm" style={{ color: 'var(--text-muted)' }}>Sem notificações</p>
            </div>
          ) : (
            notifications.map(n => (
              <button
                key={n.id}
                onClick={() => onMarkRead(n.id, n.notificacao?.link ?? null)}
                className="w-full flex items-start gap-3 px-4 py-3 text-left transition-colors duration-100 cursor-pointer"
                style={{
                  background: !n.lida ? 'rgba(0,230,118,0.04)' : 'transparent',
                  borderBottom: '1px solid var(--border-subtle)',
                }}
                onMouseEnter={e => { (e.currentTarget as HTMLElement).style.background = 'var(--bg-surface)' }}
                onMouseLeave={e => { (e.currentTarget as HTMLElement).style.background = !n.lida ? 'rgba(0,230,118,0.04)' : 'transparent' }}
              >
                {/* Icon */}
                <div className="shrink-0 w-9 h-9 rounded-full flex items-center justify-center text-base"
                  style={{ background: 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}>
                  {getCategoriaIcon(n.notificacao?.categoria)}
                </div>
                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <p className="text-sm font-medium leading-snug" style={{
                      color: getCategoriaColor(n.notificacao?.categoria),
                    }}>
                      {n.notificacao?.titulo}
                    </p>
                    {!n.lida && (
                      <div className="w-2 h-2 rounded-full shrink-0 mt-1" style={{ background: '#FF5252' }} />
                    )}
                  </div>
                  <p className="text-xs mt-0.5 line-clamp-2" style={{ color: 'var(--text-secondary)' }}>
                    {n.notificacao?.mensagem}
                  </p>
                  <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>
                    {timeAgo(n.created_at)}
                  </p>
                </div>
              </button>
            ))
          )}
        </div>


      </div>
    )
  }
)
