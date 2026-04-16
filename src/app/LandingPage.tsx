'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import Image from 'next/image'

// ─── Color tokens ─────────────────────────────────────────────────────────────
const BG    = '#1B1B1B'
const CARD  = '#323232'
const CREAM = '#FFE7D0'
const ACC   = '#FC6E20'
const WHITE = '#FFFFFF'

// ─── Font loader ──────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.querySelector('#ph-font')) return
    const link = document.createElement('link')
    link.id  = 'ph-font'
    link.rel = 'stylesheet'
    link.href = 'https://fonts.googleapis.com/css2?family=Playfair+Display:wght@700;900&family=DM+Sans:wght@400;500;600;700&display=swap'
    document.head.appendChild(link)
  }, [])
  return null
}

// ─── useFadeIn ────────────────────────────────────────────────────────────────
function useFadeIn(threshold = 0.15) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, vis }
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────
function FadeIn({
  children,
  delay = 0,
  y = 32,
  style = {},
}: {
  children: React.ReactNode
  delay?: number
  y?: number
  style?: React.CSSProperties
}) {
  const { ref, vis } = useFadeIn()
  return (
    <div
      ref={ref}
      style={{
        opacity: vis ? 1 : 0,
        transform: vis ? 'none' : `translateY(${y}px)`,
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
        ...style,
      }}
    >
      {children}
    </div>
  )
}

// ─── useCountUp ───────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!active || started.current) return
    started.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      setVal(Math.round((1 - Math.pow(1 - p, 3)) * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return val
}

// ─── PromoBar ─────────────────────────────────────────────────────────────────
function PromoBar() {
  return (
    <div style={{
      background: ACC,
      color: WHITE,
      textAlign: 'center',
      padding: '0 16px',
      height: 44,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: 13,
      fontWeight: 500,
      gap: 6,
      flexWrap: 'wrap',
    }}>
      <span>🎉 Oferta de lançamento: primeiro mês grátis com o código</span>
      <span style={{
        background: '#000',
        color: WHITE,
        borderRadius: 99,
        padding: '2px 12px',
        fontWeight: 800,
        letterSpacing: 0.5,
        fontSize: 12,
      }}>PRIMEIROS20</span>
      <span>— Cancele quando quiser.</span>
    </div>
  )
}

// ─── Navbar ───────────────────────────────────────────────────────────────────
function Navbar() {
  return (
    <nav style={{
      position: 'sticky',
      top: 0,
      zIndex: 100,
      background: 'rgba(27,27,27,0.95)',
      backdropFilter: 'blur(20px)',
      WebkitBackdropFilter: 'blur(20px)',
      borderBottom: '1px solid rgba(255,255,255,0.06)',
      padding: '0 24px',
      height: 64,
      display: 'flex',
      alignItems: 'center',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        width: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'space-between',
      }}>
        {/* Logo */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{
            width: 36,
            height: 36,
            background: ACC,
            color: WHITE,
            borderRadius: 10,
            fontSize: 14,
            fontWeight: 800,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}>PH</div>
          <span style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>PersonalHub</span>
        </div>

        {/* Nav links — hidden on mobile */}
        <div className="ph-nav-links" style={{
          background: 'rgba(255,255,255,0.05)',
          border: '1px solid rgba(255,255,255,0.08)',
          borderRadius: 99,
          padding: 4,
          display: 'flex',
          gap: 2,
        }}>
          {['Funcionalidades', 'Módulos', 'Preço', 'FAQ'].map(link => (
            <a
              key={link}
              href={`#${link.toLowerCase()}`}
              className="ph-nav-link"
              style={{
                padding: '8px 18px',
                borderRadius: 99,
                color: 'rgba(255,255,255,0.7)',
                fontSize: 14,
                fontWeight: 500,
                textDecoration: 'none',
                transition: 'background 0.15s, color 0.15s',
              }}
            >
              {link}
            </a>
          ))}
        </div>

        {/* Entrar */}
        <Link href="/login" style={{
          background: ACC,
          color: WHITE,
          padding: '10px 24px',
          borderRadius: 99,
          fontSize: 14,
          fontWeight: 700,
          textDecoration: 'none',
          transition: 'opacity 0.15s',
        }}
          onMouseEnter={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '0.9' }}
          onMouseLeave={e => { (e.currentTarget as HTMLAnchorElement).style.opacity = '1' }}
        >
          Entrar
        </Link>
      </div>
    </nav>
  )
}

// ─── HeroSection ──────────────────────────────────────────────────────────────
function HeroSection() {
  const [ctaHover, setCtaHover] = useState(false)

  return (
    <section style={{
      background: '#F8F4EF',
      backgroundImage: [
        'linear-gradient(rgba(0,0,0,0.04) 1px, transparent 1px)',
        'linear-gradient(90deg, rgba(0,0,0,0.04) 1px, transparent 1px)',
      ].join(', '),
      backgroundSize: '48px 48px',
      padding: '100px 24px 120px',
      textAlign: 'center',
    }}>
      <div style={{ maxWidth: 860, margin: '0 auto' }}>
        {/* Badge */}
        <FadeIn>
          <div style={{
            display: 'inline-block',
            background: 'rgba(252,110,32,0.12)',
            border: '1px solid rgba(252,110,32,0.25)',
            borderRadius: 99,
            padding: '6px 20px',
          }}>
            <span style={{ color: ACC, fontWeight: 700, fontSize: 13 }}>Para personal trainers 🏋️</span>
          </div>
        </FadeIn>

        {/* Headline */}
        <FadeIn delay={80}>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -2,
            color: '#1B1B1B',
            marginTop: 24,
            marginBottom: 0,
          }}>
            Gestão profissional
          </h1>
          <h1 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(52px, 8vw, 88px)',
            fontWeight: 900,
            lineHeight: 1,
            letterSpacing: -2,
            color: ACC,
            marginTop: 4,
            marginBottom: 0,
          }}>
            para personal trainers
          </h1>
        </FadeIn>

        {/* Sub-headline */}
        <FadeIn delay={140}>
          <p style={{
            color: '#666',
            fontSize: 18,
            lineHeight: 1.7,
            maxWidth: 520,
            margin: '24px auto 0',
          }}>
            Por menos de R$1 por dia, tenha controle total do seu trabalho na palma da mão.
          </p>
        </FadeIn>

        {/* Benefit cards */}
        <FadeIn delay={200}>
          <div style={{
            display: 'flex',
            gap: 16,
            marginTop: 48,
            flexWrap: 'wrap',
            justifyContent: 'center',
          }}>
            {[
              { icon: '💰', title: 'Controle financeiro total', desc: 'Saiba quanto você realmente lucra' },
              { icon: '📅', title: 'Agenda e cobrança integradas', desc: 'Uma coisa alimenta a outra' },
              { icon: '📱', title: 'Tudo em um só app', desc: 'Chega de planilha e calculadora' },
            ].map(card => (
              <div key={card.title} style={{
                background: WHITE,
                border: '1px solid rgba(0,0,0,0.08)',
                borderRadius: 20,
                padding: '20px 24px',
                display: 'flex',
                flexDirection: 'column',
                gap: 8,
                flex: 1,
                minWidth: 200,
                textAlign: 'left',
                boxShadow: '0 2px 20px rgba(0,0,0,0.06)',
              }}>
                <div style={{
                  width: 36,
                  height: 36,
                  background: 'rgba(252,110,32,0.1)',
                  borderRadius: 99,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 16,
                }}>
                  {card.icon}
                </div>
                <div style={{ color: '#1B1B1B', fontSize: 14, fontWeight: 700 }}>{card.title}</div>
                <div style={{ color: '#888', fontSize: 13, lineHeight: 1.5 }}>{card.desc}</div>
              </div>
            ))}
          </div>
        </FadeIn>

        {/* CTA Button */}
        <FadeIn delay={260}>
          <div style={{ marginTop: 40 }}>
            <Link
              href="/register"
              style={{
                background: ACC,
                color: WHITE,
                padding: '18px 40px',
                borderRadius: 99,
                fontSize: 17,
                fontWeight: 700,
                display: 'inline-flex',
                alignItems: 'center',
                gap: 8,
                textDecoration: 'none',
                transition: 'transform 0.2s, box-shadow 0.2s',
                transform: ctaHover ? 'translateY(-2px)' : 'none',
                boxShadow: ctaHover ? '0 8px 32px rgba(252,110,32,0.4)' : 'none',
              }}
              onMouseEnter={() => setCtaHover(true)}
              onMouseLeave={() => setCtaHover(false)}
            >
              Comece grátis por 7 dias <span>→</span>
            </Link>
          </div>
        </FadeIn>

        {/* Trust row */}
        <FadeIn delay={300}>
          <div style={{
            color: '#999',
            fontSize: 13,
            display: 'flex',
            gap: 20,
            justifyContent: 'center',
            flexWrap: 'wrap',
            marginTop: 20,
          }}>
            <span>🔒 Pagamento seguro</span>
            <span>✕ Cancele quando quiser</span>
            <span>🚫 Sem fidelidade</span>
          </div>
        </FadeIn>

        {/* Price */}
        <FadeIn delay={340}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: 12,
            background: 'rgba(0,0,0,0.04)',
            border: '1px solid rgba(0,0,0,0.08)',
            borderRadius: 16,
            padding: '12px 24px',
            marginTop: 24,
          }}>
            <span style={{ fontSize: 22, fontWeight: 900, color: '#1B1B1B' }}>
              R$ 29,90<span style={{ fontSize: 14, fontWeight: 400, color: '#888' }}>/mês</span>
            </span>
            <div style={{ width: 1, height: 20, background: 'rgba(0,0,0,0.1)' }} />
            <span style={{ fontSize: 13, color: ACC, fontWeight: 700 }}>menos de R$1 por dia</span>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── PainSection ──────────────────────────────────────────────────────────────
