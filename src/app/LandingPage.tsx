'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import Link from 'next/link'

// ─── design tokens ─────────────────────────────────────────────────────────────

const G  = '#00E676'        // accent green
const G2 = '#00C853'        // darker green
const N  = '#0f172a'        // near-black
const N2 = '#1e293b'        // dark slate
const S  = '#64748b'        // slate text
const B  = '#f1f5f9'        // light bg
const W  = '#ffffff'

// ─── font injection ────────────────────────────────────────────────────────────

function FontInjector() {
  useEffect(() => {
    const link = document.createElement('link')
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&display=swap'
    document.head.appendChild(link)
  }, [])
  return null
}

// ─── fade-in hook ─────────────────────────────────────────────────────────────

function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({
  children,
  delay = 0,
  className = '',
  up = true,
}: {
  children: React.ReactNode
  delay?: number
  className?: string
  up?: boolean
}) {
  const { ref, visible } = useFadeIn()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : up ? 'translateY(36px)' : 'translateY(12px)',
        transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── count-up hook ─────────────────────────────────────────────────────────────

function useCountUp(target: number, duration = 1800, start = false) {
  const [value, setValue] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!start || started.current) return
    started.current = true
    const startTime = performance.now()
    const tick = (now: number) => {
      const progress = Math.min((now - startTime) / duration, 1)
      const ease = 1 - Math.pow(1 - progress, 3)
      setValue(Math.round(ease * target))
      if (progress < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [start, target, duration])
  return value
}

function CountUpNumber({
  target,
  prefix = '',
  suffix = '',
  label,
}: {
  target: number
  prefix?: string
  suffix?: string
  label: string
}) {
  const { ref, visible } = useFadeIn(0.3)
  const value = useCountUp(target, 1600, visible)
  return (
    <div ref={ref} style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 40, fontWeight: 800, color: N, lineHeight: 1 }}>
        {prefix}{value.toLocaleString('pt-BR')}{suffix}
      </div>
      <div style={{ fontSize: 14, color: S, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ─── scroll helper ─────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) {
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: 'smooth' })
  }
}

// ─── Dashboard Mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div style={{ position: 'relative', width: '100%', maxWidth: 580 }}>
      {/* floating badges */}
      <div
        style={{
          position: 'absolute', top: -18, right: 20, zIndex: 10,
          background: W, border: `1.5px solid ${G}`, borderRadius: 12,
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,230,118,0.18)', fontSize: 12, fontWeight: 600,
          animation: 'floatBadge 3s ease-in-out infinite',
        }}
      >
        <span style={{ width: 8, height: 8, borderRadius: '50%', background: G, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
        Pagamento confirmado — R$320
      </div>
      <div
        style={{
          position: 'absolute', bottom: 40, left: -16, zIndex: 10,
          background: W, border: `1.5px solid #E5E7EB`, borderRadius: 12,
          padding: '8px 14px', display: 'flex', alignItems: 'center', gap: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.08)', fontSize: 12, fontWeight: 600,
        }}
      >
        <span style={{ fontSize: 16 }}>📅</span>
        3 aulas hoje
      </div>

      {/* laptop frame */}
      <div
        style={{
          background: '#1e293b', borderRadius: 16, padding: '12px 12px 0',
          boxShadow: '0 24px 64px rgba(0,0,0,0.18)',
        }}
      >
        {/* camera dot */}
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: 8 }}>
          <div style={{ width: 7, height: 7, borderRadius: '50%', background: '#475569' }} />
        </div>
        {/* screen */}
        <div style={{ background: B, borderRadius: 10, overflow: 'hidden', minHeight: 320 }}>
          {/* top bar */}
          <div style={{ background: W, padding: '10px 16px', display: 'flex', alignItems: 'center', gap: 8, borderBottom: '1px solid #E5E7EB' }}>
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#ef4444' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: '#f59e0b' }} />
            <div style={{ width: 8, height: 8, borderRadius: '50%', background: G }} />
            <div style={{ flex: 1, background: '#f1f5f9', borderRadius: 6, height: 22, marginLeft: 8, display: 'flex', alignItems: 'center', paddingLeft: 10 }}>
              <span style={{ fontSize: 10, color: '#94a3b8' }}>personalhub.app/dashboard</span>
            </div>
          </div>
          {/* dashboard body */}
          <div style={{ display: 'flex', height: 300 }}>
            {/* sidebar */}
            <div style={{ width: 52, background: N, display: 'flex', flexDirection: 'column', alignItems: 'center', padding: '12px 0', gap: 14, flexShrink: 0 }}>
              <div style={{ width: 28, height: 28, borderRadius: 8, background: G, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ fontSize: 12, fontWeight: 800, color: N }}>PH</span>
              </div>
              {['📊','📅','💰','👥','📄'].map((ic, i) => (
                <div key={i} style={{ width: 32, height: 32, borderRadius: 8, background: i === 0 ? '#334155' : 'transparent', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 14 }}>{ic}</div>
              ))}
            </div>
            {/* main */}
            <div style={{ flex: 1, padding: 14, overflowY: 'hidden' }}>
              {/* cards row */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8, marginBottom: 10 }}>
                {[
                  { label: 'Faturamento', value: 'R$8.940', color: G },
                  { label: 'Recebido', value: 'R$6.239', color: '#60a5fa' },
                  { label: 'Margem', value: '70%', color: '#f59e0b' },
                ].map((c) => (
                  <div key={c.label} style={{ background: W, borderRadius: 8, padding: '8px 10px', borderLeft: `3px solid ${c.color}` }}>
                    <div style={{ fontSize: 8, color: S, marginBottom: 2 }}>{c.label}</div>
                    <div style={{ fontSize: 12, fontWeight: 700, color: N }}>{c.value}</div>
                  </div>
                ))}
              </div>
              {/* agenda preview */}
              <div style={{ background: W, borderRadius: 8, padding: '8px 10px', marginBottom: 8 }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: N, marginBottom: 6 }}>Agenda — Segunda</div>
                {[
                  { time: '07:00', name: 'Lucas M.', color: G },
                  { time: '08:00', name: 'Ana C.', color: G },
                  { time: '09:30', name: 'Pedro K. (Extra)', color: '#69F0AE' },
                  { time: '17:00', name: 'Marcos T.', color: G },
                ].map((item) => (
                  <div key={item.time} style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 4 }}>
                    <div style={{ width: 3, height: 20, borderRadius: 2, background: item.color, flexShrink: 0 }} />
                    <span style={{ fontSize: 8, color: S, width: 28 }}>{item.time}</span>
                    <span style={{ fontSize: 9, color: N, fontWeight: 500 }}>{item.name}</span>
                  </div>
                ))}
              </div>
              {/* cobrança row */}
              <div style={{ background: W, borderRadius: 8, padding: '6px 10px' }}>
                <div style={{ fontSize: 9, fontWeight: 700, color: N, marginBottom: 4 }}>Cobrança deste mês</div>
                <div style={{ display: 'flex', gap: 4 }}>
                  {['Lucas M.', 'Ana C.', 'Pedro K.'].map((n) => (
                    <div key={n} style={{ background: '#dcfce7', borderRadius: 6, padding: '3px 6px', fontSize: 8, color: '#166534', fontWeight: 600 }}>
                      {n.split(' ')[0]}
                    </div>
                  ))}
                  <div style={{ background: '#fef9c3', borderRadius: 6, padding: '3px 6px', fontSize: 8, color: '#854d0e', fontWeight: 600 }}>
                    +12
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* laptop base */}
        <div style={{ height: 12, background: '#334155', borderRadius: '0 0 4px 4px', margin: '0 -4px' }} />
      </div>
      {/* laptop stand */}
      <div style={{ display: 'flex', justifyContent: 'center' }}>
        <div style={{ width: 120, height: 10, background: '#1e293b', borderRadius: '0 0 8px 8px' }} />
      </div>
    </div>
  )
}

