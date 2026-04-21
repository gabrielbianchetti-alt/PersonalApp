'use client'

import { useEffect, useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { feriadoEmData } from '@/lib/utils/feriados'

/**
 * Seletor de mês estilo Notion.
 *
 * Botão exibe "Mês Ano" (ex: "Abril 2026"). Ao clicar abre um popover
 * com um calendário tradicional (Dom-Sáb). Navegação entre meses com
 * setas ou swipe lateral. Clique em um dia dispara `onSelectDate`.
 *
 * Dias com aula (keys setWithAula) ganham dot. Feriados pintados em rosa.
 */

const MESES_FULL = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro',
]
const DOW_HEAD = ['D', 'S', 'T', 'Q', 'Q', 'S', 'S']

function daysInMonth(y: number, m: number): number {
  return new Date(y, m + 1, 0).getDate()
}
function firstDayOfMonth(y: number, m: number): number {
  return new Date(y, m, 1).getDay()
}
function isoDate(y: number, m: number, d: number): string {
  return `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`
}

interface Props {
  /** Data atualmente exibida na agenda (qualquer dia da semana vigente) */
  selected: Date
  /** Conjunto de datas ISO (YYYY-MM-DD) que têm aulas — pra mostrar o dot */
  datesWithAula?: Set<string>
  /** Callback quando o usuário seleciona um dia */
  onSelectDate: (date: Date) => void
}