const PAINS = [
  { icon: '📊', title: 'Planilha no Google Sheets', desc: 'Aquela planilha que ninguém mais entende, cheio de fórmulas quebradas' },
  { icon: '📝', title: 'Bloco de notas no celular', desc: 'Nomes, horários e valores espalhados entre conversas do WhatsApp' },
  { icon: '🔢', title: 'Calculadora todo mês', desc: 'Calculando manualmente quanto cobrar de cada aluno' },
  { icon: '⏰', title: 'Cobrança atrasada', desc: 'Demora para enviar porque o fechamento ainda não foi feito' },
  { icon: '❓', title: 'Reposições esquecidas', desc: 'No fim do mês não tem certeza de quantas aulas deu mesmo' },
  { icon: '💸', title: 'Lucro desconhecido', desc: 'Não sabe o real porque não considerou taxas, cancelamentos e custos' },
]

function PainSection() {
  return (
    <section style={{
      background: BG,
      position: 'relative',
      zIndex: 2,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 60px',
    }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>
        <FadeIn>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: WHITE,
            textAlign: 'center',
            marginBottom: 48,
          }}>
            Você ainda controla seus alunos assim?
          </h2>
        </FadeIn>

        {/* Pain cards grid */}
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 12,
        }} className="ph-pain-grid">
          {PAINS.map((pain, i) => (
            <FadeIn key={pain.title} delay={i * 60}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 20,
                padding: 24,
                display: 'flex',
                flexDirection: 'column',
                gap: 12,
                height: '100%',
              }}>
                <div style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(255,255,255,0.06)',
                  borderRadius: 99,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                  flexShrink: 0,
                }}>
                  {pain.icon}
                </div>
                <div style={{ color: WHITE, fontSize: 15, fontWeight: 700 }}>{pain.title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: 13, lineHeight: 1.6 }}>{pain.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Bridge phrase */}
        <FadeIn delay={100} style={{ textAlign: 'center', marginTop: 64 }}>
          <div style={{ width: 40, height: 1, background: 'rgba(255,255,255,0.08)', margin: '0 auto', marginBottom: 32 }} />
          <h3 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(32px, 5vw, 52px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.15,
          }}>
            Com o PersonalHub, você gerencia<br />
            <span style={{ color: ACC }}>tudo isso.</span>
          </h3>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Feature mock screens ─────────────────────────────────────────────────────
