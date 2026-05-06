'use client'

import { useState, type ReactNode, type CSSProperties } from 'react'
import Link from 'next/link'
import {
  Calendar, Clock, User, Users, DollarSign, TrendingUp, MessageSquare,
  Check, X, Plus, Minus, Edit, Trash, Search, Filter,
  Settings, Bell, ChevronRight, ChevronDown, Menu,
  Home, CalendarCheck, FileText, CheckCircle2, Info, AlertTriangle, XCircle,
  Copy, Shield,
} from 'lucide-react'

// ─── Section wrapper ─────────────────────────────────────────────────────────

function Section({ id, title, children }: { id: string; title: string; children: ReactNode }) {
  return (
    <section id={id} className="mb-12 scroll-mt-20">
      <h2
        className="text-[11px] font-bold uppercase tracking-[0.18em] mb-4 pb-2"
        style={{
          color: 'var(--text-muted)',
          borderBottom: '1px solid var(--border-subtle)',
        }}
      >
        {title}
      </h2>
      {children}
    </section>
  )
}

function SubLabel({ children }: { children: ReactNode }) {
  return (
    <p
      className="text-[10px] font-semibold uppercase tracking-wider mb-2"
      style={{ color: 'var(--text-muted)' }}
    >
      {children}
    </p>
  )
}

// ─── Color swatch ────────────────────────────────────────────────────────────

function ColorSwatch({
  name, value, usage, swatchStyle, textColor,
}: {
  name: string
  value: string
  usage: string
  swatchStyle: CSSProperties
  textColor?: string
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    try {
      await navigator.clipboard.writeText(value)
      setCopied(true)
      setTimeout(() => setCopied(false), 1200)
    } catch {
      // ignored
    }
  }

  return (
    <div
      className="rounded-xl overflow-hidden flex flex-col"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="h-20 w-full relative" style={swatchStyle}>
        <button
          onClick={copy}
          className="absolute top-2 right-2 w-7 h-7 rounded-md flex items-center justify-center cursor-pointer text-[10px] font-semibold"
          style={{
            background: 'rgba(0,0,0,0.35)',
            color: textColor ?? '#fff',
            backdropFilter: 'blur(6px)',
          }}
          aria-label={`Copiar ${value}`}
        >
          {copied ? <Check size={14} strokeWidth={2.5} /> : <Copy size={13} strokeWidth={2} />}
        </button>
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-xs font-semibold truncate" style={{ color: 'var(--text-primary)' }}>
          {name}
        </p>
        <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
          {value}
        </p>
        <p className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--text-muted)' }}>
          {usage}
        </p>
      </div>
    </div>
  )
}

// ─── DualSwatch (dark + light side by side) ─────────────────────────────────

function DualSwatch({
  token, dark, light, usage,
}: { token: string; dark: string; light: string; usage: string }) {
  return (
    <div
      className="rounded-xl overflow-hidden"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="grid grid-cols-2 h-16">
        <div className="relative flex items-end p-2" style={{ background: dark }}>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(0,0,0,0.45)', color: '#F9FAFB' }}>
            dark
          </span>
        </div>
        <div className="relative flex items-end p-2" style={{ background: light }}>
          <span className="text-[10px] font-mono px-1.5 py-0.5 rounded" style={{ background: 'rgba(255,255,255,0.7)', color: '#111827' }}>
            light
          </span>
        </div>
      </div>
      <div className="p-3 flex flex-col gap-0.5">
        <p className="text-xs font-semibold font-mono truncate" style={{ color: 'var(--text-primary)' }}>
          {token}
        </p>
        <p className="text-[11px] font-mono truncate" style={{ color: 'var(--text-secondary)' }}>
          {dark} <span style={{ color: 'var(--text-muted)' }}>/</span> {light}
        </p>
        <p className="text-[10px] mt-1 leading-tight" style={{ color: 'var(--text-muted)' }}>
          {usage}
        </p>
      </div>
    </div>
  )
}

// ─── Status colors ───────────────────────────────────────────────────────────

const STATUS_COLORS: { hex: string; label: string }[] = [
  { hex: '#10B981', label: 'Sucesso / Aula normal' },
  { hex: '#EF4444', label: 'Erro / Aluno faltou' },
  { hex: '#F59E0B', label: 'Warning / Cancelamento antecipado' },
  { hex: '#8B5CF6', label: 'Professor cancelou' },
  { hex: '#38BDF8', label: 'Remarcação' },
  { hex: '#FBBF24', label: 'Aula extra' },
  { hex: '#3B82F6', label: 'Info' },
  { hex: '#EC4899', label: 'Feriado nacional' },
]

const ACCENT_PRESETS: { hex: string; label: string }[] = [
  { hex: '#10B981', label: 'Esmeralda (padrão)' },
  { hex: '#3B82F6', label: 'Azul' },
  { hex: '#8B5CF6', label: 'Roxo' },
  { hex: '#E91E63', label: 'Rosa' },
  { hex: '#EF4444', label: 'Vermelho' },
  { hex: '#38BDF8', label: 'Ciano' },
  { hex: '#F59E0B', label: 'Âmbar' },
]

// ─── Typography sample ──────────────────────────────────────────────────────

function TypeRow({
  label, sampleStyle, sample, usage,
}: { label: string; sampleStyle: CSSProperties; sample: string; usage: string }) {
  return (
    <div
      className="rounded-xl p-4 flex flex-col gap-2"
      style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}
    >
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
          {label}
        </span>
        <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>
          {usage}
        </span>
      </div>
      <p style={{ color: 'var(--text-primary)', ...sampleStyle }}>{sample}</p>
    </div>
  )
}

// ─── Spacing visual ──────────────────────────────────────────────────────────

function SpacingRow({ value, label }: { value: number; label: string }) {
  return (
    <div className="flex items-center gap-3">
      <div className="w-14 text-xs font-mono" style={{ color: 'var(--text-secondary)' }}>{value}px</div>
      <div className="rounded" style={{ width: value, height: 16, background: 'var(--green-primary)' }} />
      <div className="text-xs flex-1" style={{ color: 'var(--text-muted)' }}>{label}</div>
    </div>
  )
}

// ─── Radius visual ───────────────────────────────────────────────────────────

function RadiusBox({ radius, label }: { radius: string; label: string }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <div
        className="w-20 h-20 flex items-center justify-center text-[10px] font-mono"
        style={{
          background: 'var(--green-muted)',
          border: '1px solid var(--green-border)',
          color: 'var(--green-primary)',
          borderRadius: radius,
        }}
      >
        {radius}
      </div>
      <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{label}</p>
    </div>
  )
}