// ─── Navbar ────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', fn)
    return () => window.removeEventListener('scroll', fn)
  }, [])
  return (
    <header
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        background: scrolled ? 'rgba(255,255,255,0.95)' : W,
        borderBottom: `1px solid ${scrolled ? '#E5E7EB' : 'transparent'}`,
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        transition: 'all 0.3s ease',
      }}
    >
      <div style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', height: 68, display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{ width: 32, height: 32, borderRadius: 8, background: N, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <span style={{ color: G, fontWeight: 800, fontSize: 13 }}>PH</span>
          </div>
          <span style={{ fontWeight: 800, fontSize: 18, color: N }}>PersonalHub</span>
        </div>

        <nav style={{ display: 'flex', gap: 28, alignItems: 'center' }} className="hide-mobile">
          {[
            ['Funcionalidades', 'features'],
            ['Preços', 'pricing'],
            ['Como funciona', 'how'],
            ['FAQ', 'faq'],
          ].map(([label, id]) => (
            <button
              key={id}
              onClick={() => scrollTo(id)}
              style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 14, fontWeight: 600, color: S, fontFamily: 'inherit' }}
            >
              {label}
            </button>
          ))}
        </nav>

        <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
          <Link
            href="/auth/login"
            style={{ fontSize: 14, fontWeight: 600, color: N, textDecoration: 'none', padding: '8px 16px' }}
            className="hide-mobile"
          >
            Entrar
          </Link>
          <Link
            href="/auth/signup"
            style={{
              fontSize: 14, fontWeight: 700, color: N, textDecoration: 'none',
              background: G, padding: '9px 20px', borderRadius: 10, whiteSpace: 'nowrap',
            }}
          >
            Testar grátis
          </Link>
          <button
            className="show-mobile"
            onClick={() => setMenuOpen(!menuOpen)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 4 }}
          >
            <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
              <div style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: '0.2s', transform: menuOpen ? 'rotate(45deg) translateY(7px)' : 'none' }} />
              <div style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: '0.2s', opacity: menuOpen ? 0 : 1 }} />
              <div style={{ width: 22, height: 2, background: N, borderRadius: 2, transition: '0.2s', transform: menuOpen ? 'rotate(-45deg) translateY(-7px)' : 'none' }} />
            </div>
          </button>
        </div>
      </div>

      {menuOpen && (
        <div style={{ background: W, borderTop: '1px solid #E5E7EB', padding: '16px 24px 20px' }}>
          {[['Funcionalidades', 'features'], ['Preços', 'pricing'], ['Como funciona', 'how'], ['FAQ', 'faq']].map(([l, id]) => (
            <button
              key={id}
              onClick={() => { scrollTo(id); setMenuOpen(false) }}
              style={{ display: 'block', width: '100%', textAlign: 'left', background: 'none', border: 'none', cursor: 'pointer', fontSize: 15, fontWeight: 600, color: N, padding: '10px 0', fontFamily: 'inherit' }}
            >
              {l}
            </button>
          ))}
          <Link href="/auth/login" style={{ display: 'block', fontSize: 15, fontWeight: 600, color: S, padding: '10px 0', textDecoration: 'none' }}>Entrar</Link>
        </div>
      )}
    </header>
  )
}