function MockFinanceiro() {
  return (
    <div style={{ background: CARD, borderRadius: 20, padding: 24, minWidth: 300, maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>FINANCEIRO — Abril 2026</div>
      {[
        { label: 'Faturamento', val: 'R$ 7.850', color: WHITE },
        { label: 'Custos', val: 'R$ 2.300', color: 'rgba(255,255,255,0.5)' },
        { label: 'Lucro', val: 'R$ 5.550', color: ACC },
      ].map(row => (
        <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '10px 0', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
          <span style={{ fontSize: 14, color: 'rgba(255,255,255,0.6)' }}>{row.label}</span>
          <span style={{ fontSize: 15, fontWeight: 800, color: row.color }}>{row.val}</span>
        </div>
      ))}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Margem de lucro</span>
          <span style={{ fontSize: 13, fontWeight: 700, color: ACC }}>72%</span>
        </div>
        <div style={{ height: 8, background: 'rgba(255,255,255,0.06)', borderRadius: 4 }}>
          <div style={{ height: '100%', width: '72%', background: ACC, borderRadius: 4 }} />
        </div>
      </div>
    </div>
  )
}

function MockAgenda() {
  const days = ['Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb', 'Dom']
  const slots = [
    { day: 0, label: 'Carlos M.', color: '#60a5fa' },
    { day: 0, label: 'Ana F.', color: '#34d399' },
    { day: 1, label: 'Bruno C.', color: ACC },
    { day: 2, label: 'Larissa N.', color: '#a78bfa' },
    { day: 2, label: 'Rodrigo P.', color: '#60a5fa' },
    { day: 4, label: 'Carlos M.', color: '#60a5fa' },
    { day: 4, label: 'Ana F.', color: '#34d399' },
  ]
  return (
    <div style={{ background: BG, borderRadius: 20, padding: 20, minWidth: 300, maxWidth: 420, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>AGENDA — Semana atual</div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 6, marginBottom: 12 }}>
        {days.map((d, i) => (
          <div key={d} style={{
            textAlign: 'center',
            padding: '8px 4px',
            borderRadius: 10,
            background: i < 5 ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.02)',
            border: i < 5 ? '1px solid rgba(255,255,255,0.08)' : '1px solid transparent',
          }}>
            <div style={{ fontSize: 8, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>{d}</div>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 3, minHeight: 40 }}>
              {slots.filter(s => s.day === i).map(s => (
                <div key={s.label} style={{ height: 6, borderRadius: 3, background: s.color }} />
              ))}
            </div>
          </div>
        ))}
      </div>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.3)', textAlign: 'center' }}>Seg–Sex com horários ocupados</div>
    </div>
  )
}

function MockCalculo() {
  return (
    <div style={{ background: BG, borderRadius: 20, padding: 24, minWidth: 300, maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>←</span>
        <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Fevereiro 2026</span>
        <span style={{ fontSize: 18, color: 'rgba(255,255,255,0.3)', cursor: 'pointer' }}>→</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(7,1fr)', gap: 4, marginBottom: 20 }}>
        {['S','T','Q','Q','S','S','D'].map((d, i) => (
          <div key={i} style={{ textAlign: 'center', fontSize: 9, color: 'rgba(255,255,255,0.3)', paddingBottom: 4 }}>{d}</div>
        ))}
        {Array.from({ length: 7 }, (_, i) => (
          <div key={i} style={{
            textAlign: 'center',
            padding: '6px 2px',
            borderRadius: 8,
            background: i < 5 ? 'rgba(252,110,32,0.15)' : 'rgba(255,255,255,0.04)',
            fontSize: 11,
            fontWeight: 700,
            color: i < 5 ? ACC : 'rgba(255,255,255,0.2)',
          }}>
            4
          </div>
        ))}
      </div>
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 16, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Total de aulas</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: WHITE }}>84</div>
        </div>
        <div style={{ textAlign: 'right' }}>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>Faturamento</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: ACC }}>R$7.850</div>
        </div>
      </div>
    </div>
  )
}

function MockCobranca() {
  return (
    <div style={{ background: BG, borderRadius: 20, padding: 24, minWidth: 300, maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ background: CARD, borderRadius: 14, padding: 16, marginBottom: 14, border: '1px solid rgba(255,255,255,0.06)' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
          <span style={{ fontSize: 14, fontWeight: 700, color: WHITE }}>Carlos Mendes</span>
          <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 10px', borderRadius: 99, background: 'rgba(252,110,32,0.15)', color: ACC }}>Pendente</span>
        </div>
        <div style={{ fontSize: 12, color: 'rgba(255,255,255,0.4)', marginBottom: 4 }}>20 aulas · Seg/Qua/Sex</div>
        <div style={{ fontSize: 18, fontWeight: 900, color: WHITE }}>R$ 320,00</div>
      </div>
      <div style={{ background: 'rgba(37,211,102,0.08)', border: '1px solid rgba(37,211,102,0.2)', borderRadius: 14, padding: 14, marginBottom: 14 }}>
        <div style={{ fontSize: 10, color: 'rgba(37,211,102,0.8)', fontWeight: 700, marginBottom: 8 }}>MENSAGEM WHATSAPP</div>
        <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.6)', lineHeight: 1.6 }}>
          Olá Carlos! 😊 Segue a cobrança de <strong style={{ color: WHITE }}>Fevereiro/2026</strong>: foram <strong style={{ color: WHITE }}>20 aulas</strong> no valor de <strong style={{ color: WHITE }}>R$320,00</strong>. Pix: ...
        </div>
      </div>
      <button style={{
        width: '100%',
        background: '#25D366',
        color: WHITE,
        border: 'none',
        borderRadius: 12,
        padding: '12px',
        fontSize: 14,
        fontWeight: 700,
        cursor: 'pointer',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 8,
      }}>
        📲 Enviar WhatsApp
      </button>
    </div>
  )
}

function MockReposicoes() {
  return (
    <div style={{ background: BG, borderRadius: 20, padding: 24, minWidth: 300, maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 20 }}>
        {[
          { label: 'Pendentes', val: '2', color: '#f59e0b' },
          { label: 'Agendadas', val: '1', color: '#60a5fa' },
          { label: 'Vencidas', val: '0', color: 'rgba(255,255,255,0.3)' },
        ].map(s => (
          <div key={s.label} style={{ textAlign: 'center', background: CARD, borderRadius: 14, padding: '14px 8px', border: '1px solid rgba(255,255,255,0.06)' }}>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 10, color: 'rgba(255,255,255,0.4)', marginTop: 4 }}>{s.label}</div>
          </div>
        ))}
      </div>
      {[
        { aluno: 'Bruno C.', data: '10/04', prazo: '10/05', status: 'Pendente', color: '#f59e0b' },
        { aluno: 'Ana F.', data: '08/04', prazo: '08/05', status: 'Agendada', color: '#60a5fa' },
      ].map(item => (
        <div key={item.aluno} style={{ background: CARD, borderRadius: 12, padding: '12px 14px', border: '1px solid rgba(255,255,255,0.06)', marginBottom: 8 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: WHITE }}>{item.aluno}</span>
            <span style={{ fontSize: 10, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: `${item.color}18`, color: item.color }}>{item.status}</span>
          </div>
          <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)' }}>Falta: {item.data} · Prazo: {item.prazo}</div>
        </div>
      ))}
    </div>
  )
}

