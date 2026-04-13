'use client'

import { useState, useEffect, useRef } from 'react'
import Link from 'next/link'

// ─── fade-in on scroll ────────────────────────────────────────────────────────

function useFadeIn() {
  const ref = useRef<HTMLDivElement>(null)
  const [visible, setVisible] = useState(false)
  useEffect(() => {
    const el = ref.current
    if (!el) return
    const obs = new IntersectionObserver(([e]) => { if (e.isIntersecting) { setVisible(true); obs.disconnect() } }, { threshold: 0.12 })
    obs.observe(el)
    return () => obs.disconnect()
  }, [])
  return { ref, style: { opacity: visible ? 1 : 0, transform: visible ? 'translateY(0)' : 'translateY(28px)', transition: 'opacity 0.6s ease, transform 0.6s ease' } as React.CSSProperties }
}

function FadeIn({ children, delay = 0, className = '' }: { children: React.ReactNode; delay?: number; className?: string }) {
  const { ref, style } = useFadeIn()
  return <div ref={ref} className={className} style={{ ...style, transitionDelay: `${delay}ms` }}>{children}</div>
}

// ─── data ─────────────────────────────────────────────────────────────────────

const FEATURES = [
  { icon: '👤', title: 'Cadastro de Alunos', desc: 'Ficha completa com horários, objetivos, contato de emergência e modelo de cobrança personalizado.' },
  { icon: '📅', title: 'Agenda Inteligente', desc: 'Grade visual semanal com drag and drop. Veja todos seus alunos organizados por dia e horário.' },
  { icon: '💬', title: 'Cobrança pelo WhatsApp', desc: 'Mensagem pronta com valor, datas das aulas e chave Pix gerada automaticamente. Um toque, enviado.' },
  { icon: '📊', title: 'Controle Financeiro', desc: 'Faturamento, custos fixos e lucro líquido por mês. Saiba exatamente quanto você está ganhando.' },
  { icon: '📋', title: 'Faltas e Reposições', desc: 'Registre faltas, controle reposições com prazo automático e aplique créditos na cobrança.' },
  { icon: '🏠', title: 'Dashboard Completo', desc: 'Visão geral do negócio em 5 segundos: alunos ativos, agenda de hoje, faturamento e alertas.' },
]

const STEPS = [
  { n: '01', title: 'Crie sua conta grátis', desc: 'Cadastro simples em 30 segundos. Sem cartão de crédito necessário para testar.' },
  { n: '02', title: 'Cadastre seus alunos', desc: 'Importe seus alunos rapidamente. Configure horários, valores e modelo de cobrança de cada um.' },
  { n: '03', title: 'Gerencie tudo em um lugar', desc: 'Agenda, cobranças, financeiro e relatórios — tudo integrado, funcionando juntos.' },
]

const INCLUDES = [
  'Alunos ilimitados',
  'Agenda semanal com drag & drop',
  'Cobrança automática via WhatsApp',
  'Controle financeiro completo',
  'Registro de faltas e reposições',
  'Termos de compromisso digitais',
  'Dashboard com métricas em tempo real',
  'Personalização de cor e tema',
  'Suporte por WhatsApp',
  'Acesso em qualquer dispositivo',
]

const FAQ = [
  { q: 'Funciona no celular?', a: 'Sim! O PersonalHub é 100% responsivo. Você pode usar no celular, tablet ou computador — o app se adapta a qualquer tela perfeitamente.' },
  { q: 'Preciso instalar algum app?', a: 'Não. O PersonalHub roda direto no navegador, sem instalação. Acesse de qualquer dispositivo com internet.' },
  { q: 'Como funciona o período grátis?', a: 'Você tem 7 dias para testar todas as funcionalidades sem restrições e sem precisar cadastrar cartão. Só começa a cobrar se você decidir continuar.' },
  { q: 'Posso cancelar a qualquer momento?', a: 'Sim, sem multa e sem burocracia. Cancele quando quiser pelo próprio painel. Seus dados ficam disponíveis por 30 dias após o cancelamento.' },
  { q: 'Meus dados ficam seguros?', a: 'Seus dados são armazenados na Supabase com criptografia em repouso e em trânsito. Nunca vendemos ou compartilhamos seus dados.' },
  { q: 'Como funciona a cobrança pelo WhatsApp?', a: 'O sistema calcula automaticamente o valor com base nas aulas do mês, créditos por faltas e forma de pagamento. Você revisa e envia com um clique — a mensagem vai diretamente para o WhatsApp do aluno.' },
]

