'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Color tokens ─────────────────────────────────────────────────────────────
const G     = '#7cb972'                        // sage green — accent
const GB    = '#34502b'                        // forest green — badge bg
const BG    = '#09100a'                        // near-black, green-tinted
const BG2   = '#0d160d'
const BG3   = '#111a11'
const CARD  = '#141f13'
const BORDER  = '#233022'
const TW    = '#edf3eb'                        // warm white
const TG    = '#8aaa84'                        // muted sage
const TS    = '#506050'                        // subtle
const RED   = '#e05252'

// ─── Font loader ──────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.querySelector('#ph-font')) return
    const l = document.createElement('link')
    l.id  = 'ph-font'
    l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
    document.head.appendChild(l)
  }, [])
  return null
}

// ─── FadeIn on scroll ─────────────────────────────────────────────────────────
function useFadeIn(threshold = 0.12) {
  const ref = useRef<HTMLDivElement>(null)
  const [vis, setVis] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(
      ([e]) => { if (e.isIntersecting) { setVis(true); obs.disconnect() } },
      { threshold }
    )
    obs.observe(el)
    return () => obs.disconnect()
  }, [threshold])
  return { ref, vis }
}

function FadeIn({ children, delay = 0, y = 32, style = {} }: {
  children: React.ReactNode
  delay?: number
  y?: number
  style?: React.CSSProperties
}) {
  const { ref, vis } = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : `translateY(${y}px)`,
      transition: `opacity 0.7s ease ${delay}ms, transform 0.7s ease ${delay}ms`,
      ...style,
    }}>
      {children}
    </div>
  )
}

// ─── Count-up ─────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 1800, active = false) {
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

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Label({ children, color = G }: { children: React.ReactNode; color?: string }) {
  return (
    <p style={{ fontSize: 11, fontWeight: 700, color, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 16 }}>
      {children}
    </p>
  )
}

function Section({ children, bg = BG, style = {} }: {
  children: React.ReactNode; bg?: string; style?: React.CSSProperties
}) {
  return (
    <section style={{ padding: '100px 24px', background: bg, ...style }}>
      <div style={{ maxWidth: 960, margin: '0 auto' }}>{children}</div>
    </section>
  )
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ children }: { children: React.ReactNode }) {
  return (
    <div style={{
      width: 260, minHeight: 520,
      background: '#0a0a0a',
      borderRadius: 44,
      border: `8px solid #1e2b1c`,
      boxShadow: '0 40px 80px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.04)',
      overflow: 'hidden',
      position: 'relative',
      flexShrink: 0,
    }}>
      {/* Notch */}
      <div style={{
        position: 'absolute', top: 12, left: '50%', transform: 'translateX(-50%)',
        width: 100, height: 24, background: '#0a0a0a',
        borderRadius: 12, zIndex: 10, border: '1px solid #1a1a1a',
      }} />
      <div style={{ paddingTop: 48, height: '100%', overflow: 'hidden' }}>{children}</div>
    </div>
  )
}