function MockExtras() {
  return (
    <div style={{ background: BG, borderRadius: 20, padding: 24, minWidth: 300, maxWidth: 380, border: '1px solid rgba(255,255,255,0.08)' }}>
      <div style={{ fontSize: 11, color: 'rgba(255,255,255,0.4)', fontWeight: 700, letterSpacing: 1, marginBottom: 16 }}>AULAS EXTRAS — Fevereiro 2026</div>
      {[
        { aluno: 'Carlos M.', extras: 3, valor: '+R$120', bg: 'rgba(252,110,32,0.15)' },
        { aluno: 'Ana F.', extras: 1, valor: '+R$40', bg: 'rgba(252,110,32,0.08)' },
        { aluno: 'Bruno C.', extras: 2, valor: '+R$80', bg: 'rgba(252,110,32,0.12)' },
        { aluno: 'Larissa N.', extras: 0, valor: '—', bg: 'rgba(255,255,255,0.03)' },
      ].map(item => (
        <div key={item.aluno} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 14px', borderRadius: 12, marginBottom: 8, background: item.bg }}>
          <span style={{ fontSize: 13, fontWeight: 600, color: WHITE }}>{item.aluno}</span>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {item.extras > 0 && (
              <span style={{ fontSize: 11, fontWeight: 700, padding: '2px 8px', borderRadius: 99, background: 'rgba(252,110,32,0.3)', color: ACC }}>
                +{item.extras} aula{item.extras > 1 ? 's' : ''}
              </span>
            )}
            <span style={{ fontSize: 13, fontWeight: 800, color: item.extras > 0 ? ACC : 'rgba(255,255,255,0.2)' }}>{item.valor}</span>
          </div>
        </div>
      ))}
      <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 12, paddingTop: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 13, color: 'rgba(255,255,255,0.5)' }}>Total extras</span>
        <span style={{ fontSize: 16, fontWeight: 900, color: ACC }}>+R$ 240</span>
      </div>
    </div>
  )
}

// ─── FeatureSection ───────────────────────────────────────────────────────────
interface FeatureProps {
  num: string
  badge: string
  badgeBg: string
  badgeColor: string
  headline: string
  desc: string
  bg: string
  textColor: string
  flip?: boolean
  mockup: React.ReactNode
  zIndex: number
}

