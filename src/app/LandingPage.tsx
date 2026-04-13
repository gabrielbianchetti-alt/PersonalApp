'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── constants ────────────────────────────────────────────────────────────────

const GREEN  = '#00E676'
const NAVY   = '#0f172a'
const GRAY   = '#6B7280'
const BORDER = '#E5E7EB'
const CARD   = '#ffffff'

// ─── fade-in hook ─────────────────────────────────────────────────────────────

function useFadeIn(threshold = 0.1) {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current; if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold })
    obs.observe(el); return () => obs.disconnect()
  }, [threshold])
  return { ref, visible }
}

function FadeIn({ children, delay = 0, className = '', up = true }: { children: React.ReactNode; delay?: number; className?: string; up?: boolean }) {
  const { ref, visible } = useFadeIn()
  return (
    <div
      ref={ref}
      className={className}
      style={{
        opacity: visible ? 1 : 0,
        transform: visible ? 'none' : up ? 'translateY(32px)' : 'translateY(16px)',
        transition: `opacity 0.65s ease ${delay}ms, transform 0.65s ease ${delay}ms`,
      }}
    >
      {children}
    </div>
  )
}

// ─── scroll helper ────────────────────────────────────────────────────────────

function scrollTo(id: string) {
  const el = document.getElementById(id)
  if (el) { const y = el.getBoundingClientRect().top + window.scrollY - 72; window.scrollTo({ top: y, behavior: 'smooth' }) }
}