// ─── dashboard mockup ─────────────────────────────────────────────────────────

function DashboardMockup() {
  return (
    <div className="relative w-full max-w-2xl mx-auto select-none" aria-hidden>
      {/* Desktop browser frame */}
      <div className="rounded-2xl overflow-hidden shadow-2xl" style={{ background: '#18181b', border: '1px solid #3f3f46' }}>
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-4 py-3" style={{ background: '#27272a', borderBottom: '1px solid #3f3f46' }}>
          <div className="flex gap-1.5">
            <div className="w-3 h-3 rounded-full" style={{ background: '#ef4444' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#f59e0b' }} />
            <div className="w-3 h-3 rounded-full" style={{ background: '#22c55e' }} />
          </div>
          <div className="flex-1 mx-3 h-6 rounded-md flex items-center px-3 text-xs" style={{ background: '#3f3f46', color: '#71717a' }}>
            app.personalhub.com.br/dashboard
          </div>
        </div>
        {/* Dashboard content */}
        <div className="flex" style={{ height: 260 }}>
          {/* Sidebar */}
          <div className="w-14 flex flex-col items-center gap-3 py-4" style={{ background: '#111111', borderRight: '1px solid #2A2A2A' }}>
            <div className="w-7 h-7 rounded-lg flex items-center justify-center text-xs font-bold" style={{ background: '#00E676', color: '#000' }}>PH</div>
            {['▪','▪','▪','▪'].map((_, i) => (
              <div key={i} className="w-7 h-7 rounded-lg" style={{ background: i === 0 ? 'rgba(0,230,118,0.15)' : '#1E1E1E' }} />
            ))}
          </div>
          {/* Main area */}
          <div className="flex-1 p-4 flex flex-col gap-3 overflow-hidden" style={{ background: '#0a0a0a' }}>
            {/* Stats row */}
            <div className="grid grid-cols-3 gap-2">
              {[['12', 'Alunos ativos'], ['R$ 4.800', 'Faturamento'], ['R$ 3.200', 'Lucro']].map(([v, l]) => (
                <div key={l} className="rounded-xl p-2" style={{ background: '#171717', border: '1px solid #2A2A2A' }}>
                  <div className="text-xs font-bold" style={{ color: '#00E676' }}>{v}</div>
                  <div className="text-xs" style={{ color: '#555', marginTop: 1 }}>{l}</div>
                </div>
              ))}
            </div>
            {/* Agenda preview */}
            <div className="rounded-xl p-2 flex-1" style={{ background: '#171717', border: '1px solid #2A2A2A' }}>
              <div className="text-xs font-semibold mb-2" style={{ color: '#A0A0A0' }}>Agenda — Hoje</div>
              <div className="flex flex-col gap-1">
                {[['07:00','João Silva','#00E676'],['08:30','Maria Costa','#40C4FF'],['10:00','Pedro Nunes','#FFAB00']].map(([h,n,c]) => (
                  <div key={n} className="flex items-center gap-2 px-2 py-1 rounded-lg" style={{ background: '#0a0a0a' }}>
                    <div className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: c }} />
                    <span className="text-xs" style={{ color: '#555', width: 32 }}>{h}</span>
                    <span className="text-xs truncate" style={{ color: '#F5F5F5' }}>{n}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Mobile frame floating */}
      <div
        className="absolute -bottom-6 -right-4 hidden sm:block rounded-3xl overflow-hidden shadow-2xl"
        style={{ width: 110, height: 190, background: '#18181b', border: '2px solid #3f3f46' }}
      >
        <div className="w-full h-full flex flex-col">
          <div className="h-4 flex items-center justify-center" style={{ background: '#27272a' }}>
            <div className="w-8 h-1 rounded-full" style={{ background: '#3f3f46' }} />
          </div>
          <div className="flex-1 p-2 flex flex-col gap-1.5 overflow-hidden" style={{ background: '#0a0a0a' }}>
            <div className="w-full h-2 rounded" style={{ background: '#00E676', opacity: 0.9 }} />
            {[1,2,3,4].map(i => (
              <div key={i} className="w-full rounded" style={{ background: '#171717', height: i === 1 ? 28 : 20 }} />
            ))}
          </div>
        </div>
      </div>
    </div>
  )
}

// ─── accordion item ───────────────────────────────────────────────────────────

function AccordionItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <div
      className="rounded-2xl overflow-hidden cursor-pointer"
      style={{ border: '1px solid #E5E7EB', background: '#fff' }}
      onClick={() => setOpen(o => !o)}
    >
      <div className="flex items-center justify-between px-5 py-4 gap-4">
        <span className="text-sm font-semibold" style={{ color: '#1A1A2E' }}>{q}</span>
        <span
          className="shrink-0 w-6 h-6 rounded-full flex items-center justify-center transition-transform duration-200"
          style={{ background: open ? '#00E676' : '#F3F4F6', transform: open ? 'rotate(45deg)' : 'none' }}
        >
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke={open ? '#000' : '#6B7280'} strokeWidth="2.5">
            <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
          </svg>
        </span>
      </div>
      {open && (
        <div className="px-5 pb-4 text-sm" style={{ color: '#6B7280', lineHeight: 1.6 }}>{a}</div>
      )}
    </div>
  )
}