function FeatureSection({
  num, badge, badgeBg, badgeColor,
  headline, desc, bg, textColor,
  flip = false, mockup, zIndex,
}: FeatureProps) {
  const isDark = bg === BG || bg === CARD
  const decColor = isDark ? 'rgba(255,255,255,0.06)' : 'rgba(0,0,0,0.06)'

  return (
    <section style={{
      background: bg,
      position: 'relative',
      zIndex,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px',
    }}>
      <div style={{
        maxWidth: 1100,
        margin: '0 auto',
        display: 'flex',
        alignItems: 'center',
        gap: 64,
        flexDirection: flip ? 'row-reverse' : 'row',
      }} className="ph-feature-row">
        {/* Text side */}
        <FadeIn style={{ flex: 1 }}>
          <div>
            <span style={{
              background: badgeBg,
              color: badgeColor,
              padding: '6px 16px',
              borderRadius: 99,
              fontSize: 11,
              fontWeight: 800,
              letterSpacing: 1.5,
              textTransform: 'uppercase' as const,
              display: 'inline-block',
              marginBottom: 20,
            }}>
              {badge}
            </span>
            <h2 style={{
              fontFamily: "'Playfair Display', serif",
              fontSize: 'clamp(36px, 4vw, 52px)',
              fontWeight: 900,
              color: textColor,
              lineHeight: 1.1,
              marginBottom: 16,
            }}>
              {headline}
            </h2>
            <p style={{
              color: textColor,
              opacity: 0.7,
              fontSize: 17,
              lineHeight: 1.75,
              maxWidth: 440,
              marginBottom: 32,
            }}>
              {desc}
            </p>
            <a href="#" style={{
              color: textColor,
              fontSize: 15,
              fontWeight: 700,
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
              textDecoration: 'none',
              opacity: 0.8,
            }}>
              Saiba mais →
            </a>
          </div>
        </FadeIn>

        {/* Mockup side */}
        <FadeIn delay={150} style={{ flex: 1, position: 'relative', display: 'flex', justifyContent: 'center' }}>
          <div style={{ position: 'relative' }}>
            {/* Decorative number */}
            <div style={{
              position: 'absolute',
              top: -20,
              [flip ? 'left' : 'right']: -20,
              fontSize: 'clamp(120px, 15vw, 180px)',
              fontWeight: 900,
              color: decColor,
              lineHeight: 1,
              pointerEvents: 'none',
              zIndex: 0,
              userSelect: 'none' as const,
              fontFamily: "'Playfair Display', serif",
            }}>
              {num}
            </div>
            {/* Mock frame */}
            <div style={{
              position: 'relative',
              zIndex: 1,
              boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
            }}>
              {mockup}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Demo Carousel ────────────────────────────────────────────────────────────
const DEMO_SLIDES = [
  { img: '/mockups/01-dashboard.png', title: 'Dashboard', desc: 'Visão geral em segundos' },
  { img: '/mockups/02-agenda.png',    title: 'Agenda',    desc: 'Grade semanal completa' },
  { img: '/mockups/03-calculo.png',   title: 'Cálculo',   desc: 'Automático e exato' },
  { img: '/mockups/04-cobranca.png',  title: 'Cobrança',  desc: 'Um toque, WhatsApp' },
  { img: '/mockups/05-custos.png',    title: 'Financeiro', desc: 'Seu lucro real' },
]

function DemoSection() {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)

  function go(n: number) {
    if (fading) return
    setFading(true)
    setTimeout(() => { setActive(n); setFading(false) }, 220)
  }

  const slide = DEMO_SLIDES[active]

  return (
    <section style={{
      background: BG,
      position: 'relative',
      zIndex: 9,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 100px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 64 }}>
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            display: 'inline-block',
            marginBottom: 20,
          }}>DEMONSTRAÇÃO</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.1,
          }}>
            Veja o app em ação
          </h2>
        </FadeIn>

        {/* Carousel */}
        <FadeIn delay={100}>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 40 }}>
            {/* Phone + nav */}
            <div style={{ display: 'flex', alignItems: 'center', gap: 32 }}>
              {/* Prev */}
              <button
                onClick={() => go((active - 1 + DEMO_SLIDES.length) % DEMO_SLIDES.length)}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: BG, border: '1px solid rgba(255,255,255,0.12)',
                  color: WHITE, fontSize: 20, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  flexShrink: 0,
                }}
              >←</button>

              {/* Phone frame */}
              <div style={{
                borderRadius: 36,
                overflow: 'hidden',
                boxShadow: '0 40px 100px rgba(0,0,0,0.8)',
                opacity: fading ? 0 : 1,
                transform: fading ? 'scale(0.97)' : 'scale(1)',
                transition: 'opacity 0.22s ease, transform 0.22s ease',
              }}>
                <Image
                  src={slide.img}
                  alt={slide.title}
                  width={260}
                  height={563}
                  style={{ borderRadius: 36, display: 'block' }}
                  priority={active === 0}
                />
              </div>

              {/* Next */}
              <button
                onClick={() => go((active + 1) % DEMO_SLIDES.length)}
                style={{
                  width: 48, height: 48, borderRadius: '50%',
                  background: ACC, border: 'none',
                  color: WHITE, fontSize: 20, cursor: 'pointer',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontWeight: 800, flexShrink: 0,
                }}
              >→</button>
            </div>

            {/* Title below */}
            <div style={{ textAlign: 'center', opacity: fading ? 0 : 1, transition: 'opacity 0.22s' }}>
              <div style={{ fontSize: 18, fontWeight: 700, color: WHITE, marginBottom: 6 }}>{slide.title}</div>
              <div style={{ fontSize: 14, color: 'rgba(255,255,255,0.5)' }}>{slide.desc}</div>
            </div>

            {/* Dots */}
            <div style={{ display: 'flex', gap: 8 }}>
              {DEMO_SLIDES.map((_, i) => (
                <button
                  key={i}
                  onClick={() => go(i)}
                  style={{
                    width: i === active ? 32 : 8,
                    height: 8,
                    borderRadius: 4,
                    border: 'none',
                    cursor: 'pointer',
                    background: i === active ? ACC : 'rgba(255,255,255,0.15)',
                    transition: 'width 0.3s, background 0.3s',
                    padding: 0,
                  }}
                />
              ))}
            </div>
          </div>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Modules section ──────────────────────────────────────────────────────────
const MODULES = [
  { icon: '🏠', name: 'Dashboard', desc: 'Tudo que importa em 5 segundos' },
  { icon: '👥', name: 'Cadastro de Alunos', desc: 'Formulário completo em 4 etapas' },
  { icon: '📅', name: 'Agenda Semanal', desc: 'Grade visual de segunda a domingo' },
  { icon: '🔢', name: 'Cálculo Mensal', desc: 'Contagem exata, zero conta manual' },
  { icon: '💳', name: 'Cobrança', desc: 'Mensagem pronta com Pix ou cartão' },
  { icon: '🔄', name: 'Faltas e Reposições', desc: 'Prazo, crédito e alertas' },
  { icon: '📊', name: 'Financeiro', desc: 'Custos, faturamento e lucro real' },
  { icon: '📋', name: 'Termo de Serviço', desc: 'Enviado pelo WhatsApp' },
  { icon: '⏸️', name: 'Suspensão e Atestado', desc: 'Pausa sem perder o cadastro' },
]