// ─── navbar ───────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [open, setOpen] = useState(false)
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 30)
    window.addEventListener('scroll', fn, { passive: true }); return () => window.removeEventListener('scroll', fn)
  }, [])
  const links = [['Funcionalidades','features'],['Preço','pricing'],['FAQ','faq']] as const

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.96)' : 'transparent',
        backdropFilter: scrolled ? 'blur(14px)' : 'none',
        borderBottom: scrolled ? `1px solid ${BORDER}` : 'none',
        transition: 'background 0.2s, border-color 0.2s',
      }}
    >
      <div className="max-w-6xl mx-auto px-5 h-16 flex items-center justify-between">
        {/* logo */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-black text-xs" style={{ background: GREEN, color: '#000' }}>PH</div>
          <span className="font-black text-sm tracking-tight" style={{ color: NAVY }}>PersonalHub</span>
        </div>

        {/* desktop nav */}
        <div className="hidden md:flex items-center gap-7">
          {links.map(([l,id]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium cursor-pointer hover:opacity-70 transition-opacity" style={{ color: GRAY }}>{l}</button>
          ))}
        </div>

        {/* desktop cta */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium hover:opacity-70 transition-opacity" style={{ color: GRAY }}>Entrar</Link>
          <Link
            href="/register"
            className="h-9 px-5 rounded-xl text-sm font-bold transition-all hover:scale-105 hover:shadow-md flex items-center"
            style={{ background: GREEN, color: '#000' }}
          >
            Testar grátis
          </Link>
        </div>

        {/* mobile toggle */}
        <button className="md:hidden p-2 rounded-lg cursor-pointer" onClick={() => setOpen(o => !o)} aria-label="Menu"
          style={{ color: NAVY }}>
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            {open ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></>
                  : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </div>

      {open && (
        <div className="md:hidden flex flex-col gap-1 px-5 pb-5" style={{ background: 'rgba(255,255,255,0.98)', borderBottom: `1px solid ${BORDER}` }}>
          {links.map(([l,id]) => (
            <button key={id} onClick={() => { scrollTo(id); setOpen(false) }} className="text-sm font-medium py-2.5 text-left cursor-pointer" style={{ color: GRAY }}>{l}</button>
          ))}
          <hr style={{ borderColor: BORDER, margin: '4px 0' }} />
          <Link href="/login" className="text-sm font-medium py-2.5" style={{ color: GRAY }}>Entrar</Link>
          <Link href="/register" className="h-11 rounded-xl font-bold text-sm flex items-center justify-center mt-1" style={{ background: GREEN, color: '#000' }}>Testar grátis →</Link>
        </div>
      )}
    </nav>
  )
}

// ─── hero mockup ──────────────────────────────────────────────────────────────

function HeroMockup() {
  return (
    <div className="relative w-full flex items-end justify-center" style={{ height: 320 }} aria-hidden>

      {/* ── laptop ── */}
      <div className="relative" style={{ width: 420, zIndex: 2 }}>
        {/* screen */}
        <div className="rounded-xl overflow-hidden" style={{ background: '#0a0a0a', border: '3px solid #27272a', boxShadow: '0 24px 60px rgba(0,0,0,0.35)' }}>
          {/* browser bar */}
          <div className="flex items-center gap-2 px-3 py-2" style={{ background: '#1c1c1c', borderBottom: '1px solid #2a2a2a' }}>
            <div className="flex gap-1"><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#ef4444' }}/><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#f59e0b' }}/><div className="w-2.5 h-2.5 rounded-full" style={{ background: '#22c55e' }}/></div>
            <div className="flex-1 mx-2 h-5 rounded-md text-center flex items-center justify-center" style={{ background: '#2a2a2a' }}>
              <span style={{ fontSize: 8, color: '#555', fontFamily: 'monospace' }}>personalhub.com.br/dashboard</span>
            </div>
          </div>

          {/* dashboard inside */}
          <div className="flex" style={{ height: 218 }}>
            {/* sidebar */}
            <div className="w-12 flex flex-col items-center py-3 gap-2.5" style={{ background: '#111', borderRight: '1px solid #222' }}>
              <div className="w-7 h-7 rounded-lg flex items-center justify-center font-black" style={{ background: GREEN, color: '#000', fontSize: 8 }}>PH</div>
              {[GREEN,'#333','#333','#333'].map((bg,i) => (
                <div key={i} className="w-7 h-6 rounded-lg" style={{ background: i===0 ? 'rgba(0,230,118,0.15)' : bg, border: i===0 ? '1px solid rgba(0,230,118,0.3)' : 'none' }}/>
              ))}
            </div>

            {/* content */}
            <div className="flex-1 p-3 flex flex-col gap-2.5" style={{ background: '#080808' }}>
              {/* stats */}
              <div className="grid grid-cols-3 gap-2">
                {[['12','Alunos'],['R$ 4.8k','Faturamento'],['R$ 3.1k','Lucro']].map(([v,l]) => (
                  <div key={l} className="rounded-xl p-2" style={{ background: '#141414', border: '1px solid #222' }}>
                    <div className="font-bold" style={{ fontSize: 11, color: GREEN }}>{v}</div>
                    <div style={{ fontSize: 8, color: '#555', marginTop: 1 }}>{l}</div>
                  </div>
                ))}
              </div>
              {/* main row */}
              <div className="flex gap-2 flex-1 min-h-0">
                {/* agenda */}
                <div className="flex-1 rounded-xl p-2.5" style={{ background: '#141414', border: '1px solid #222' }}>
                  <div style={{ fontSize: 8, color: '#888', fontWeight: 600, marginBottom: 5 }}>AGENDA HOJE</div>
                  {[['07:00','João S.',GREEN],['08:30','Maria C.','#40C4FF'],['10:00','Pedro N.','#FFAB00']].map(([h,n,c]) => (
                    <div key={n} className="flex items-center gap-1.5 mb-1.5">
                      <div className="w-1 h-1 rounded-full shrink-0" style={{ background: c }}/>
                      <span style={{ fontSize: 8, color: '#555', width: 22 }}>{h}</span>
                      <span style={{ fontSize: 8, color: '#ddd' }}>{n}</span>
                    </div>
                  ))}
                </div>
                {/* cobrança mini */}
                <div className="flex-1 rounded-xl p-2.5" style={{ background: '#141414', border: '1px solid #222' }}>
                  <div style={{ fontSize: 8, color: '#888', fontWeight: 600, marginBottom: 5 }}>COBRANÇAS</div>
                  {[['João','Pago',GREEN],['Maria','Enviado','#40C4FF'],['Pedro','Pendente','#FFAB00']].map(([n,s,c]) => (
                    <div key={n} className="flex items-center justify-between mb-1.5">
                      <span style={{ fontSize: 8, color: '#ddd' }}>{n}</span>
                      <span style={{ fontSize: 7, color: c, background: c+'20', padding: '1px 4px', borderRadius: 4 }}>{s}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
        {/* base */}
        <div className="mx-auto mt-0 h-3 rounded-b-xl" style={{ background: '#27272a', width: '88%' }}/>
        <div className="mx-auto h-1.5 rounded-b-xl" style={{ background: '#1c1c1c', width: '60%' }}/>
      </div>

      {/* ── phone ── */}
      <div
        className="absolute bottom-0 -right-2 sm:right-4 z-10"
        style={{ width: 100, boxShadow: '0 20px 40px rgba(0,0,0,0.3)' }}
      >
        <div className="rounded-3xl overflow-hidden" style={{ background: '#0a0a0a', border: '2.5px solid #27272a' }}>
          {/* notch */}
          <div className="flex justify-center pt-1.5 pb-1" style={{ background: '#111' }}>
            <div className="w-10 h-1 rounded-full" style={{ background: '#2a2a2a' }}/>
          </div>
          {/* screen */}
          <div className="p-2 flex flex-col gap-1.5" style={{ background: '#080808', minHeight: 168 }}>
            <div className="rounded-xl p-2" style={{ background: '#141414', border: '1px solid #222' }}>
              <div style={{ fontSize: 7, color: '#555' }}>Faturamento</div>
              <div style={{ fontSize: 12, fontWeight: 800, color: GREEN }}>R$ 4.800</div>
            </div>
            <div className="rounded-xl p-2 flex-1" style={{ background: '#141414', border: '1px solid #222' }}>
              <div style={{ fontSize: 7, color: '#555', marginBottom: 4 }}>Próximas aulas</div>
              {['João · 07:00','Maria · 08:30','Pedro · 10:00'].map(t => (
                <div key={t} className="flex items-center gap-1 mb-1">
                  <div className="w-1 h-1 rounded-full shrink-0" style={{ background: GREEN }}/>
                  <span style={{ fontSize: 7, color: '#ccc' }}>{t}</span>
                </div>
              ))}
            </div>
            <div className="rounded-xl p-1.5" style={{ background: '#00E67615', border: '1px solid #00E67630' }}>
              <div style={{ fontSize: 7, color: GREEN, textAlign: 'center', fontWeight: 700 }}>💬 Cobrar agora</div>
            </div>
          </div>
          {/* home indicator */}
          <div className="flex justify-center py-1.5" style={{ background: '#111' }}>
            <div className="w-8 h-0.5 rounded-full" style={{ background: '#333' }}/>
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── feature illustration svgs ────────────────────────────────────────────────

function IlluCobranca() {
  return (
    <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="220" height="160" rx="16" fill="#F0FDF4"/>
      {/* phone */}
      <rect x="65" y="20" width="90" height="120" rx="12" fill="#0f172a"/>
      <rect x="68" y="24" width="84" height="112" rx="10" fill="#1e293b"/>
      <rect x="90" y="26" width="40" height="4" rx="2" fill="#334155"/>
      {/* whatsapp green header */}
      <rect x="68" y="30" width="84" height="24" rx="0" fill="#128C7E"/>
      <text x="110" y="46" textAnchor="middle" fill="white" fontSize="8" fontWeight="700">WhatsApp</text>
      {/* message bubble */}
      <rect x="76" y="60" width="70" height="44" rx="8" fill="#DCF8C6"/>
      <text x="111" y="74" textAnchor="middle" fill="#1a1a1a" fontSize="7" fontWeight="600">Olá João! 👋</text>
      <text x="111" y="85" textAnchor="middle" fill="#555" fontSize="6.5">Cobrança de Abril:</text>
      <text x="111" y="95" textAnchor="middle" fill="#059669" fontSize="8" fontWeight="800">R$ 360,00</text>
      <text x="111" y="105" textAnchor="middle" fill="#777" fontSize="6">Pix: 11 9 9999-0000</text>
      {/* check icon */}
      <circle cx="168" cy="130" r="14" fill={GREEN}/>
      <path d="M162 130 l4 4 l8-8" stroke="#000" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
    </svg>
  )
}

function IlluFinanceiro() {
  return (
    <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="220" height="160" rx="16" fill="#F0FDF4"/>
      {/* card */}
      <rect x="20" y="16" width="180" height="50" rx="12" fill="#0f172a"/>
      <text x="36" y="36" fill="#888" fontSize="7">Lucro Líquido — Abril</text>
      <text x="36" y="55" fill={GREEN} fontSize="20" fontWeight="800">R$ 3.100</text>
      {/* bars */}
      {[[40,90],[60,70],[80,110],[100,80],[120,130],[140,100],[160,140]].map(([x,h],i) => (
        <g key={i}>
          <rect x={x} y={155-h} width="16" height={h} rx="4"
            fill={i===6 ? GREEN : `rgba(0,230,118,${0.25+i*0.07})`}/>
        </g>
      ))}
      {/* labels */}
      <text x="40" y="158" fill="#888" fontSize="6">Jan</text>
      <text x="100" y="158" fill="#888" fontSize="6">Abr</text>
      <text x="157" y="158" fill={GREEN} fontSize="6" fontWeight="700">Atual</text>
    </svg>
  )
}

function IlluAgenda() {
  return (
    <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="220" height="160" rx="16" fill="#F0FDF4"/>
      {/* header */}
      <rect x="16" y="16" width="188" height="22" rx="8" fill="#0f172a"/>
      {['Seg','Ter','Qua','Qui','Sex'].map((d,i) => (
        <text key={d} x={31+i*38} y="31" fill={i===2 ? GREEN : '#888'} fontSize="7" fontWeight={i===2?'700':'400'} textAnchor="middle">{d}</text>
      ))}
      {/* time slots */}
      {[
        [0, '07:00', 'João Silva',    GREEN,    true],
        [1, '07:00', '',              '',       false],
        [2, '07:00', 'Carlos M.',    '#FFAB00', true],
        [0, '08:30', 'Maria Costa',  '#40C4FF', true],
        [2, '08:30', '',              '',       false],
        [3, '08:30', 'Ana Lima',     '#CE93D8', true],
        [1, '10:00', 'Pedro N.',     GREEN,    true],
        [4, '10:00', 'Luiz S.',     '#FFAB00', true],
      ].map(([col, time, name, color, filled], idx) => {
        const row = ['07:00','08:30','10:00'].indexOf(time as string)
        return filled ? (
          <g key={idx}>
            <rect x={16+(col as number)*38} y={46+row*36} width="34" height="30" rx="5" fill={`${color}25`} stroke={color as string} strokeWidth="1"/>
            <text x={33+(col as number)*38} y={63+row*36} fill={color as string} fontSize="6" fontWeight="600" textAnchor="middle">{(name as string).split(' ')[0]}</text>
          </g>
        ) : null
      })}
    </svg>
  )
}

function IlluFaltas() {
  return (
    <svg viewBox="0 0 220 160" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
      <rect width="220" height="160" rx="16" fill="#F0FDF4"/>
      {/* list */}
      {[
        { name: 'João Silva', status: 'Reposta', color: GREEN, bg: '#00E67618' },
        { name: 'Maria Costa', status: 'Crédito', color: '#40C4FF', bg: '#40C4FF18' },
        { name: 'Pedro Nunes', status: 'Pendente', color: '#FFAB00', bg: '#FFAB0018' },
      ].map(({ name, status, color, bg }, i) => (
        <g key={name}>
          <rect x="20" y={24+i*40} width="180" height="32" rx="10" fill={bg} stroke={color} strokeWidth="1" strokeOpacity="0.4"/>
          {/* avatar */}
          <circle cx="42" cy={40+i*40} r="10" fill={color} fillOpacity="0.2"/>
          <text x="42" y={44+i*40} fill={color} fontSize="8" fontWeight="700" textAnchor="middle">{name[0]}</text>
          {/* name + date */}
          <text x="60" y={36+i*40} fill={NAVY} fontSize="8" fontWeight="600">{name}</text>
          <text x="60" y={48+i*40} fill="#888" fontSize="7">Falta em 15/04</text>
          {/* badge */}
          <rect x="148" y={33+i*40} width="44" height="16" rx="8" fill={color+'25'}/>
          <text x="170" y={45+i*40} fill={color} fontSize="7" fontWeight="700" textAnchor="middle">{status}</text>
        </g>
      ))}
    </svg>
  )
}

// ─── testimonial avatar ───────────────────────────────────────────────────────

function Avatar({ initials, color }: { initials: string; color: string }) {
  return (
    <div className="w-12 h-12 rounded-full flex items-center justify-center font-black text-sm shrink-0" style={{ background: color + '20', color, border: `2px solid ${color}30` }}>
      {initials}
    </div>
  )
}

// ─── accordion ────────────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer transition-all"
      style={{ border: `1px solid ${open ? GREEN + '50' : BORDER}`, background: CARD }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between gap-4 px-5 py-4">
        <span className="text-sm font-semibold" style={{ color: NAVY }}>{q}</span>
        <div
          className="w-6 h-6 rounded-full flex items-center justify-center shrink-0 transition-all duration-200"
          style={{ background: open ? GREEN : '#F3F4F6', transform: open ? 'rotate(45deg)' : 'none' }}
        >
          <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke={open ? '#000' : GRAY} strokeWidth="3">
            <line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/>
          </svg>
        </div>
      </div>
      <div
        style={{
          maxHeight: open ? 200 : 0,
          overflow: 'hidden',
          transition: 'max-height 0.3s ease',
        }}
      >
        <p className="px-5 pb-4 text-sm" style={{ color: GRAY, lineHeight: 1.65 }}>{a}</p>
      </div>
    </div>
  )
}

// ─── section label ────────────────────────────────────────────────────────────

function Label({ children }: { children: React.ReactNode }) {
  return (
    <div className="inline-block text-xs font-bold uppercase tracking-widest px-3 py-1 rounded-full mb-3" style={{ background: GREEN + '18', color: '#059669' }}>
      {children}
    </div>
  )
}

function CtaBtn({ href, children, large }: { href: string; children: React.ReactNode; large?: boolean }) {
  return (
    <Link
      href={href}
      className="inline-flex items-center justify-center gap-2 font-bold rounded-2xl transition-all hover:scale-105 hover:shadow-xl"
      style={{
        background: GREEN,
        color: '#000',
        height: large ? 56 : 48,
        padding: large ? '0 36px' : '0 28px',
        fontSize: large ? 16 : 14,
      }}
    >
      {children}
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
    </Link>
  )
}

// ─── main ─────────────────────────────────────────────────────────────────────

export function LandingPage() {
  const faqItems = [
    { q: 'Funciona no celular?', a: 'Sim! O PersonalHub é totalmente responsivo. Acesse pelo navegador do celular — sem instalar nada. A experiência é fluida tanto no iPhone quanto no Android.' },
    { q: 'Preciso instalar algum app?', a: 'Não! É um site que funciona direto no navegador. Abra no Chrome, Safari ou qualquer browser. Sem instalação, sem atualização manual.' },
    { q: 'Como funciona o período grátis?', a: '7 dias com acesso completo a todas as funcionalidades, sem restrição. Não pedimos cartão para ativar o teste. Só começa a cobrar se você optar por continuar.' },
    { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa e sem burocracia. Você cancela pelo próprio painel em 1 clique. Seus dados ficam disponíveis por 30 dias após o cancelamento, caso mude de ideia.' },
    { q: 'Meus dados ficam seguros?', a: 'Sim. Usamos a Supabase para armazenamento, com criptografia em repouso e em trânsito (HTTPS). Nunca vendemos ou compartilhamos seus dados com terceiros.' },
    { q: 'Quantos alunos posso cadastrar?', a: 'Ilimitados. Não existe limite de alunos no PersonalHub Pro. Você pode crescer sua base sem pagar a mais por isso.' },
  ]

  return (
    <div style={{ background: '#FAFAFA', color: NAVY, fontFamily: 'var(--font-geist, system-ui, sans-serif)', overflowX: 'hidden' }}>
      <Navbar />

      {/* ──────────────────── 1. HERO ──────────────────────────────────────── */}
      <section
        className="relative min-h-screen flex flex-col items-center justify-center px-5 pt-24 pb-16 text-center overflow-hidden"
        style={{ background: 'linear-gradient(175deg, #ffffff 0%, #f0fdf8 55%, #FAFAFA 100%)' }}
      >
        {/* bg decoration */}
        <div className="absolute top-20 left-1/2 -translate-x-1/2 rounded-full pointer-events-none" aria-hidden
          style={{ width: 600, height: 600, background: `radial-gradient(circle, ${GREEN}12 0%, transparent 70%)` }}/>

        <FadeIn>
          <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-bold mb-6"
            style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
            🔥 Preço de lançamento por tempo limitado
          </div>
        </FadeIn>

        <FadeIn delay={80}>
          <h1 className="text-4xl sm:text-5xl lg:text-[58px] font-black leading-[1.1] mb-5 max-w-3xl"
            style={{ color: NAVY, letterSpacing: '-0.025em' }}>
            Seus alunos organizados.{' '}
            <span style={{ color: '#059669' }}>Suas cobranças no automático.</span>{' '}
            Seu lucro visível.
          </h1>
        </FadeIn>

        <FadeIn delay={160}>
          <p className="text-lg sm:text-xl mb-8 max-w-xl" style={{ color: GRAY, lineHeight: 1.65 }}>
            O app que substitui suas planilhas, cadernos e mensagens soltas. Tudo que um personal trainer precisa em um só lugar.
          </p>
        </FadeIn>

        <FadeIn delay={240}>
          <div className="flex flex-col items-center gap-2 mb-14">
            <CtaBtn href="/register" large>Testar grátis por 7 dias</CtaBtn>
            <span className="text-xs" style={{ color: '#9CA3AF' }}>Sem cartão de crédito · Cancele quando quiser</span>
          </div>
        </FadeIn>

        <FadeIn delay={320} className="w-full max-w-2xl px-2">
          <HeroMockup />
        </FadeIn>
      </section>

      {/* ──────────────────── 2. TRUST BAR ────────────────────────────────── */}
      <div style={{ background: NAVY, borderTop: '1px solid #1e293b' }}>
        <div className="max-w-4xl mx-auto px-5 py-4 flex flex-wrap items-center justify-center gap-6 sm:gap-10">
          {['✓ Funciona no celular', '✓ Sem instalar nada', '✓ Pronto em 2 minutos', '✓ Suporte por WhatsApp'].map(t => (
            <span key={t} className="text-sm font-semibold" style={{ color: GREEN }}>{t}</span>
          ))}
        </div>
      </div>

      {/* ──────────────────── 3. DOR ───────────────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: '#fff' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <Label>O problema</Label>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.02em' }}>
              Quanto dinheiro você já perdeu por desorganização?
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { emoji: '😰', title: 'Esqueceu de cobrar um aluno e perdeu R$ 150', desc: 'Fim do mês chegou, você não sabe quem pagou, quando pagou e qual era o valor combinado. Começa a embaraçar.' },
              { emoji: '🤷', title: 'Não sabe se está lucrando ou só pagando as contas', desc: 'Fatura R$ 5.000 mas gasta com academia, gasolina e alimentação. O que sobra? Impossível saber sem calcular.' },
              { emoji: '📊', title: 'Perde tempo toda semana montando planilha de aulas', desc: 'Abre o Excel, atualiza à mão, manda por foto no WhatsApp. Cada semana reinventando a roda.' },
            ].map(({ emoji, title, desc }, i) => (
              <FadeIn key={title} delay={i * 100}>
                <div className="rounded-2xl p-6 h-full" style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}>
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="text-sm font-bold mb-2 leading-snug" style={{ color: '#991B1B' }}>{title}</h3>
                  <p className="text-sm" style={{ color: '#B91C1C', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn delay={200} className="text-center mt-10">
            <p className="text-xl font-bold" style={{ color: '#059669' }}>
              ✨ Não precisa ser assim.
            </p>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────── 4. BENEFÍCIOS ───────────────────────────────── */}
      <section id="features" className="py-24 px-5" style={{ background: '#FAFAFA' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-16">
            <Label>Funcionalidades</Label>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.02em' }}>
              Tudo que você precisa.<br/>Nada que você não precisa.
            </h2>
          </FadeIn>

          <div className="flex flex-col gap-20">
            {[
              {
                illu: <IlluCobranca />,
                title: 'Nunca mais esqueça uma cobrança',
                desc: 'Mensagem automática com valor, datas das aulas e Pix. Um toque no WhatsApp e está cobrado. Sem planilha, sem calcular na cabeça.',
                bullets: ['Valor calculado automaticamente por aula ou mensalidade','Inclui chave Pix ou link do cartão','Histórico de quem pagou e quem não pagou'],
                reversed: false,
              },
              {
                illu: <IlluFinanceiro />,
                title: 'Saiba seu lucro REAL todo mês',
                desc: 'Não é só faturamento. É faturamento menos academia, gasolina, alimentação — os custos que você esquece de contar.',
                bullets: ['Cadastre custos fixos e variáveis','Dashboard com faturamento, custos e lucro líquido','Compare meses e veja sua evolução'],
                reversed: true,
              },
              {
                illu: <IlluAgenda />,
                title: 'Sua agenda sempre atualizada',
                desc: 'Grade visual da semana inteira. Arraste para remarcar. Veja seus horários livres em 1 segundo — no celular ou no computador.',
                bullets: ['Drag and drop para remarcar aulas','Visualização por semana com todos os alunos','Identifique horários vagos rapidamente'],
                reversed: false,
              },
              {
                illu: <IlluFaltas />,
                title: 'Faltas resolvidas com justiça',
                desc: 'Sistema automático: prazo para repor, crédito se for sua culpa, sem discussão e sem constrangimento com o aluno.',
                bullets: ['Controle de quem faltou e por qual motivo','Prazo de reposição automático','Crédito aplicado direto na cobrança do mês'],
                reversed: true,
              },
            ].map(({ illu, title, desc, bullets, reversed }, i) => (
              <FadeIn key={title}>
                <div className={`flex flex-col ${reversed ? 'md:flex-row-reverse' : 'md:flex-row'} items-center gap-10 md:gap-16`}>
                  <div className="w-full md:w-[44%] max-w-sm mx-auto" style={{ height: 200 }}>
                    {illu}
                  </div>
                  <div className="flex-1">
                    <h3 className="text-2xl sm:text-3xl font-black mb-3" style={{ letterSpacing: '-0.02em' }}>{title}</h3>
                    <p className="text-base mb-5" style={{ color: GRAY, lineHeight: 1.65 }}>{desc}</p>
                    <ul className="flex flex-col gap-2">
                      {bullets.map(b => (
                        <li key={b} className="flex items-start gap-2.5">
                          <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0 mt-0.5" style={{ background: GREEN + '20' }}>
                            <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                          </div>
                          <span className="text-sm" style={{ color: NAVY }}>{b}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── 5. COMO FUNCIONA ────────────────────────────── */}
      <section id="how" className="py-24 px-5" style={{ background: '#fff' }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn className="text-center mb-16">
            <Label>Como funciona</Label>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.02em' }}>
              Comece em 3 passos simples
            </h2>
          </FadeIn>

          <div className="relative flex flex-col md:flex-row gap-8">
            {/* connector */}
            <div className="hidden md:block absolute top-10 left-[16.5%] right-[16.5%] h-px" style={{ background: `linear-gradient(90deg, ${GREEN}, ${GREEN})`, opacity: 0.3 }}/>

            {[
              { n: '01', title: 'Crie sua conta em 30 segundos', desc: 'Só nome e e-mail. Sem cartão. Acesso imediato a tudo.' },
              { n: '02', title: 'Cadastre seus alunos com dias e horários', desc: 'Ficha completa: horários, valores, WhatsApp, modelo de cobrança.' },
              { n: '03', title: 'Pronto. Tudo funcionando.', desc: 'Agenda, cobranças e financeiro integrados desde o primeiro aluno.' },
            ].map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 120} className="flex-1">
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center font-black text-2xl mb-5 relative z-10"
                    style={{ background: GREEN, color: '#000', boxShadow: `0 0 0 8px ${GREEN}20` }}
                  >
                    {n}
                  </div>
                  <h3 className="font-black text-base mb-2" style={{ color: NAVY }}>{title}</h3>
                  <p className="text-sm" style={{ color: GRAY, lineHeight: 1.6 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── 6. PREÇO ─────────────────────────────────────── */}
      <section id="pricing" className="py-24 px-5" style={{ background: 'linear-gradient(160deg, #f0fdf8 0%, #FAFAFA 100%)' }}>
        <div className="max-w-lg mx-auto">
          <FadeIn className="text-center mb-10">
            <Label>Preço</Label>
            <h2 className="text-3xl sm:text-4xl font-black mb-2" style={{ letterSpacing: '-0.02em' }}>
              Simples e transparente
            </h2>
            <p style={{ color: GRAY }}>Menos que o preço de UMA aula.</p>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="rounded-3xl p-8 relative" style={{ background: '#fff', border: `2px solid ${GREEN}`, boxShadow: `0 0 0 6px ${GREEN}10, 0 20px 60px rgba(0,230,118,0.12)` }}>
              <div className="absolute top-5 right-5 px-3 py-1 rounded-full text-xs font-bold" style={{ background: '#FFF7ED', color: '#C2410C', border: '1px solid #FED7AA' }}>
                🔥 Lançamento
              </div>

              <div className="text-sm font-bold mb-2" style={{ color: '#059669' }}>PersonalHub Pro</div>

              <div className="flex items-baseline gap-2 mb-1">
                <span className="text-sm line-through" style={{ color: '#9CA3AF' }}>De R$ 59,90</span>
              </div>
              <div className="flex items-end gap-1 mb-1">
                <span className="text-6xl font-black" style={{ color: NAVY, letterSpacing: '-0.04em', lineHeight: 1 }}>R$ 29</span>
                <span className="text-2xl font-black mb-1" style={{ color: NAVY }}>,90</span>
                <span className="text-sm mb-2 ml-1" style={{ color: GRAY }}>/mês</span>
              </div>
              <p className="text-sm mb-6" style={{ color: GRAY }}>
                ou <strong style={{ color: '#059669' }}>R$ 249,90/ano</strong> — economize 30%
              </p>

              <div className="flex flex-col gap-2.5 mb-7">
                {[
                  'Alunos ilimitados',
                  'Agenda semanal com drag & drop',
                  'Cobrança automática via WhatsApp',
                  'Controle financeiro completo',
                  'Registro de faltas e reposições',
                  'Termos de compromisso digitais',
                  'Dashboard com métricas em tempo real',
                  'Suporte por WhatsApp',
                ].map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: GREEN + '18' }}>
                      <svg width="9" height="9" viewBox="0 0 24 24" fill="none" stroke={GREEN} strokeWidth="3.5"><polyline points="20 6 9 17 4 12"/></svg>
                    </div>
                    <span className="text-sm" style={{ color: '#374151' }}>{item}</span>
                  </div>
                ))}
              </div>

              <Link href="/register" className="w-full flex items-center justify-center gap-2 font-bold rounded-2xl transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: GREEN, color: '#000', height: 56, fontSize: 16 }}>
                Começar meus 7 dias grátis
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5"><line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/></svg>
              </Link>
              <p className="text-center text-xs mt-3" style={{ color: '#9CA3AF' }}>
                Sem cartão · Sem compromisso · Cancele quando quiser
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────── 7. DEPOIMENTOS ──────────────────────────────── */}
      <section className="py-24 px-5" style={{ background: '#fff' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn className="text-center mb-12">
            <Label>Depoimentos</Label>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.02em' }}>
              O que os personal trainers dizem
            </h2>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5">
            {[
              { ini: 'RS', cor: GREEN,     nome: 'Rafael S.', city: 'São Paulo, SP',
                txt: '"Eu cobrava pelo caderno e sempre esquecia alguém. Agora é tudo automático, chego no fim do mês e cada centavo está no lugar."' },
              { ini: 'JF', cor: '#40C4FF', nome: 'Juliana F.', city: 'Curitiba, PR',
                txt: '"Finalmente sei quanto realmente ganho por mês. O financeiro mudou minha visão do negócio. Percebi que estava cobrando barato."' },
              { ini: 'ML', cor: '#FFAB00', nome: 'Marcos L.', city: 'Belo Horizonte, MG',
                txt: '"Meus alunos elogiam a organização. Parece que virei uma empresa. O WhatsApp de cobrança é um nível acima do que eu fazia."' },
            ].map(({ ini, cor, nome, city, txt }, i) => (
              <FadeIn key={nome} delay={i * 100}>
                <div className="rounded-2xl p-6 h-full flex flex-col gap-4" style={{ background: '#FAFAFA', border: `1px solid ${BORDER}` }}>
                  <p className="text-sm flex-1" style={{ color: NAVY, lineHeight: 1.7, fontStyle: 'italic' }}>{txt}</p>
                  <div className="flex items-center gap-3">
                    <Avatar initials={ini} color={cor}/>
                    <div>
                      <div className="font-bold text-sm" style={{ color: NAVY }}>{nome}</div>
                      <div className="text-xs" style={{ color: GRAY }}>Personal Trainer · {city}</div>
                    </div>
                  </div>
                  <div className="flex gap-0.5">
                    {[1,2,3,4,5].map(s => <svg key={s} width="14" height="14" viewBox="0 0 24 24" fill="#FBBF24" xmlns="http://www.w3.org/2000/svg"><path d="M12 2l3.09 6.26L22 9.27l-5 4.87L18.18 21 12 17.77 5.82 21 7 14.14 2 9.27l6.91-1.01L12 2z"/></svg>)}
                  </div>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ──────────────────── 8. FAQ ───────────────────────────────────────── */}
      <section id="faq" className="py-24 px-5" style={{ background: '#FAFAFA' }}>
        <div className="max-w-2xl mx-auto">
          <FadeIn className="text-center mb-12">
            <Label>Dúvidas</Label>
            <h2 className="text-3xl sm:text-4xl font-black" style={{ letterSpacing: '-0.02em' }}>Perguntas frequentes</h2>
          </FadeIn>
          <FadeIn delay={80}>
            <div className="flex flex-col gap-3">
              {faqItems.map(item => <AccordionItem key={item.q} {...item}/>)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ──────────────────── 9. CTA FINAL ────────────────────────────────── */}
      <section
        className="py-28 px-5 text-center relative overflow-hidden"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #064e3b 100%)' }}
      >
        <div className="absolute inset-0 pointer-events-none" aria-hidden
          style={{ background: `radial-gradient(ellipse at center, ${GREEN}15 0%, transparent 65%)` }}/>
        <FadeIn className="relative z-10 max-w-2xl mx-auto">
          <div className="text-5xl mb-6">💪</div>
          <h2 className="text-4xl sm:text-5xl font-black mb-4 leading-tight" style={{ color: '#fff', letterSpacing: '-0.025em' }}>
            Pronto para parar de <span style={{ color: GREEN }}>perder dinheiro?</span>
          </h2>
          <p className="text-lg mb-8" style={{ color: '#94a3b8' }}>
            Junte-se aos personal trainers que já organizaram sua vida.
          </p>
          <CtaBtn href="/register" large>Criar minha conta grátis</CtaBtn>
          <p className="text-sm mt-4" style={{ color: '#64748b' }}>Leva menos de 1 minuto · Sem cartão de crédito</p>
        </FadeIn>
      </section>

      {/* ──────────────────── 10. FOOTER ──────────────────────────────────── */}
      <footer className="py-10 px-5" style={{ background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-5">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-xl flex items-center justify-center font-black text-xs" style={{ background: GREEN, color: '#000' }}>PH</div>
            <span className="font-black text-sm" style={{ color: '#f1f5f9' }}>PersonalHub</span>
          </div>

          <div className="flex flex-wrap items-center justify-center gap-5">
            {[['Funcionalidades','features'],['Preço','pricing'],['FAQ','faq']].map(([l,id]) => (
              <button key={id} onClick={() => scrollTo(id)} className="text-xs cursor-pointer transition-colors hover:text-white" style={{ color: '#64748b' }}>{l}</button>
            ))}
            <a href="https://wa.me/5500000000000" target="_blank" rel="noopener noreferrer" className="text-xs transition-colors hover:text-white" style={{ color: '#64748b' }}>
              Contato
            </a>
            <Link href="/login" className="text-xs transition-colors hover:text-white" style={{ color: '#64748b' }}>Entrar</Link>
          </div>

          <p className="text-xs" style={{ color: '#475569' }}>© 2026 PersonalHub. Todos os direitos reservados.</p>
        </div>
      </footer>
    </div>
  )
}