// ─── Hero ──────────────────────────────────────────────────────────────────────

function HeroSection() {
  return (
    <section
      style={{
        minHeight: '100vh', paddingTop: 100, paddingBottom: 60,
        background: `linear-gradient(160deg, #f8faff 0%, #f0fdf4 60%, #f8faff 100%)`,
        display: 'flex', alignItems: 'center',
      }}
    >
      <div
        style={{ maxWidth: 1160, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 64, flexWrap: 'wrap' }}
      >
        <div style={{ flex: '1 1 380px', minWidth: 0 }}>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8,
              background: '#dcfce7', border: `1px solid ${G}`, borderRadius: 24,
              padding: '5px 14px', marginBottom: 24, fontSize: 12, fontWeight: 700, color: '#166534',
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: G, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
            Feito para Personal Trainers brasileiros
          </div>
          <h1
            style={{
              fontSize: 'clamp(32px, 5vw, 54px)', fontWeight: 800, color: N,
              lineHeight: 1.1, marginBottom: 20,
            }}
          >
            Pare de perder tempo.<br />
            <span style={{ color: G }}>Comece a ganhar mais.</span>
          </h1>
          <p style={{ fontSize: 17, color: S, lineHeight: 1.7, marginBottom: 32, maxWidth: 480 }}>
            Agenda, cobrança, termos de compromisso e cálculo de aulas — tudo num só lugar.
            Feito do zero para personal trainers que querem crescer sem virar administrador.
          </p>
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            <Link
              href="/auth/signup"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: G, color: N, fontWeight: 700, fontSize: 15,
                padding: '14px 28px', borderRadius: 12, textDecoration: 'none',
              }}
            >
              Criar conta grátis →
            </Link>
            <button
              onClick={() => scrollTo('how')}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: W, color: N, fontWeight: 600, fontSize: 15,
                padding: '14px 24px', borderRadius: 12, border: '1.5px solid #E5E7EB',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              Ver como funciona
            </button>
          </div>
          <div style={{ marginTop: 28, display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['Sem cartão de crédito', 'Setup em 5 minutos', 'Cancele quando quiser'].map(t => (
              <span key={t} style={{ fontSize: 13, color: S, display: 'flex', alignItems: 'center', gap: 6 }}>
                <span style={{ color: G, fontWeight: 700 }}>✓</span> {t}
              </span>
            ))}
          </div>
        </div>

        <div style={{ flex: '1 1 420px', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
          <DashboardMockup />
        </div>
      </div>
    </section>
  )
}

// ─── Numbers Bar ──────────────────────────────────────────────────────────────

function NumbersBar() {
  return (
    <section style={{ background: N, padding: '56px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 40 }}>
        <CountUpNumber target={1200} suffix="+" label="Personal trainers ativos" />
        <CountUpNumber target={48000} suffix="+" label="Aulas agendadas" />
        <CountUpNumber target={3} prefix="R$" suffix="M+" label="Cobrados via plataforma" />
        <CountUpNumber target={97} suffix="%" label="Taxa de satisfação" />
      </div>
    </section>
  )
}

// ─── Pain Section ─────────────────────────────────────────────────────────────

function PainSection() {
  const pains = [
    { icon: '📱', text: 'Cobrar aluno por WhatsApp e ficar sem resposta por semanas' },
    { icon: '📓', text: 'Agenda espalhada entre caderno, Google Calendar e a cabeça' },
    { icon: '🧮', text: 'Calcular o valor do mês na calculadora toda vez, errando conta' },
    { icon: '📄', text: 'Não ter termo de compromisso — e aluno cancelar sem pagar' },
    { icon: '😤', text: 'Trabalhar 10h/dia mas não saber quanto vai entrar no mês' },
    { icon: '⏰', text: 'Perder 2 horas por semana fazendo tarefas administrativas' },
  ]
  return (
    <section style={{ background: B, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              Você se identifica com isso?
            </h2>
            <p style={{ fontSize: 16, color: S, maxWidth: 520, margin: '0 auto' }}>
              A maioria dos personal trainers perde dinheiro todos os meses por falta de organização — não por falta de talento.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {pains.map((p, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div
                style={{
                  background: W, borderRadius: 14, padding: '20px 22px',
                  display: 'flex', alignItems: 'flex-start', gap: 14,
                  border: '1.5px solid #E5E7EB', boxShadow: '0 2px 8px rgba(0,0,0,0.04)',
                }}
              >
                <span style={{ fontSize: 24, flexShrink: 0 }}>{p.icon}</span>
                <span style={{ fontSize: 14, color: N2, fontWeight: 500, lineHeight: 1.5 }}>{p.text}</span>
              </div>
            </FadeIn>
          ))}
        </div>
        <FadeIn delay={400}>
          <div style={{ textAlign: 'center', marginTop: 48 }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: N }}>
              O PersonalHub resolve tudo isso. <span style={{ color: G }}>Em minutos.</span>
            </p>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Features Section ─────────────────────────────────────────────────────────

function FeatureIllustration({ id }: { id: string }) {
  if (id === 'agenda') {
    return (
      <div style={{ background: W, borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: N, marginBottom: 14 }}>Agenda da semana</div>
        {['Seg', 'Ter', 'Qua', 'Qui', 'Sex'].map((day, di) => (
          <div key={day} style={{ marginBottom: 8 }}>
            <div style={{ fontSize: 10, color: S, fontWeight: 600, marginBottom: 4 }}>{day}</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {Array.from({ length: di === 2 ? 3 : di === 4 ? 4 : 2 }).map((_, i) => (
                <div
                  key={i}
                  style={{
                    background: i === (di === 2 ? 2 : -1) ? '#dcfce7' : `${G}22`,
                    border: `1px solid ${G}44`,
                    borderRadius: 6, padding: '5px 10px', fontSize: 10, color: '#166534', fontWeight: 600,
                  }}
                >
                  {['07:00', '08:00', '09:30', '17:00'][i]}
                  {i === 2 && di === 2 && <span style={{ marginLeft: 4, background: G, color: N, borderRadius: 4, padding: '1px 4px', fontSize: 8 }}>Extra</span>}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    )
  }
  if (id === 'cobranca') {
    return (
      <div style={{ background: W, borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: N, marginBottom: 14 }}>Cobrança — Março 2025</div>
        {[
          { name: 'Lucas M.', model: 'Mensalidade', value: 'R$320', status: 'pago' },
          { name: 'Ana C.', model: '3× semana', value: 'R$480', status: 'pago' },
          { name: 'Pedro K.', model: 'Mensalidade + extra', value: 'R$440', status: 'pendente' },
          { name: 'Marcos T.', model: '2× semana', value: 'R$260', status: 'pago' },
        ].map((row) => (
          <div key={row.name} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, borderBottom: '1px solid #f1f5f9', paddingBottom: 10 }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 600, color: N }}>{row.name}</div>
              <div style={{ fontSize: 10, color: S }}>{row.model}</div>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
              <span style={{ fontSize: 13, fontWeight: 700, color: N }}>{row.value}</span>
              <span style={{
                fontSize: 9, fontWeight: 700, padding: '2px 8px', borderRadius: 20,
                background: row.status === 'pago' ? '#dcfce7' : '#fef3c7',
                color: row.status === 'pago' ? '#166534' : '#92400e',
              }}>
                {row.status === 'pago' ? 'Pago' : 'Pendente'}
              </span>
            </div>
          </div>
        ))}
        <div style={{ display: 'flex', justifyContent: 'space-between', marginTop: 4 }}>
          <span style={{ fontSize: 12, fontWeight: 700, color: N }}>Total do mês</span>
          <span style={{ fontSize: 14, fontWeight: 800, color: G }}>R$1.500</span>
        </div>
      </div>
    )
  }
  if (id === 'termos') {
    return (
      <div style={{ background: W, borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: N, marginBottom: 12 }}>Termo de Compromisso</div>
        <div style={{ background: B, borderRadius: 10, padding: 14, fontSize: 11, color: N2, lineHeight: 1.7, marginBottom: 12 }}>
          <p>Eu, <strong>Ana Carolina Silva</strong>, me comprometo a comparecer às aulas agendadas. Em caso de falta sem aviso prévio de <strong>24 horas</strong>, o valor da aula será cobrado normalmente.</p>
          <p style={{ marginTop: 8 }}>Valor: <strong>R$480/mês</strong>  ·  Início: <strong>01/03/2025</strong></p>
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {['Modelo Formal', 'Modelo Descontraído', 'Personalizado'].map((m, i) => (
            <div key={m} style={{
              background: i === 0 ? N : '#f1f5f9', color: i === 0 ? W : S,
              borderRadius: 8, padding: '5px 10px', fontSize: 10, fontWeight: 600, cursor: 'pointer',
            }}>{m}</div>
          ))}
        </div>
      </div>
    )
  }
  if (id === 'calculo') {
    return (
      <div style={{ background: W, borderRadius: 16, padding: 20, boxShadow: '0 8px 32px rgba(0,0,0,0.08)', maxWidth: 400 }}>
        <div style={{ fontWeight: 700, fontSize: 13, color: N, marginBottom: 14 }}>Cálculo Mensal Automático</div>
        {[
          { name: 'Lucas M.', aulas: 12, tipo: 'por aula', valor: 'R$40', total: 'R$480' },
          { name: 'Pedro K.', aulas: '8 + 2 extras', tipo: 'por aula', valor: 'R$45', total: 'R$450' },
          { name: 'Carla F.', aulas: '—', tipo: 'mensalidade', valor: 'R$320', total: 'R$320' },
        ].map((r) => (
          <div key={r.name} style={{ marginBottom: 10, background: B, borderRadius: 10, padding: '10px 12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
              <div>
                <div style={{ fontSize: 12, fontWeight: 700, color: N }}>{r.name}</div>
                <div style={{ fontSize: 10, color: S }}>{r.tipo} · {r.aulas} aulas · {r.valor}</div>
              </div>
              <span style={{ fontSize: 13, fontWeight: 800, color: G }}>{r.total}</span>
            </div>
          </div>
        ))}
        <div style={{ fontSize: 10, color: S, marginTop: 6, textAlign: 'center' }}>
          ✨ Aulas extras do mês anterior somadas automaticamente
        </div>
      </div>
    )
  }
  return null
}

function FeaturesSection() {
  const features = [
    {
      id: 'agenda',
      tag: 'Agenda',
      title: 'Agenda inteligente, sem conflitos',
      body: 'Monte sua semana de forma visual. Arraste aulas, adicione reposições, refeições e aulas extras. Tudo sincronizado com o cálculo mensal.',
      bullets: [
        'Aulas recorrentes e eventos únicos',
        'Aula extra com valor individual registrado',
        'Visualização semanal clara e colorida',
      ],
    },
    {
      id: 'cobranca',
      tag: 'Cobrança',
      title: 'Cobranças geradas em 1 clique',
      body: 'Selecione o mês, veja o total calculado automaticamente e envie a cobrança por WhatsApp ou copie para onde quiser. Sem planilha, sem erro.',
      bullets: [
        'Mensagem personalizada por aluno',
        'Crédito de falta descontado automaticamente',
        'Histórico de cobranças por mês',
      ],
    },
    {
      id: 'calculo',
      tag: 'Cálculo Mensal',
      title: 'Aulas extras somadas automaticamente',
      body: 'O PersonalHub busca as aulas extras registradas no mês anterior e já inclui no cálculo. Você nunca mais esquece de cobrar uma aula avulsa.',
      bullets: [
        'Modelos por aula e mensalidade fixa',
        'Aulas extras do mês anterior incluídas',
        'Ajuste manual de qualquer valor',
      ],
    },
    {
      id: 'termos',
      tag: 'Termos',
      title: 'Termos de compromisso em segundos',
      body: 'Gere e envie termos de compromisso personalizados com dados do aluno preenchidos automaticamente. Modelos formal, descontraído e personalizado.',
      bullets: [
        'Variáveis preenchidas automaticamente',
        'Crie modelos ilimitados',
        'Histórico de termos enviados',
      ],
    },
  ]

  return (
    <section id="features" style={{ background: W, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 64 }}>
            <span style={{ display: 'inline-block', background: '#dcfce7', color: '#166534', borderRadius: 24, padding: '4px 14px', fontSize: 12, fontWeight: 700, marginBottom: 12 }}>
              Funcionalidades
            </span>
            <h2 style={{ fontSize: 'clamp(26px, 4vw, 40px)', fontWeight: 800, color: N }}>
              Tudo que você precisa.<br />Nada do que você não precisa.
            </h2>
          </div>
        </FadeIn>

        {features.map((f, i) => {
          const isEven = i % 2 === 1
          return (
            <FadeIn key={f.id} delay={80}>
              <div
                style={{
                  display: 'flex', alignItems: 'center', gap: 56,
                  marginBottom: 72, flexDirection: isEven ? 'row-reverse' : 'row',
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ flex: '1 1 320px', minWidth: 0 }}>
                  <span style={{ display: 'inline-block', background: `${G}22`, color: G2, borderRadius: 20, padding: '3px 12px', fontSize: 11, fontWeight: 700, marginBottom: 14, letterSpacing: 0.5, textTransform: 'uppercase' }}>
                    {f.tag}
                  </span>
                  <h3 style={{ fontSize: 'clamp(20px, 3vw, 28px)', fontWeight: 800, color: N, marginBottom: 14, lineHeight: 1.2 }}>
                    {f.title}
                  </h3>
                  <p style={{ fontSize: 15, color: S, lineHeight: 1.7, marginBottom: 20 }}>{f.body}</p>
                  <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {f.bullets.map(b => (
                      <li key={b} style={{ display: 'flex', alignItems: 'flex-start', gap: 10, fontSize: 14, color: N2 }}>
                        <span style={{ color: G, fontWeight: 800, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                        {b}
                      </li>
                    ))}
                  </ul>
                </div>
                <div style={{ flex: '1 1 360px', display: 'flex', justifyContent: 'center', minWidth: 0 }}>
                  <FeatureIllustration id={f.id} />
                </div>
              </div>
            </FadeIn>
          )
        })}
      </div>
    </section>
  )
}

// ─── Comparison Table ─────────────────────────────────────────────────────────

function ComparisonSection() {
  const features = [
    'Agenda semanal visual',
    'Cobrança por WhatsApp',
    'Termos de compromisso',
    'Cálculo automático',
    'Aulas extras automáticas',
    'Histórico de cobranças',
    'Crédito de falta',
    'Múltiplos modelos de cobrança',
    'Interface simples (mobile)',
    'Feito para personal trainer BR',
    'Preço acessível',
  ]
  const competitors = [
    { name: 'PersonalHub', values: [true, true, true, true, true, true, true, true, true, true, true], highlight: true },
    { name: 'FitFlow', values: [true, false, false, true, false, false, false, true, true, false, false] },
    { name: 'PersonalFlow', values: [true, true, false, true, false, true, false, true, false, false, false] },
    { name: 'Tecnofit', values: [true, false, false, true, false, true, false, true, false, false, false] },
    { name: 'Wiki4Fit', values: [true, false, false, false, false, false, false, false, true, false, true] },
  ]

  return (
    <section style={{ background: B, padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              Por que o PersonalHub?
            </h2>
            <p style={{ fontSize: 15, color: S }}>
              Compare com as alternativas e veja o que só a gente oferece.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 13 }}>
              <thead>
                <tr>
                  <th style={{ textAlign: 'left', padding: '12px 16px', fontWeight: 700, color: N, background: W, borderBottom: '2px solid #E5E7EB', minWidth: 180 }}>
                    Recurso
                  </th>
                  {competitors.map(c => (
                    <th
                      key={c.name}
                      style={{
                        textAlign: 'center', padding: '12px 8px', fontWeight: 700,
                        background: c.highlight ? N : W,
                        color: c.highlight ? G : N,
                        borderBottom: `2px solid ${c.highlight ? G : '#E5E7EB'}`,
                        minWidth: 100,
                        borderRadius: c.highlight ? '8px 8px 0 0' : 0,
                      }}
                    >
                      {c.highlight ? '⭐ ' : ''}{c.name}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {features.map((feat, fi) => (
                  <tr key={feat} style={{ background: fi % 2 === 0 ? W : B }}>
                    <td style={{ padding: '10px 16px', color: N, fontWeight: 500 }}>{feat}</td>
                    {competitors.map(c => (
                      <td
                        key={c.name}
                        style={{
                          textAlign: 'center', padding: '10px 8px',
                          background: c.highlight ? (fi % 2 === 0 ? '#0f172a' : '#1e293b') : undefined,
                          color: c.highlight ? W : undefined,
                        }}
                      >
                        {c.values[fi]
                          ? <span style={{ color: c.highlight ? G : G, fontWeight: 700, fontSize: 16 }}>✓</span>
                          : <span style={{ color: '#cbd5e1', fontSize: 16 }}>—</span>
                        }
                      </td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── How It Works ─────────────────────────────────────────────────────────────

function HowSection() {
  const steps = [
    { n: '01', title: 'Crie sua conta grátis', body: 'Cadastre-se em 30 segundos. Nenhum cartão necessário.' },
    { n: '02', title: 'Adicione seus alunos', body: 'Informe nome, modelo de cobrança, dias e horários. Pronto.' },
    { n: '03', title: 'Monte sua agenda', body: 'Sua semana já aparece montada. Adicione extras e reposições.' },
    { n: '04', title: 'Cobre com 1 clique', body: 'O sistema calcula tudo. Você só envia a mensagem no WhatsApp.' },
  ]
  return (
    <section id="how" style={{ background: W, padding: '80px 24px' }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 56 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              Como funciona
            </h2>
            <p style={{ fontSize: 15, color: S }}>
              Do cadastro ao primeiro envio em menos de 5 minutos.
            </p>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 24, position: 'relative' }}>
          {steps.map((s, i) => (
            <FadeIn key={s.n} delay={i * 100}>
              <div style={{ textAlign: 'center', padding: '24px 16px' }}>
                <div style={{
                  width: 52, height: 52, borderRadius: '50%',
                  background: i === 0 ? G : B,
                  border: i !== 0 ? `2px solid #E5E7EB` : 'none',
                  color: i === 0 ? N : S,
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, fontSize: 18, margin: '0 auto 16px',
                }}>
                  {s.n}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 700, color: N, marginBottom: 8 }}>{s.title}</h3>
                <p style={{ fontSize: 13, color: S, lineHeight: 1.6 }}>{s.body}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Pricing ──────────────────────────────────────────────────────────────────

function PricingSection() {
  return (
    <section id="pricing" style={{ background: B, padding: '80px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <div style={{ marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              Preço simples. Sem surpresa.
            </h2>
            <p style={{ fontSize: 15, color: S }}>
              Um plano que cobre tudo. Sem limite de alunos.
            </p>
          </div>
        </FadeIn>
        <FadeIn delay={100}>
          <div
            style={{
              background: N, borderRadius: 24, padding: '40px 40px 36px',
              boxShadow: '0 16px 48px rgba(0,0,0,0.15)',
              border: `2px solid ${G}`,
              position: 'relative', overflow: 'hidden',
            }}
          >
            <div
              style={{
                position: 'absolute', top: 16, right: 16,
                background: G, color: N, borderRadius: 20, padding: '4px 14px',
                fontSize: 11, fontWeight: 800,
              }}
            >
              MAIS POPULAR
            </div>
            <div style={{ fontSize: 14, fontWeight: 700, color: S, marginBottom: 4 }}>PersonalHub Pro</div>
            <div style={{ display: 'flex', alignItems: 'flex-end', justifyContent: 'center', gap: 4, marginBottom: 6 }}>
              <span style={{ fontSize: 16, color: S, fontWeight: 600, marginBottom: 8 }}>R$</span>
              <span style={{ fontSize: 56, fontWeight: 800, color: W, lineHeight: 1 }}>49</span>
              <span style={{ fontSize: 16, color: S, fontWeight: 600, marginBottom: 8 }}>/mês</span>
            </div>
            <div style={{ fontSize: 12, color: S, marginBottom: 28 }}>Ou R$490/ano — 2 meses grátis</div>
            <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 28px', display: 'flex', flexDirection: 'column', gap: 12 }}>
              {[
                'Alunos ilimitados',
                'Agenda semanal completa',
                'Cobrança automática via WhatsApp',
                'Termos de compromisso ilimitados',
                'Aulas extras somadas automaticamente',
                'Cálculo mensal com crédito de falta',
                'Suporte via WhatsApp',
              ].map(f => (
                <li key={f} style={{ display: 'flex', alignItems: 'center', gap: 10, fontSize: 14, color: '#e2e8f0' }}>
                  <span style={{ color: G, fontWeight: 800 }}>✓</span>
                  {f}
                </li>
              ))}
            </ul>
            <Link
              href="/auth/signup"
              style={{
                display: 'block', width: '100%', background: G, color: N,
                fontWeight: 800, fontSize: 15, padding: '14px 0',
                borderRadius: 12, textDecoration: 'none', textAlign: 'center',
              }}
            >
              Começar agora — 7 dias grátis
            </Link>
            <div style={{ fontSize: 12, color: '#64748b', marginTop: 10 }}>
              Cancele quando quiser. Sem multa.
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Testimonials ─────────────────────────────────────────────────────────────

function TestimonialsSection() {
  const testimonials = [
    {
      name: 'Rafael S.', role: 'Personal Trainer, SP',
      avatar: 'RS',
      text: 'Antes eu perdia umas 2 horas por semana só organizando cobrança e agenda. Agora faço tudo em 10 minutos no mês.',
    },
    {
      name: 'Juliana M.', role: 'Personal Trainer, RJ',
      avatar: 'JM',
      text: 'O term de compromisso foi o que me vendeu. Depois que comecei a usar, zero aluno cancelou sem pagar.',
    },
    {
      name: 'Carlos A.', role: 'Personal Trainer, BH',
      avatar: 'CA',
      text: 'O cálculo automático das aulas extras é demais. Eu sempre esquecia de cobrar — agora tá lá automaticamente.',
    },
    {
      name: 'Fernanda L.', role: 'Personal Trainer, Curitiba',
      avatar: 'FL',
      text: 'Simples, rápido e funciona. Não precisa de treinamento, qualquer personal consegue usar no primeiro dia.',
    },
  ]
  return (
    <section style={{ background: W, padding: '80px 24px' }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              O que os personais estão falando
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 20 }}>
          {testimonials.map((t, i) => (
            <FadeIn key={t.name} delay={i * 80}>
              <div
                style={{
                  background: B, borderRadius: 16, padding: '22px 20px',
                  border: '1.5px solid #E5E7EB', position: 'relative',
                }}
              >
                <div style={{ fontSize: 28, color: G, fontWeight: 900, lineHeight: 1, marginBottom: 10 }}>"</div>
                <p style={{ fontSize: 13, color: N2, lineHeight: 1.65, marginBottom: 16 }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                  <div style={{ width: 36, height: 36, borderRadius: '50%', background: N, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 11, fontWeight: 700, color: G, flexShrink: 0 }}>
                    {t.avatar}
                  </div>
                  <div>
                    <div style={{ fontSize: 13, fontWeight: 700, color: N }}>{t.name}</div>
                    <div style={{ fontSize: 11, color: S }}>{t.role}</div>
                  </div>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────

function FAQSection() {
  const [open, setOpen] = useState<number | null>(null)
  const items = [
    {
      q: 'Precisa de cartão de crédito para testar?',
      a: 'Não. O período de teste é de 7 dias completamente grátis e sem cartão. Você só informa os dados de pagamento se quiser continuar.',
    },
    {
      q: 'Quantos alunos posso cadastrar?',
      a: 'Alunos ilimitados em todos os planos. Sem nenhum limite.',
    },
    {
      q: 'O PersonalHub funciona no celular?',
      a: 'Sim! O sistema foi desenvolvido mobile-first. Funciona muito bem em qualquer smartphone, direto no navegador.',
    },
    {
      q: 'O que é "aula extra somada automaticamente"?',
      a: 'Quando você registra uma aula extra na agenda, o sistema salva o valor. No mês seguinte, o cálculo mensal já inclui esse valor automaticamente no total do aluno — você nunca mais esquece de cobrar.',
    },
    {
      q: 'Posso cancelar quando quiser?',
      a: 'Sim, a qualquer momento, sem burocracia. Basta acessar as configurações e cancelar. Seus dados ficam disponíveis por 30 dias.',
    },
    {
      q: 'O PersonalHub tem aplicativo?',
      a: 'Funciona como um PWA — pode ser instalado na tela inicial do seu celular como se fosse um app nativo, sem precisar de loja.',
    },
  ]
  return (
    <section id="faq" style={{ background: B, padding: '80px 24px' }}>
      <div style={{ maxWidth: 700, margin: '0 auto' }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h2 style={{ fontSize: 'clamp(24px, 4vw, 38px)', fontWeight: 800, color: N, marginBottom: 12 }}>
              Perguntas frequentes
            </h2>
          </div>
        </FadeIn>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
          {items.map((item, i) => (
            <FadeIn key={i} delay={i * 50}>
              <div
                style={{
                  background: W, borderRadius: 12, overflow: 'hidden',
                  border: `1.5px solid ${open === i ? G : '#E5E7EB'}`,
                  transition: 'border-color 0.2s',
                }}
              >
                <button
                  onClick={() => setOpen(open === i ? null : i)}
                  style={{
                    width: '100%', textAlign: 'left', background: 'none', border: 'none',
                    padding: '18px 20px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', gap: 12, fontFamily: 'inherit',
                  }}
                >
                  <span style={{ fontSize: 14, fontWeight: 700, color: N }}>{item.q}</span>
                  <span style={{ color: open === i ? G : S, fontWeight: 700, fontSize: 18, flexShrink: 0, transition: 'transform 0.2s', transform: open === i ? 'rotate(45deg)' : 'none', display: 'inline-block' }}>+</span>
                </button>
                {open === i && (
                  <div style={{ padding: '0 20px 18px', fontSize: 14, color: S, lineHeight: 1.7 }}>
                    {item.a}
                  </div>
                )}
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Final CTA ────────────────────────────────────────────────────────────────

function CTASection() {
  return (
    <section style={{ background: N, padding: '80px 24px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto', textAlign: 'center' }}>
        <FadeIn>
          <div
            style={{
              display: 'inline-flex', alignItems: 'center', gap: 8, marginBottom: 20,
              background: `${G}22`, border: `1px solid ${G}44`, borderRadius: 24,
              padding: '5px 16px', fontSize: 12, fontWeight: 700, color: G,
            }}
          >
            <span style={{ width: 7, height: 7, borderRadius: '50%', background: G, display: 'inline-block', animation: 'pulse 1.5s ease-in-out infinite' }} />
            Comece hoje gratuitamente
          </div>
          <h2 style={{ fontSize: 'clamp(26px, 4vw, 44px)', fontWeight: 800, color: W, lineHeight: 1.1, marginBottom: 16 }}>
            Seu negócio merece uma<br />
            <span style={{ color: G }}>gestão profissional.</span>
          </h2>
          <p style={{ fontSize: 16, color: '#94a3b8', lineHeight: 1.7, marginBottom: 32, maxWidth: 480, margin: '0 auto 32px' }}>
            Junte-se a mais de 1.200 personal trainers que já param de perder dinheiro com desorganização.
          </p>
          <Link
            href="/auth/signup"
            style={{
              display: 'inline-block', background: G, color: N,
              fontWeight: 800, fontSize: 16, padding: '15px 36px',
              borderRadius: 12, textDecoration: 'none',
            }}
          >
            Criar conta grátis — 7 dias sem cobrar
          </Link>
          <div style={{ marginTop: 16, fontSize: 13, color: '#64748b' }}>
            Sem cartão. Sem compromisso. Cancele quando quiser.
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Footer ────────────────────────────────────────────────────────────────────

function Footer() {
  return (
    <footer style={{ background: '#020617', padding: '40px 24px 28px', borderTop: '1px solid #1e293b' }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 32, marginBottom: 32 }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 10 }}>
              <div style={{ width: 30, height: 30, borderRadius: 8, background: N2, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <span style={{ color: G, fontWeight: 800, fontSize: 11 }}>PH</span>
              </div>
              <span style={{ fontWeight: 800, fontSize: 16, color: W }}>PersonalHub</span>
            </div>
            <p style={{ fontSize: 13, color: '#64748b', maxWidth: 220, lineHeight: 1.6 }}>
              A plataforma de gestão para personal trainers brasileiros.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 48, flexWrap: 'wrap' }}>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Produto</div>
              {['Funcionalidades', 'Preços', 'Como funciona'].map(l => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <button onClick={() => scrollTo(l === 'Funcionalidades' ? 'features' : l === 'Preços' ? 'pricing' : 'how')}
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: 13, color: '#64748b', fontFamily: 'inherit', padding: 0 }}>
                    {l}
                  </button>
                </div>
              ))}
            </div>
            <div>
              <div style={{ fontSize: 12, fontWeight: 700, color: '#94a3b8', marginBottom: 12, textTransform: 'uppercase', letterSpacing: 0.8 }}>Conta</div>
              {[['Entrar', '/auth/login'], ['Criar conta', '/auth/signup']].map(([l, href]) => (
                <div key={l} style={{ marginBottom: 8 }}>
                  <Link href={href} style={{ fontSize: 13, color: '#64748b', textDecoration: 'none' }}>{l}</Link>
                </div>
              ))}
            </div>
          </div>
        </div>
        <div style={{ borderTop: '1px solid #1e293b', paddingTop: 20, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 8 }}>
          <span style={{ fontSize: 12, color: '#475569' }}>© 2025 PersonalHub. Todos os direitos reservados.</span>
          <span style={{ fontSize: 12, color: '#475569' }}>Feito com ❤️ para personal trainers brasileiros</span>
        </div>
      </div>
    </footer>
  )
}

// ─── Global styles ─────────────────────────────────────────────────────────────

const GLOBAL_CSS = `
  * { box-sizing: border-box; margin: 0; padding: 0; }
  body { font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #fff; color: #0f172a; -webkit-font-smoothing: antialiased; }
  @keyframes pulse {
    0%, 100% { opacity: 1; transform: scale(1); }
    50% { opacity: 0.6; transform: scale(0.85); }
  }
  @keyframes floatBadge {
    0%, 100% { transform: translateY(0); }
    50% { transform: translateY(-6px); }
  }
  .hide-mobile { display: flex; }
  .show-mobile { display: none; }
  @media (max-width: 680px) {
    .hide-mobile { display: none !important; }
    .show-mobile { display: flex !important; }
  }
`

// ─── Page ──────────────────────────────────────────────────────────────────────

export default function LandingPage() {
  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: GLOBAL_CSS }} />
      <FontInjector />
      <Navbar />
      <main>
        <HeroSection />
        <NumbersBar />
        <PainSection />
        <FeaturesSection />
        <ComparisonSection />
        <HowSection />
        <PricingSection />
        <TestimonialsSection />
        <FAQSection />
        <CTASection />
      </main>
      <Footer />
    </>
  )
}