// ─── Elevation ───────────────────────────────────────────────────────────────

const ELEVATIONS: { level: string; shadow: string; usage: string }[] = [
  { level: 'Level 1',  shadow: '0 1px 2px rgba(0,0,0,0.18), 0 1px 3px rgba(0,0,0,0.12)',  usage: 'Hover sutil em cards' },
  { level: 'Level 2',  shadow: '0 4px 8px rgba(0,0,0,0.20), 0 2px 4px rgba(0,0,0,0.10)',  usage: 'Cards principais' },
  { level: 'Level 3',  shadow: '0 12px 24px rgba(0,0,0,0.30), 0 4px 8px rgba(0,0,0,0.14)', usage: 'Modais' },
  { level: 'Level 4',  shadow: '0 24px 48px rgba(0,0,0,0.40), 0 8px 16px rgba(0,0,0,0.20)', usage: 'Popovers / Dropdowns' },
]

// ─── Buttons preview ────────────────────────────────────────────────────────

function ButtonRow({ label, render }: { label: string; render: (state: 'default'|'hover'|'active'|'disabled') => ReactNode }) {
  return (
    <div className="grid grid-cols-1 md:grid-cols-[120px_1fr] gap-3 items-center py-3" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      <p className="text-xs font-semibold" style={{ color: 'var(--text-secondary)' }}>{label}</p>
      <div className="flex flex-wrap gap-2 items-center">
        <div className="flex flex-col items-start gap-1">{render('default')}<span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>default</span></div>
        <div className="flex flex-col items-start gap-1">{render('hover')}<span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>hover</span></div>
        <div className="flex flex-col items-start gap-1">{render('active')}<span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>active</span></div>
        <div className="flex flex-col items-start gap-1">{render('disabled')}<span className="text-[9px]" style={{ color: 'var(--text-muted)' }}>disabled</span></div>
      </div>
    </div>
  )
}

function PrimaryButton({ state, withArrow, size = 'md' }: { state: 'default'|'hover'|'active'|'disabled'; withArrow?: boolean; size?: 'sm'|'md'|'lg' }) {
  const heights = { sm: 32, md: 40, lg: 48 }
  const padX    = { sm: 12, md: 16, lg: 20 }
  const fonts   = { sm: 12, md: 14, lg: 15 }
  const bg = state === 'hover' ? '#059669' : state === 'active' ? '#047857' : '#10B981'
  return (
    <button
      disabled={state === 'disabled'}
      className="rounded-xl font-semibold inline-flex items-center gap-1.5 cursor-pointer disabled:cursor-not-allowed"
      style={{
        height: heights[size],
        paddingLeft: padX[size],
        paddingRight: padX[size],
        background: bg,
        color: '#000',
        opacity: state === 'disabled' ? 0.4 : 1,
        fontSize: fonts[size],
      }}
    >
      Salvar {withArrow && <ChevronRight size={14} strokeWidth={2.5} />}
    </button>
  )
}

function SecondaryButton({ state }: { state: 'default'|'hover'|'active'|'disabled' }) {
  const bg = state === 'hover' ? 'var(--bg-input)' : state === 'active' ? 'var(--bg-card)' : 'transparent'
  return (
    <button
      disabled={state === 'disabled'}
      className="h-10 px-4 rounded-xl text-sm font-semibold inline-flex items-center cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: bg,
        color: 'var(--text-primary)',
        border: '1px solid var(--border-subtle)',
        opacity: state === 'disabled' ? 0.4 : 1,
      }}
    >
      Cancelar
    </button>
  )
}

function TertiaryButton({ state }: { state: 'default'|'hover'|'active'|'disabled' }) {
  const bg = state === 'hover' ? 'var(--green-muted)' : state === 'active' ? 'rgba(16,185,129,0.22)' : 'transparent'
  return (
    <button
      disabled={state === 'disabled'}
      className="h-10 px-3 rounded-xl text-sm font-semibold inline-flex items-center cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: bg,
        color: 'var(--green-primary)',
        opacity: state === 'disabled' ? 0.4 : 1,
      }}
    >
      Ver mais
    </button>
  )
}

function DangerButton({ state }: { state: 'default'|'hover'|'active'|'disabled' }) {
  const bg = state === 'hover' ? '#DC2626' : state === 'active' ? '#B91C1C' : '#EF4444'
  return (
    <button
      disabled={state === 'disabled'}
      className="h-10 px-4 rounded-xl text-sm font-semibold inline-flex items-center cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: bg,
        color: '#fff',
        opacity: state === 'disabled' ? 0.4 : 1,
      }}
    >
      Excluir
    </button>
  )
}

function GhostButton({ state }: { state: 'default'|'hover'|'active'|'disabled' }) {
  const bg = state === 'hover' ? 'var(--bg-input)' : state === 'active' ? 'var(--bg-card)' : 'transparent'
  return (
    <button
      disabled={state === 'disabled'}
      className="h-10 px-3 rounded-xl text-sm font-medium inline-flex items-center cursor-pointer disabled:cursor-not-allowed"
      style={{
        background: bg,
        color: 'var(--text-secondary)',
        opacity: state === 'disabled' ? 0.4 : 1,
      }}
    >
      <Menu size={14} strokeWidth={1.75} />
    </button>
  )
}

// ─── Inputs preview ─────────────────────────────────────────────────────────

function InputBox({
  state, children, hint,
}: { state: 'default'|'focus'|'error'|'disabled'; children: ReactNode; hint?: string }) {
  return (
    <div className="flex flex-col gap-1.5">
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>{state}</span>
        {hint && <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>{hint}</span>}
      </div>
      {children}
    </div>
  )
}

function inputBaseStyle(state: 'default'|'focus'|'error'|'disabled'): CSSProperties {
  return {
    background: state === 'disabled' ? 'var(--bg-card)' : 'var(--bg-input)',
    border: state === 'focus'
      ? '1px solid var(--border-focus)'
      : state === 'error'
      ? '1px solid #EF4444'
      : '1px solid var(--border-subtle)',
    color: 'var(--text-primary)',
    boxShadow: state === 'focus' ? '0 0 0 3px rgba(16,185,129,0.18)' : 'none',
    opacity: state === 'disabled' ? 0.5 : 1,
  }
}

// ─── Chips ───────────────────────────────────────────────────────────────────