// ─── nav ──────────────────────────────────────────────────────────────────────

function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [mobileOpen, setMobileOpen] = useState(false)

  useEffect(() => {
    const handler = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', handler, { passive: true })
    return () => window.removeEventListener('scroll', handler)
  }, [])

  function scrollTo(id: string) {
    setMobileOpen(false)
    document.getElementById(id)?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-50 transition-all duration-200"
      style={{
        background: scrolled ? 'rgba(255,255,255,0.95)' : 'transparent',
        backdropFilter: scrolled ? 'blur(12px)' : 'none',
        borderBottom: scrolled ? '1px solid #E5E7EB' : 'none',
      }}
    >
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        {/* Logo */}
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl flex items-center justify-center font-bold text-sm" style={{ background: '#00E676', color: '#000' }}>PH</div>
          <span className="font-bold text-base" style={{ color: '#1A1A2E' }}>PersonalHub</span>
        </div>

        {/* Desktop links */}
        <div className="hidden md:flex items-center gap-6">
          {[['Funcionalidades','features'],['Como Funciona','how'],['Preço','pricing'],['FAQ','faq']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium cursor-pointer" style={{ color: '#6B7280' }}>
              {label}
            </button>
          ))}
        </div>

        {/* Desktop CTA */}
        <div className="hidden md:flex items-center gap-3">
          <Link href="/login" className="text-sm font-medium" style={{ color: '#6B7280' }}>Entrar</Link>
          <Link
            href="/register"
            className="h-9 px-5 rounded-xl text-sm font-bold flex items-center transition-opacity hover:opacity-90"
            style={{ background: '#00E676', color: '#000' }}
          >
            Começar grátis
          </Link>
        </div>

        {/* Mobile hamburger */}
        <button className="md:hidden p-2 cursor-pointer" onClick={() => setMobileOpen(o => !o)} aria-label="Menu">
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#1A1A2E" strokeWidth="2">
            {mobileOpen ? <><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></> : <><line x1="3" y1="6" x2="21" y2="6"/><line x1="3" y1="12" x2="21" y2="12"/><line x1="3" y1="18" x2="21" y2="18"/></>}
          </svg>
        </button>
      </div>

      {/* Mobile menu */}
      {mobileOpen && (
        <div className="md:hidden px-4 pb-4 flex flex-col gap-2" style={{ background: 'rgba(255,255,255,0.98)', borderBottom: '1px solid #E5E7EB' }}>
          {[['Funcionalidades','features'],['Como Funciona','how'],['Preço','pricing'],['FAQ','faq']].map(([label, id]) => (
            <button key={id} onClick={() => scrollTo(id)} className="text-sm font-medium text-left py-2 cursor-pointer" style={{ color: '#6B7280' }}>{label}</button>
          ))}
          <Link href="/login" className="text-sm font-medium py-2" style={{ color: '#6B7280' }}>Entrar</Link>
          <Link href="/register" className="h-10 rounded-xl text-sm font-bold flex items-center justify-center mt-1" style={{ background: '#00E676', color: '#000' }}>
            Começar grátis
          </Link>
        </div>
      )}
    </nav>
  )
}