export function MonthPicker({ selected, datesWithAula, onSelectDate }: Props) {
  const [open, setOpen] = useState(false)
  const [view, setView] = useState<{ year: number; month: number }>({
    year:  selected.getFullYear(),
    month: selected.getMonth(),
  })
  const rootRef = useRef<HTMLDivElement>(null)

  // Sincroniza view quando selected muda externamente
  useEffect(() => {
    setView({ year: selected.getFullYear(), month: selected.getMonth() })
  }, [selected])

  // Fecha ao clicar fora
  useEffect(() => {
    if (!open) return
    function onDocClick(e: MouseEvent) {
      if (!rootRef.current?.contains(e.target as Node)) setOpen(false)
    }
    function onEsc(e: KeyboardEvent) { if (e.key === 'Escape') setOpen(false) }
    document.addEventListener('mousedown', onDocClick)
    document.addEventListener('keydown', onEsc)
    return () => {
      document.removeEventListener('mousedown', onDocClick)
      document.removeEventListener('keydown', onEsc)
    }
  }, [open])

  // Swipe lateral (mobile) pra trocar de mês
  const touchRef = useRef<{ startX: number; startY: number } | null>(null)
  function onTouchStart(e: React.TouchEvent) {
    touchRef.current = { startX: e.touches[0].clientX, startY: e.touches[0].clientY }
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (!touchRef.current) return
    const dx = e.changedTouches[0].clientX - touchRef.current.startX
    const dy = e.changedTouches[0].clientY - touchRef.current.startY
    touchRef.current = null
    if (Math.abs(dx) > 50 && Math.abs(dx) > Math.abs(dy)) {
      if (dx > 0) prevMonth()
      else nextMonth()
    }
  }

  function prevMonth() {
    setView(v => {
      let m = v.month - 1, y = v.year
      if (m < 0) { m = 11; y -= 1 }
      return { year: y, month: m }
    })
  }
  function nextMonth() {
    setView(v => {
      let m = v.month + 1, y = v.year
      if (m > 11) { m = 0; y += 1 }
      return { year: y, month: m }
    })
  }

  function selectDay(day: number) {
    const d = new Date(view.year, view.month, day)
    onSelectDate(d)
    setOpen(false)
  }

  const today = new Date()
  const totalDays = daysInMonth(view.year, view.month)
  const leading   = firstDayOfMonth(view.year, view.month)
  const cells: (number | null)[] = []
  for (let i = 0; i < leading; i++) cells.push(null)
  for (let d = 1; d <= totalDays; d++) cells.push(d)
  while (cells.length % 7 !== 0) cells.push(null)

  const selectedIso = isoDate(selected.getFullYear(), selected.getMonth(), selected.getDate())
  const todayIso    = isoDate(today.getFullYear(), today.getMonth(), today.getDate())

  return (
    <div ref={rootRef} className="relative inline-block">
      {/* Botão principal */}
      <button
        type="button"
        onClick={() => setOpen(v => !v)}
        className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-sm font-semibold cursor-pointer transition-colors"
        style={{
          background: 'var(--bg-card)',
          color: 'var(--text-primary)',
          border: '1px solid var(--border-subtle)',
        }}
        aria-haspopup="dialog"
        aria-expanded={open}
      >
        <span>{MESES_FULL[selected.getMonth()]} {selected.getFullYear()}</span>
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
          style={{ transform: open ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 150ms' }}>
          <polyline points="6 9 12 15 18 9" />
        </svg>
      </button>

      {/* Popover calendário */}
      {open && (
        <div
          role="dialog"
          className="absolute z-40 mt-2"
          style={{
            top: '100%', left: 0,
            width: 280,
            background: 'var(--bg-surface)',
            border: '1px solid var(--border-subtle)',
            borderRadius: 14,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.35)',
            padding: 12,
            animation: 'monthpicker-in 120ms ease-out',
          }}
          onTouchStart={onTouchStart}
          onTouchEnd={onTouchEnd}
        >
          {/* Header: setas + mês/ano */}
          <div className="flex items-center justify-between mb-2">
            <button type="button" onClick={prevMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
              aria-label="Mês anterior">
              <ChevronLeft size={14} strokeWidth={2} aria-hidden />
            </button>
            <span className="text-sm font-bold" style={{ color: 'var(--text-primary)' }}>
              {MESES_FULL[view.month]} {view.year}
            </span>
            <button type="button" onClick={nextMonth}
              className="w-7 h-7 rounded-lg flex items-center justify-center cursor-pointer"
              style={{ color: 'var(--text-secondary)', background: 'var(--bg-card)' }}
              aria-label="Próximo mês">
              <ChevronRight size={14} strokeWidth={2} aria-hidden />
            </button>
          </div>

          {/* Cabeçalho dos dias da semana */}
          <div className="grid grid-cols-7 gap-0.5 mb-1">
            {DOW_HEAD.map((d, i) => (
              <div key={i} className="text-[10px] font-semibold text-center py-1"
                style={{ color: 'var(--text-muted)' }}>
                {d}
              </div>
            ))}
          </div>

          {/* Grid de dias */}
          <div className="grid grid-cols-7 gap-0.5">
            {cells.map((d, i) => {
              if (d === null) return <div key={i} />
              const iso      = isoDate(view.year, view.month, d)
              const isToday  = iso === todayIso
              const isSel    = iso === selectedIso
              const hasAula  = datesWithAula?.has(iso) ?? false
              const feriado  = feriadoEmData(iso)
              return (
                <button
                  key={i}
                  type="button"
                  onClick={() => selectDay(d)}
                  title={feriado ? feriado.nome : undefined}
                  className="relative flex flex-col items-center justify-center rounded-md cursor-pointer transition-colors"
                  style={{
                    aspectRatio: '1 / 1',
                    fontSize: 12,
                    fontWeight: isToday ? 700 : 500,
                    color: isSel ? '#000'
                          : feriado ? '#EC4899'
                          : isToday ? 'var(--green-primary)'
                          : 'var(--text-secondary)',
                    background: isSel ? 'var(--green-primary)'
                              : feriado ? 'rgba(236, 72, 153, 0.15)'
                              : isToday ? 'var(--green-muted)'
                              : 'transparent',
                    border: isToday && !isSel ? '1px solid rgba(16, 185, 129, 0.35)' : '1px solid transparent',
                  }}
                >
                  <span>{d}</span>
                  {hasAula && !isSel && (
                    <span
                      style={{
                        position: 'absolute',
                        bottom: 2,
                        width: 4, height: 4, borderRadius: '50%',
                        background: 'var(--green-primary)',
                      }}
                    />
                  )}
                </button>
              )
            })}
          </div>
        </div>
      )}

      <style jsx>{`
        @keyframes monthpicker-in {
          from { opacity: 0; transform: translateY(-4px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}