function Chip({ label, variant, onRemove }: { label: string; variant: 'filled'|'outline'|'removable'; onRemove?: boolean }) {
  if (variant === 'filled') {
    return (
      <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
        style={{ background: 'var(--green-primary)', color: '#000' }}>
        {label}
      </span>
    )
  }
  if (variant === 'outline') {
    return (
      <span className="text-xs font-medium px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
        style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
        {label}
      </span>
    )
  }
  return (
    <span className="text-xs font-semibold px-3 py-1.5 rounded-full inline-flex items-center gap-1.5"
      style={{ background: 'var(--green-muted)', color: 'var(--green-primary)', border: '1px solid var(--green-border)' }}>
      {label}
      {onRemove && (
        <span className="w-3.5 h-3.5 rounded-full inline-flex items-center justify-center" style={{ background: 'rgba(16,185,129,0.4)' }}>
          <X size={9} strokeWidth={3} />
        </span>
      )}
    </span>
  )
}

function StatusBadge({ tone, label }: { tone: 'success'|'pending'|'error'|'info'; label: string }) {
  const map = {
    success: { bg: 'rgba(16,185,129,0.15)',  fg: '#10B981' },
    pending: { bg: 'rgba(245,158,11,0.15)',  fg: '#F59E0B' },
    error:   { bg: 'rgba(239,68,68,0.15)',   fg: '#EF4444' },
    info:    { bg: 'rgba(59,130,246,0.15)',  fg: '#3B82F6' },
  }[tone]
  return (
    <span className="text-xs font-semibold px-2.5 py-1 rounded-full inline-flex items-center gap-1.5"
      style={{ background: map.bg, color: map.fg }}>
      {label}
    </span>
  )
}

const COBRANCA_TAGS: { label: string; bg: string; fg: string }[] = [
  { label: 'Por aula',          bg: 'rgba(59,130,246,0.15)',  fg: '#3B82F6' },
  { label: 'Mensalidade',       bg: 'rgba(16,185,129,0.15)',  fg: '#10B981' },
  { label: 'Pacote Fixo',       bg: 'rgba(139,92,246,0.15)',  fg: '#8B5CF6' },
  { label: 'Pacote Alternado',  bg: 'rgba(249,115,22,0.15)',  fg: '#F97316' },
]

// ─── Tabs ────────────────────────────────────────────────────────────────────

function TabsDemo() {
  const [active, setActive] = useState<'agenda'|'alunos'|'cobrancas'>('agenda')
  return (
    <div className="flex gap-6 px-4" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
      {([
        { key: 'agenda',    label: 'Agenda',    badge: null },
        { key: 'alunos',    label: 'Alunos',    badge: 12   },
        { key: 'cobrancas', label: 'Cobranças', badge: 3    },
      ] as const).map(t => (
        <button
          key={t.key}
          onClick={() => setActive(t.key)}
          className="relative py-3 text-sm font-medium cursor-pointer inline-flex items-center gap-2"
          style={{ color: active === t.key ? 'var(--text-primary)' : 'var(--text-muted)' }}
        >
          {t.label}
          {t.badge !== null && (
            <span className="text-[10px] px-1.5 rounded-full font-semibold"
              style={{
                background: active === t.key ? 'var(--green-muted)' : 'var(--bg-input)',
                color: active === t.key ? 'var(--green-primary)' : 'var(--text-muted)',
              }}>
              {t.badge}
            </span>
          )}
          {active === t.key && (
            <span
              className="absolute left-0 right-0 -bottom-px h-0.5 rounded-full"
              style={{ background: 'var(--green-primary)' }}
            />
          )}
        </button>
      ))}
    </div>
  )
}

// ─── Alerts ──────────────────────────────────────────────────────────────────

function Alert({ tone, title, body }: { tone: 'success'|'info'|'warning'|'error'; title: string; body: string }) {
  const map = {
    success: { bg: 'rgba(16,185,129,0.10)',  fg: '#10B981', border: 'rgba(16,185,129,0.30)',  Icon: CheckCircle2 },
    info:    { bg: 'rgba(59,130,246,0.10)',  fg: '#3B82F6', border: 'rgba(59,130,246,0.30)',  Icon: Info },
    warning: { bg: 'rgba(245,158,11,0.10)',  fg: '#F59E0B', border: 'rgba(245,158,11,0.30)',  Icon: AlertTriangle },
    error:   { bg: 'rgba(239,68,68,0.10)',   fg: '#EF4444', border: 'rgba(239,68,68,0.30)',   Icon: XCircle },
  }[tone]
  const Icon = map.Icon
  return (
    <div className="rounded-xl p-3 flex items-start gap-3"
      style={{ background: map.bg, border: `1px solid ${map.border}` }}>
      <Icon size={20} strokeWidth={1.75} style={{ color: map.fg, flexShrink: 0 }} aria-hidden />
      <div className="flex-1 min-w-0">
        <p className="text-sm font-semibold" style={{ color: map.fg }}>{title}</p>
        <p className="text-xs mt-0.5" style={{ color: 'var(--text-secondary)' }}>{body}</p>
      </div>
    </div>
  )
}

// ─── Icon library ────────────────────────────────────────────────────────────

const ICONS = [
  { I: Calendar,       name: 'Calendar' },
  { I: Clock,          name: 'Clock' },
  { I: User,           name: 'User' },
  { I: Users,          name: 'Users' },
  { I: DollarSign,     name: 'DollarSign' },
  { I: TrendingUp,     name: 'TrendingUp' },
  { I: MessageSquare,  name: 'MessageSquare' },
  { I: Check,          name: 'Check' },
  { I: X,              name: 'X' },
  { I: Plus,           name: 'Plus' },
  { I: Minus,          name: 'Minus' },
  { I: Edit,           name: 'Edit' },
  { I: Trash,          name: 'Trash' },
  { I: Search,         name: 'Search' },
  { I: Filter,         name: 'Filter' },
  { I: Settings,       name: 'Settings' },
  { I: Bell,           name: 'Bell' },
  { I: ChevronRight,   name: 'ChevronRight' },
  { I: ChevronDown,    name: 'ChevronDown' },
  { I: Menu,           name: 'Menu' },
  { I: Home,           name: 'Home' },
  { I: CalendarCheck,  name: 'CalendarCheck' },
  { I: FileText,       name: 'FileText' },
  { I: CheckCircle2,   name: 'CheckCircle2' },
  { I: Info,           name: 'Info' },
  { I: AlertTriangle,  name: 'AlertTriangle' },
  { I: XCircle,        name: 'XCircle' },
] as const

// ─── Main view ───────────────────────────────────────────────────────────────