// ─── main component ───────────────────────────────────────────────────────────

export function LandingPage() {
  return (
    <div style={{ background: '#F9FAFB', color: '#1A1A2E', fontFamily: 'var(--font-geist, system-ui, sans-serif)' }}>
      <Navbar />

      {/* ── 1. HERO ─────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="min-h-screen flex flex-col items-center justify-center px-4 pt-20 pb-16 text-center"
        style={{ background: 'linear-gradient(160deg, #ffffff 0%, #f0fdf4 60%, #F9FAFB 100%)' }}
      >
        <FadeIn>
          <div
            className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full text-xs font-semibold mb-6"
            style={{ background: 'rgba(0,230,118,0.12)', color: '#059669', border: '1px solid rgba(0,230,118,0.3)' }}
          >
            <span className="w-1.5 h-1.5 rounded-full inline-block" style={{ background: '#00E676' }} />
            7 dias grátis · Sem cartão
          </div>
        </FadeIn>

        <FadeIn delay={100}>
          <h1
            className="text-4xl sm:text-5xl lg:text-6xl font-black leading-tight mb-4 max-w-3xl"
            style={{ color: '#0f172a', letterSpacing: '-0.02em' }}
          >
            Chega de planilha.{' '}
            <span style={{ color: '#00C853' }}>Gerencie seus alunos</span>{' '}
            como profissional.
          </h1>
        </FadeIn>

        <FadeIn delay={200}>
          <p className="text-lg sm:text-xl mb-8 max-w-xl" style={{ color: '#6B7280', lineHeight: 1.6 }}>
            O app completo para personal trainers: alunos, agenda, cobranças e financeiro em um só lugar.
          </p>
        </FadeIn>

        <FadeIn delay={300}>
          <div className="flex flex-col sm:flex-row gap-3 justify-center mb-12">
            <Link
              href="/register"
              className="h-13 px-8 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:scale-105 hover:shadow-lg"
              style={{ background: '#00E676', color: '#000', height: 52 }}
            >
              Começar grátis por 7 dias
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <button
              onClick={() => document.getElementById('features')?.scrollIntoView({ behavior: 'smooth' })}
              className="h-13 px-8 rounded-2xl text-base font-semibold flex items-center justify-center gap-2 cursor-pointer transition-all hover:scale-105"
              style={{ background: '#fff', color: '#1A1A2E', border: '1.5px solid #E5E7EB', height: 52 }}
            >
              Ver funcionalidades
            </button>
          </div>
        </FadeIn>

        <FadeIn delay={400} className="w-full max-w-2xl px-4">
          <DashboardMockup />
        </FadeIn>

        <FadeIn delay={500}>
          <div className="flex items-center gap-6 mt-14 flex-wrap justify-center">
            {[['✓ Sem cartão para testar'], ['✓ Cancele quando quiser'], ['✓ Suporte incluído']].map(([t]) => (
              <span key={t} className="text-sm font-medium" style={{ color: '#6B7280' }}>{t}</span>
            ))}
          </div>
        </FadeIn>
      </section>

      {/* ── 2. PROBLEMA ─────────────────────────────────────────────────────── */}
      <section className="py-20 px-4" style={{ background: '#fff' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <h2 className="text-3xl sm:text-4xl font-black text-center mb-4" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
              Você ainda controla seus alunos assim?
            </h2>
            <p className="text-center text-base mb-12" style={{ color: '#6B7280' }}>
              Se a resposta for sim, você está perdendo tempo e dinheiro todos os dias.
            </p>
          </FadeIn>

          <div className="grid md:grid-cols-3 gap-5 mb-12">
            {[
              { emoji: '📊', title: 'Planilhas confusas', desc: 'Arquivo com abas infinitas, dados desatualizados, difícil de abrir no celular e impossível de usar no dia a dia.' },
              { emoji: '💸', title: 'Cobranças esquecidas', desc: 'Fim do mês chegou e você ainda não sabe quem pagou, quem não pagou e qual foi o valor combinado com cada aluno.' },
              { emoji: '🔢', title: 'Sem controle financeiro', desc: 'Quanto você faturou esse mês? Quanto sobrou depois dos custos? Impossível saber sem perder horas calculando.' },
            ].map(({ emoji, title, desc }, i) => (
              <FadeIn key={title} delay={i * 100}>
                <div
                  className="rounded-2xl p-6 h-full"
                  style={{ background: '#FEF2F2', border: '1px solid #FECACA' }}
                >
                  <div className="text-3xl mb-3">{emoji}</div>
                  <h3 className="text-base font-bold mb-2" style={{ color: '#991B1B' }}>{title}</h3>
                  <p className="text-sm" style={{ color: '#B91C1C', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>

          <FadeIn>
            <div className="text-center">
              <div className="inline-flex items-center gap-3 px-6 py-3 rounded-2xl" style={{ background: 'rgba(0,230,118,0.1)', border: '1px solid rgba(0,230,118,0.2)' }}>
                <span className="text-2xl">✨</span>
                <span className="text-base font-semibold" style={{ color: '#059669' }}>Existe um jeito melhor — e começa aqui.</span>
              </div>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 3. FUNCIONALIDADES ──────────────────────────────────────────────── */}
      <section id="features" className="py-20 px-4" style={{ background: '#F9FAFB' }}>
        <div className="max-w-5xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full" style={{ background: 'rgba(0,230,118,0.12)', color: '#059669' }}>
                Funcionalidades
              </div>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                Tudo que você precisa em um só lugar
              </h2>
            </div>
          </FadeIn>

          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {FEATURES.map(({ icon, title, desc }, i) => (
              <FadeIn key={title} delay={i * 80}>
                <div
                  className="rounded-2xl p-6 h-full flex flex-col gap-3 transition-all hover:-translate-y-1 hover:shadow-lg"
                  style={{ background: '#fff', border: '1px solid #E5E7EB' }}
                >
                  <div className="w-12 h-12 rounded-2xl flex items-center justify-center text-2xl" style={{ background: '#F0FDF4' }}>
                    {icon}
                  </div>
                  <h3 className="font-bold text-base" style={{ color: '#0f172a' }}>{title}</h3>
                  <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 4. COMO FUNCIONA ────────────────────────────────────────────────── */}
      <section id="how" className="py-20 px-4" style={{ background: '#fff' }}>
        <div className="max-w-4xl mx-auto">
          <FadeIn>
            <div className="text-center mb-14">
              <div className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full" style={{ background: 'rgba(0,230,118,0.12)', color: '#059669' }}>
                Como funciona
              </div>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                Comece em 3 passos simples
              </h2>
            </div>
          </FadeIn>

          <div className="flex flex-col md:flex-row gap-6 relative">
            {/* connector line */}
            <div className="hidden md:block absolute top-10 left-[calc(16.7%+16px)] right-[calc(16.7%+16px)] h-0.5" style={{ background: 'linear-gradient(90deg, #00E676, #00C853)' }} />

            {STEPS.map(({ n, title, desc }, i) => (
              <FadeIn key={n} delay={i * 150} className="flex-1">
                <div className="flex flex-col items-center text-center">
                  <div
                    className="w-20 h-20 rounded-3xl flex items-center justify-center text-2xl font-black mb-5 relative z-10"
                    style={{ background: '#00E676', color: '#000' }}
                  >
                    {n}
                  </div>
                  <h3 className="text-base font-bold mb-2" style={{ color: '#0f172a' }}>{title}</h3>
                  <p className="text-sm" style={{ color: '#6B7280', lineHeight: 1.6 }}>{desc}</p>
                </div>
              </FadeIn>
            ))}
          </div>
        </div>
      </section>

      {/* ── 5. PREÇO ────────────────────────────────────────────────────────── */}
      <section id="pricing" className="py-20 px-4" style={{ background: 'linear-gradient(160deg, #f0fdf4 0%, #F9FAFB 100%)' }}>
        <div className="max-w-lg mx-auto">
          <FadeIn>
            <div className="text-center mb-10">
              <div className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full" style={{ background: 'rgba(0,230,118,0.12)', color: '#059669' }}>
                Preço
              </div>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                Simples e transparente
              </h2>
              <p className="text-base mt-2" style={{ color: '#6B7280' }}>Menos que o preço de uma aula.</p>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div
              className="rounded-3xl p-8 relative overflow-hidden"
              style={{ background: '#fff', border: '2px solid #00E676', boxShadow: '0 0 0 4px rgba(0,230,118,0.08)' }}
            >
              {/* Popular badge */}
              <div
                className="absolute top-5 right-5 text-xs font-bold px-3 py-1 rounded-full"
                style={{ background: '#00E676', color: '#000' }}
              >
                Mais popular
              </div>

              <div className="mb-1 text-sm font-semibold" style={{ color: '#059669' }}>PersonalHub Pro</div>
              <div className="flex items-end gap-2 mb-1">
                <span className="text-5xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.03em' }}>R$ 29</span>
                <span className="text-2xl font-black mb-1" style={{ color: '#0f172a' }}>,90</span>
                <span className="text-sm mb-2" style={{ color: '#6B7280' }}>/mês</span>
              </div>
              <div className="text-sm mb-6" style={{ color: '#6B7280' }}>
                ou <strong style={{ color: '#059669' }}>R$ 249,90/ano</strong> — economize 30%
              </div>

              <div className="flex flex-col gap-2.5 mb-7">
                {INCLUDES.map(item => (
                  <div key={item} className="flex items-center gap-3">
                    <div className="w-5 h-5 rounded-full flex items-center justify-center shrink-0" style={{ background: 'rgba(0,230,118,0.15)' }}>
                      <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="#00C853" strokeWidth="3">
                        <polyline points="20 6 9 17 4 12"/>
                      </svg>
                    </div>
                    <span className="text-sm" style={{ color: '#374151' }}>{item}</span>
                  </div>
                ))}
              </div>

              <Link
                href="/register"
                className="w-full h-13 rounded-2xl text-base font-bold flex items-center justify-center gap-2 transition-all hover:opacity-90 hover:scale-[1.02]"
                style={{ background: '#00E676', color: '#000', height: 52 }}
              >
                Começar grátis por 7 dias
                <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                  <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
                </svg>
              </Link>

              <p className="text-center text-xs mt-3" style={{ color: '#9CA3AF' }}>
                Sem cartão para testar · Cancele quando quiser
              </p>
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 6. FAQ ──────────────────────────────────────────────────────────── */}
      <section id="faq" className="py-20 px-4" style={{ background: '#fff' }}>
        <div className="max-w-2xl mx-auto">
          <FadeIn>
            <div className="text-center mb-12">
              <div className="inline-block text-xs font-bold uppercase tracking-widest mb-3 px-3 py-1 rounded-full" style={{ background: 'rgba(0,230,118,0.12)', color: '#059669' }}>
                Dúvidas
              </div>
              <h2 className="text-3xl sm:text-4xl font-black" style={{ color: '#0f172a', letterSpacing: '-0.02em' }}>
                Perguntas frequentes
              </h2>
            </div>
          </FadeIn>

          <FadeIn delay={100}>
            <div className="flex flex-col gap-3">
              {FAQ.map(item => <AccordionItem key={item.q} {...item} />)}
            </div>
          </FadeIn>
        </div>
      </section>

      {/* ── 7. CTA FINAL ────────────────────────────────────────────────────── */}
      <section
        className="py-24 px-4 text-center"
        style={{ background: 'linear-gradient(135deg, #0f172a 0%, #1e3a2f 100%)' }}
      >
        <FadeIn>
          <div className="max-w-2xl mx-auto">
            <div className="text-4xl mb-6">🚀</div>
            <h2
              className="text-3xl sm:text-5xl font-black mb-4"
              style={{ color: '#fff', letterSpacing: '-0.02em', lineHeight: 1.15 }}
            >
              Pronto para organizar sua{' '}
              <span style={{ color: '#00E676' }}>vida de personal?</span>
            </h2>
            <p className="text-lg mb-8" style={{ color: '#94a3b8' }}>
              Junte-se a centenas de personal trainers que já deixaram as planilhas para trás.
            </p>
            <Link
              href="/register"
              className="inline-flex items-center gap-2 px-10 py-4 rounded-2xl text-base font-bold transition-all hover:scale-105 hover:shadow-xl"
              style={{ background: '#00E676', color: '#000' }}
            >
              Criar minha conta grátis
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                <line x1="5" y1="12" x2="19" y2="12"/><polyline points="12 5 19 12 12 19"/>
              </svg>
            </Link>
            <p className="text-sm mt-4" style={{ color: '#64748b' }}>
              7 dias grátis · Sem cartão de crédito · Cancele quando quiser
            </p>
          </div>
        </FadeIn>
      </section>

      {/* ── 8. FOOTER ───────────────────────────────────────────────────────── */}
      <footer className="py-10 px-4" style={{ background: '#0f172a', borderTop: '1px solid #1e293b' }}>
        <div className="max-w-5xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg flex items-center justify-center font-bold text-xs" style={{ background: '#00E676', color: '#000' }}>PH</div>
            <span className="font-bold text-sm" style={{ color: '#f1f5f9' }}>PersonalHub</span>
          </div>

          <div className="flex items-center gap-5 flex-wrap justify-center">
            {[['Funcionalidades','features'],['Preço','pricing'],['FAQ','faq']].map(([label, id]) => (
              <button
                key={id}
                onClick={() => document.getElementById(id)?.scrollIntoView({ behavior: 'smooth' })}
                className="text-xs cursor-pointer transition-colors hover:text-white"
                style={{ color: '#64748b' }}
              >
                {label}
              </button>
            ))}
            <Link href="/login" className="text-xs transition-colors hover:text-white" style={{ color: '#64748b' }}>
              Entrar
            </Link>
          </div>

          <p className="text-xs" style={{ color: '#475569' }}>
            © 2026 PersonalHub. Todos os direitos reservados.
          </p>
        </div>
      </footer>
    </div>
  )
}
