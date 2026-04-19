'use client'

import { useEffect, useRef, useState } from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { Sparkles, X, ChevronRight } from 'lucide-react'

/**
 * Tour guiado do Modo Demonstração.
 *
 * Sequência de tooltips que apontam para elementos marcados com
 * `data-demo-tour="chave"`. Só aparece na primeira ativação do
 * modo demo (controlado via localStorage key `ph-demo-tour-seen`).
 *
 * Passo "generic" (sem target) é renderizado como card centralizado.
 */

const TOUR_SEEN_KEY = 'ph-demo-tour-seen'

interface Step {
  target: string | null   // seletor `[data-demo-tour="..."]` ou null p/ card central
  title: string
  body: string
  /** Rota onde esse passo pode ser exibido (prefixo). Se não bater, é pulado. */
  route?: string
}

const STEPS: Step[] = [
  {
    target: null,
    title: 'Bem-vindo ao modo demonstração',
    body: 'Você está explorando o PersonalHub com 8 alunos fictícios. Nada do que você fizer é salvo no banco de dados. Vamos dar um tour rápido.',
    route: '/dashboard',
  },
  {
    target: '[data-demo-tour="dashboard-header"]',
    title: 'Data e horário em destaque',
    body: 'No topo do dashboard você vê o dia da semana, data e horário atualizados em tempo real.',
    route: '/dashboard',
  },
  {
    target: '[data-demo-tour="dashboard-alertas"]',
    title: 'Alertas importantes',
    body: 'Novidades do dia aparecem aqui: pagamentos pendentes, pacotes vencendo, aniversários e remarcações urgentes.',
    route: '/dashboard',
  },
  {
    target: '[data-demo-tour="dashboard-timeline"]',
    title: 'Aulas de hoje',
    body: 'Clique em qualquer aula pra registrar uma falta, cancelamento ou remarcação.',
    route: '/dashboard',
  },
  {
    target: '[data-demo-tour="sidebar"]',
    title: 'Navegação',
    body: 'Use o menu lateral pra explorar Alunos, Agenda, Financeiro e Relatórios. Cada área está preenchida com dados fictícios.',
    route: '/dashboard',
  },
  {
    target: null,
    title: 'Pronto para explorar',
    body: 'Clique, arraste, crie — tudo é simulado. Quando quiser sair, use o botão no banner verde no topo.',
    route: '/dashboard',
  },
]