export function StyleguideView() {
  return (
    <div className="min-h-screen" style={{ background: 'var(--bg-base)' }}>
      {/* ── Top bar ────────────────────────────────────────────────────── */}
      <div
        className="sticky top-0 z-10 flex items-center justify-between px-4 md:px-6 h-14 shrink-0"
        style={{ background: 'var(--bg-surface)', borderBottom: '1px solid var(--border-subtle)' }}
      >
        <div className="flex items-center gap-3">
          <Link href="/admin" className="flex items-center gap-1.5 text-sm" style={{ color: 'var(--text-muted)' }}>
            <ChevronRight size={14} strokeWidth={2} style={{ transform: 'rotate(180deg)' }} aria-hidden />
            Admin
          </Link>
          <span style={{ color: 'var(--border-subtle)' }}>/</span>
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: 'var(--green-primary)' }}>
              <Shield size={13} strokeWidth={2.5} style={{ color: '#000' }} aria-hidden />
            </div>
            <span className="font-semibold text-sm" style={{ color: 'var(--text-primary)' }}>Design System</span>
          </div>
        </div>
        <span className="text-[10px] font-mono px-2 py-1 rounded"
          style={{ background: 'var(--bg-input)', color: 'var(--text-muted)' }}>
          v1.0
        </span>
      </div>

      <div className="p-4 md:p-8 max-w-7xl mx-auto">
        {/* ── Header ──────────────────────────────────────────────────── */}
        <header className="mb-12 pb-8" style={{ borderBottom: '1px solid var(--border-subtle)' }}>
          <div className="flex items-start justify-between gap-6 flex-wrap">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold uppercase tracking-[0.18em] mb-3" style={{ color: 'var(--green-primary)' }}>
                Documentação Interna
              </p>
              <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-2 leading-tight" style={{ color: 'var(--text-primary)' }}>
                PersonalHub Design System
              </h1>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Version 1.0 &middot; Maio 2026
              </p>
              <p className="text-sm mt-3 max-w-2xl" style={{ color: 'var(--text-muted)' }}>
                Sistema de design profissional para gestão de personal trainers. Esta página é uma
                referência visual completa de tokens, componentes e padrões usados no produto.
              </p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <div
                className="w-14 h-14 rounded-2xl flex items-center justify-center"
                style={{ background: 'var(--green-primary)' }}
              >
                <Shield size={28} strokeWidth={2} style={{ color: '#000' }} aria-hidden />
              </div>
              <span className="text-[10px] font-semibold" style={{ color: 'var(--text-muted)' }}>PersonalHub</span>
            </div>
          </div>

          {/* Navegação rápida */}
          <nav className="mt-8 flex flex-wrap gap-2">
            {[
              ['colors',     '01 Cores'],
              ['typography', '02 Tipografia'],
              ['spacing',    '03 Espaçamento'],
              ['radius',     '04 Border Radius'],
              ['elevation',  '05 Elevation'],
              ['buttons',    '06 Buttons'],
              ['inputs',     '07 Inputs'],
              ['chips',      '08 Chips & Badges'],
              ['tabs',       '09 Tabs'],
              ['alerts',     '10 Alerts / Toast'],
              ['cards',      '11 Cards'],
              ['icons',      '12 Icons'],
              ['motion',     '13 Animação'],
              ['components', '14 Componentes'],
            ].map(([id, label]) => (
              <a
                key={id}
                href={`#${id}`}
                className="text-[11px] font-mono px-2.5 py-1 rounded-md"
                style={{
                  background: 'var(--bg-card)',
                  color: 'var(--text-secondary)',
                  border: '1px solid var(--border-subtle)',
                  textDecoration: 'none',
                }}
              >
                {label}
              </a>
            ))}
          </nav>
        </header>

        {/* ══ 01 Color tokens ════════════════════════════════════════════ */}
        <Section id="colors" title="01 — Color Tokens">
          <SubLabel>Paleta principal · Esmeralda</SubLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 mb-6">
            <ColorSwatch
              name="--green-primary" value="#10B981" usage="Primary Action"
              swatchStyle={{ background: '#10B981' }} textColor="#000"
            />
            <ColorSwatch
              name="--green-hover" value="#059669" usage="Hover/Pressed"
              swatchStyle={{ background: '#059669' }}
            />
            <ColorSwatch
              name="--green-light" value="#34D399" usage="Variante Clara"
              swatchStyle={{ background: '#34D399' }} textColor="#000"
            />
            <ColorSwatch
              name="--green-muted" value="rgba(16,185,129,0.15)" usage="Fundo Translúcido"
              swatchStyle={{ background: 'rgba(16,185,129,0.15)' }}
            />
            <ColorSwatch
              name="--green-border" value="rgba(16,185,129,0.25)" usage="Borda Destaque"
              swatchStyle={{ background: 'rgba(16,185,129,0.25)' }}
            />
          </div>

          <SubLabel>Backgrounds (dark / light)</SubLabel>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 mb-6">
            <DualSwatch token="--bg-base"        dark="#0B0F19" light="#F9FAFB" usage="Fundo da aplicação" />
            <DualSwatch token="--bg-surface"     dark="#111827" light="#FFFFFF" usage="Top bar, modais" />
            <DualSwatch token="--bg-card"        dark="#111827" light="#FFFFFF" usage="Cards, painéis" />
            <DualSwatch token="--bg-input"       dark="#1F2937" light="#FFFFFF" usage="Campos de entrada" />
            <DualSwatch token="--border-subtle"  dark="#374151" light="#E5E7EB" usage="Bordas e divisores" />
          </div>

          <SubLabel>Texto (dark / light)</SubLabel>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-6">
            <DualSwatch token="--text-primary"   dark="#F9FAFB" light="#111827" usage="Textos principais" />
            <DualSwatch token="--text-secondary" dark="#9CA3AF" light="#6B7280" usage="Textos auxiliares" />
            <DualSwatch token="--text-muted"     dark="#6B7280" light="#9CA3AF" usage="Labels e captions" />
          </div>

          <SubLabel>Cores de status</SubLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3 mb-6">
            {STATUS_COLORS.map(c => (
              <ColorSwatch
                key={c.hex}
                name={c.label}
                value={c.hex}
                usage="Status / categoria"
                swatchStyle={{ background: c.hex }}
                textColor="#fff"
              />
            ))}
          </div>

          <SubLabel>Presets de tema (accent)</SubLabel>
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
            {ACCENT_PRESETS.map(c => (
              <ColorSwatch
                key={c.hex}
                name={c.label}
                value={c.hex}
                usage="Accent escolhido pelo usuário"
                swatchStyle={{ background: c.hex }}
                textColor="#fff"
              />
            ))}
          </div>
        </Section>

        {/* ══ 02 Typography ════════════════════════════════════════════════ */}
        <Section id="typography" title="02 — Typography Scale">
          <div className="rounded-xl p-4 mb-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Família tipográfica</p>
              <p className="text-xs mt-0.5" style={{ color: 'var(--text-muted)' }}>
                Geist (variable, via <code className="font-mono">next/font/google</code>)
              </p>
            </div>
            <div className="flex flex-wrap gap-1.5">
              {[300, 400, 500, 600, 700, 800].map(w => (
                <span key={w} className="text-[11px] font-mono px-2 py-1 rounded"
                  style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)', fontWeight: w }}>
                  {w}
                </span>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3">
            <TypeRow label="H1 Display"   sample="Bem-vindo ao PersonalHub"  usage="48–72px · 800"
              sampleStyle={{ fontSize: 48, fontWeight: 800, lineHeight: 1.05, letterSpacing: '-0.02em' }} />
            <TypeRow label="H2 Heading"   sample="Resumo da semana"          usage="32–40px · 700"
              sampleStyle={{ fontSize: 32, fontWeight: 700, lineHeight: 1.15, letterSpacing: '-0.015em' }} />
            <TypeRow label="H3 Subheading" sample="Próximas aulas"           usage="24–28px · 700"
              sampleStyle={{ fontSize: 24, fontWeight: 700, lineHeight: 1.2 }} />
            <TypeRow label="Body Large"   sample="Parágrafos importantes ocupam este tamanho — usado em descrições destacadas." usage="18px · 400"
              sampleStyle={{ fontSize: 18, fontWeight: 400, lineHeight: 1.55 }} />
            <TypeRow label="Body Medium"  sample="Tamanho padrão de texto do app, usado em quase todos os conteúdos." usage="16px · 400"
              sampleStyle={{ fontSize: 16, fontWeight: 400, lineHeight: 1.55 }} />
            <TypeRow label="Body Small"   sample="Textos auxiliares, hints e descrições secundárias." usage="14px · 400"
              sampleStyle={{ fontSize: 14, fontWeight: 400, lineHeight: 1.5 }} />
            <TypeRow label="Caption"      sample="LEGENDA · LABEL · METADADOS" usage="12px · 400"
              sampleStyle={{ fontSize: 12, fontWeight: 500, lineHeight: 1.4, letterSpacing: '0.04em' }} />
          </div>
        </Section>

        {/* ══ 03 Spacing ═══════════════════════════════════════════════════ */}
        <Section id="spacing" title="03 — Spacing Scale">
          <div className="rounded-xl p-5 flex flex-col gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <SpacingRow value={4}  label="Espaçamento ultra-pequeno (entre ícones e texto inline)" />
            <SpacingRow value={8}  label="Entre elementos próximos (chips, tags, ícones)" />
            <SpacingRow value={16} label="Padding padrão de cards e containers" />
            <SpacingRow value={24} label="Entre seções pequenas dentro de um card" />
            <SpacingRow value={32} label="Entre seções principais da página" />
            <SpacingRow value={48} label="Entre seções grandes / blocos hero" />
            <SpacingRow value={64} label="Margens hero / espaçamentos extremos" />
          </div>
        </Section>

        {/* ══ 04 Border radius ═════════════════════════════════════════════ */}
        <Section id="radius" title="04 — Border Radius">
          <div className="rounded-xl p-6"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-wrap gap-6 items-end">
              <RadiusBox radius="0px"   label="Sem arredondamento" />
              <RadiusBox radius="4px"   label="Cards pequenos" />
              <RadiusBox radius="8px"   label="Inputs" />
              <RadiusBox radius="12px"  label="Botões" />
              <RadiusBox radius="16px"  label="Cards principais" />
              <RadiusBox radius="24px"  label="Overlays grandes" />
              <RadiusBox radius="9999px" label="Pill / Full (CTAs, badges)" />
            </div>
          </div>
        </Section>

        {/* ══ 05 Elevation ═════════════════════════════════════════════════ */}
        <Section id="elevation" title="05 — Elevation (Shadows)">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
            {ELEVATIONS.map(e => (
              <div key={e.level} className="flex flex-col items-center gap-3 p-6 rounded-xl"
                style={{ background: 'var(--bg-base)' }}>
                <div className="w-full h-20 rounded-xl flex items-center justify-center text-xs font-semibold"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-primary)', boxShadow: e.shadow }}>
                  {e.level}
                </div>
                <p className="text-[10px] text-center" style={{ color: 'var(--text-muted)' }}>{e.usage}</p>
                <code className="text-[9px] font-mono text-center break-all leading-tight" style={{ color: 'var(--text-muted)' }}>
                  {e.shadow}
                </code>
              </div>
            ))}
          </div>
        </Section>

        {/* ══ 06 Buttons ═══════════════════════════════════════════════════ */}
        <Section id="buttons" title="06 — Buttons">
          <SubLabel>Variantes &middot; estados</SubLabel>
          <div className="rounded-xl p-5 mb-5"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <ButtonRow label="Primary"    render={(s) => <PrimaryButton state={s} />} />
            <ButtonRow label="Primary →"  render={(s) => <PrimaryButton state={s} withArrow />} />
            <ButtonRow label="Secondary"  render={(s) => <SecondaryButton state={s} />} />
            <ButtonRow label="Tertiary"   render={(s) => <TertiaryButton state={s} />} />
            <ButtonRow label="Danger"     render={(s) => <DangerButton state={s} />} />
            <ButtonRow label="Ghost"      render={(s) => <GhostButton state={s} />} />
          </div>

          <SubLabel>Tamanhos</SubLabel>
          <div className="rounded-xl p-5 flex items-end flex-wrap gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div className="flex flex-col items-start gap-1">
              <PrimaryButton state="default" size="sm" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Small &middot; 32px</span>
            </div>
            <div className="flex flex-col items-start gap-1">
              <PrimaryButton state="default" size="md" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Medium &middot; 40px (padrão)</span>
            </div>
            <div className="flex flex-col items-start gap-1">
              <PrimaryButton state="default" size="lg" />
              <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>Large &middot; 48px</span>
            </div>
          </div>
        </Section>

        {/* ══ 07 Inputs ════════════════════════════════════════════════════ */}
        <Section id="inputs" title="07 — Inputs">
          <SubLabel>Input de texto · estados</SubLabel>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-5">
            {(['default','focus','error','disabled'] as const).map(s => (
              <InputBox key={s} state={s} hint={s === 'error' ? 'Email inválido' : undefined}>
                <input
                  readOnly
                  value={s === 'default' ? '' : s === 'disabled' ? 'desabilitado@x.com' : 'gabriel@email.com'}
                  placeholder="seu@email.com"
                  className="h-10 rounded-lg px-3 text-sm outline-none w-full"
                  style={inputBaseStyle(s)}
                />
              </InputBox>
            ))}
          </div>

          <SubLabel>Input com ícone &middot; numérico R$ &middot; busca</SubLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <div className="relative">
              <User size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }} aria-hidden />
              <input readOnly value="João Silva"
                className="h-10 rounded-lg pl-9 pr-3 text-sm outline-none w-full"
                style={inputBaseStyle('default')} />
            </div>
            <div className="relative">
              <span className="absolute left-3 top-1/2 -translate-y-1/2 text-sm font-medium"
                style={{ color: 'var(--text-muted)' }}>R$</span>
              <input readOnly value="120,00"
                className="h-10 rounded-lg pl-9 pr-3 text-sm outline-none w-full"
                style={inputBaseStyle('default')} />
            </div>
            <div className="relative">
              <Search size={14} strokeWidth={1.75} className="absolute left-3 top-1/2 -translate-y-1/2"
                style={{ color: 'var(--text-muted)' }} aria-hidden />
              <input readOnly placeholder="Buscar aluno..."
                className="h-10 rounded-lg pl-9 pr-3 text-sm outline-none w-full"
                style={inputBaseStyle('default')} />
            </div>
          </div>

          <SubLabel>Textarea &middot; Select &middot; Date</SubLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 mb-5">
            <textarea
              readOnly
              rows={3}
              defaultValue={'Observações da aula...\n'}
              className="rounded-lg p-3 text-sm outline-none resize-none"
              style={inputBaseStyle('default')}
            />
            <div className="relative">
              <select
                className="h-10 rounded-lg px-3 pr-9 text-sm outline-none w-full appearance-none cursor-pointer"
                style={inputBaseStyle('default')}
                defaultValue="mensal"
              >
                <option value="mensal">Mensalidade</option>
                <option value="aula">Por aula</option>
                <option value="pacote">Pacote</option>
              </select>
              <ChevronDown size={14} strokeWidth={1.75} className="absolute right-3 top-1/2 -translate-y-1/2 pointer-events-none"
                style={{ color: 'var(--text-muted)' }} aria-hidden />
            </div>
            <input
              type="date"
              defaultValue="2026-05-06"
              className="h-10 rounded-lg px-3 text-sm outline-none w-full"
              style={inputBaseStyle('default')}
            />
          </div>

          <SubLabel>Toggle &middot; Checkbox &middot; Radio</SubLabel>
          <div className="rounded-xl p-4 flex flex-wrap gap-6 items-center"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {/* Toggle */}
            <ToggleDemo />
            {/* Checkbox */}
            <CheckboxDemo />
            {/* Radio */}
            <RadioDemo />
          </div>
        </Section>

        {/* ══ 08 Chips / Badges ════════════════════════════════════════════ */}
        <Section id="chips" title="08 — Chips & Badges">
          <SubLabel>Chips de filtro</SubLabel>
          <div className="flex flex-wrap gap-2 mb-5">
            <Chip variant="filled"     label="Filter: Active" />
            <Chip variant="outline"    label="Filtro" />
            <Chip variant="removable"  label="Tag: Novo" onRemove />
          </div>

          <SubLabel>Status badges</SubLabel>
          <div className="flex flex-wrap gap-2 mb-5">
            <StatusBadge tone="success" label="Pago" />
            <StatusBadge tone="pending" label="Pendente" />
            <StatusBadge tone="error"   label="Atrasado" />
            <StatusBadge tone="info"    label="Novo" />
          </div>

          <SubLabel>Tags de modelo de cobrança</SubLabel>
          <div className="flex flex-wrap gap-2">
            {COBRANCA_TAGS.map(t => (
              <span key={t.label} className="text-xs font-semibold px-2.5 py-1 rounded-full"
                style={{ background: t.bg, color: t.fg }}>
                {t.label}
              </span>
            ))}
          </div>
        </Section>

        {/* ══ 09 Tabs ══════════════════════════════════════════════════════ */}
        <Section id="tabs" title="09 — Tabs">
          <div className="rounded-xl"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <TabsDemo />
            <div className="p-5 text-xs" style={{ color: 'var(--text-muted)' }}>
              Conteúdo da tab ativa aparece aqui.
            </div>
          </div>
          <p className="text-[11px] mt-3" style={{ color: 'var(--text-muted)' }}>
            Tab ativa: sublinhado verde (<code className="font-mono">var(--green-primary)</code>) + texto primário.
            Tabs com badge mostram contagem em chip discreto.
          </p>
        </Section>

        {/* ══ 10 Alerts ════════════════════════════════════════════════════ */}
        <Section id="alerts" title="10 — Alerts / Toast">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <Alert tone="success" title="Changes saved." body="Suas alterações foram salvas com sucesso." />
            <Alert tone="info"    title="New feature available." body="Confira a nova versão do dashboard." />
            <Alert tone="warning" title="Session expiring."  body="Sua sessão expira em 5 minutos." />
            <Alert tone="error"   title="Failed to save."    body="Não foi possível salvar — tente novamente." />
          </div>
        </Section>

        {/* ══ 11 Cards ═════════════════════════════════════════════════════ */}
        <Section id="cards" title="11 — Cards">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">

            {/* Card básico */}
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>
                Card básico
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Fundo + borda. Usado como container padrão.
              </p>
            </div>

            {/* Card com hover */}
            <div className="rounded-2xl p-4 transition-colors"
              style={{
                background: 'var(--bg-card)',
                border: '1px solid var(--green-border)',
                boxShadow: '0 0 0 1px rgba(16,185,129,0.10), 0 6px 16px rgba(16,185,129,0.06)',
              }}>
              <p className="text-xs font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--green-primary)' }}>
                Card com hover
              </p>
              <p className="text-sm" style={{ color: 'var(--text-secondary)' }}>
                Borda verde + glow sutil quando ativo.
              </p>
            </div>

            {/* Card com header */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="px-4 py-2.5 flex items-center justify-between"
                style={{ borderBottom: '1px solid var(--border-subtle)' }}>
                <p className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>
                  Header
                </p>
                <ChevronRight size={14} strokeWidth={1.75} style={{ color: 'var(--text-muted)' }} aria-hidden />
              </div>
              <div className="p-4 text-sm" style={{ color: 'var(--text-secondary)' }}>
                Conteúdo do card.
              </div>
            </div>

            {/* Card com footer */}
            <div className="rounded-2xl overflow-hidden"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="p-4">
                <p className="text-sm font-semibold mb-1" style={{ color: 'var(--text-primary)' }}>
                  Cancelar assinatura?
                </p>
                <p className="text-xs" style={{ color: 'var(--text-muted)' }}>
                  Ação irreversível.
                </p>
              </div>
              <div className="px-4 py-3 flex gap-2"
                style={{ background: 'var(--bg-base)', borderTop: '1px solid var(--border-subtle)' }}>
                <button className="flex-1 h-8 rounded-lg text-xs font-medium cursor-pointer"
                  style={{ background: 'var(--bg-card)', color: 'var(--text-secondary)', border: '1px solid var(--border-subtle)' }}>
                  Voltar
                </button>
                <button className="flex-1 h-8 rounded-lg text-xs font-bold cursor-pointer"
                  style={{ background: '#EF4444', color: '#fff' }}>
                  Confirmar
                </button>
              </div>
            </div>

            {/* Card de aluno */}
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold shrink-0"
                  style={{ background: 'var(--green-muted)', color: 'var(--green-primary)' }}>
                  AS
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Ana Silva</p>
                  <p className="text-xs truncate" style={{ color: 'var(--text-muted)' }}>3 aulas/semana</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full"
                  style={{ background: 'rgba(16,185,129,0.15)', color: '#10B981' }}>
                  Mensalidade
                </span>
              </div>
            </div>

            {/* Card de métrica */}
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-start justify-between mb-2">
                <p className="text-xs font-medium" style={{ color: 'var(--text-muted)' }}>Receita do mês</p>
                <DollarSign size={16} strokeWidth={1.75} style={{ color: '#10B981' }} aria-hidden />
              </div>
              <p className="text-2xl font-bold leading-tight" style={{ color: '#10B981' }}>R$&nbsp;4.890,00</p>
              <p className="text-xs mt-1" style={{ color: 'var(--text-muted)' }}>+12% vs. mês anterior</p>
            </div>

            {/* Card de cobrança */}
            <div className="rounded-2xl p-4 md:col-span-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="flex items-center justify-between mb-3">
                <div>
                  <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>Cobrança · Maio</p>
                  <p className="text-xs" style={{ color: 'var(--text-muted)' }}>Ana Silva &middot; vence 10/05</p>
                </div>
                <StatusBadge tone="pending" label="Pendente" />
              </div>
              <div className="rounded-lg p-3" style={{ background: 'var(--bg-input)' }}>
                <p className="text-[10px] font-semibold uppercase tracking-wider mb-1" style={{ color: 'var(--text-muted)' }}>
                  Mensagem
                </p>
                <p className="text-xs" style={{ color: 'var(--text-secondary)' }}>
                  Olá Ana! Segue o link de pagamento da mensalidade de maio. Qualquer dúvida estou à disposição. 💪
                </p>
              </div>
            </div>

          </div>
        </Section>

        {/* ══ 12 Icons ═════════════════════════════════════════════════════ */}
        <Section id="icons" title="12 — Icons">
          <div className="rounded-xl p-4 mb-4 flex flex-wrap items-center gap-4"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: 'var(--text-primary)' }}>Lucide Icons</p>
              <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>line-style &middot; <code className="font-mono">strokeWidth: 1.75</code></p>
            </div>
            <div className="flex items-end gap-3" style={{ borderLeft: '1px solid var(--border-subtle)', paddingLeft: 16 }}>
              {[16, 20, 24, 32].map(size => (
                <div key={size} className="flex flex-col items-center gap-1">
                  <Calendar size={size} strokeWidth={1.75} style={{ color: 'var(--text-primary)' }} aria-hidden />
                  <span className="text-[10px] font-mono" style={{ color: 'var(--text-muted)' }}>{size}px</span>
                </div>
              ))}
            </div>
          </div>

          <div className="rounded-xl p-4 grid grid-cols-3 sm:grid-cols-5 lg:grid-cols-7 gap-3"
            style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
            {ICONS.map(({ I, name }) => (
              <div key={name} className="flex flex-col items-center gap-1.5 p-2 rounded-lg"
                style={{ background: 'var(--bg-input)' }}>
                <I size={20} strokeWidth={1.75} style={{ color: 'var(--text-primary)' }} aria-hidden />
                <span className="text-[9px] font-mono truncate w-full text-center" style={{ color: 'var(--text-muted)' }}>{name}</span>
              </div>
            ))}
          </div>
        </Section>

        {/* ══ 13 Animação ══════════════════════════════════════════════════ */}
        <Section id="motion" title="13 — Animação & Transições">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-4">
            <div className="rounded-xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Easing padrão</p>
              <code className="text-xs font-mono block" style={{ color: 'var(--green-primary)' }}>
                cubic-bezier(0.16, 1, 0.3, 1)
              </code>
            </div>
            <div className="rounded-xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-2" style={{ color: 'var(--text-muted)' }}>Durações</p>
              <div className="flex gap-2 flex-wrap">
                {['200ms', '300ms', '500ms'].map(d => (
                  <span key={d} className="text-[11px] font-mono px-2 py-1 rounded"
                    style={{ background: 'var(--bg-input)', color: 'var(--text-secondary)' }}>{d}</span>
                ))}
              </div>
            </div>
          </div>

          <SubLabel>Demonstrações ao hover</SubLabel>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <HoverDemo
              title="Hover scale"
              note="scale(1.02) · 200ms"
              hoverStyle={{ transform: 'scale(1.02)' }}
            />
            <HoverDemo
              title="Hover lift"
              note="translateY(-2px) · 200ms"
              hoverStyle={{ transform: 'translateY(-2px)', boxShadow: '0 8px 16px rgba(0,0,0,0.25)' }}
            />
            <HoverDemo
              title="Hover glow"
              note="border + shadow · 300ms"
              hoverStyle={{
                borderColor: 'var(--green-primary)',
                boxShadow: '0 0 0 4px rgba(16,185,129,0.12)',
              }}
            />
          </div>

          <p className="text-[11px] mt-4" style={{ color: 'var(--text-muted)' }}>
            Stagger delay entre elementos: <code className="font-mono">0.1s</code>. Animações de fade-in usam{' '}
            <code className="font-mono">.ph-fade-in</code> (220ms ease-out).
          </p>
        </Section>

        {/* ══ 14 Componentes específicos ═══════════════════════════════════ */}
        <Section id="components" title="14 — Componentes Específicos">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">

            {/* Card do dashboard (data + horário) */}
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Dashboard · Próxima aula</p>
              <div className="flex items-center gap-3">
                <div className="rounded-xl p-2.5 flex flex-col items-center"
                  style={{ background: 'var(--green-muted)', minWidth: 56 }}>
                  <span className="text-[10px] font-semibold uppercase" style={{ color: 'var(--green-primary)' }}>Hoje</span>
                  <span className="text-2xl font-bold leading-none" style={{ color: 'var(--green-primary)' }}>06</span>
                  <span className="text-[10px] uppercase" style={{ color: 'var(--green-primary)' }}>Mai</span>
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-sm font-semibold truncate" style={{ color: 'var(--text-primary)' }}>Ana Silva</p>
                  <p className="text-xs flex items-center gap-1" style={{ color: 'var(--text-muted)' }}>
                    <Clock size={11} strokeWidth={1.75} aria-hidden /> 18:00 — 19:00
                  </p>
                </div>
              </div>
            </div>

            {/* Bloco de aula na agenda */}
            <div className="rounded-2xl p-4"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Agenda · Bloco de aula</p>
              <div className="rounded-lg p-3 border-l-4"
                style={{
                  background: 'rgba(16,185,129,0.10)',
                  borderLeftColor: '#10B981',
                }}>
                <p className="text-xs font-mono mb-0.5" style={{ color: 'var(--text-muted)' }}>18:00 — 19:00</p>
                <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>João Pereira</p>
                <p className="text-[11px]" style={{ color: 'var(--text-secondary)' }}>Treino de força · Quadra 3</p>
              </div>
            </div>

            {/* Card "Lucros Líquidos" */}
            <div className="rounded-2xl overflow-hidden md:col-span-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <div className="px-4 pt-4 pb-1">
                <p className="text-[10px] font-semibold uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Financeiro · Lucros Líquidos</p>
              </div>
              <div className="grid grid-cols-2">
                <div className="p-4 flex flex-col gap-1"
                  style={{ borderRight: '1px solid var(--border-subtle)' }}>
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>Recebido</span>
                  <span className="text-2xl font-bold" style={{ color: '#10B981' }}>R$&nbsp;3.420</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>14 cobranças pagas</span>
                </div>
                <div className="p-4 flex flex-col gap-1">
                  <span className="text-[10px] uppercase tracking-wider" style={{ color: 'var(--text-muted)' }}>A receber</span>
                  <span className="text-2xl font-bold" style={{ color: '#F59E0B' }}>R$&nbsp;1.470</span>
                  <span className="text-[10px]" style={{ color: 'var(--text-muted)' }}>6 pendentes</span>
                </div>
              </div>
            </div>

            {/* Tag de status de cobrança (3 estados) */}
            <div className="rounded-2xl p-4 md:col-span-2"
              style={{ background: 'var(--bg-card)', border: '1px solid var(--border-subtle)' }}>
              <p className="text-[10px] font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--text-muted)' }}>Tags de status de cobrança</p>
              <div className="flex flex-wrap gap-2">
                <StatusBadge tone="pending" label="Pendente" />
                <StatusBadge tone="info"    label="Enviado" />
                <StatusBadge tone="success" label="Pago" />
              </div>
            </div>

          </div>
        </Section>

        {/* ── Footer ──────────────────────────────────────────────────────── */}
        <footer className="mt-12 pt-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3"
          style={{ borderTop: '1px solid var(--border-subtle)' }}>
          <p className="text-[11px]" style={{ color: 'var(--text-muted)' }}>
            PersonalHub Design System &middot; v1.0
          </p>
          <p className="text-[11px] font-mono" style={{ color: 'var(--text-muted)' }}>
            Última atualização: 06/05/2026
          </p>
        </footer>
      </div>
    </div>
  )
}

