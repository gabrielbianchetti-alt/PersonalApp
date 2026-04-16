'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── Tokens ───────────────────────────────────────────────────────────────────
const LIME   = '#C8F169'   // GREEN 2 — lime vibrante, accent principal
const VIVID  = '#78C51C'   // GREEN 3 — verde vívido
const FOREST = '#2A6F2B'   // GREEN 4 — verde floresta
const DEEP   = '#043F2E'   // GREEN 5 — verde escuro profundo
const BG     = '#080808'
const BG2    = '#0e0e0e'
const BG3    = '#111111'
const CARD   = '#141414'
const BORDER = '#222222'
const TW     = '#FFFFFF'
const TG     = '#888888'
const TS     = '#444444'
const RED    = '#FF4444'

// ─── Font ─────────────────────────────────────────────────────────────────────
function FontLoader() {
  useEffect(() => {
    if (document.querySelector('#ph-font')) return
    const l = document.createElement('link')
    l.id = 'ph-font'; l.rel = 'stylesheet'
    l.href = 'https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&display=swap'
    document.head.appendChild(l)
  }, [])
  return null
}

// ─── FadeIn ───────────────────────────────────────────────────────────────────
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

function FadeIn({ children, delay = 0, y = 28, style = {} }: {
  children: React.ReactNode; delay?: number; y?: number; style?: React.CSSProperties
}) {
  const { ref, vis } = useFadeIn()
  return (
    <div ref={ref} style={{
      opacity: vis ? 1 : 0,
      transform: vis ? 'none' : `translateY(${y}px)`,
      transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      ...style,
    }}>{children}</div>
  )
}

// ─── Count-up ─────────────────────────────────────────────────────────────────
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

// ─── Marquee ──────────────────────────────────────────────────────────────────
function Marquee({ dark = false }: { dark?: boolean }) {
  const items = 'Alunos • Agenda • Cálculo Mensal • Cobranças • Financeiro • Faltas e Reposições • Termos de Serviço • Suspensão '
  const repeated = items.repeat(4)
  return (
    <div style={{
      overflow: 'hidden',
      background: dark ? DEEP : LIME,
      padding: '15px 0',
      borderTop: dark ? 'none' : `1px solid ${BORDER}`,
      borderBottom: dark ? 'none' : `1px solid ${BORDER}`,
    }}>
      <div style={{
        display: 'flex', whiteSpace: 'nowrap',
        animation: 'marquee 28s linear infinite',
      }}>
        <span style={{
          fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          textTransform: 'uppercase', color: dark ? LIME : '#000',
          paddingRight: 0,
        }}>{repeated}</span>
        <span style={{
          fontSize: 13, fontWeight: 800, letterSpacing: 1.5,
          textTransform: 'uppercase', color: dark ? LIME : '#000',
        }}>{repeated}</span>
      </div>
    </div>
  )
}

// ─── Phone mockup ─────────────────────────────────────────────────────────────
function PhoneMockup({ children, scale = 1 }: { children: React.ReactNode; scale?: number }) {
  return (
    <div style={{
      width: 260 * scale, minHeight: 520 * scale,
      background: '#050505',
      borderRadius: 44 * scale,
      border: `${8 * scale}px solid #1c1c1c`,
      boxShadow: `0 40px 100px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.03), 0 0 80px rgba(200,241,105,0.08)`,
      overflow: 'hidden', position: 'relative', flexShrink: 0,
    }}>
      <div style={{
        position: 'absolute', top: 12 * scale, left: '50%', transform: 'translateX(-50%)',
        width: 100 * scale, height: 24 * scale, background: '#050505',
        borderRadius: 12 * scale, zIndex: 10, border: '1px solid #1a1a1a',
      }} />
      <div style={{ paddingTop: 48 * scale, height: '100%', overflow: 'hidden' }}>
        {children}
      </div>
    </div>
  )
}