export function DemoTour() {
  const pathname = usePathname()
  const router   = useRouter()
  const [stepIdx, setStepIdx]   = useState(0)
  const [visible, setVisible]   = useState(false)
  const [pos, setPos]           = useState<{ top: number; left: number; width: number; height: number } | null>(null)
  const targetRef = useRef<HTMLElement | null>(null)

  // Auto-abrir na primeira visita em modo demo
  useEffect(() => {
    if (typeof window === 'undefined') return
    const seen = localStorage.getItem(TOUR_SEEN_KEY)
    if (seen === '1') return
    const t = setTimeout(() => setVisible(true), 400)
    return () => clearTimeout(t)
  }, [])

  // Recalcular posição do target quando o passo muda / window redimensiona
  useEffect(() => {
    if (!visible) return
    const step = STEPS[stepIdx]
    if (!step || !step.target) { setPos(null); return }

    function update() {
      const el = document.querySelector(step.target!) as HTMLElement | null
      targetRef.current = el
      if (!el) { setPos(null); return }
      const r = el.getBoundingClientRect()
      setPos({ top: r.top, left: r.left, width: r.width, height: r.height })
      // Scroll pra mostrar o elemento se estiver fora da viewport
      if (r.top < 80 || r.bottom > window.innerHeight - 80) {
        el.scrollIntoView({ behavior: 'smooth', block: 'center' })
      }
    }
    update()
    const raf = requestAnimationFrame(update)
    window.addEventListener('resize', update)
    window.addEventListener('scroll', update, true)
    return () => {
      cancelAnimationFrame(raf)
      window.removeEventListener('resize', update)
      window.removeEventListener('scroll', update, true)
    }
  }, [stepIdx, visible, pathname])

  function finish() {
    if (typeof window !== 'undefined') {
      localStorage.setItem(TOUR_SEEN_KEY, '1')
    }
    setVisible(false)
  }

  function next() {
    if (stepIdx >= STEPS.length - 1) { finish(); return }
    const nextStep = STEPS[stepIdx + 1]
    // Se o próximo passo tem rota específica e não estamos nela, navega
    if (nextStep.route && !pathname.startsWith(nextStep.route)) {
      router.push(nextStep.route)
    }
    setStepIdx(stepIdx + 1)
  }

  if (!visible) return null

  const step = STEPS[stepIdx]
  if (!step) return null

  // Card centralizado (sem target)
  if (!step.target || !pos) {
    return (
      <div
        style={{
          position: 'fixed', inset: 0, zIndex: 9998,
          background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(2px)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: 16,
        }}
      >
        <TourCard step={step} idx={stepIdx} total={STEPS.length} onNext={next} onClose={finish} />
      </div>
    )
  }

  // Tooltip ancorado ao target
  const margin = 12
  const cardWidth = 320
  const tooltipTop = pos.top + pos.height + margin
  const fitsBelow = tooltipTop + 180 < window.innerHeight - 20
  const top  = fitsBelow ? tooltipTop : Math.max(16, pos.top - 200)
  const left = Math.min(
    Math.max(16, pos.left + pos.width / 2 - cardWidth / 2),
    window.innerWidth - cardWidth - 16
  )

  return (
    <>
      {/* Overlay com recorte transparente no target */}
      <svg
        style={{ position: 'fixed', inset: 0, zIndex: 9997, pointerEvents: 'none' }}
        width="100%" height="100%"
      >
        <defs>
          <mask id="demo-tour-mask">
            <rect x="0" y="0" width="100%" height="100%" fill="white" />
            <rect
              x={pos.left - 6} y={pos.top - 6}
              width={pos.width + 12} height={pos.height + 12}
              rx="10" fill="black"
            />
          </mask>
        </defs>
        <rect x="0" y="0" width="100%" height="100%" fill="rgba(0,0,0,0.55)" mask="url(#demo-tour-mask)" />
        <rect
          x={pos.left - 4} y={pos.top - 4}
          width={pos.width + 8} height={pos.height + 8}
          rx="10" fill="none"
          stroke="var(--green-primary)" strokeWidth="2"
        />
      </svg>

      <div style={{ position: 'fixed', top, left, width: cardWidth, zIndex: 9999 }}>
        <TourCard step={step} idx={stepIdx} total={STEPS.length} onNext={next} onClose={finish} />
      </div>
    </>
  )
}

function TourCard({
  step, idx, total, onNext, onClose,
}: {
  step: Step; idx: number; total: number; onNext: () => void; onClose: () => void
}) {
  const isLast = idx >= total - 1
  return (
    <div
      style={{
        background: 'var(--bg-surface)',
        border: '1px solid rgba(16, 185, 129, 0.35)',
        borderRadius: 16,
        padding: 18,
        boxShadow: '0 20px 60px rgba(0, 0, 0, 0.5)',
        maxWidth: 340,
      }}
    >
      <div className="flex items-start justify-between gap-3 mb-2">
        <div className="flex items-center gap-2">
          <Sparkles size={16} strokeWidth={1.75} style={{ color: 'var(--green-primary)' }} aria-hidden />
          <span className="text-xs font-semibold uppercase tracking-wider" style={{ color: 'var(--green-primary)' }}>
            Passo {idx + 1} de {total}
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="w-6 h-6 rounded-md flex items-center justify-center cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
          aria-label="Fechar tour"
        >
          <X size={14} strokeWidth={2} aria-hidden />
        </button>
      </div>
      <h3 className="text-base font-bold mb-1" style={{ color: 'var(--text-primary)' }}>
        {step.title}
      </h3>
      <p className="text-sm leading-relaxed" style={{ color: 'var(--text-secondary)' }}>
        {step.body}
      </p>
      <div className="flex items-center justify-between gap-2 mt-4">
        <button
          type="button"
          onClick={onClose}
          className="text-xs font-medium cursor-pointer"
          style={{ color: 'var(--text-muted)' }}
        >
          Pular tour
        </button>
        <button
          type="button"
          onClick={onNext}
          className="inline-flex items-center gap-1.5 py-2 px-3 rounded-lg text-sm font-semibold cursor-pointer"
          style={{ background: 'var(--green-primary)', color: '#000' }}
        >
          {isLast ? 'Concluir' : (
            <>
              Próximo
              <ChevronRight size={14} strokeWidth={2} aria-hidden />
            </>
          )}
        </button>
      </div>
    </div>
  )
}