// ─── Form interactives ───────────────────────────────────────────────────────

function ToggleDemo() {
  const [on, setOn] = useState(true)
  return (
    <div className="flex items-center gap-2">
      <button
        onClick={() => setOn(v => !v)}
        className="relative w-10 h-6 rounded-full cursor-pointer transition-colors"
        style={{ background: on ? 'var(--green-primary)' : 'var(--bg-input)', border: '1px solid var(--border-subtle)' }}
        aria-pressed={on}
      >
        <span
          className="absolute top-0.5 w-4 h-4 rounded-full transition-all"
          style={{
            background: '#fff',
            left: on ? 20 : 2,
            boxShadow: '0 1px 3px rgba(0,0,0,0.3)',
          }}
        />
      </button>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Toggle</span>
    </div>
  )
}

function CheckboxDemo() {
  const [checked, setChecked] = useState(true)
  return (
    <label className="flex items-center gap-2 cursor-pointer">
      <span
        onClick={() => setChecked(v => !v)}
        className="w-5 h-5 rounded-md flex items-center justify-center transition-colors"
        style={{
          background: checked ? 'var(--green-primary)' : 'var(--bg-input)',
          border: checked ? '1px solid var(--green-primary)' : '1px solid var(--border-subtle)',
        }}
      >
        {checked && <Check size={12} strokeWidth={3} style={{ color: '#000' }} />}
      </span>
      <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Checkbox</span>
    </label>
  )
}

