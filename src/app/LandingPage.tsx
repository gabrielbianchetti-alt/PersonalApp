'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'
import { LogoFull } from '@/components/brand/LogoFull'

// ─── tokens ───────────────────────────────────────────────────────────────────
const G  = '#00E676'
const GD = '#00C853'
const BG = '#0F0F0F'
const BG2 = '#141414'
const BG3 = '#1A1A1A'
const CARD = '#1C1C1C'
const BORDER = '#2A2A2A'
const TW  = '#FFFFFF'
const TG  = '#A3A3A3'
const TS  = '#6B6B6B'

// ─── font ─────────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.querySelector('#ph-font')) return
    const l = document.createElement('link')
    l.id   = 'ph-font'
    l.rel  = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
    document.head.appendChild(l)
  }, [])
  return null
}

// ─── fade in ─────────────────────────────────────────────────────────────────
function useFadeIn(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, vis }
}

function FadeIn({ children, delay = 0, style = {} }: {
  children: React.ReactNode; delay?: number; style?: React.CSSProperties
}) {
  const { ref, vis } = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : 'translateY(40px)',
      transition: `opacity 0.75s ease ${delay}ms, transform 0.75s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── count-up ─────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1600, active = false) {
  const [val, setVal] = useState(0)
  const started = useRef(false)
  useEffect(() => {
    if (!active || started.current) return
    started.current = true
    const t0 = performance.now()
    const tick = (now: number) => {
      const p = Math.min((now - t0) / duration, 1)
      const ease = 1 - Math.pow(1 - p, 3)
      setVal(Math.round(ease * target))
      if (p < 1) requestAnimationFrame(tick)
    }
    requestAnimationFrame(tick)
  }, [active, target, duration])
  return val
}

function CountUpStat({ value, suffix = '', label, active }: {
  value: number; suffix?: string; label: string; active: boolean
}) {
  const v = useCountUp(value, 1600, active)
  return (
    <div style={{ textAlign: 'center' }}>
      <div style={{ fontSize: 44, fontWeight: 900, color: G, lineHeight: 1 }}>
        {v}{suffix}
      </div>
      <div style={{ fontSize: 13, color: TG, marginTop: 6, fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ─── divider ─────────────────────────────────────────────────────────────────
function Divider() {
  return <div style={{ height: 1, background: BORDER, margin: '0 auto', maxWidth: 900 }} />
}

// ─── dashboard mockup ─────────────────────────────────────────────────────────
function DashboardMockup() {
  return (
    <div style={{
      background: '#111', borderRadius: 16, border: `1px solid ${BORDER}`,
      overflow: 'hidden', boxShadow: '0 32px 80px rgba(0,0,0,0.6)',
      fontFamily: 'inherit',
    }}>
      {/* Top bar */}
      <div style={{
        background: '#161616', borderBottom: `1px solid ${BORDER}`,
        padding: '12px 20px', display: 'flex', alignItems: 'center', gap: 8,
      }}>
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FF5F56' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#FFBD2E' }} />
        <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#27C93F' }} />
        <div style={{ flex: 1, textAlign: 'center', fontSize: 11, color: TS, letterSpacing: 0.5 }}>
          PersonalHub — Dashboard
        </div>
      </div>
      {/* Content */}
      <div style={{ padding: 20 }}>
        {/* Stat row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10, marginBottom: 16 }}>
          {[
            { label: 'Faturamento mensal', val: 'R$ 4.800', color: G },
            { label: 'Alunos ativos', val: '18', color: '#60A5FA' },
            { label: 'Pagamentos em dia', val: '94%', color: '#A78BFA' },
          ].map(s => (
            <div key={s.label} style={{
              background: CARD, borderRadius: 10, padding: '12px 14px',
              border: `1px solid ${BORDER}`,
            }}>
              <div style={{ fontSize: 10, color: TS, marginBottom: 4 }}>{s.label}</div>
              <div style={{ fontSize: 18, fontWeight: 800, color: s.color }}>{s.val}</div>
            </div>
          ))}
        </div>
        {/* Aluno list */}
        <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
          <div style={{ padding: '10px 14px', borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TG, fontWeight: 600 }}>
            ALUNOS — COBRANÇAS DO MÊS
          </div>
          {[
            { nome: 'Carlos Mendes', val: 'R$320', status: 'Pago', ok: true },
            { nome: 'Ana Ferreira', val: 'R$280', status: 'Pago', ok: true },
            { nome: 'Bruno Costa',  val: 'R$350', status: 'Pendente', ok: false },
            { nome: 'Larissa Nunes',val: 'R$300', status: 'Pago', ok: true },
          ].map(a => (
            <div key={a.nome} style={{
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
              padding: '9px 14px', borderBottom: `1px solid #1F1F1F`,
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                <div style={{
                  width: 26, height: 26, borderRadius: '50%',
                  background: a.ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,171,0,0.12)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 10, fontWeight: 700,
                  color: a.ok ? G : '#FFAB00',
                }}>
                  {a.nome.slice(0,2).toUpperCase()}
                </div>
                <div style={{ fontSize: 12, color: TW, fontWeight: 500 }}>{a.nome}</div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{ fontSize: 12, fontWeight: 700, color: TW }}>{a.val}</div>
                <div style={{
                  fontSize: 10, fontWeight: 600, padding: '2px 8px', borderRadius: 20,
                  background: a.ok ? 'rgba(0,230,118,0.12)' : 'rgba(255,171,0,0.12)',
                  color: a.ok ? G : '#FFAB00',
                }}>
                  {a.status}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