function ModulesSection() {
  return (
    <section id="Módulos" style={{
      background: CREAM,
      position: 'relative',
      zIndex: 10,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 100px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            background: 'rgba(27,27,27,0.1)',
            color: '#1B1B1B',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            display: 'inline-block',
            marginBottom: 20,
          }}>MÓDULOS</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: '#1B1B1B',
            lineHeight: 1.1,
          }}>
            Tudo que você precisa,<br />nada que você não precisa
          </h2>
        </FadeIn>

        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(3, 1fr)',
          gap: 2,
        }} className="ph-mod-grid">
          {MODULES.map((mod, i) => (
            <FadeIn key={mod.name} delay={i * 40}>
              <div
                style={{
                  background: WHITE,
                  border: '1px solid rgba(0,0,0,0.08)',
                  padding: '28px 24px',
                  transition: 'border-color 0.2s, transform 0.2s',
                  cursor: 'default',
                  height: '100%',
                }}
                onMouseEnter={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(252,110,32,0.3)'
                  el.style.transform = 'translateY(-2px)'
                }}
                onMouseLeave={e => {
                  const el = e.currentTarget as HTMLDivElement
                  el.style.borderColor = 'rgba(0,0,0,0.08)'
                  el.style.transform = 'none'
                }}
              >
                <div style={{
                  width: 44,
                  height: 44,
                  background: 'rgba(252,110,32,0.1)',
                  borderRadius: 99,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 20,
                }}>
                  {mod.icon}
                </div>
                <div style={{ color: '#1B1B1B', fontSize: 16, fontWeight: 800, marginTop: 12, marginBottom: 6 }}>{mod.name}</div>
                <div style={{ color: '#888', fontSize: 13, lineHeight: 1.55 }}>{mod.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Social Proof ─────────────────────────────────────────────────────────────
function SocialProofSection() {
  return (
    <section style={{
      background: BG,
      position: 'relative',
      zIndex: 11,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 100px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            display: 'inline-block',
            marginBottom: 20,
          }}>DEPOIMENTOS</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.1,
          }}>
            O que dizem nossos usuários
          </h2>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 16 }} className="ph-proof-grid">
          {[0, 1, 2].map(i => (
            <FadeIn key={i} delay={i * 100}>
              <div style={{
                background: 'rgba(255,255,255,0.04)',
                border: '1px solid rgba(255,255,255,0.06)',
                borderRadius: 24,
                padding: '36px 32px',
              }}>
                {/* Stars */}
                <div style={{ display: 'flex', gap: 3, marginBottom: 16 }}>
                  {[...Array(5)].map((_, j) => (
                    <span key={j} style={{ color: ACC, fontSize: 14 }}>★</span>
                  ))}
                </div>
                {/* Quote mark */}
                <div style={{
                  fontFamily: "'Playfair Display', serif",
                  fontSize: 72,
                  lineHeight: 0.8,
                  color: ACC,
                  marginBottom: 16,
                  userSelect: 'none' as const,
                }}>"</div>
                {/* Text */}
                <p style={{
                  color: 'rgba(255,255,255,0.7)',
                  fontSize: 16,
                  lineHeight: 1.75,
                  fontStyle: 'italic',
                }}>
                  xxxxxxxxx xxxxx xxxxx xxxxxxx xxxxxx xxxxx xxxxx xxxxx xxxxxx xxxxx xxxxxxxx xxxxxx xxxxx
                </p>
                {/* Divider */}
                <div style={{ borderTop: '1px solid rgba(255,255,255,0.08)', marginTop: 24, marginBottom: 20 }} />
                {/* Avatar row */}
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 44,
                    height: 44,
                    borderRadius: '50%',
                    background: 'rgba(252,110,32,0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 16,
                  }}>
                    👤
                  </div>
                  <span style={{ color: WHITE, fontSize: 14, fontWeight: 700 }}>— Nome Sobrenome</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </div>
    </section>
  )
}

// ─── Comparison section ───────────────────────────────────────────────────────
const COMPARISON_ROWS = [
  ['Controle de alunos', 'Planilha ou bloco de notas', 'Cadastro completo com histórico'],
  ['Agenda', 'Memória ou anotação', 'Grade visual com cores'],
  ['Cálculo de aulas', 'Calculadora todo mês', 'Automático e exato'],
  ['Cobrança', 'Digitar mensagem por mensagem', '1 toque, Pix ou cartão incluso'],
  ['Reposições', 'Esquece ou perde o controle', 'Prazo, alerta e crédito automático'],
  ['Financeiro', 'Não sabe o lucro real', 'Custos, faturamento e margem'],
  ['Aulas extras', 'Esquece de anotar e perde', 'Somadas na cobrança automaticamente'],
  ['Profissionalismo', 'Amador', 'Referência'],
]