// ─── Screen: Dashboard ────────────────────────────────────────────────────────
function ScreenDashboard() {
  return (
    <div style={{ padding: '12px 14px', background: '#0f150e', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 12, fontWeight: 600 }}>Bom dia, Gabriel 👋</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Faturamento', val: 'R$4.800', color: G },
          { label: 'Alunos ativos', val: '18', color: '#60a5fa' },
          { label: 'Recebido', val: 'R$4.160', color: G },
          { label: 'Pendente', val: 'R$640', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, borderRadius: 10, padding: '10px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 8.5, color: TS, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, fontSize: 8.5, color: TS, fontWeight: 700, letterSpacing: 1 }}>
          COBRANÇAS DO MÊS
        </div>
        {[
          { nome: 'Carlos M.', val: 'R$320', ok: true },
          { nome: 'Ana F.', val: 'R$280', ok: true },
          { nome: 'Bruno C.', val: 'R$350', ok: false },
          { nome: 'Larissa N.', val: 'R$300', ok: true },
        ].map(a => (
          <div key={a.nome} style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            padding: '7px 10px', borderBottom: `1px solid #1a2419`,
          }}>
            <span style={{ fontSize: 11, color: TW, fontWeight: 500 }}>{a.nome}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TW }}>{a.val}</span>
              <span style={{
                fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
                background: a.ok ? 'rgba(124,185,114,0.12)' : 'rgba(224,82,82,0.12)',
                color: a.ok ? G : RED,
              }}>{a.ok ? 'Pago' : 'Pend.'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Cálculo Mensal ───────────────────────────────────────────────────
function ScreenFinanceiro() {
  return (
    <div style={{ padding: '12px 14px', background: '#0f150e', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Cálculo Mensal</div>
      <div style={{
        background: CARD, borderRadius: 10, padding: '10px 12px',
        border: `1px solid ${BORDER}`, marginBottom: 12,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      }}>
        <span style={{ fontSize: 11, color: TG }}>Abril 2026</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: TW }}>R$ 4.800</span>
      </div>
      {[
        { label: 'Mensalidades', val: 'R$3.840', pct: 80, color: G },
        { label: 'Aulas avulsas', val: 'R$640', pct: 13, color: '#60a5fa' },
        { label: 'Reposições cobradas', val: 'R$320', pct: 7, color: '#a78bfa' },
      ].map(r => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: TG }}>{r.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.val}</span>
          </div>
          <div style={{ height: 5, background: '#1a2419', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
      <div style={{
        background: 'rgba(124,185,114,0.06)', borderRadius: 10,
        border: `1px solid rgba(124,185,114,0.15)`, padding: '10px 12px', marginTop: 12,
      }}>
        <div style={{ fontSize: 8.5, color: G, fontWeight: 700, marginBottom: 6 }}>AULAS EXTRAS COMPUTADAS</div>
        {[
          { aluno: 'Carlos M.', aulas: '+2 aulas', val: '+R$80' },
          { aluno: 'Ana F.', aulas: '+1 aula', val: '+R$40' },
        ].map(e => (
          <div key={e.aluno} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: TG }}>{e.aluno} <span style={{ color: '#60a5fa' }}>{e.aulas}</span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: G }}>{e.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

// ─── Screen: Agenda ───────────────────────────────────────────────────────────
function ScreenAgenda() {
  return (
    <div style={{ padding: '12px 14px', background: '#0f150e', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Agenda da Semana</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {['S', 'T', 'Q', 'Q', 'S'].map((d, i) => (
          <div key={i} style={{
            flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 8,
            background: i === 1 ? GB : CARD,
            border: `1px solid ${i === 1 ? G : BORDER}`,
          }}>
            <div style={{ fontSize: 8, color: i === 1 ? G : TS }}>{d}</div>
            <div style={{ fontSize: 11, fontWeight: 700, color: i === 1 ? TW : TG }}>{14 + i}</div>
          </div>
        ))}
      </div>
      {[
        { hora: '06:00', nome: 'Carlos M.', local: 'Academia' },
        { hora: '07:00', nome: 'Ana F.', local: 'Parque' },
        { hora: '08:00', nome: 'Bruno C.', local: 'Academia' },
        { hora: '17:00', nome: 'Larissa N.', local: 'Academia' },
        { hora: '18:00', nome: 'Rodrigo P.', local: 'Online' },
      ].map(ev => (
        <div key={ev.hora} style={{
          display: 'flex', gap: 8, alignItems: 'center',
          padding: '7px 8px', borderRadius: 8, marginBottom: 4,
          background: CARD, border: `1px solid ${BORDER}`,
        }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: G, minWidth: 38 }}>{ev.hora}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: TW, fontWeight: 600 }}>{ev.nome}</div>
            <div style={{ fontSize: 9, color: TS }}>{ev.local}</div>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: G }} />
        </div>
      ))}
    </div>
  )
}

// ─── Screen: Faltas ───────────────────────────────────────────────────────────
function ScreenReposicoes() {
  return (
    <div style={{ padding: '12px 14px', background: '#0f150e', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Faltas e Reposições</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[
          { label: 'Pendentes', val: '3', color: '#f59e0b' },
          { label: 'Agendadas', val: '2', color: '#60a5fa' },
          { label: 'Vencidas', val: '1', color: RED },
        ].map(s => (
          <div key={s.label} style={{
            background: CARD, borderRadius: 8, padding: '8px',
            border: `1px solid ${BORDER}`, textAlign: 'center',
          }}>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
            <div style={{ fontSize: 8, color: TS }}>{s.label}</div>
          </div>
        ))}
      </div>
      {[
        { aluno: 'Bruno C.', data: '10/04', prazo: '10/05', status: 'Pendente', sc: '#f59e0b' },
        { aluno: 'Ana F.', data: '08/04', prazo: '08/05', status: 'Agendada', sc: '#60a5fa' },
        { aluno: 'Marcos S.', data: '02/04', prazo: '02/05', status: 'Vencida', sc: RED },
      ].map(f => (
        <div key={f.aluno} style={{
          background: CARD, borderRadius: 8, padding: '9px 10px',
          border: `1px solid ${BORDER}`, marginBottom: 6,
        }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: TW }}>{f.aluno}</span>
            <span style={{
              fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 10,
              background: `${f.sc}18`, color: f.sc,
            }}>{f.status}</span>
          </div>
          <div style={{ fontSize: 9, color: TS }}>Falta: {f.data} · Prazo: {f.prazo}</div>
        </div>
      ))}
    </div>
  )
}

// ─── Screen: Alunos ───────────────────────────────────────────────────────────
function ScreenAlunos() {
  return (
    <div style={{ padding: '12px 14px', background: '#0f150e', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Meus Alunos</div>
      {[
        { nome: 'Carlos Mendes', dias: 'Seg/Qua/Sex', valor: 'R$320/mês', ok: true },
        { nome: 'Ana Ferreira', dias: 'Ter/Qui', valor: 'R$280/mês', ok: true },
        { nome: 'Bruno Costa', dias: 'Seg/Sex', valor: 'R$350/mês', ok: false },
        { nome: 'Larissa Nunes', dias: 'Ter/Qui', valor: 'R$300/mês', ok: true },
        { nome: 'Rodrigo Pinto', dias: 'Qua/Sex', valor: 'R$280/mês', ok: true },
      ].map(a => (
        <div key={a.nome} style={{
          background: CARD, borderRadius: 10, padding: '10px 11px',
          border: `1px solid ${BORDER}`, marginBottom: 6,
          display: 'flex', alignItems: 'center', gap: 9,
        }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: a.ok ? 'rgba(124,185,114,0.12)' : 'rgba(224,82,82,0.1)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9.5, fontWeight: 700, color: a.ok ? G : RED,
          }}>
            {a.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TW }}>{a.nome}</div>
            <div style={{ fontSize: 9, color: TS }}>{a.dias} · {a.valor}</div>
          </div>
          <span style={{
            fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10,
            background: a.ok ? 'rgba(124,185,114,0.1)' : 'rgba(224,82,82,0.1)',
            color: a.ok ? G : RED,
          }}>{a.ok ? 'Ativo' : 'Pausado'}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
const SLIDES = [
  { title: 'Dashboard completo', desc: 'Faturamento, alunos ativos e cobranças do mês na mesma tela', screen: <ScreenDashboard /> },
  { title: 'Cálculo mensal automático', desc: 'Aulas extras e variações calculadas automaticamente, sem planilha', screen: <ScreenFinanceiro /> },
  { title: 'Agenda visual da semana', desc: 'Todos os alunos, horários e locais organizados por dia', screen: <ScreenAgenda /> },
  { title: 'Faltas e reposições', desc: 'Controle de prazo, status e agendamento de cada reposição', screen: <ScreenReposicoes /> },
  { title: 'Gestão de alunos', desc: 'Ficha completa: dias, horários, valor e status de cada aluno', screen: <ScreenAlunos /> },
]

function ScreensCarousel() {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)

  function go(next: number) {
    if (fading) return
    setFading(true)
    setTimeout(() => { setActive(next); setFading(false) }, 240)
  }

  const prev = () => go((active - 1 + SLIDES.length) % SLIDES.length)
  const next = () => go((active + 1) % SLIDES.length)
  const item = SLIDES[active]

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 44 }}>
      <div className="carousel-inner" style={{
        display: 'flex', gap: 64, alignItems: 'center',
        flexWrap: 'wrap', justifyContent: 'center',
      }}>
        {/* Phone */}
        <div style={{
          opacity: fading ? 0 : 1, transform: fading ? 'scale(0.96)' : 'scale(1)',
          transition: 'opacity 0.22s, transform 0.22s',
        }}>
          <PhoneMockup>{item.screen}</PhoneMockup>
        </div>

        {/* Text + arrows */}
        <div style={{ maxWidth: 380 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `rgba(52,80,43,0.45)`, border: `1px solid rgba(124,185,114,0.25)`,
            borderRadius: 100, padding: '5px 16px', marginBottom: 22,
          }}>
            <span style={{ fontSize: 11, color: G, fontWeight: 600 }}>{active + 1} / {SLIDES.length}</span>
          </div>

          <h3 style={{
            fontSize: 28, fontWeight: 800, color: TW,
            letterSpacing: -0.5, lineHeight: 1.2, marginBottom: 14,
            opacity: fading ? 0 : 1, transform: fading ? 'translateX(-8px)' : 'none',
            transition: 'opacity 0.22s, transform 0.22s',
          }}>{item.title}</h3>

          <p style={{
            fontSize: 16, color: TG, lineHeight: 1.65,
            opacity: fading ? 0 : 1, transition: 'opacity 0.22s',
          }}>{item.desc}</p>

          <div style={{ display: 'flex', gap: 12, marginTop: 32 }}>
            <button onClick={prev} style={{
              width: 44, height: 44, borderRadius: '50%',
              background: CARD, border: `1px solid ${BORDER}`,
              color: TW, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'border-color 0.2s',
            }}>←</button>
            <button onClick={next} style={{
              width: 44, height: 44, borderRadius: '50%',
              background: GB, border: `1px solid ${G}`,
              color: TW, fontSize: 18, cursor: 'pointer',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              transition: 'background 0.2s',
            }}>→</button>
          </div>
        </div>
      </div>

      {/* Dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)} style={{
            width: i === active ? 28 : 8, height: 8,
            borderRadius: 4, border: 'none', cursor: 'pointer',
            background: i === active ? G : BORDER,
            transition: 'width 0.3s, background 0.3s',
            padding: 0,
          }} />
        ))}
      </div>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: 'Funciona no celular?', a: 'Sim, 100%. O PersonalHub é mobile-first — foi projetado para ser usado no celular. Funciona perfeitamente em qualquer smartphone, tablet ou computador.' },
  { q: 'Preciso instalar alguma coisa?', a: 'Não. O PersonalHub funciona diretamente no navegador, sem baixar nenhum aplicativo. Abriu, usou.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim, sem burocracia. Sem fidelidade, sem multa, sem ligação para cancelar. Você cancela quando quiser pelo próprio sistema.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Todos os dados são criptografados e armazenados com backups automáticos diários. Sua base de alunos está protegida.' },
  { q: 'Tem período de teste gratuito?', a: 'Sim. São 7 dias grátis para testar tudo sem compromisso. Não é necessário cartão de crédito para começar.' },
  { q: 'Quantos alunos posso cadastrar?', a: 'Ilimitados. Não há limite de alunos, cobranças, registros de faltas ou termos. Tudo sem limite no plano único.' },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', textAlign: 'left',
          padding: '22px 0', background: 'none', border: 'none', cursor: 'pointer',
          display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16,
        }}
      >
        <span style={{ fontSize: 16, fontWeight: 600, color: TW, lineHeight: 1.4 }}>{q}</span>
        <span style={{
          width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
          background: open ? GB : CARD, border: `1px solid ${open ? G : BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? G : TG, fontSize: 18, fontWeight: 300,
          transition: 'all 0.2s', transform: open ? 'rotate(45deg)' : 'none',
        }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
        <p style={{ fontSize: 15, color: TG, lineHeight: 1.7, paddingBottom: 22 }}>{a}</p>
      </div>
    </div>
  )
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const [statsVisible, setStatsVisible] = useState(false)
  const statsRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const el = statsRef.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsVisible(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])

  const cAlunos  = useCountUp(18, 1800, statsVisible)
  const cMobile  = useCountUp(100, 1600, statsVisible)
  const cPreco   = useCountUp(29, 1800, statsVisible)

  return (
    <div style={{
      background: BG, color: TW,
      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
      overflowX: 'hidden',
    }}>
      <FontLoader />

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        ::selection { background: rgba(124,185,114,0.25); }
        @keyframes pulse  { 0%,100%{opacity:.5;transform:scale(1)} 50%{opacity:1;transform:scale(1.1)} }
        @keyframes float  { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-12px)} }
        @keyframes glow   { 0%,100%{box-shadow:0 0 40px rgba(124,185,114,0.18)} 50%{box-shadow:0 0 70px rgba(124,185,114,0.38)} }
        .cta-btn {
          background: ${G}; color: #000; font-weight: 800; text-decoration: none;
          border-radius: 14px; display: inline-flex; align-items: center; justify-content: center;
          transition: transform 0.15s, box-shadow 0.15s, background 0.15s;
        }
        .cta-btn:hover { background: #8dc882; transform: translateY(-2px); box-shadow: 0 8px 32px rgba(124,185,114,0.35); }
        .fcard { transition: transform 0.2s, border-color 0.2s; }
        .fcard:hover { transform: translateY(-3px); border-color: rgba(124,185,114,0.3) !important; }
        @media (max-width: 720px) {
          .hero-grid   { grid-template-columns: 1fr !important; }
          .hero-right  { display: none !important; }
          .chaos-grid  { grid-template-columns: 1fr !important; }
          .chaos-arrow { display: none !important; }
          .ba-grid     { grid-template-columns: 1fr !important; }
          .mod-grid    { grid-template-columns: repeat(2, 1fr) !important; }
          .carousel-inner { flex-direction: column !important; }
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{
        position: 'sticky', top: 0, zIndex: 100,
        background: 'rgba(9,16,10,0.92)', backdropFilter: 'blur(20px)',
        borderBottom: `1px solid ${BORDER}`, padding: '0 24px',
      }}>
        <div style={{
          maxWidth: 960, margin: '0 auto',
          display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 60,
        }}>
          <div style={{ fontSize: 17, fontWeight: 800, color: TW, letterSpacing: -0.3 }}>
            Personal<span style={{ color: G }}>Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <Link href="/login" style={{ fontSize: 13, color: TG, textDecoration: 'none', fontWeight: 500 }}>
              Entrar
            </Link>
            <Link href="/register" className="cta-btn" style={{ fontSize: 13, padding: '9px 20px' }}>
              Começar grátis
            </Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO / BUYBOX
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '90px 24px 80px', background: BG, position: 'relative', overflow: 'hidden' }}>
        {/* BG glows */}
        <div style={{
          position: 'absolute', top: -200, right: -100, width: 600, height: 600, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,80,43,0.4) 0%, transparent 65%)', pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', bottom: -150, left: -100, width: 400, height: 400, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,80,43,0.2) 0%, transparent 65%)', pointerEvents: 'none',
        }} />

        <div style={{ maxWidth: 960, margin: '0 auto', position: 'relative' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 72, alignItems: 'center' }}>

            {/* Left — copy */}
            <FadeIn>
              {/* Badge */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 8,
                background: `rgba(52,80,43,0.5)`, border: `1px solid rgba(124,185,114,0.3)`,
                borderRadius: 100, padding: '6px 16px', marginBottom: 28,
              }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: G, animation: 'pulse 2.5s infinite' }} />
                <span style={{ fontSize: 12, color: G, fontWeight: 600 }}>Gestão completa para personal trainers</span>
              </div>

              <h1 style={{
                fontSize: 'clamp(38px,5.5vw,64px)', fontWeight: 900,
                lineHeight: 1.06, letterSpacing: -2, color: TW, marginBottom: 22,
              }}>
                Controle total<br />do seu trabalho<br />
                <span style={{ color: G }}>na palma da mão</span>
              </h1>

              <p style={{ fontSize: 17, color: TG, lineHeight: 1.7, marginBottom: 20, maxWidth: 460 }}>
                Alunos, agenda, cobranças e financeiro num só lugar.
                Pare de perder dinheiro por falta de organização.
              </p>

              {/* Price anchor */}
              <div style={{
                display: 'inline-flex', alignItems: 'center', gap: 12,
                background: `rgba(52,80,43,0.3)`, border: `1px solid rgba(124,185,114,0.2)`,
                borderRadius: 12, padding: '12px 20px', marginBottom: 32,
              }}>
                <span style={{ fontSize: 22, fontWeight: 900, color: TW }}>
                  R$29,90<span style={{ fontSize: 14, fontWeight: 500, color: TG }}>/mês</span>
                </span>
                <div style={{ width: 1, height: 22, background: BORDER }} />
                <span style={{ fontSize: 13, color: G, fontWeight: 600 }}>menos de R$1 por dia</span>
              </div>

              {/* 3 main benefits */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 12, marginBottom: 38 }}>
                {[
                  ['Controle financeiro real', 'Saiba quanto lucra, não só quanto fatura'],
                  ['Agenda visual organizada', 'Grade semanal clara, sem conflito de horário'],
                  ['Cálculo automático de aulas', 'Extras e reposições computados sozinhos'],
                ].map(([title, desc], i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                    <div style={{
                      width: 22, height: 22, borderRadius: '50%', flexShrink: 0, marginTop: 1,
                      background: `rgba(52,80,43,0.6)`, border: `1px solid ${G}`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 11, color: G, fontWeight: 800 }}>✓</span>
                    </div>
                    <div>
                      <span style={{ fontSize: 14, fontWeight: 700, color: TW }}>{title}</span>
                      <span style={{ fontSize: 13, color: TG }}> — {desc}</span>
                    </div>
                  </div>
                ))}
              </div>

              {/* CTA */}
              <Link href="/register" className="cta-btn" style={{
                fontSize: 17, padding: '17px 36px', marginBottom: 18,
                animation: 'glow 3s infinite',
              }}>
                Comece grátis por 7 dias →
              </Link>

              {/* Trust */}
              <div style={{ display: 'flex', gap: 20, flexWrap: 'wrap' }}>
                {[['🔒', 'Pagamento seguro'], ['✗', 'Sem fidelidade'], ['✓', 'Cancele quando quiser']].map(([icon, label]) => (
                  <div key={label} style={{ display: 'flex', alignItems: 'center', gap: 5 }}>
                    <span style={{ fontSize: 12 }}>{icon}</span>
                    <span style={{ fontSize: 12, color: TS }}>{label}</span>
                  </div>
                ))}
              </div>
            </FadeIn>

            {/* Right — floating phone */}
            <div className="hero-right" style={{ display: 'flex', justifyContent: 'center' }}>
              <FadeIn delay={200}>
                <div style={{ animation: 'float 6s ease-in-out infinite', position: 'relative' }}>
                  <div style={{
                    position: 'absolute', inset: -50, borderRadius: '50%',
                    background: 'radial-gradient(circle, rgba(52,80,43,0.55) 0%, transparent 70%)',
                    pointerEvents: 'none',
                  }} />
                  <PhoneMockup><ScreenDashboard /></PhoneMockup>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* Stats bar */}
      <div ref={statsRef} style={{
        background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}`,
        padding: '44px 24px',
      }}>
        <div style={{
          maxWidth: 760, margin: '0 auto',
          display: 'flex', justifyContent: 'space-around', flexWrap: 'wrap', gap: 36,
        }}>
          {[
            { val: `${cAlunos}+`, label: 'Alunos em média por personal na plataforma' },
            { val: `${cMobile}%`, label: 'Mobile-first — feito para o celular' },
            { val: `R$${cPreco},90`, label: 'Por mês — menos de R$1 por dia' },
          ].map((s, i) => (
            <div key={i} style={{ textAlign: 'center' }}>
              <div style={{ fontSize: 44, fontWeight: 900, color: G, lineHeight: 1, letterSpacing: -1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: TS, marginTop: 8, maxWidth: 160 }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. DOR DO PERSONAL
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG}>
        <FadeIn>
          <Label>Você se identifica?</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            Você ainda controla seus alunos{' '}
            <span style={{ textDecoration: 'line-through', textDecorationColor: RED, color: TG }}>em planilha?</span>
          </h2>
          <p style={{ fontSize: 17, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 56 }}>
            A maioria dos personais é excelente no treino. O problema está na gestão — e custa dinheiro real.
          </p>
        </FadeIn>

        {/* Caos → Organização */}
        <FadeIn delay={100}>
          <div className="chaos-grid" style={{ display: 'grid', gridTemplateColumns: '1fr auto 1fr', gap: 24, alignItems: 'center', marginBottom: 56 }}>
            {/* Antes */}
            <div style={{ background: 'rgba(224,82,82,0.04)', border: `1px solid rgba(224,82,82,0.15)`, borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: RED, marginBottom: 20 }}>📱 HOJE</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  '📊 Planilha do Excel com fórmulas manuais',
                  '📝 Bloco de notas no celular',
                  '💬 Cobrança pelo WhatsApp quando lembra',
                  '🤯 Fim de mês sem saber quanto ganhou',
                  '😰 Faltas e reposições perdidas',
                ].map((item, i) => (
                  <div key={i} style={{ fontSize: 14, color: TG, lineHeight: 1.5 }}>{item}</div>
                ))}
              </div>
            </div>

            {/* Seta */}
            <div className="chaos-arrow" style={{ textAlign: 'center' }}>
              <div style={{
                fontSize: 24, color: G, background: `rgba(52,80,43,0.4)`, border: `1px solid rgba(124,185,114,0.3)`,
                borderRadius: '50%', width: 52, height: 52, display: 'flex', alignItems: 'center', justifyContent: 'center',
              }}>→</div>
            </div>

            {/* Depois */}
            <div style={{ background: `rgba(52,80,43,0.15)`, border: `1px solid rgba(124,185,114,0.2)`, borderRadius: 16, padding: '28px 24px' }}>
              <div style={{ fontSize: 13, fontWeight: 700, color: G, marginBottom: 20 }}>💪 COM O PERSONALHUB</div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 13 }}>
                {[
                  '📊 Dashboard com faturamento em tempo real',
                  '📅 Agenda visual semana a semana',
                  '💰 Cobranças organizadas por aluno',
                  '✅ Previsão do mês antes de terminar',
                  '🔄 Reposições com prazo e rastreamento',
                ].map((item, i) => (
                  <div key={i} style={{ fontSize: 14, color: TG, lineHeight: 1.5 }}>{item}</div>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>

        {/* Pain cards */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(240px, 1fr))', gap: 14 }}>
          {[
            { icon: '💸', title: 'Dinheiro parado', text: 'Atraso em cobrar = dias sem esse valor na sua conta. Multiplica por 12 meses.' },
            { icon: '📉', title: 'Perda invisível', text: 'Alunos que faltam e você não registra. Reposição que vence sem cobrar.' },
            { icon: '😤', title: 'Estresse desnecessário', text: 'Gerenciar tudo na cabeça gasta energia que deveria ir pro treino.' },
            { icon: '❓', title: 'Fim do mês surpresa', text: 'Trabalhou muito e não sabe quanto sobrou? Isso tem nome: falta de controle.' },
          ].map((card, i) => (
            <FadeIn key={i} delay={i * 70}>
              <div className="fcard" style={{ background: CARD, border: `1px solid ${BORDER}`, borderRadius: 14, padding: '24px 22px' }}>
                <div style={{ fontSize: 28, marginBottom: 12 }}>{card.icon}</div>
                <h3 style={{ fontSize: 15, fontWeight: 700, color: TW, marginBottom: 8 }}>{card.title}</h3>
                <p style={{ fontSize: 13, color: TG, lineHeight: 1.6 }}>{card.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>

        <FadeIn delay={200}>
          <div style={{
            marginTop: 44, background: `rgba(52,80,43,0.2)`,
            border: `1px solid rgba(124,185,114,0.25)`, borderLeft: `4px solid ${G}`,
            borderRadius: 12, padding: '24px 28px',
          }}>
            <p style={{ fontSize: 18, fontWeight: 700, color: TW, lineHeight: 1.5 }}>
              👉 O problema não é falta de aluno.<br />
              <span style={{ color: G }}>É falta de organização — e isso tem solução.</span>
            </p>
          </div>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. BENEFÍCIOS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG2}>
        <FadeIn>
          <Label>Resultados reais</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            Controle total do seu trabalho<br />
            <span style={{ color: G }}>na palma da mão</span>
          </h2>
          <p style={{ fontSize: 17, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 56 }}>
            Não são features técnicas. São transformações que você sente no bolso e na qualidade de vida.
          </p>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            { icon: '💰', tag: 'Financeiro', title: 'Saiba quanto você realmente lucra', text: 'Não só quanto fatura — o PersonalHub separa faturamento de lucro real, incluindo aulas extras, reposições e variações do mês.' },
            { icon: '📅', tag: 'Agenda', title: 'Agenda visual, dia a dia organizado', text: 'Grade semanal completa com todos os alunos por horário. Sem conflito, sem esquecimento, sem aquela sensação de bagunça.' },
            { icon: '🔢', tag: 'Automação', title: 'Cálculos automáticos de aula', text: 'Aulas extras são somadas automaticamente ao valor do mês. Reposições têm prazo e são rastreadas. Nada cai no esquecimento.' },
            { icon: '🔄', tag: 'Faltas', title: 'Reposições facilitadas com prazo', text: 'Cada falta gera uma reposição com data limite e status. Você sabe exatamente quantas estão pendentes, agendadas ou vencidas.' },
            { icon: '📋', tag: 'Termos', title: 'Termos de serviço digitais', text: 'Envie contratos personalizados para seus alunos pelo WhatsApp. Profissionalismo que gera confiança e fecha mais contratos.' },
            { icon: '⏸️', tag: 'Gestão', title: 'Suspensões e atestados sob controle', text: 'Gerencie pausas, atestados e retornos sem perder o histórico. Cada aluno tem seu status claro e atualizado.' },
          ].map((card, i) => (
            <FadeIn key={i} delay={i * 80}>
              <div className="fcard" style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: '28px 24px', height: '100%',
              }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 16 }}>
                  <div style={{
                    width: 50, height: 50, borderRadius: 14,
                    background: `rgba(52,80,43,0.5)`, border: `1px solid rgba(124,185,114,0.15)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 22,
                  }}>{card.icon}</div>
                  <span style={{
                    fontSize: 10, fontWeight: 700, letterSpacing: 1,
                    padding: '4px 10px', borderRadius: 6,
                    background: `rgba(52,80,43,0.4)`, color: G, border: `1px solid rgba(124,185,114,0.2)`,
                  }}>{card.tag}</span>
                </div>
                <h3 style={{ fontSize: 16, fontWeight: 800, color: TW, marginBottom: 10, lineHeight: 1.3 }}>{card.title}</h3>
                <p style={{ fontSize: 14, color: TG, lineHeight: 1.65 }}>{card.text}</p>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. SCREENSHOTS / DEMO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG3}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 60 }}>
          <Label>Veja na prática</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            O app que você vai usar<br />
            <span style={{ color: G }}>todo dia no celular</span>
          </h2>
          <p style={{ fontSize: 17, color: TG, maxWidth: 480, margin: '0 auto', lineHeight: 1.65 }}>
            Navegue pelas principais telas e veja como tudo funciona na prática.
          </p>
        </FadeIn>
        <FadeIn delay={150}><ScreensCarousel /></FadeIn>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. MÓDULOS
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG}>
        <FadeIn>
          <Label>O que está incluído</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            Tudo que o personal trainer<br />
            <span style={{ color: G }}>precisa para trabalhar</span>
          </h2>
          <p style={{ fontSize: 17, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 52 }}>
            Sem funcionalidades inúteis. Só o que você realmente usa todo dia.
          </p>
        </FadeIn>

        <div className="mod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 14 }}>
          {[
            { icon: '🏠', name: 'Dashboard', desc: 'Visão geral do mês: faturamento, alunos e cobranças' },
            { icon: '👥', name: 'Alunos', desc: 'Cadastro completo com horários, valores e histórico' },
            { icon: '📅', name: 'Agenda', desc: 'Grade semanal visual com todos os treinos' },
            { icon: '🔢', name: 'Cálculo Mensal', desc: 'Valor exato de cada aluno incluindo extras' },
            { icon: '💳', name: 'Cobrança', desc: 'Status de pagamento e envio via WhatsApp' },
            { icon: '🔄', name: 'Faltas e Reposições', desc: 'Controle de prazo, status e agendamento' },
            { icon: '📊', name: 'Financeiro', desc: 'Relatório de receitas e visão mensal do negócio' },
            { icon: '📋', name: 'Termos de Serviço', desc: 'Contratos digitais personalizados via WhatsApp' },
            { icon: '⏸️', name: 'Suspensão e Atestado', desc: 'Pausas, retornos e histórico de cada aluno' },
          ].map((mod, i) => (
            <FadeIn key={i} delay={i * 55}>
              <div className="fcard" style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 14, padding: '22px 18px',
              }}>
                <div style={{ fontSize: 26, marginBottom: 10 }}>{mod.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: TW, marginBottom: 6 }}>{mod.name}</div>
                <div style={{ fontSize: 12, color: TG, lineHeight: 1.55 }}>{mod.desc}</div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. SOCIAL PROOF
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG2}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 52 }}>
          <Label>Quem já usa</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>
            O que os personais estão<br />
            <span style={{ color: G }}>falando do PersonalHub</span>
          </h2>
        </FadeIn>

        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
          {[
            {
              text: '"R$29,90. Menos de um real por dia. Não tem como não valer. Antes eu não sabia nem quanto ia faturar no mês. Agora vejo tudo no dashboard."',
              author: 'Personal trainer — Beta tester',
            },
            {
              text: '"O cálculo automático de aulas extras foi o que mais me surpreendeu. Antes eu esquecia de cobrar, agora vem tudo certinho no mês."',
              author: 'Personal trainer — Beta tester',
            },
            {
              text: '"A agenda semanal mudou minha rotina. Consigo ver o dia todo num relance sem precisar ficar abrindo conversas de WhatsApp."',
              author: 'Personal trainer — Beta tester',
            },
          ].map((t, i) => (
            <FadeIn key={i} delay={i * 100}>
              <div style={{
                background: CARD, border: `1px solid ${BORDER}`,
                borderRadius: 16, padding: '28px 24px',
                display: 'flex', flexDirection: 'column', gap: 20,
              }}>
                <div style={{ display: 'flex', gap: 3 }}>
                  {[...Array(5)].map((_, j) => <span key={j} style={{ color: '#f59e0b', fontSize: 14 }}>★</span>)}
                </div>
                <p style={{ fontSize: 15, color: TG, lineHeight: 1.7, fontStyle: 'italic', flex: 1 }}>{t.text}</p>
                <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                  <div style={{
                    width: 36, height: 36, borderRadius: '50%',
                    background: `rgba(52,80,43,0.5)`, border: `1px solid rgba(124,185,114,0.3)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontSize: 12, fontWeight: 700, color: G,
                  }}>PT</div>
                  <span style={{ fontSize: 13, color: TS, fontWeight: 500 }}>{t.author}</span>
                </div>
              </div>
            </FadeIn>
          ))}
        </div>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. COMPARAÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG}>
        <FadeIn>
          <Label>A escolha óbvia</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1, marginBottom: 16 }}>
            PersonalHub vs.<br />
            <span style={{ color: TG }}>planilha e bloco de notas</span>
          </h2>
          <p style={{ fontSize: 17, color: TG, maxWidth: 520, lineHeight: 1.65, marginBottom: 52 }}>
            Compare e veja por que profissionais estão migrando.
          </p>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ overflowX: 'auto', borderRadius: 16, border: `1px solid ${BORDER}` }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
              <thead>
                <tr>
                  <th style={{ padding: '18px 22px', textAlign: 'left', fontSize: 13, color: TS, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, background: BG }}>
                    Funcionalidade
                  </th>
                  <th style={{ padding: '18px 22px', textAlign: 'center', fontSize: 13, color: TS, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, background: BG }}>
                    Planilha / Caderno
                  </th>
                  <th style={{
                    padding: '18px 22px', textAlign: 'center', fontSize: 14, fontWeight: 800,
                    borderBottom: `2px solid ${G}`, color: G, background: `rgba(52,80,43,0.25)`,
                  }}>
                    PersonalHub ✦
                  </th>
                </tr>
              </thead>
              <tbody>
                {[
                  'Dashboard financeiro em tempo real',
                  'Cálculo automático de aulas extras',
                  'Agenda visual por semana',
                  'Controle de faltas e reposições',
                  'Cobranças organizadas por aluno',
                  'Termos de serviço digitais',
                  'Suspensão e atestado com histórico',
                  '100% no celular, sem instalar nada',
                  'Backup automático dos dados',
                  'Notificações e lembretes',
                ].map((feature, i) => (
                  <tr key={i}>
                    <td style={{ padding: '14px 22px', fontSize: 14, color: TG, borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? BG : `${BG2}` }}>
                      {feature}
                    </td>
                    <td style={{ padding: '14px 22px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? BG : `${BG2}` }}>
                      <span style={{ color: RED, fontSize: 18, fontWeight: 700 }}>✗</span>
                    </td>
                    <td style={{ padding: '14px 22px', textAlign: 'center', borderBottom: `1px solid rgba(124,185,114,0.12)`, background: `rgba(52,80,43,0.12)` }}>
                      <span style={{ color: G, fontSize: 18, fontWeight: 700 }}>✓</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          PREÇO
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG2}>
        <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
          <Label>Investimento</Label>
          <h2 style={{ fontSize: 'clamp(30px,4vw,50px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>
            Quanto vale ter controle<br />
            <span style={{ color: G }}>total do seu negócio?</span>
          </h2>
        </FadeIn>

        <FadeIn delay={100}>
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            <div style={{
              background: CARD, border: `1px solid rgba(124,185,114,0.3)`,
              borderRadius: 24, padding: '56px 56px',
              maxWidth: 500, width: '100%', textAlign: 'center',
              boxShadow: `0 0 80px rgba(52,80,43,0.35)`,
              position: 'relative',
            }}>
              <div style={{
                position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)',
                background: G, color: '#000', fontWeight: 800, fontSize: 12, letterSpacing: 1,
                padding: '7px 22px', borderRadius: 100, whiteSpace: 'nowrap',
              }}>
                ✦ ACESSO COMPLETO
              </div>

              <div style={{ marginBottom: 8 }}>
                <span style={{ fontSize: 20, color: TG, fontWeight: 500 }}>R$</span>
                <span style={{ fontSize: 76, fontWeight: 900, color: TW, lineHeight: 1, letterSpacing: -3 }}>29</span>
                <span style={{ fontSize: 34, color: TW, fontWeight: 700 }}>,90</span>
              </div>
              <p style={{ fontSize: 14, color: TS, marginBottom: 14 }}>por mês</p>
              <div style={{
                display: 'inline-block', background: `rgba(52,80,43,0.4)`,
                border: `1px solid rgba(124,185,114,0.25)`,
                borderRadius: 8, padding: '7px 18px', marginBottom: 44,
              }}>
                <span style={{ fontSize: 14, color: G, fontWeight: 600 }}>= menos de R$1,00 por dia</span>
              </div>

              <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 44, textAlign: 'left' }}>
                {[
                  'Alunos ilimitados',
                  'Agenda semanal visual',
                  'Controle de faltas e reposições',
                  'Cálculo automático de aulas',
                  'Relatório financeiro mensal',
                  'Cobranças organizadas por aluno',
                  'Termos digitais via WhatsApp',
                  'Suspensão e atestado com histórico',
                  'Suporte incluso',
                ].map((f, i) => (
                  <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                    <div style={{
                      width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                      background: `rgba(52,80,43,0.6)`,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}>
                      <span style={{ fontSize: 10, color: G }}>✓</span>
                    </div>
                    <span style={{ fontSize: 14, color: TG }}>{f}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" className="cta-btn" style={{
                display: 'block', fontSize: 17, padding: '18px',
                marginBottom: 20, boxShadow: '0 0 48px rgba(124,185,114,0.25)',
              }}>
                Comece grátis — 7 dias sem custo
              </Link>

              <div style={{ display: 'flex', justifyContent: 'center', gap: 20, flexWrap: 'wrap' }}>
                {['Sem cartão no trial', 'Sem contrato', 'Cancele quando quiser'].map(t => (
                  <span key={t} style={{ fontSize: 12, color: TS }}>{t}</span>
                ))}
              </div>
            </div>
          </div>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <Section bg={BG}>
        <FadeIn>
          <div style={{ maxWidth: 680, margin: '0 auto' }}>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <Label>Dúvidas frequentes</Label>
              <h2 style={{ fontSize: 'clamp(28px,4vw,46px)', fontWeight: 900, lineHeight: 1.1, letterSpacing: -1 }}>
                Perguntas e <span style={{ color: G }}>respostas</span>
              </h2>
            </div>
            {FAQ.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
          </div>
        </FadeIn>
      </Section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. CTA FINAL
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{
        padding: '120px 24px', background: BG3,
        textAlign: 'center', position: 'relative', overflow: 'hidden',
      }}>
        {/* BG radial */}
        <div style={{
          position: 'absolute', top: '50%', left: '50%',
          transform: 'translate(-50%, -50%)',
          width: 800, height: 800, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(52,80,43,0.45) 0%, transparent 65%)',
          pointerEvents: 'none',
        }} />
        {/* Decorative rings */}
        <div style={{ position: 'absolute', top: 40, right: 60, width: 220, height: 220, borderRadius: '50%', border: `1px solid rgba(124,185,114,0.07)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 80, right: 80, width: 140, height: 140, borderRadius: '50%', border: `1px solid rgba(124,185,114,0.05)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', bottom: 40, left: 60, width: 160, height: 160, borderRadius: '50%', border: `1px solid rgba(124,185,114,0.06)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 640, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <Label>Comece agora</Label>
            <h2 style={{
              fontSize: 'clamp(34px,5vw,58px)', fontWeight: 900,
              lineHeight: 1.06, letterSpacing: -2, marginBottom: 22,
            }}>
              Organize sua rotina.<br />
              <span style={{ color: G }}>Controle seu dinheiro.</span><br />
              Cresça como profissional.
            </h2>
            <p style={{ fontSize: 17, color: TG, lineHeight: 1.7, marginBottom: 48 }}>
              Tenha clareza financeira, agenda organizada e postura profissional.
              Por menos de R$1 por dia.
            </p>

            <Link href="/register" className="cta-btn" style={{
              fontSize: 18, padding: '20px 56px', marginBottom: 24,
              boxShadow: '0 0 60px rgba(124,185,114,0.35)',
            }}>
              Comece agora — 7 dias grátis
            </Link>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
              {['✓ Sem cartão no período de teste', '✓ Cancele quando quiser', '✓ Sem fidelidade'].map(t => (
                <span key={t} style={{ fontSize: 13, color: TS }}>{t}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── FOOTER ────────────────────────────────────────────────────────── */}
      <footer style={{
        borderTop: `1px solid ${BORDER}`, padding: '36px 24px', background: BG,
        display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16,
      }}>
        <div style={{ fontSize: 16, fontWeight: 800, color: TW }}>
          Personal<span style={{ color: G }}>Hub</span>
        </div>
        <div style={{ display: 'flex', gap: 28 }}>
          {[['Entrar', '/login'], ['Cadastrar', '/register']].map(([label, href]) => (
            <Link key={href} href={href} style={{ fontSize: 13, color: TS, textDecoration: 'none' }}>{label}</Link>
          ))}
        </div>
        <p style={{ fontSize: 12, color: TS }}>© {new Date().getFullYear()} PersonalHub</p>
      </footer>
    </div>
  )
}