// ─── section wrapper ─────────────────────────────────────────────────────────
function Section({ children, style = {} }: { children: React.ReactNode; style?: React.CSSProperties }) {
  return (
    <section style={{
      padding: '96px 24px',
      ...style,
    }}>
      <div style={{ maxWidth: 900, margin: '0 auto' }}>
        {children}
      </div>
    </section>
  )
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  return (
    <div style={{ background: BG, color: TW, fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>
      <FontLoader />

      {/* Global animations */}
      <style>{`
        @keyframes pulse-green { 0%,100%{opacity:.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.04)} }
        @keyframes float { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-8px)} }
        @keyframes shimmer { 0%{background-position:-400px 0} 100%{background-position:400px 0} }
        * { box-sizing: border-box; }
        ::selection { background: ${G}33; }
      `}</style>

      {/* ── NAV ───────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(15,15,15,0.92)', backdropFilter: 'blur(16px)',
        borderBottom: `1px solid ${BORDER}`,
        padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 1000, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          height: 60,
        }}>
          <LogoFull iconSize={28} fontSize={17} gap={8} variant="brand" />
          <Link href="/register" style={{
            background: G, color: '#000',
            fontWeight: 700, fontSize: 13, padding: '9px 20px',
            borderRadius: 8, textDecoration: 'none',
          }}>
            Começar grátis
          </Link>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 1 — HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '80px 24px 72px', background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'minmax(0,1fr) minmax(0,1fr)',
            gap: 64, alignItems: 'center',
          }}
            className="hero-grid"
          >
            {/* Left */}
            <FadeIn>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,230,118,0.08)', border: `1px solid rgba(0,230,118,0.2)`,
                borderRadius: 100, padding: '6px 14px', marginBottom: 28,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, animation: 'pulse-green 2s infinite' }} />
                <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>Para personal trainers</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(36px, 5vw, 58px)', fontWeight: 900,
                lineHeight: 1.08, letterSpacing: -1.5,
                color: TW, marginBottom: 20,
              }}>
                Pare de perder<br />
                <span style={{ color: G }}>dinheiro</span> por falta<br />
                de organização
              </h1>

              <p style={{
                fontSize: 17, color: TG, lineHeight: 1.7,
                marginBottom: 36, maxWidth: 460,
              }}>
                Controle seus alunos, suas cobranças e saiba exatamente
                quanto sobra no seu bolso no fim do mês.
              </p>

              <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
                <Link href="/register" style={{
                  display: 'inline-flex', alignItems: 'center', gap: 8,
                  background: G, color: '#000',
                  fontWeight: 800, fontSize: 16, padding: '15px 32px',
                  borderRadius: 12, textDecoration: 'none',
                  boxShadow: `0 0 32px rgba(0,230,118,0.3)`,
                  transition: 'transform 0.15s',
                }}>
                  Começar agora por R$29,90
                </Link>
              </div>

              <p style={{ fontSize: 12, color: TS, marginTop: 14 }}>
                7 dias grátis · Sem contrato · Cancele quando quiser
              </p>
            </FadeIn>

            {/* Right — dashboard mockup */}
            <FadeIn delay={150}>
              <div style={{ animation: 'float 6s ease-in-out infinite' }}>
                <DashboardMockup />
              </div>
            </FadeIn>
          </div>
        </div>

        {/* Responsive hero grid */}
        <style>{`
          @media (max-width: 700px) {
            .hero-grid { grid-template-columns: 1fr !important; }
            .hero-grid > div:last-child { display: none; }
          }
        `}</style>
      </section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 2 — DOR REAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section>
        <FadeIn>
          <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Reconhece isso?
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            Se você é personal, isso provavelmente<br />
            <span style={{ color: G }}>acontece com você</span>
          </h2>
          <p style={{ fontSize: 16, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 52 }}>
            A maioria dos personais é excelente no treino. O problema está na gestão.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(260px, 1fr))', gap: 16 }}>
          {[
            { icon: '⏰', text: 'Você demora pra cobrar e deixa pra depois' },
            { icon: '😶', text: 'Tem aluno que paga atrasado e você nem percebe' },
            { icon: '📱', text: 'Sua agenda fica bagunçada no meio da correria' },
            { icon: '❓', text: 'No fim do mês, você não sabe quanto realmente ganhou' },
            { icon: '😤', text: 'Você trabalha muito, mas não tem controle do dinheiro' },
          ].map((item, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: '22px 22px',
                display: 'flex', alignItems: 'flex-start', gap: 14,
                transition: 'border-color 0.2s',
              }}>
                <span style={{ fontSize: 24, flexShrink: 0, lineHeight: 1 }}>{item.icon}</span>
                <p style={{ fontSize: 15, color: TG, lineHeight: 1.55, margin: 0, fontWeight: 500 }}>
                  {item.text}
                </p>
              </div>
            </FadeIn>
          ))}
        </div>

        {/* Destaque */}
        <FadeIn delay={200}>
          <div style={{
            marginTop: 44, background: 'rgba(0,230,118,0.05)',
            border: `1px solid rgba(0,230,118,0.2)`,
            borderLeft: `4px solid ${G}`,
            borderRadius: 12, padding: '24px 28px',
          }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: TW, margin: 0, lineHeight: 1.55 }}>
              👉 O problema não é falta de aluno.<br />
              <span style={{ color: G }}>É falta de organização.</span>
            </p>
          </div>
        </FadeIn>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 3 — GATILHO FINANCEIRO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section style={{ background: BG2 }}>
        <FadeIn>
          <p style={{ fontSize: 12, fontWeight: 700, color: '#FF5252', letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Impacto real no seu bolso
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 48 }}>
            Você está deixando dinheiro<br />
            <span style={{ color: '#FF5252' }}>parado todos os meses</span>
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{
            background: CARD, border: `1px solid ${BORDER}`,
            borderRadius: 16, padding: '40px',
            maxWidth: 680,
          }}>
            <p style={{ fontSize: 17, color: TG, lineHeight: 1.8, marginBottom: 28 }}>
              Se você demora em média{' '}
              <span style={{ color: TW, fontWeight: 800 }}>10 dias para cobrar seus alunos</span>:
            </p>

            <div style={{ display: 'flex', flexDirection: 'column', gap: 16, marginBottom: 32 }}>
              {[
                { icon: '💸', text: 'São 10 dias sem esse dinheiro na sua conta' },
                { icon: '📉', text: '10 dias que você poderia estar usando esse valor' },
              ].map((item, i) => (
                <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                  <span style={{ fontSize: 22 }}>{item.icon}</span>
                  <p style={{ fontSize: 16, color: TG, margin: 0 }}>{item.text}</p>
                </div>
              ))}
            </div>

            <p style={{ fontSize: 16, color: TG, marginBottom: 24 }}>
              Agora multiplica isso por um ano:
            </p>

            <div style={{
              background: 'rgba(255,82,82,0.08)', border: `1px solid rgba(255,82,82,0.2)`,
              borderRadius: 12, padding: '24px 28px', marginBottom: 28,
            }}>
              <p style={{ fontSize: 22, fontWeight: 900, color: '#FF5252', margin: 0, lineHeight: 1.4 }}>
                👉 São <span style={{ fontSize: 32 }}>120 dias</span> com seu dinheiro fora da sua mão.<br />
                <span style={{ fontSize: 18, opacity: 0.9 }}>4 meses do seu faturamento atrasado.</span>
              </p>
            </div>

            <blockquote style={{
              borderLeft: `3px solid ${G}`,
              paddingLeft: 20, margin: 0,
            }}>
              <p style={{ fontSize: 20, fontWeight: 800, color: TW, margin: 0, fontStyle: 'italic' }}>
                &quot;Atrasar cobrança é atrasar sua vida financeira.&quot;
              </p>
            </blockquote>
          </div>
        </FadeIn>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 4 — SOLUÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section>
        <FadeIn>
          <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            A solução
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            O PersonalHub resolve<br />
            <span style={{ color: G }}>isso pra você</span>
          </h2>
          <p style={{ fontSize: 16, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 52 }}>
            Ele organiza tudo que hoje está solto na sua rotina — num lugar só, simples de usar.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16 }}>
          {[
            { icon: '📅', title: 'Agenda organizada', desc: 'Visualize todos os seus treinos em um calendário limpo e sem confusão.' },
            { icon: '👥', title: 'Alunos centralizados', desc: 'Ficha completa de cada aluno: dados, objetivos, histórico e contato.' },
            { icon: '💰', title: 'Controle de pagamentos', desc: 'Saiba em tempo real quem pagou, quem está atrasado e quanto está pendente.' },
            { icon: '📊', title: 'Faturamento automático', desc: 'O sistema calcula tudo. Você vê o número real sem fazer uma planilha.' },
          ].map((card, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: '28px 24px',
                height: '100%',
                transition: 'border-color 0.2s, transform 0.2s',
              }}>
                <div style={{
                  width: 48, height: 48, borderRadius: 12,
                  background: 'rgba(0,230,118,0.1)',
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  fontSize: 22, marginBottom: 16,
                }}>
                  {card.icon}
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: TW, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: TG, lineHeight: 1.6, margin: 0 }}>{card.desc}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={200}>
          <div style={{
            marginTop: 44, background: 'rgba(0,230,118,0.05)',
            border: `1px solid rgba(0,230,118,0.18)`,
            borderRadius: 12, padding: '24px 28px', textAlign: 'center',
          }}>
            <p style={{ fontSize: 17, fontWeight: 700, color: TW, margin: 0 }}>
              👉 Você passa a saber exatamente quanto entrou e quanto sobrou.
            </p>
          </div>
        </FadeIn>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 5 — COMO FUNCIONA
      ══════════════════════════════════════════════════════════════════════ */}
      <Section style={{ background: BG2 }}>
        <FadeIn>
          <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Como funciona
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 52 }}>
            Veja o que você passa<br />
            a <span style={{ color: G }}>enxergar todos os dias</span>
          </h2>
        </FadeIn>

        <div style={{ display: 'flex', flexDirection: 'column', gap: 56 }}>
          {[
            {
              num: '01',
              title: 'Veja quanto você vai faturar no mês',
              desc: 'O sistema soma as cobranças dos seus alunos e te mostra o número exato antes mesmo do mês terminar. Sem surpresa, sem planilha, sem achismo.',
              visual: (
                <div style={{ background: '#111', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20 }}>
                  <div style={{ fontSize: 11, color: TS, marginBottom: 16, fontWeight: 600, letterSpacing: 1 }}>PREVISÃO DO MÊS</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                    {[
                      { label: 'Confirmado', val: 'R$ 3.840', pct: 80, color: G },
                      { label: 'Pendente',   val: 'R$   960', pct: 20, color: '#FFAB00' },
                    ].map(r => (
                      <div key={r.label}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
                          <span style={{ fontSize: 12, color: TG }}>{r.label}</span>
                          <span style={{ fontSize: 13, fontWeight: 700, color: r.color }}>{r.val}</span>
                        </div>
                        <div style={{ height: 6, background: '#222', borderRadius: 4 }}>
                          <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 4 }} />
                        </div>
                      </div>
                    ))}
                    <div style={{ borderTop: `1px solid ${BORDER}`, paddingTop: 10, display: 'flex', justifyContent: 'space-between' }}>
                      <span style={{ fontSize: 13, color: TG, fontWeight: 600 }}>Total projetado</span>
                      <span style={{ fontSize: 18, fontWeight: 900, color: TW }}>R$ 4.800</span>
                    </div>
                  </div>
                </div>
              ),
            },
            {
              num: '02',
              title: 'Controle quem pagou e quem não pagou',
              desc: 'Cada aluno tem um status de cobrança claro. Você vê em segundos quem está em dia, quem está atrasado e qual o valor pendente.',
              visual: (
                <div style={{ background: '#111', borderRadius: 12, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
                  <div style={{ padding: '12px 16px', borderBottom: `1px solid ${BORDER}`, fontSize: 11, color: TS, fontWeight: 600, letterSpacing: 1 }}>
                    SITUAÇÃO DAS COBRANÇAS
                  </div>
                  {[
                    { nome: 'Rafael Souza', val: 'R$400', dias: null, ok: true },
                    { nome: 'Priya Santos', val: 'R$280', dias: null, ok: true },
                    { nome: 'Lucas Alves',  val: 'R$320', dias: 5,    ok: false },
                    { nome: 'Marta Lima',   val: 'R$350', dias: null, ok: true },
                  ].map(a => (
                    <div key={a.nome} style={{
                      display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                      padding: '10px 16px', borderBottom: `1px solid #1a1a1a`,
                    }}>
                      <div style={{ fontSize: 13, color: TW }}>{a.nome}</div>
                      <div style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                        <span style={{ fontSize: 13, fontWeight: 700, color: TW }}>{a.val}</span>
                        <span style={{
                          fontSize: 10, fontWeight: 600, padding: '2px 9px', borderRadius: 20,
                          background: a.ok ? 'rgba(0,230,118,0.1)' : 'rgba(255,82,82,0.1)',
                          color: a.ok ? G : '#FF5252',
                        }}>
                          {a.ok ? 'Pago' : `${a.dias}d atraso`}
                        </span>
                      </div>
                    </div>
                  ))}
                </div>
              ),
            },
            {
              num: '03',
              title: 'Organize sua agenda sem erro',
              desc: 'Cada aluno tem seus dias e horários cadastrados. A agenda mostra tudo em ordem — sem duplos agendamentos e sem confusão.',
              visual: (
                <div style={{ background: '#111', borderRadius: 12, border: `1px solid ${BORDER}`, padding: 20 }}>
                  <div style={{ fontSize: 11, color: TS, marginBottom: 14, fontWeight: 600, letterSpacing: 1 }}>HOJE — SEG 14</div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {[
                      { hora: '06:00', nome: 'Carlos M.', local: 'Academia Central' },
                      { hora: '07:00', nome: 'Ana F.',    local: 'Parque Ibirapuera' },
                      { hora: '08:00', nome: 'Bruno C.',  local: 'Academia Central' },
                      { hora: '17:00', nome: 'Larissa N.', local: 'Academia Norte' },
                      { hora: '18:00', nome: 'Rodrigo P.', local: 'Online' },
                    ].map(ev => (
                      <div key={ev.hora} style={{
                        display: 'flex', gap: 12, alignItems: 'center',
                        background: CARD, borderRadius: 8, padding: '10px 12px',
                        border: `1px solid ${BORDER}`,
                      }}>
                        <span style={{ fontSize: 12, fontWeight: 800, color: G, minWidth: 44 }}>{ev.hora}</span>
                        <div>
                          <div style={{ fontSize: 13, color: TW, fontWeight: 600 }}>{ev.nome}</div>
                          <div style={{ fontSize: 11, color: TS }}>{ev.local}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ),
            },
          ].map((step, i) => (
            <FadeIn key={i} delay={100}>
              <div style={{
                display: 'grid',
                gridTemplateColumns: i % 2 === 0 ? '1fr 1fr' : '1fr 1fr',
                gap: 56, alignItems: 'center',
              }}
                className={`step-grid${i % 2 === 1 ? ' step-reverse' : ''}`}
              >
                <div style={{ order: i % 2 === 1 ? 2 : 1 }}>
                  <div style={{ fontSize: 64, fontWeight: 900, color: BORDER, lineHeight: 1, marginBottom: 8 }}>
                    {step.num}
                  </div>
                  <h3 style={{ fontSize: 26, fontWeight: 800, color: TW, marginBottom: 14, lineHeight: 1.2 }}>
                    {step.title}
                  </h3>
                  <p style={{ fontSize: 15, color: TG, lineHeight: 1.7 }}>{step.desc}</p>
                </div>
                <div style={{ order: i % 2 === 1 ? 1 : 2 }}>
                  {step.visual}
                </div>
              </div>
            </FadeIn>
          ))}
        </div>

        <style>{`
          @media (max-width: 650px) {
            .step-grid { grid-template-columns: 1fr !important; }
            .step-grid > div { order: unset !important; }
          }
        `}</style>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 6 — ANTES vs DEPOIS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section>
        <FadeIn>
          <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
            Transformação
          </p>
          <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 52 }}>
            O que muda quando<br />
            <span style={{ color: G }}>você tem controle</span>
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>
            {/* Antes */}
            <div style={{
              background: 'rgba(255,82,82,0.04)', border: `1px solid rgba(255,82,82,0.15)`,
              borderRadius: 16, padding: '32px 28px',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(255,82,82,0.08)', border: `1px solid rgba(255,82,82,0.2)`,
                borderRadius: 8, padding: '6px 14px', marginBottom: 28,
              }}>
                <span style={{ fontSize: 14 }}>😓</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: '#FF5252' }}>ANTES</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Cobrança atrasada, dinheiro parado',
                  'Não sabe quanto vai ganhar no mês',
                  'Agenda bagunçada e estressante',
                  'Sensação de trabalhar sem crescer',
                  'Medo de perder aluno por desorganização',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: '#FF5252', fontSize: 16, flexShrink: 0, marginTop: 1 }}>✗</span>
                    <span style={{ fontSize: 15, color: TG, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Depois */}
            <div style={{
              background: 'rgba(0,230,118,0.04)', border: `1px solid rgba(0,230,118,0.15)`,
              borderRadius: 16, padding: '32px 28px',
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,230,118,0.08)', border: `1px solid rgba(0,230,118,0.2)`,
                borderRadius: 8, padding: '6px 14px', marginBottom: 28,
              }}>
                <span style={{ fontSize: 14 }}>💪</span>
                <span style={{ fontSize: 13, fontWeight: 700, color: G }}>COM O PERSONALHUB</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
                {[
                  'Cobrança em dia, dinheiro na conta',
                  'Previsão de faturamento em tempo real',
                  'Agenda clara, dia a dia sem estresse',
                  'Sensação de controle e crescimento',
                  'Postura profissional que retém alunos',
                ].map((item, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <span style={{ color: G, fontSize: 16, flexShrink: 0, marginTop: 1 }}>✓</span>
                    <span style={{ fontSize: 15, color: TG, lineHeight: 1.5 }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        <style>{`@media(max-width:580px){.bvd-grid{grid-template-columns:1fr!important}}`}</style>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 7 — PREÇO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section style={{ background: BG2 }}>
        <FadeIn>
          <div style={{ textAlign: 'center', marginBottom: 52 }}>
            <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 16 }}>
              Investimento
            </p>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 12 }}>
              Quanto vale ter controle total<br />
              <span style={{ color: G }}>do seu dinheiro e da sua rotina?</span>
            </h2>
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: CARD, border: `1px solid rgba(0,230,118,0.25)`,
              borderRadius: 20, padding: '48px 52px',
              maxWidth: 480, width: '100%', textAlign: 'center',
              boxShadow: `0 0 60px rgba(0,230,118,0.08)`,
            }}>
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: 'rgba(0,230,118,0.08)', border: `1px solid rgba(0,230,118,0.2)`,
                borderRadius: 100, padding: '6px 16px', marginBottom: 28,
              }}>
                <span style={{ fontSize: 12, fontWeight: 700, color: G }}>Plano Pro — Acesso completo</span>
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: TG, fontWeight: 500 }}>R$</span>
                <span style={{ fontSize: 64, fontWeight: 900, color: TW, lineHeight: 1, letterSpacing: -2 }}>29</span>
                <span style={{ fontSize: 30, color: TW, fontWeight: 700 }}>,90</span>
              </div>
              <p style={{ fontSize: 14, color: TS, marginBottom: 36 }}>por mês</p>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 36, textAlign: 'left' }}>
                {[
                  'Alunos ilimitados',
                  'Controle completo de cobranças',
                  'Agenda e histórico de treinos',
                  'Relatório financeiro automático',
                  'Termos digitais por WhatsApp',
                  'Suporte incluído',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 10, alignItems: 'center' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%',
                      background: 'rgba(0,230,118,0.12)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      flexShrink: 0,
                    }}>
                      <span style={{ fontSize: 11, color: G, fontWeight: 700 }}>✓</span>
                    </div>
                    <span style={{ fontSize: 14, color: TG }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" style={{
                display: 'block', textAlign: 'center',
                background: G, color: '#000',
                fontWeight: 800, fontSize: 16, padding: '16px',
                borderRadius: 12, textDecoration: 'none',
                marginBottom: 16,
              }}>
                Começar agora
              </Link>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                {['Menos de R$1/dia', 'Sem contrato', 'Cancele quando quiser'].map(t => (
                  <span key={t} style={{ fontSize: 12, color: TS }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 8 — POSICIONAMENTO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section>
        <FadeIn>
          <div style={{ maxWidth: 600, margin: '0 auto', textAlign: 'center' }}>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, marginBottom: 20 }}>
              Não é sobre trabalhar mais.
            </h2>
            <h2 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 900, lineHeight: 1.15, letterSpacing: -1, color: G, marginBottom: 28 }}>
              É sobre parar de perder dinheiro no que você já faz.
            </h2>
            <p style={{ fontSize: 17, color: TG, lineHeight: 1.7 }}>
              Você já tem os alunos. Você já faz os treinos. O PersonalHub só garante
              que você receba direito, no prazo, sem se perder no caminho.
            </p>
          </div>
        </FadeIn>
      </Section>

      <Divider />

      {/* ══════════════════════════════════════════════════════════════════════
          SEÇÃO 9 — CTA FINAL
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        background: BG3,
        padding: '100px 24px',
        textAlign: 'center',
        position: 'relative', overflow: 'hidden',
      }}>
        {/* Background glow */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(0,230,118,0.06) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 580, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 12, fontWeight: 700, color: G, letterSpacing: 2, textTransform: 'uppercase', marginBottom: 20 }}>
              Comece agora
            </p>
            <h2 style={{ fontSize: 'clamp(32px,5vw,52px)', fontWeight: 900, lineHeight: 1.08, letterSpacing: -1.5, marginBottom: 20 }}>
              Organize sua rotina.<br />
              <span style={{ color: G }}>Controle seu dinheiro.</span>
            </h2>
            <p style={{ fontSize: 17, color: TG, lineHeight: 1.7, marginBottom: 40 }}>
              Tenha previsibilidade no seu mês e pare de trabalhar no escuro.
            </p>

            <Link href="/register" style={{
              display: 'inline-flex', alignItems: 'center', justifyContent: 'center', gap: 10,
              background: G, color: '#000',
              fontWeight: 800, fontSize: 17, padding: '18px 44px',
              borderRadius: 14, textDecoration: 'none',
              boxShadow: `0 0 48px rgba(0,230,118,0.4)`,
              marginBottom: 20,
            }}>
              Quero usar o PersonalHub
            </Link>

            <p style={{ fontSize: 13, color: TS }}>
              7 dias grátis para experimentar · Sem cartão de crédito · R$29,90/mês depois
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`,
        padding: '32px 24px',
        background: BG,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
        flexWrap: 'wrap', gap: 16,
      }}>
        <LogoFull iconSize={22} fontSize={14} gap={7} variant="brand" />
        <div style={{ display: 'flex', gap: 28 }}>
          {[['Entrar', '/login'], ['Cadastrar', '/register']].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontSize: 13, color: TS, textDecoration: 'none' }}>
              {label}
            </Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: TS }}>
          © {new Date().getFullYear()} PersonalHub
        </p>
      </footer>
    </div>
  )
}