function ComparisonSection() {
  return (
    <section style={{
      background: CARD,
      position: 'relative',
      zIndex: 12,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 100px',
    }}>
      <div style={{ maxWidth: 1100, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            display: 'inline-block',
            marginBottom: 20,
          }}>COMPARAÇÃO</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.1,
          }}>
            PersonalHub vs. Jeito Antigo
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ width: '100%', borderRadius: 20, overflow: 'hidden', border: '1px solid rgba(255,255,255,0.06)' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ padding: '20px', textAlign: 'left', fontSize: 12, color: 'rgba(255,255,255,0.5)', fontWeight: 600, letterSpacing: 1, background: 'rgba(255,255,255,0.04)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    FUNCIONALIDADE
                  </th>
                  <th style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: 'rgba(255,255,255,0.4)', fontWeight: 600, background: 'rgba(255,255,255,0.03)', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    ❌ Jeito Antigo
                  </th>
                  <th style={{ padding: '20px', textAlign: 'center', fontSize: 13, color: ACC, fontWeight: 800, background: 'rgba(252,110,32,0.15)', borderBottom: '1px solid rgba(252,110,32,0.2)' }}>
                    ✅ PersonalHub
                  </th>
                </tr>
              </thead>
              <tbody>
                {COMPARISON_ROWS.map((row, i) => (
                  <tr key={i} style={{ background: i % 2 === 0 ? 'transparent' : 'rgba(255,255,255,0.02)' }}>
                    <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.8)', fontSize: 14, fontWeight: 600, borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {row[0]}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'rgba(255,255,255,0.3)', fontSize: 13, textAlign: 'center', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {row[1]}
                    </td>
                    <td style={{ padding: '16px 20px', color: 'rgba(252,110,32,0.9)', fontSize: 13, textAlign: 'center', fontWeight: 600, background: 'rgba(252,110,32,0.04)', borderBottom: '1px solid rgba(255,255,255,0.04)' }}>
                      {row[2]}
                    </td>
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

// ─── FAQ section ──────────────────────────────────────────────────────────────
const FAQ_ITEMS = [
  { q: 'Funciona no celular?', a: 'Sim, 100%. O PersonalHub é mobile-first — projetado para ser usado no celular. Funciona em qualquer smartphone, tablet ou computador.' },
  { q: 'Preciso instalar alguma coisa?', a: 'Não. Funciona direto no navegador, sem download. Abriu, usou.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa, sem ligação. Cancela pelo próprio sistema quando quiser.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Dados criptografados com backups automáticos diários. Sua base de alunos está protegida.' },
  { q: 'Tem período de teste?', a: 'Sim, 7 dias grátis sem precisar de cartão de crédito.' },
  { q: 'Quantos alunos posso cadastrar?', a: 'Ilimitados. Sem limite de alunos, cobranças ou registros.' },
  { q: 'Como funciona a cobrança pelo WhatsApp?', a: 'O app monta a mensagem com o valor exato, lista de aulas e link de pagamento. Você revisa e envia com um toque direto no WhatsApp.' },
  { q: 'O que é o cálculo automático de aulas?', a: 'O PersonalHub conta os dias exatos do mês para cada aluno, considerando os dias de treino cadastrados, feriados, faltas e reposições. Zero conta manual.' },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%',
          textAlign: 'left',
          padding: '24px 0',
          background: 'none',
          border: 'none',
          cursor: 'pointer',
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 16,
        }}
      >
        <span style={{ fontSize: 17, fontWeight: 600, color: WHITE, lineHeight: 1.4 }}>{q}</span>
        <span style={{
          width: 32,
          height: 32,
          borderRadius: '50%',
          flexShrink: 0,
          background: open ? ACC : 'rgba(255,255,255,0.05)',
          color: open ? WHITE : 'rgba(255,255,255,0.4)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: 20,
          fontWeight: 300,
          transition: 'all 0.2s',
          transform: open ? 'rotate(45deg)' : 'none',
        }}>
          +
        </span>
      </button>
      <div style={{ maxHeight: open ? 240 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
        <p style={{ fontSize: 15, color: 'rgba(255,255,255,0.6)', lineHeight: 1.75, paddingBottom: 24 }}>{a}</p>
      </div>
    </div>
  )
}

function FAQSection() {
  return (
    <section id="FAQ" style={{
      background: BG,
      position: 'relative',
      zIndex: 13,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '80px 24px 100px',
    }}>
      <div style={{ maxWidth: 720, margin: '0 auto' }}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <span style={{
            background: 'rgba(255,255,255,0.08)',
            color: 'rgba(255,255,255,0.6)',
            padding: '6px 16px',
            borderRadius: 99,
            fontSize: 11,
            fontWeight: 800,
            letterSpacing: 1.5,
            textTransform: 'uppercase' as const,
            display: 'inline-block',
            marginBottom: 20,
          }}>FAQ</span>
          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 56px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.1,
          }}>
            Perguntas frequentes
          </h2>
        </FadeIn>

        <FadeIn delay={80}>
          {FAQ_ITEMS.map((item, i) => (
            <FAQItem key={i} q={item.q} a={item.a} />
          ))}
        </FadeIn>
      </div>
    </section>
  )
}

// ─── CTA Final ────────────────────────────────────────────────────────────────
function CTAFinalSection() {
  const [hover, setHover] = useState(false)
  return (
    <section style={{
      background: ACC,
      position: 'relative',
      zIndex: 14,
      borderRadius: '40px 40px 0 0',
      marginTop: '-40px',
      padding: '100px 24px',
      textAlign: 'center',
      overflow: 'hidden',
    }}>
      {/* Decorative rings */}
      {[700, 450, 220].map(size => (
        <div key={size} style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%,-50%)',
          width: size,
          height: size,
          borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.1)',
          pointerEvents: 'none',
        }} />
      ))}

      <div style={{ position: 'relative', zIndex: 1, maxWidth: 700, margin: '0 auto' }}>
        <FadeIn>
          <span style={{
            background: 'rgba(255,255,255,0.2)',
            color: WHITE,
            borderRadius: 99,
            padding: '6px 16px',
            fontSize: 12,
            fontWeight: 800,
            display: 'inline-block',
            marginBottom: 20,
            letterSpacing: 1,
          }}>COMECE AGORA</span>

          <h2 style={{
            fontFamily: "'Playfair Display', serif",
            fontSize: 'clamp(36px, 5vw, 60px)',
            fontWeight: 900,
            color: WHITE,
            lineHeight: 1.1,
            marginTop: 0,
            marginBottom: 20,
          }}>
            Comece a gerenciar seus alunos e ter o controle de suas finanças como profissional
          </h2>

          <p style={{
            color: 'rgba(255,255,255,0.8)',
            fontSize: 17,
            lineHeight: 1.65,
            marginBottom: 48,
          }}>
            Teste as funcionalidades por 7 dias grátis, sem cartão. Cancele quando quiser.
          </p>

          <Link
            href="/register"
            style={{
              background: WHITE,
              color: ACC,
              padding: '20px 56px',
              borderRadius: 99,
              fontSize: 18,
              fontWeight: 800,
              display: 'inline-flex',
              gap: 8,
              alignItems: 'center',
              textDecoration: 'none',
              transition: 'transform 0.2s, box-shadow 0.2s',
              transform: hover ? 'translateY(-2px)' : 'none',
              boxShadow: hover ? '0 12px 40px rgba(0,0,0,0.2)' : 'none',
            }}
            onMouseEnter={() => setHover(true)}
            onMouseLeave={() => setHover(false)}
          >
            Começar agora →
          </Link>

          <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: 15, marginTop: 32 }}>
            Junte-se aos personal trainers que já deixaram as planilhas para trás.
          </p>
        </FadeIn>
      </div>
    </section>
  )
}