function RadioDemo() {
  const [selected, setSelected] = useState<'a'|'b'>('a')
  return (
    <div className="flex items-center gap-3">
      {(['a','b'] as const).map(v => (
        <label key={v} className="flex items-center gap-1.5 cursor-pointer" onClick={() => setSelected(v)}>
          <span
            className="w-4 h-4 rounded-full flex items-center justify-center"
            style={{
              background: 'var(--bg-input)',
              border: selected === v ? '4px solid var(--green-primary)' : '1px solid var(--border-subtle)',
            }}
          />
          <span className="text-xs" style={{ color: 'var(--text-secondary)' }}>Opção {v.toUpperCase()}</span>
        </label>
      ))}
    </div>
  )
}

// ─── Hover demo ─────────────────────────────────────────────────────────────

function HoverDemo({ title, note, hoverStyle }: { title: string; note: string; hoverStyle: CSSProperties }) {
  const [hover, setHover] = useState(false)
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      className="rounded-xl p-4 cursor-pointer"
      style={{
        background: 'var(--bg-card)',
        border: '1px solid var(--border-subtle)',
        transition: 'transform 200ms cubic-bezier(0.16,1,0.3,1), box-shadow 200ms cubic-bezier(0.16,1,0.3,1), border-color 200ms cubic-bezier(0.16,1,0.3,1)',
        ...(hover ? hoverStyle : {}),
      }}
    >
      <p className="text-sm font-semibold" style={{ color: 'var(--text-primary)' }}>{title}</p>
      <p className="text-[11px] font-mono mt-1" style={{ color: 'var(--text-muted)' }}>{note}</p>
      <p className="text-[10px] mt-2" style={{ color: 'var(--text-muted)' }}>
        Passe o mouse sobre o card →
      </p>
    </div>
  )
}