// ─── Screens ──────────────────────────────────────────────────────────────────
function ScreenDashboard() {
  return (
    <div style={{ padding: '12px 14px', background: '#0a0a0a', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 12, fontWeight: 600 }}>Bom dia, Gabriel 👋</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8, marginBottom: 12 }}>
        {[
          { label: 'Faturamento', val: 'R$4.800', color: LIME },
          { label: 'Alunos ativos', val: '18', color: '#60a5fa' },
          { label: 'Recebido', val: 'R$4.160', color: LIME },
          { label: 'Pendente', val: 'R$640', color: '#f59e0b' },
        ].map(s => (
          <div key={s.label} style={{ background: CARD, borderRadius: 10, padding: '10px', border: `1px solid ${BORDER}` }}>
            <div style={{ fontSize: 8.5, color: TS, marginBottom: 3 }}>{s.label}</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: s.color }}>{s.val}</div>
          </div>
        ))}
      </div>
      <div style={{ background: CARD, borderRadius: 10, border: `1px solid ${BORDER}`, overflow: 'hidden' }}>
        <div style={{ padding: '8px 10px', borderBottom: `1px solid ${BORDER}`, fontSize: 8.5, color: TS, fontWeight: 700, letterSpacing: 1 }}>COBRANÇAS DO MÊS</div>
        {[
          { nome: 'Carlos M.', val: 'R$320', ok: true },
          { nome: 'Ana F.', val: 'R$280', ok: true },
          { nome: 'Bruno C.', val: 'R$350', ok: false },
          { nome: 'Larissa N.', val: 'R$300', ok: true },
        ].map(a => (
          <div key={a.nome} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 10px', borderBottom: `1px solid #111` }}>
            <span style={{ fontSize: 11, color: TW, fontWeight: 500 }}>{a.nome}</span>
            <div style={{ display: 'flex', gap: 6, alignItems: 'center' }}>
              <span style={{ fontSize: 11, fontWeight: 700, color: TW }}>{a.val}</span>
              <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: a.ok ? `${LIME}18` : `${RED}18`, color: a.ok ? LIME : RED }}>{a.ok ? 'Pago' : 'Pend.'}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenFinanceiro() {
  return (
    <div style={{ padding: '12px 14px', background: '#0a0a0a', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Cálculo Mensal</div>
      <div style={{ background: CARD, borderRadius: 10, padding: '10px 12px', border: `1px solid ${BORDER}`, marginBottom: 12, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <span style={{ fontSize: 11, color: TG }}>Abril 2026</span>
        <span style={{ fontSize: 14, fontWeight: 900, color: TW }}>R$ 4.800</span>
      </div>
      {[
        { label: 'Mensalidades', val: 'R$3.840', pct: 80, color: LIME },
        { label: 'Aulas avulsas', val: 'R$640', pct: 13, color: '#60a5fa' },
        { label: 'Reposições', val: 'R$320', pct: 7, color: '#a78bfa' },
      ].map(r => (
        <div key={r.label} style={{ marginBottom: 10 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 9.5, color: TG }}>{r.label}</span>
            <span style={{ fontSize: 10, fontWeight: 700, color: r.color }}>{r.val}</span>
          </div>
          <div style={{ height: 5, background: '#1a1a1a', borderRadius: 3 }}>
            <div style={{ height: '100%', width: `${r.pct}%`, background: r.color, borderRadius: 3 }} />
          </div>
        </div>
      ))}
      <div style={{ background: `${LIME}0f`, borderRadius: 10, border: `1px solid ${LIME}22`, padding: '10px 12px', marginTop: 12 }}>
        <div style={{ fontSize: 8.5, color: LIME, fontWeight: 700, marginBottom: 6 }}>EXTRAS COMPUTADOS</div>
        {[{ aluno: 'Carlos M.', aulas: '+2 aulas', val: '+R$80' }, { aluno: 'Ana F.', aulas: '+1 aula', val: '+R$40' }].map(e => (
          <div key={e.aluno} style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4 }}>
            <span style={{ fontSize: 10, color: TG }}>{e.aluno} <span style={{ color: '#60a5fa' }}>{e.aulas}</span></span>
            <span style={{ fontSize: 10, fontWeight: 700, color: LIME }}>{e.val}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

function ScreenAgenda() {
  return (
    <div style={{ padding: '12px 14px', background: '#0a0a0a', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Agenda da Semana</div>
      <div style={{ display: 'flex', gap: 4, marginBottom: 12 }}>
        {['S', 'T', 'Q', 'Q', 'S'].map((d, i) => (
          <div key={i} style={{ flex: 1, textAlign: 'center', padding: '5px 0', borderRadius: 8, background: i === 1 ? FOREST : CARD, border: `1px solid ${i === 1 ? LIME : BORDER}` }}>
            <div style={{ fontSize: 8, color: i === 1 ? LIME : TS }}>{d}</div>
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
        <div key={ev.hora} style={{ display: 'flex', gap: 8, alignItems: 'center', padding: '7px 8px', borderRadius: 8, marginBottom: 4, background: CARD, border: `1px solid ${BORDER}` }}>
          <span style={{ fontSize: 9.5, fontWeight: 800, color: LIME, minWidth: 38 }}>{ev.hora}</span>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 10.5, color: TW, fontWeight: 600 }}>{ev.nome}</div>
            <div style={{ fontSize: 9, color: TS }}>{ev.local}</div>
          </div>
          <div style={{ width: 6, height: 6, borderRadius: '50%', background: LIME }} />
        </div>
      ))}
    </div>
  )
}

function ScreenReposicoes() {
  return (
    <div style={{ padding: '12px 14px', background: '#0a0a0a', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Faltas e Reposições</div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 6, marginBottom: 12 }}>
        {[{ label: 'Pendentes', val: '3', color: '#f59e0b' }, { label: 'Agendadas', val: '2', color: '#60a5fa' }, { label: 'Vencidas', val: '1', color: RED }].map(s => (
          <div key={s.label} style={{ background: CARD, borderRadius: 8, padding: '8px', border: `1px solid ${BORDER}`, textAlign: 'center' }}>
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
        <div key={f.aluno} style={{ background: CARD, borderRadius: 8, padding: '9px 10px', border: `1px solid ${BORDER}`, marginBottom: 6 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 3 }}>
            <span style={{ fontSize: 11, fontWeight: 600, color: TW }}>{f.aluno}</span>
            <span style={{ fontSize: 8, fontWeight: 700, padding: '1px 6px', borderRadius: 10, background: `${f.sc}18`, color: f.sc }}>{f.status}</span>
          </div>
          <div style={{ fontSize: 9, color: TS }}>Falta: {f.data} · Prazo: {f.prazo}</div>
        </div>
      ))}
    </div>
  )
}

function ScreenAlunos() {
  return (
    <div style={{ padding: '12px 14px', background: '#0a0a0a', minHeight: 480 }}>
      <div style={{ fontSize: 10, color: TS, marginBottom: 14, fontWeight: 600 }}>Meus Alunos</div>
      {[
        { nome: 'Carlos Mendes', dias: 'Seg/Qua/Sex', valor: 'R$320/mês', ok: true },
        { nome: 'Ana Ferreira', dias: 'Ter/Qui', valor: 'R$280/mês', ok: true },
        { nome: 'Bruno Costa', dias: 'Seg/Sex', valor: 'R$350/mês', ok: false },
        { nome: 'Larissa Nunes', dias: 'Ter/Qui', valor: 'R$300/mês', ok: true },
        { nome: 'Rodrigo Pinto', dias: 'Qua/Sex', valor: 'R$280/mês', ok: true },
      ].map(a => (
        <div key={a.nome} style={{ background: CARD, borderRadius: 10, padding: '10px 11px', border: `1px solid ${BORDER}`, marginBottom: 6, display: 'flex', alignItems: 'center', gap: 9 }}>
          <div style={{
            width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
            background: a.ok ? `${LIME}18` : `${RED}15`,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 9.5, fontWeight: 700, color: a.ok ? LIME : RED,
          }}>
            {a.nome.split(' ').map(n => n[0]).join('').slice(0, 2)}
          </div>
          <div style={{ flex: 1 }}>
            <div style={{ fontSize: 11, fontWeight: 600, color: TW }}>{a.nome}</div>
            <div style={{ fontSize: 9, color: TS }}>{a.dias} · {a.valor}</div>
          </div>
          <span style={{ fontSize: 8, fontWeight: 700, padding: '2px 6px', borderRadius: 10, background: a.ok ? `${LIME}12` : `${RED}12`, color: a.ok ? LIME : RED }}>{a.ok ? 'Ativo' : 'Pausado'}</span>
        </div>
      ))}
    </div>
  )
}

// ─── Carousel ─────────────────────────────────────────────────────────────────
const SLIDES = [
  { title: 'Dashboard completo', desc: 'Faturamento, alunos ativos e cobranças do mês numa tela só', screen: <ScreenDashboard /> },
  { title: 'Cálculo automático', desc: 'Aulas extras somadas automaticamente. Sem planilha, sem erro', screen: <ScreenFinanceiro /> },
  { title: 'Agenda semanal', desc: 'Todos os alunos por horário, dia a dia sem confusão', screen: <ScreenAgenda /> },
  { title: 'Faltas e reposições', desc: 'Prazo, status e rastreamento de cada reposição', screen: <ScreenReposicoes /> },
  { title: 'Gestão de alunos', desc: 'Ficha completa: dias, valor, status e histórico', screen: <ScreenAlunos /> },
]

function Carousel() {
  const [active, setActive] = useState(0)
  const [fading, setFading] = useState(false)
  function go(n: number) {
    if (fading) return
    setFading(true)
    setTimeout(() => { setActive(n); setFading(false) }, 220)
  }
  const item = SLIDES[active]
  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 48 }}>
      <div className="carousel-wrap" style={{ display: 'flex', gap: 72, alignItems: 'center', flexWrap: 'wrap', justifyContent: 'center' }}>
        {/* Phone */}
        <div style={{ position: 'relative' }}>
          <div style={{
            position: 'absolute', inset: -60, borderRadius: '50%',
            background: `radial-gradient(circle, ${LIME}15 0%, transparent 70%)`,
            pointerEvents: 'none',
          }} />
          <div style={{ opacity: fading ? 0 : 1, transform: fading ? 'scale(0.97)' : 'scale(1)', transition: 'opacity 0.2s, transform 0.2s' }}>
            <PhoneMockup>{item.screen}</PhoneMockup>
          </div>
        </div>
        {/* Copy */}
        <div style={{ maxWidth: 380 }}>
          <div style={{
            display: 'inline-flex', alignItems: 'center', gap: 8,
            background: `${LIME}18`, border: `1px solid ${LIME}44`,
            borderRadius: 100, padding: '5px 16px', marginBottom: 24,
          }}>
            <span style={{ fontSize: 12, color: LIME, fontWeight: 700 }}>{active + 1} / {SLIDES.length}</span>
          </div>
          <h3 style={{
            fontSize: 32, fontWeight: 900, color: TW, letterSpacing: -0.8,
            lineHeight: 1.15, marginBottom: 14,
            opacity: fading ? 0 : 1, transform: fading ? 'translateX(-10px)' : 'none',
            transition: 'opacity 0.2s, transform 0.2s',
          }}>{item.title}</h3>
          <p style={{ fontSize: 16, color: TG, lineHeight: 1.7, opacity: fading ? 0 : 1, transition: 'opacity 0.2s' }}>{item.desc}</p>
          <div style={{ display: 'flex', gap: 12, marginTop: 36 }}>
            <button onClick={() => go((active - 1 + SLIDES.length) % SLIDES.length)} style={{ width: 48, height: 48, borderRadius: '50%', background: CARD, border: `1px solid ${BORDER}`, color: TW, fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', transition: 'border-color 0.2s' }}>←</button>
            <button onClick={() => go((active + 1) % SLIDES.length)} style={{ width: 48, height: 48, borderRadius: '50%', background: LIME, border: `1px solid ${LIME}`, color: '#000', fontSize: 20, cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 800 }}>→</button>
          </div>
        </div>
      </div>
      {/* Dots */}
      <div style={{ display: 'flex', gap: 8 }}>
        {SLIDES.map((_, i) => (
          <button key={i} onClick={() => go(i)} style={{ width: i === active ? 32 : 8, height: 8, borderRadius: 4, border: 'none', cursor: 'pointer', background: i === active ? LIME : BORDER, transition: 'width 0.3s, background 0.3s', padding: 0 }} />
        ))}
      </div>
    </div>
  )
}

// ─── FAQ ──────────────────────────────────────────────────────────────────────
const FAQ = [
  { q: 'Funciona no celular?', a: 'Sim, 100%. O PersonalHub é mobile-first — projetado para ser usado no celular. Funciona em qualquer smartphone, tablet ou computador.' },
  { q: 'Preciso instalar alguma coisa?', a: 'Não. Funciona direto no navegador, sem download. Abriu, usou.' },
  { q: 'Posso cancelar quando quiser?', a: 'Sim. Sem fidelidade, sem multa, sem ligação. Cancela pelo próprio sistema quando quiser.' },
  { q: 'Meus dados ficam seguros?', a: 'Sim. Dados criptografados com backups automáticos diários. Sua base de alunos está protegida.' },
  { q: 'Tem período de teste?', a: 'Sim, 7 dias grátis sem precisar de cartão de crédito.' },
  { q: 'Quantos alunos posso cadastrar?', a: 'Ilimitados. Sem limite de alunos, cobranças ou registros.' },
]

function FAQItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div style={{ borderBottom: `1px solid ${BORDER}` }}>
      <button onClick={() => setOpen(o => !o)} style={{ width: '100%', textAlign: 'left', padding: '24px 0', background: 'none', border: 'none', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 16 }}>
        <span style={{ fontSize: 17, fontWeight: 600, color: TW, lineHeight: 1.4 }}>{q}</span>
        <span style={{
          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
          background: open ? LIME : CARD, border: `1px solid ${open ? LIME : BORDER}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          color: open ? '#000' : TG, fontSize: 20, fontWeight: 300,
          transition: 'all 0.2s', transform: open ? 'rotate(45deg)' : 'none',
        }}>+</span>
      </button>
      <div style={{ maxHeight: open ? 200 : 0, overflow: 'hidden', transition: 'max-height 0.35s ease' }}>
        <p style={{ fontSize: 15, color: TG, lineHeight: 1.75, paddingBottom: 24 }}>{a}</p>
      </div>
    </div>
  )
}

// ─── LANDING PAGE ─────────────────────────────────────────────────────────────
export default function LandingPage() {
  const statsRef = useRef<HTMLDivElement>(null)
  const [statsOn, setStatsOn] = useState(false)
  useEffect(() => {
    const el = statsRef.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) setStatsOn(true) }, { threshold: 0.3 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  const c1 = useCountUp(18, 1600, statsOn)
  const c2 = useCountUp(29, 1600, statsOn)
  const c3 = useCountUp(7, 1200, statsOn)
  const c4 = useCountUp(100, 1800, statsOn)

  return (
    <div style={{ background: BG, color: TW, fontFamily: "'Inter', -apple-system, sans-serif", overflowX: 'hidden' }}>
      <FontLoader />
      <style>{`
        *{box-sizing:border-box;margin:0;padding:0;}
        ::selection{background:${LIME}33;}
        @keyframes marquee{0%{transform:translateX(0)}100%{transform:translateX(-50%)}}
        @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-14px)}}
        @keyframes glow{0%,100%{box-shadow:0 0 32px ${LIME}30}50%{box-shadow:0 0 60px ${LIME}55}}
        @keyframes pulse{0%,100%{opacity:.5;transform:scale(1)}50%{opacity:1;transform:scale(1.15)}}
        .btn{background:${LIME};color:#000;font-weight:800;text-decoration:none;border-radius:10px;
             display:inline-flex;align-items:center;justify-content:center;
             transition:transform 0.15s,box-shadow 0.15s,background 0.15s;}
        .btn:hover{background:#d9ff7a;transform:translateY(-2px);box-shadow:0 8px 28px ${LIME}44;}
        .card{background:${CARD};border:1px solid ${BORDER};border-radius:16px;
              transition:border-color 0.2s,transform 0.2s;}
        .card:hover{border-color:${LIME}44;transform:translateY(-3px);}
        @media(max-width:720px){
          .hero-grid{grid-template-columns:1fr!important;}
          .hero-phone{display:none!important;}
          .chaos-grid{grid-template-columns:1fr!important;}
          .chaos-arrow{display:none!important;}
          .mod-grid{grid-template-columns:repeat(2,1fr)!important;}
          .step-grid{grid-template-columns:1fr!important;}
          .carousel-wrap{flex-direction:column!important;}
        }
      `}</style>

      {/* ── NAV ─────────────────────────────────────────────────────────────── */}
      <nav style={{ position: 'sticky', top: 0, zIndex: 100, background: 'rgba(8,8,8,0.95)', backdropFilter: 'blur(20px)', borderBottom: `1px solid ${BORDER}`, padding: '0 24px' }}>
        <div style={{ maxWidth: 1000, margin: '0 auto', display: 'flex', alignItems: 'center', justifyContent: 'space-between', height: 62 }}>
          <div style={{ fontSize: 17, fontWeight: 900, color: TW, letterSpacing: -0.5 }}>
            Personal<span style={{ color: LIME }}>Hub</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Link href="/login" style={{ fontSize: 13, color: TG, textDecoration: 'none', fontWeight: 500 }}>Entrar</Link>
            <Link href="/register" className="btn" style={{ fontSize: 13, padding: '9px 22px' }}>Começar grátis</Link>
          </div>
        </div>
      </nav>

      {/* ══════════════════════════════════════════════════════════════════════
          1. HERO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px 90px', background: BG, position: 'relative', overflow: 'hidden' }}>
        {/* BG decoration */}
        <div style={{ position: 'absolute', top: -300, right: -200, width: 700, height: 700, borderRadius: '50%', background: `radial-gradient(circle, ${LIME}0a 0%, transparent 65%)`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: 200, right: 100, width: 1, height: 300, background: `linear-gradient(to bottom, transparent, ${LIME}22, transparent)`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <div className="hero-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 80, alignItems: 'center' }}>

            {/* Left */}
            <FadeIn>
              {/* Badge */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${LIME}12`, border: `1px solid ${LIME}33`, borderRadius: 100, padding: '6px 16px', marginBottom: 32 }}>
                <div style={{ width: 7, height: 7, borderRadius: '50%', background: LIME, animation: 'pulse 2.5s infinite' }} />
                <span style={{ fontSize: 12, color: LIME, fontWeight: 700, letterSpacing: 0.5 }}>Para personal trainers</span>
              </div>

              <h1 style={{ fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: -3, color: TW, marginBottom: 12 }}>
                Controle total<br />do seu trabalho
              </h1>
              <h1 style={{ fontSize: 'clamp(44px, 6vw, 76px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: -3, marginBottom: 28 }}>
                <span style={{
                  background: LIME, color: '#000',
                  padding: '2px 16px', borderRadius: 8,
                  display: 'inline-block',
                }}>na palma da mão.</span>
              </h1>

              <p style={{ fontSize: 18, color: TG, lineHeight: 1.65, marginBottom: 20, maxWidth: 440 }}>
                Alunos, agenda, cobranças e financeiro num só lugar.
                Pare de perder dinheiro por falta de organização.
              </p>

              {/* Price anchor */}
              <div style={{ display: 'inline-flex', alignItems: 'center', gap: 12, background: BG3, border: `1px solid ${BORDER}`, borderRadius: 12, padding: '12px 20px', marginBottom: 36 }}>
                <span style={{ fontSize: 24, fontWeight: 900, color: TW }}>R$29,90<span style={{ fontSize: 14, fontWeight: 500, color: TG }}>/mês</span></span>
                <div style={{ width: 1, height: 24, background: BORDER }} />
                <span style={{ fontSize: 14, color: LIME, fontWeight: 700 }}>menos de R$1 por dia</span>
              </div>

              {/* CTA */}
              <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap', marginBottom: 28 }}>
                <Link href="/register" className="btn" style={{ fontSize: 16, padding: '16px 36px', animation: 'glow 3s infinite' }}>
                  Comece grátis por 7 dias →
                </Link>
                <Link href="/login" style={{ fontSize: 15, color: TG, textDecoration: 'none', display: 'flex', alignItems: 'center', padding: '16px 0', fontWeight: 500 }}>
                  Já tenho conta
                </Link>
              </div>

              {/* Trust */}
              <div style={{ display: 'flex', gap: 22, flexWrap: 'wrap' }}>
                {['🔒 Pagamento seguro', '✗ Sem fidelidade', '✓ Cancele quando quiser'].map(t => (
                  <span key={t} style={{ fontSize: 12, color: TS }}>{t}</span>
                ))}
              </div>
            </FadeIn>

            {/* Right — phone */}
            <div className="hero-phone" style={{ display: 'flex', justifyContent: 'center' }}>
              <FadeIn delay={180}>
                <div style={{ animation: 'float 5.5s ease-in-out infinite', position: 'relative' }}>
                  <div style={{ position: 'absolute', inset: -80, borderRadius: '50%', background: `radial-gradient(circle, ${LIME}12 0%, transparent 65%)`, pointerEvents: 'none' }} />
                  <PhoneMockup><ScreenDashboard /></PhoneMockup>
                </div>
              </FadeIn>
            </div>
          </div>
        </div>
      </section>

      {/* ── MARQUEE ─────────────────────────────────────────────────────────── */}
      <Marquee />

      {/* ── STATS ───────────────────────────────────────────────────────────── */}
      <div ref={statsRef} style={{ background: BG2, padding: '60px 24px', borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 900, margin: '0 auto', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 24, textAlign: 'center' }}>
          {[
            { val: `${c1}+`, label: 'Alunos em média\npor personal' },
            { val: `R$${c2},90`, label: 'Por mês — menos\nde R$1 por dia' },
            { val: `${c3} dias`, label: 'Grátis para\nexperimentar' },
            { val: `${c4}%`, label: 'Mobile-first\nfeito pro celular' },
          ].map((s, i) => (
            <div key={i}>
              <div style={{ fontSize: 'clamp(32px,4vw,52px)', fontWeight: 900, color: LIME, letterSpacing: -2, lineHeight: 1 }}>{s.val}</div>
              <div style={{ fontSize: 12, color: TS, marginTop: 10, lineHeight: 1.5, whiteSpace: 'pre-line' }}>{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ══════════════════════════════════════════════════════════════════════
          2. DOR
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Você se identifica?</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,64px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2.5, marginBottom: 16 }}>
              Você ainda controla<br />
              seus alunos em{' '}
              <span style={{ WebkitTextStroke: `2px ${LIME}`, color: 'transparent' }}>planilha?</span>
            </h2>
            <p style={{ fontSize: 17, color: TG, maxWidth: 500, lineHeight: 1.65, marginBottom: 64 }}>
              A maioria dos personais é excelente no treino. O problema está na gestão — e isso custa dinheiro real todo mês.
            </p>
          </FadeIn>

          {/* Antes → Depois */}
          <FadeIn delay={100}>
            <div className="chaos-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 80px 1fr', gap: 0, alignItems: 'stretch', marginBottom: 64 }}>
              {/* Antes */}
              <div style={{ background: BG3, border: `1px solid ${BORDER}`, borderRight: 'none', borderRadius: '16px 0 0 16px', padding: '36px 32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${RED}12`, border: `1px solid ${RED}33`, borderRadius: 8, padding: '6px 14px', marginBottom: 28 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: RED, letterSpacing: 1 }}>ANTES</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['📊 Planilha do Excel com fórmulas manuais', '📝 Bloco de notas no celular', '💬 Cobrança pelo WhatsApp quando lembra', '🤯 Fim do mês sem saber o quanto ganhou', '😰 Faltas e reposições perdidas no esquecimento'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: RED, flexShrink: 0, marginTop: 1, fontSize: 14 }}>✗</span>
                      <span style={{ fontSize: 14, color: TG, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>

              {/* Seta central */}
              <div className="chaos-arrow" style={{ background: `${LIME}0a`, border: `1px solid ${BORDER}`, borderLeft: 'none', borderRight: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <div style={{ background: LIME, borderRadius: '50%', width: 40, height: 40, display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#000', fontSize: 18, fontWeight: 900 }}>→</div>
              </div>

              {/* Depois */}
              <div style={{ background: `${LIME}08`, border: `1px solid ${LIME}22`, borderLeft: 'none', borderRadius: '0 16px 16px 0', padding: '36px 32px' }}>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: 8, background: `${LIME}15`, border: `1px solid ${LIME}44`, borderRadius: 8, padding: '6px 14px', marginBottom: 28 }}>
                  <span style={{ fontSize: 12, fontWeight: 800, color: LIME, letterSpacing: 1 }}>COM O PERSONALHUB</span>
                </div>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                  {['📊 Dashboard com faturamento em tempo real', '📅 Agenda visual semana a semana', '💰 Cobranças organizadas e no prazo', '✅ Previsão do mês antes de terminar', '🔄 Reposições com prazo e rastreamento'].map((item, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'flex-start' }}>
                      <span style={{ color: LIME, flexShrink: 0, marginTop: 1, fontSize: 14 }}>✓</span>
                      <span style={{ fontSize: 14, color: TG, lineHeight: 1.5 }}>{item}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </FadeIn>

          {/* Pain cards */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: 16 }}>
            {[
              { icon: '💸', title: 'Dinheiro parado', text: 'Cada dia de atraso na cobrança é dinheiro fora da sua conta. Multiplica por 12 meses.' },
              { icon: '📉', title: 'Perda invisível', text: 'Reposições que vencem sem você perceber. Aulas extras que você esquece de cobrar.' },
              { icon: '😤', title: 'Estresse diário', text: 'Gerenciar tudo na cabeça consome energia que deveria ir pro treino dos seus alunos.' },
              { icon: '❓', title: 'Surpresa todo mês', text: 'Trabalhou muito e no fim não sabe quanto sobrou. Isso tem solução — e é simples.' },
            ].map((c, i) => (
              <FadeIn key={i} delay={i * 70}>
                <div className="card" style={{ padding: '28px 24px' }}>
                  <div style={{ fontSize: 32, marginBottom: 14 }}>{c.icon}</div>
                  <h3 style={{ fontSize: 16, fontWeight: 800, color: TW, marginBottom: 8 }}>{c.title}</h3>
                  <p style={{ fontSize: 13, color: TG, lineHeight: 1.65 }}>{c.text}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          3. PROCESSO — Numbered steps
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>O que muda</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 72 }}>
              Controle que você sente<br />
              <span style={{ color: LIME }}>no bolso todo mês</span>
            </h2>
          </FadeIn>

          <div style={{ display: 'flex', flexDirection: 'column' }}>
            {[
              {
                num: '01',
                title: 'Saiba exatamente quanto vai faturar',
                desc: 'O dashboard soma todas as cobranças do mês — mensalidades, aulas extras e reposições — e mostra o número real antes do mês terminar. Sem planilha, sem chute.',
              },
              {
                num: '02',
                title: 'Agenda visual, zero confusão',
                desc: 'Cada aluno tem seus dias e horários registrados. A grade semanal mostra tudo em ordem — sem duplos agendamentos, sem esquecer quem vem quando.',
              },
              {
                num: '03',
                title: 'Reposições e faltas sob controle',
                desc: 'Cada falta vira uma reposição com prazo automático. Você acompanha o status de cada uma — pendente, agendada ou vencida — sem precisar lembrar de nada.',
              },
            ].map((step, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 40, alignItems: 'start', padding: '48px 0', borderBottom: i < 2 ? `1px solid ${BORDER}` : 'none' }}
                  className="step-grid"
                >
                  <div style={{
                    fontSize: 'clamp(72px, 10vw, 120px)', fontWeight: 900,
                    lineHeight: 0.85, letterSpacing: -4,
                    WebkitTextStroke: `2px ${LIME}`,
                    color: 'transparent', userSelect: 'none', flexShrink: 0,
                  }}>{step.num}</div>
                  <div style={{ paddingTop: 16 }}>
                    <h3 style={{ fontSize: 'clamp(20px,2.5vw,28px)', fontWeight: 800, color: TW, marginBottom: 14, lineHeight: 1.2 }}>{step.title}</h3>
                    <p style={{ fontSize: 16, color: TG, lineHeight: 1.75, maxWidth: 560 }}>{step.desc}</p>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          4. DEMO / SCREENSHOTS
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 64 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Veja na prática</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
              O app que você usa<br />
              <span style={{ color: LIME }}>todo dia no celular</span>
            </h2>
          </FadeIn>
          <FadeIn delay={150}><Carousel /></FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          5. MÓDULOS
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>O que está incluído</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 16 }}>
              Tudo que você precisa.<br />
              <span style={{ color: LIME }}>Nada que você não usa.</span>
            </h2>
            <p style={{ fontSize: 17, color: TG, maxWidth: 480, lineHeight: 1.65, marginBottom: 56 }}>
              9 módulos construídos especificamente para a rotina do personal trainer.
            </p>
          </FadeIn>

          <div className="mod-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 2 }}>
            {[
              { icon: '🏠', name: 'Dashboard', desc: 'Visão geral: faturamento, alunos e cobranças do mês' },
              { icon: '👥', name: 'Alunos', desc: 'Cadastro completo com horários, valores e histórico' },
              { icon: '📅', name: 'Agenda', desc: 'Grade semanal visual com todos os treinos' },
              { icon: '🔢', name: 'Cálculo Mensal', desc: 'Valor exato de cada aluno incluindo aulas extras' },
              { icon: '💳', name: 'Cobrança', desc: 'Status de pagamento e envio de cobranças via WhatsApp' },
              { icon: '🔄', name: 'Faltas e Reposições', desc: 'Controle de prazo, status e agendamento' },
              { icon: '📊', name: 'Financeiro', desc: 'Relatório de receitas e visão mensal do negócio' },
              { icon: '📋', name: 'Termos de Serviço', desc: 'Contratos digitais personalizados via WhatsApp' },
              { icon: '⏸️', name: 'Suspensão e Atestado', desc: 'Pausas, retornos e histórico de cada aluno' },
            ].map((mod, i) => (
              <FadeIn key={i} delay={i * 50}>
                <div style={{
                  background: i % 2 === 0 ? CARD : BG3,
                  border: `1px solid ${BORDER}`,
                  padding: '28px 24px',
                  transition: 'background 0.2s, border-color 0.2s',
                  cursor: 'default',
                }}
                  onMouseEnter={e => { (e.currentTarget as HTMLDivElement).style.borderColor = `${LIME}44` }}
                  onMouseLeave={e => { (e.currentTarget as HTMLDivElement).style.borderColor = BORDER }}
                >
                  <div style={{ fontSize: 28, marginBottom: 12 }}>{mod.icon}</div>
                  <div style={{ fontSize: 15, fontWeight: 800, color: TW, marginBottom: 6 }}>{mod.name}</div>
                  <div style={{ fontSize: 13, color: TG, lineHeight: 1.55 }}>{mod.desc}</div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          6. SOCIAL PROOF
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn style={{ marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Quem já usa</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
              O que dizem os<br />
              <span style={{ color: LIME }}>beta testers</span>
            </h2>
          </FadeIn>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: 16 }}>
            {[
              { text: '"R$29,90. Menos de um real por dia. Antes eu não sabia nem quanto ia faturar no mês. Agora vejo tudo no dashboard."' },
              { text: '"O cálculo automático de aulas extras foi o que mais me surpreendeu. Antes eu esquecia de cobrar, agora vem tudo certinho."' },
              { text: '"A agenda semanal mudou minha rotina. Consigo ver o dia todo num relance sem ficar abrindo conversas de WhatsApp."' },
            ].map((t, i) => (
              <FadeIn key={i} delay={i * 100}>
                <div className="card" style={{ padding: '32px 28px' }}>
                  <div style={{ display: 'flex', gap: 3, marginBottom: 20 }}>
                    {[...Array(5)].map((_, j) => <span key={j} style={{ color: LIME, fontSize: 15 }}>★</span>)}
                  </div>
                  <p style={{ fontSize: 16, color: TW, lineHeight: 1.75, fontStyle: 'italic', marginBottom: 28 }}>{t.text}</p>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                    <div style={{ width: 40, height: 40, borderRadius: '50%', background: `${LIME}15`, border: `1px solid ${LIME}33`, display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 13, fontWeight: 800, color: LIME }}>PT</div>
                    <span style={{ fontSize: 13, color: TS }}>Personal trainer — Beta tester</span>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          7. COMPARAÇÃO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>A escolha óbvia</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2, marginBottom: 56 }}>
              PersonalHub vs.<br />
              <span style={{ WebkitTextStroke: `1.5px ${TG}`, color: 'transparent' }}>planilha e caderno</span>
            </h2>
          </FadeIn>

          <FadeIn delay={100}>
            <div style={{ overflowX: 'auto', borderRadius: 16, border: `1px solid ${BORDER}` }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: 500 }}>
                <thead>
                  <tr>
                    <th style={{ padding: '20px 24px', textAlign: 'left', fontSize: 13, color: TS, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, background: BG3 }}>Funcionalidade</th>
                    <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: 13, color: TS, fontWeight: 600, borderBottom: `1px solid ${BORDER}`, background: BG3 }}>Planilha / Caderno</th>
                    <th style={{ padding: '20px 24px', textAlign: 'center', fontSize: 14, fontWeight: 900, borderBottom: `2px solid ${LIME}`, color: LIME, background: `${LIME}0a` }}>PersonalHub ✦</th>
                  </tr>
                </thead>
                <tbody>
                  {[
                    'Dashboard financeiro em tempo real',
                    'Cálculo automático de aulas extras',
                    'Agenda visual por semana',
                    'Controle de faltas e reposições com prazo',
                    'Cobranças organizadas por aluno',
                    'Termos de serviço digitais',
                    'Suspensão e atestado com histórico',
                    '100% no celular, sem instalar nada',
                    'Backup automático dos dados',
                  ].map((feature, i) => (
                    <tr key={i}>
                      <td style={{ padding: '16px 24px', fontSize: 14, color: TG, borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? BG : BG2 }}>{feature}</td>
                      <td style={{ padding: '16px 24px', textAlign: 'center', borderBottom: `1px solid ${BORDER}`, background: i % 2 === 0 ? BG : BG2 }}>
                        <span style={{ color: RED, fontSize: 20, fontWeight: 700 }}>✗</span>
                      </td>
                      <td style={{ padding: '16px 24px', textAlign: 'center', borderBottom: `1px solid ${LIME}12`, background: `${LIME}06` }}>
                        <span style={{ color: LIME, fontSize: 20, fontWeight: 700 }}>✓</span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          PREÇO
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG }}>
        <div style={{ maxWidth: 1000, margin: '0 auto' }}>
          <FadeIn style={{ textAlign: 'center', marginBottom: 56 }}>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Investimento</p>
            <h2 style={{ fontSize: 'clamp(36px,5vw,60px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
              Quanto vale ter controle<br />
              <span style={{ color: LIME }}>total do seu negócio?</span>
            </h2>
          </FadeIn>

          <FadeIn delay={100}>
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <div style={{ background: CARD, border: `1px solid ${LIME}33`, borderRadius: 24, padding: '56px', maxWidth: 520, width: '100%', textAlign: 'center', position: 'relative', boxShadow: `0 0 80px ${LIME}0f` }}>
                <div style={{ position: 'absolute', top: -18, left: '50%', transform: 'translateX(-50%)', background: LIME, color: '#000', fontWeight: 900, fontSize: 12, letterSpacing: 1.5, padding: '7px 24px', borderRadius: 100, whiteSpace: 'nowrap' }}>
                  ✦ ACESSO COMPLETO
                </div>

                <div style={{ marginBottom: 8 }}>
                  <span style={{ fontSize: 20, color: TG }}>R$</span>
                  <span style={{ fontSize: 80, fontWeight: 900, color: TW, lineHeight: 1, letterSpacing: -4 }}>29</span>
                  <span style={{ fontSize: 36, color: TW, fontWeight: 700 }}>,90</span>
                </div>
                <p style={{ fontSize: 14, color: TS, marginBottom: 14 }}>por mês</p>
                <div style={{ display: 'inline-block', background: `${LIME}15`, border: `1px solid ${LIME}33`, borderRadius: 8, padding: '7px 20px', marginBottom: 44 }}>
                  <span style={{ fontSize: 14, color: LIME, fontWeight: 700 }}>= menos de R$1,00 por dia</span>
                </div>

                <div style={{ display: 'flex', flexDirection: 'column', gap: 14, marginBottom: 44, textAlign: 'left' }}>
                  {['Alunos ilimitados', 'Agenda semanal visual', 'Controle de faltas e reposições', 'Cálculo automático de aulas', 'Relatório financeiro mensal', 'Cobranças organizadas por aluno', 'Termos digitais via WhatsApp', 'Suspensão e atestado com histórico', 'Suporte incluso'].map((f, i) => (
                    <div key={i} style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                      <div style={{ width: 20, height: 20, borderRadius: '50%', flexShrink: 0, background: `${LIME}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <span style={{ fontSize: 10, color: LIME }}>✓</span>
                      </div>
                      <span style={{ fontSize: 14, color: TG }}>{f}</span>
                    </div>
                  ))}
                </div>

                <Link href="/register" className="btn" style={{ display: 'block', fontSize: 17, padding: '18px', marginBottom: 20, boxShadow: `0 0 40px ${LIME}22` }}>
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
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          8. FAQ
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '100px 24px', background: BG2, borderTop: `1px solid ${BORDER}`, borderBottom: `1px solid ${BORDER}` }}>
        <div style={{ maxWidth: 680, margin: '0 auto' }}>
          <FadeIn>
            <div style={{ textAlign: 'center', marginBottom: 56 }}>
              <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 20 }}>Dúvidas</p>
              <h2 style={{ fontSize: 'clamp(36px,5vw,56px)', fontWeight: 900, lineHeight: 1.05, letterSpacing: -2 }}>
                Perguntas<br /><span style={{ color: LIME }}>e respostas</span>
              </h2>
            </div>
            {FAQ.map((item, i) => <FAQItem key={i} q={item.q} a={item.a} />)}
          </FadeIn>
        </div>
      </section>

      {/* ══════════════════════════════════════════════════════════════════════
          9. CTA FINAL
      ══════════════════════════════════════════════════════════════════════ */}
      <section style={{ padding: '120px 24px', background: DEEP, textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
        {/* Geometric rings */}
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 600, height: 600, borderRadius: '50%', border: `1px solid ${LIME}12`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 400, height: 400, borderRadius: '50%', border: `1px solid ${LIME}18`, pointerEvents: 'none' }} />
        <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%,-50%)', width: 200, height: 200, borderRadius: '50%', border: `1px solid ${LIME}22`, pointerEvents: 'none' }} />

        <div style={{ maxWidth: 680, margin: '0 auto', position: 'relative' }}>
          <FadeIn>
            <p style={{ fontSize: 11, fontWeight: 700, color: LIME, letterSpacing: 2.5, textTransform: 'uppercase', marginBottom: 24 }}>Comece agora</p>
            <h2 style={{ fontSize: 'clamp(40px,6vw,72px)', fontWeight: 900, lineHeight: 1.02, letterSpacing: -3, color: TW, marginBottom: 24 }}>
              Organize sua rotina.<br />
              <span style={{ color: LIME }}>Controle seu dinheiro.</span><br />
              Cresça como profissional.
            </h2>
            <p style={{ fontSize: 17, color: `${TW}99`, lineHeight: 1.7, marginBottom: 52 }}>
              Tenha clareza financeira, agenda organizada e postura profissional.<br />Por menos de R$1 por dia.
            </p>

            <Link href="/register" className="btn" style={{ fontSize: 18, padding: '20px 60px', marginBottom: 24, boxShadow: `0 0 60px ${LIME}44` }}>
              Comece agora — 7 dias grátis
            </Link>

            <div style={{ display: 'flex', justifyContent: 'center', gap: 28, flexWrap: 'wrap' }}>
              {['✓ Sem cartão no trial', '✓ Cancele quando quiser', '✓ Sem fidelidade'].map(t => (
                <span key={t} style={{ fontSize: 13, color: `${TW}55` }}>{t}</span>
              ))}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── MARQUEE final ───────────────────────────────────────────────────── */}
      <Marquee dark />

      {/* ── FOOTER ──────────────────────────────────────────────────────────── */}
      <footer style={{ padding: '36px 24px', background: BG, borderTop: `1px solid ${BORDER}`, display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
        <div style={{ fontSize: 16, fontWeight: 900, color: TW }}>
          Personal<span style={{ color: LIME }}>Hub</span>
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