// ─── Footer ───────────────────────────────────────────────────────────────────
function FooterSection() {
  return (
    <footer style={{
      background: BG,
      position: 'relative',
      zIndex: 15,
      padding: '48px 24px',
      borderTop: '1px solid rgba(255,255,255,0.06)',
    }}>
      <div style={{ maxWidth: 1000, margin: '0 auto' }}>
        {/* Row 1 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 24 }}>
          {/* Logo */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <div style={{
              width: 36, height: 36,
              background: ACC, color: WHITE,
              borderRadius: 10, fontSize: 14,
              fontWeight: 800, display: 'flex',
              alignItems: 'center', justifyContent: 'center',
            }}>PH</div>
            <span style={{ color: WHITE, fontSize: 16, fontWeight: 700 }}>PersonalHub</span>
          </div>

          {/* Nav links */}
          <div style={{ display: 'flex', gap: 24, flexWrap: 'wrap' }}>
            {['Funcionalidades', 'Módulos', 'Preço', 'FAQ'].map(link => (
              <a key={link} href={`#${link.toLowerCase()}`} style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>{link}</a>
            ))}
          </div>

          {/* Entrar */}
          <Link href="/login" style={{ color: 'rgba(255,255,255,0.4)', fontSize: 13, textDecoration: 'none' }}>
            Entrar
          </Link>
        </div>

        {/* Divider */}
        <div style={{ borderTop: '1px solid rgba(255,255,255,0.06)', marginTop: 32, marginBottom: 24 }} />

        {/* Row 2 */}
        <div style={{ display: 'flex', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          <span style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13 }}>
            © 2026 PersonalHub. Todos os direitos reservados.
          </span>
          <a href="https://personalhub.fit" style={{ color: 'rgba(255,255,255,0.3)', fontSize: 13, textDecoration: 'none' }}>
            personalhub.fit
          </a>
        </div>
      </div>
    </footer>
  )
}

// ─── LandingPage (main export) ────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{
      background: BG,
      color: WHITE,
      fontFamily: "'DM Sans', -apple-system, sans-serif",
      overflowX: 'hidden',
    }}>
      <FontLoader />

      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:rgba(252,110,32,0.25);}

        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-12px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 24px rgba(252,110,32,0.3)}50%{box-shadow:0 0 48px rgba(252,110,32,0.6)}}
        @keyframes pulse{0%,100%{opacity:0.5;transform:scale(1)}50%{opacity:1;transform:scale(1.2)}}

        .ph-nav-link:hover{background:rgba(255,255,255,0.08)!important;color:#fff!important;}

        @media(max-width:768px){
          .ph-nav-links{display:none!important;}
          .ph-feature-row{flex-direction:column!important;gap:40px!important;}
          .ph-pain-grid{grid-template-columns:repeat(2,1fr)!important;}
          .ph-mod-grid{grid-template-columns:1fr!important;}
          .ph-proof-grid{grid-template-columns:1fr!important;}
        }
        @media(max-width:480px){
          .ph-pain-grid{grid-template-columns:1fr!important;}
        }
      `}</style>

      <PromoBar />
      <Navbar />
      <HeroSection />

      {/* Pain — zIndex 2 */}
      <PainSection />

      {/* Features — zIndex 3–8 */}
      <FeatureSection
        num="01"
        badge="FINANCEIRO"
        badgeBg="rgba(27,27,27,0.1)"
        badgeColor="#1B1B1B"
        headline="Controle financeiro total"
        desc="Saiba quanto fatura, quanto gasta e quanto sobra todo mês. Veja seu lucro real — não um chute."
        bg={CREAM}
        textColor="#1B1B1B"
        flip={false}
        mockup={<MockFinanceiro />}
        zIndex={3}
      />
      <FeatureSection
        num="02"
        badge="AGENDA"
        badgeBg="rgba(255,255,255,0.2)"
        badgeColor={WHITE}
        headline="Agenda inteligente"
        desc="Grade visual de segunda a domingo. Veja horários livres e ocupados em segundos, sem abrir nenhum chat."
        bg={ACC}
        textColor={WHITE}
        flip={true}
        mockup={<MockAgenda />}
        zIndex={4}
      />
      <FeatureSection
        num="03"
        badge="CÁLCULO"
        badgeBg="rgba(252,110,32,0.15)"
        badgeColor={ACC}
        headline="Cálculo automático de aulas"
        desc="O app conta os dias exatos do mês, calcula extras e reposições. Zero conta manual, zero esquecimento."
        bg={BG}
        textColor={WHITE}
        flip={false}
        mockup={<MockCalculo />}
        zIndex={5}
      />
      <FeatureSection
        num="04"
        badge="COBRANÇA"
        badgeBg="rgba(252,110,32,0.15)"
        badgeColor={ACC}
        headline="Cobrança em 1 toque"
        desc="Mensagem personalizada com valor exato, datas das aulas e link de pagamento. Envia pelo WhatsApp sem digitar nada."
        bg={CARD}
        textColor={WHITE}
        flip={true}
        mockup={<MockCobranca />}
        zIndex={6}
      />
      <FeatureSection
        num="05"
        badge="REPOSIÇÕES"
        badgeBg="rgba(27,27,27,0.1)"
        badgeColor="#1B1B1B"
        headline="Reposições sob controle"
        desc="Cada falta gera uma reposição com prazo automático. Acompanhe o status — pendente, agendada ou vencida."
        bg={CREAM}
        textColor="#1B1B1B"
        flip={false}
        mockup={<MockReposicoes />}
        zIndex={7}
      />
      <FeatureSection
        num="06"
        badge="EXTRAS"
        badgeBg="rgba(252,110,32,0.15)"
        badgeColor={ACC}
        headline="Aulas extras na cobrança"
        desc="Registre aulas extras com um toque. Elas são somadas automaticamente na cobrança do mês seguinte."
        bg={BG}
        textColor={WHITE}
        flip={true}
        mockup={<MockExtras />}
        zIndex={8}
      />

      {/* Demo — zIndex 9 */}
      <DemoSection />

      {/* Modules — zIndex 10 */}
      <ModulesSection />

      {/* Social Proof — zIndex 11 */}
      <SocialProofSection />

      {/* Comparison — zIndex 12 */}
      <ComparisonSection />

      {/* FAQ — zIndex 13 */}
      <FAQSection />

      {/* CTA Final — zIndex 14 */}
      <CTAFinalSection />

      {/* Footer — zIndex 15 */}
      <FooterSection />
    </div>
  )
}
