'use client'

import { useEffect, useRef, useState, useCallback } from 'react'
import Link from 'next/link'
import {
  DollarSign, CalendarCheck, Layers,
  FileSpreadsheet, Smartphone, Calculator, Clock, HelpCircle, TrendingDown,
  MessageSquare, TrendingUp, Calendar, RefreshCw, PlusCircle,
  ArrowRight, Plus, Check, X, Menu, Send,
} from 'lucide-react'

// ═════════════════════════════════════════════════════════════════════════════
//  PALETA + CONSTANTES
// ═════════════════════════════════════════════════════════════════════════════

const C = {
  bg:         '#0B0F19',
  surface:    '#111827',
  input:      '#1F2937',
  border:     '#374151',
  textP:      '#F9FAFB',
  textS:      '#9CA3AF',
  textM:      '#6B7280',
  primary:    '#10B981',
  primaryDk:  '#059669',
  primaryLt:  '#34D399',
  danger:     '#EF4444',
}

// ═════════════════════════════════════════════════════════════════════════════
//  HOOKS
// ═════════════════════════════════════════════════════════════════════════════

/** Intersection observer hook — dispara true quando entra no viewport */
function useReveal<T extends HTMLElement = HTMLDivElement>(threshold = 0.15): {
  ref: React.RefObject<T | null>
  revealed: boolean
} {
  const ref = useRef<T | null>(null)
  const [revealed, setRevealed] = useState(false)

  useEffect(() => {
    const node = ref.current
    if (!node) return
    const obs = new IntersectionObserver(
      ([entry]) => { if (entry.isIntersecting) { setRevealed(true); obs.disconnect() } },
      { threshold, rootMargin: '0px 0px -8% 0px' },
    )
    obs.observe(node)
    return () => obs.disconnect()
  }, [threshold])

  return { ref, revealed }
}

// ═════════════════════════════════════════════════════════════════════════════
//  PRIMITIVOS: BOTÃO, FRAME DE CELULAR
// ═════════════════════════════════════════════════════════════════════════════

function CtaButton({
  href, children, large = false, dark = false,
}: {
  href: string; children: React.ReactNode; large?: boolean; dark?: boolean
}) {
  return (
    <Link href={href} className="ph-cta" data-large={large ? '1' : '0'} data-dark={dark ? '1' : '0'}>
      <span>{children}</span>
      <ArrowRight size={large ? 18 : 16} strokeWidth={2} aria-hidden />
    </Link>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return (
    <div className="ph-phone">
      <div className="ph-phone-notch" />
      <div className="ph-phone-screen">
        {children}
      </div>
    </div>
  )
}

/** Mini navbar interna dos mockups */
function MockupHeader() {
  return (
    <div className="flex items-center gap-2 px-4 py-3 border-b" style={{ borderColor: C.border }}>
      <span className="w-6 h-6 rounded-md flex items-center justify-center font-bold text-[10px]"
        style={{ background: C.primary, color: '#fff' }}>PH</span>
      <span className="text-xs font-semibold" style={{ color: C.textP }}>PersonalHub</span>
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  MOCKUPS — componentes HTML/CSS que simulam telas do app
// ═════════════════════════════════════════════════════════════════════════════

function MockupHero() {
  return (
    <PhoneFrame>
      <MockupHeader />
      <div className="p-4 flex flex-col gap-3" style={{ background: C.bg }}>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textM }}>Cobrança · Fev 2026</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: C.textP }}>Ana Silva</p>
        </div>

        <div className="rounded-xl p-3 text-[11px] leading-relaxed"
          style={{ background: C.surface, border: `1px solid ${C.border}`, color: C.textS }}>
          <p style={{ color: C.textP }}>Olá, Ana! 👋</p>
          <p className="mt-1">Segue sua cobrança referente a <b style={{ color: C.textP }}>Fevereiro</b>:</p>
          <p className="mt-1">📅 Datas: 3, 5, 7, 10, 12, 14, 17, 19, 21, 24, 26, 28</p>
          <p>📊 Total de aulas: <b style={{ color: C.textP }}>12</b></p>
          <p>💰 Valor: <b style={{ color: C.primary }}>R$ 980,00</b></p>
          <p className="mt-1">💳 Pix: gabriel@email.com</p>
        </div>

        <button className="flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold"
          style={{ background: '#25D366', color: '#fff' }}>
          <Send size={12} strokeWidth={2} aria-hidden /> Enviar no WhatsApp
        </button>

        <div className="rounded-lg p-2.5 flex items-center gap-2"
          style={{ background: 'rgba(16, 185, 129, 0.1)', border: `1px solid ${C.primary}40` }}>
          <Check size={12} strokeWidth={2.5} style={{ color: C.primary }} aria-hidden />
          <span className="text-[10px] font-semibold" style={{ color: C.primary }}>Mensagem pronta em 1 toque</span>
        </div>
      </div>
    </PhoneFrame>
  )
}

function MockupCalculo() {
  return (
    <PhoneFrame>
      <MockupHeader />
      <div className="p-4 flex flex-col gap-3" style={{ background: C.bg }}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textM }}>Cálculo Mensal</p>
            <p className="text-sm font-bold mt-0.5" style={{ color: C.textP }}>Fevereiro 2026</p>
          </div>
          <div className="flex gap-1">
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: C.input, color: C.textS }}>‹</span>
            <span className="w-6 h-6 rounded-md flex items-center justify-center" style={{ background: C.input, color: C.textS }}>›</span>
          </div>
        </div>

        <div className="grid grid-cols-7 gap-1">
          {[
            { l: 'Seg', n: 4 }, { l: 'Ter', n: 4 }, { l: 'Qua', n: 4 },
            { l: 'Qui', n: 4 }, { l: 'Sex', n: 4 }, { l: 'Sáb', n: 4 }, { l: 'Dom', n: 4 },
          ].map((d, i) => (
            <div key={i} className="rounded-md py-1.5 text-center"
              style={{ background: C.input }}>
              <p className="text-[8px]" style={{ color: C.textM }}>{d.l}</p>
              <p className="text-xs font-bold" style={{ color: C.textP }}>{d.n}</p>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[9px]" style={{ color: C.textM }}>Total aulas</p>
            <p className="text-base font-bold" style={{ color: C.textP }}>84</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: 'rgba(16, 185, 129, 0.08)', border: `1px solid ${C.primary}40` }}>
            <p className="text-[9px]" style={{ color: C.primary }}>Faturamento</p>
            <p className="text-base font-bold" style={{ color: C.primary }}>R$ 7.850</p>
          </div>
        </div>

        {[
          { nome: 'Ana Silva',   aulas: 12, valor: 'R$ 980'  },
          { nome: 'Pedro Costa', aulas:  8, valor: 'R$ 1.040' },
          { nome: 'Lucas Mendes',aulas: 12, valor: 'R$ 1.680' },
        ].map((a, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <div>
              <p className="text-xs font-semibold" style={{ color: C.textP }}>{a.nome}</p>
              <p className="text-[9px]" style={{ color: C.textM }}>{a.aulas} aulas este mês</p>
            </div>
            <p className="text-xs font-bold" style={{ color: C.primary }}>{a.valor}</p>
          </div>
        ))}
      </div>
    </PhoneFrame>
  )
}

function MockupCobranca() {
  return (
    <PhoneFrame>
      <MockupHeader />
      <div className="p-4 flex flex-col gap-3" style={{ background: C.bg }}>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textM }}>Cobrança · Fev 2026</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: C.textP }}>6 alunos</p>
        </div>

        <div className="grid grid-cols-3 gap-1.5">
          {[
            { l: 'Pendente', n: '2', c: '#F59E0B' },
            { l: 'Enviado',  n: '3', c: '#38BDF8' },
            { l: 'Pago',     n: '1', c: C.primary },
          ].map((s, i) => (
            <div key={i} className="rounded-md px-2 py-2 text-center"
              style={{ background: C.surface, border: `1px solid ${C.border}` }}>
              <p className="text-[8px]" style={{ color: C.textM }}>{s.l}</p>
              <p className="text-sm font-bold" style={{ color: s.c }}>{s.n}</p>
            </div>
          ))}
        </div>

        {/* Card expandido — Ana */}
        <div className="rounded-xl p-3" style={{ background: C.surface, border: `1px solid ${C.primary}40` }}>
          <div className="flex items-center justify-between mb-2">
            <p className="text-xs font-bold" style={{ color: C.textP }}>Ana Silva</p>
            <span className="text-[9px] px-1.5 py-0.5 rounded-full font-semibold"
              style={{ background: 'rgba(245, 158, 11, 0.15)', color: '#F59E0B' }}>PENDENTE</span>
          </div>
          <div className="rounded-md p-2 text-[10px] leading-relaxed"
            style={{ background: C.input, color: C.textS }}>
            <p style={{ color: C.textP }}>Olá, Ana!</p>
            <p className="mt-0.5">📅 Datas: 3, 5, 7, 10… (12 aulas)</p>
            <p>💰 <b style={{ color: C.primary }}>R$ 980,00</b></p>
          </div>
          <button className="mt-2 w-full flex items-center justify-center gap-1.5 py-2 rounded-lg text-[10px] font-bold"
            style={{ background: '#25D366', color: '#fff' }}>
            <Send size={10} strokeWidth={2} aria-hidden /> Enviar WhatsApp
          </button>
        </div>

        {/* Outros alunos */}
        {[
          { nome: 'Pedro Costa',   status: 'Enviado', cor: '#38BDF8' },
          { nome: 'Marina Santos', status: 'Pago',    cor: C.primary },
        ].map((a, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 rounded-lg"
            style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-xs font-semibold" style={{ color: C.textP }}>{a.nome}</p>
            <span className="text-[9px] font-semibold" style={{ color: a.cor }}>{a.status.toUpperCase()}</span>
          </div>
        ))}
      </div>
    </PhoneFrame>
  )
}

function MockupFinanceiro() {
  // Dados do gráfico
  const receitas = [6800, 7200, 6500, 7800, 7100, 8450]
  const custos   = [2100, 2200, 2000, 2300, 2100, 2300]
  const meses    = ['Set', 'Out', 'Nov', 'Dez', 'Jan', 'Fev']
  const W = 240, H = 80, padX = 10, padY = 10
  const max = Math.max(...receitas, ...custos) * 1.1
  const cw = W - padX * 2, ch = H - padY * 2
  const xOf = (i: number) => padX + (i / (receitas.length - 1)) * cw
  const yOf = (v: number) => padY + ch - (v / max) * ch
  const path = (arr: number[]) => arr.map((v, i) => `${i === 0 ? 'M' : 'L'} ${xOf(i).toFixed(1)} ${yOf(v).toFixed(1)}`).join(' ')

  return (
    <PhoneFrame>
      <MockupHeader />
      <div className="p-4 flex flex-col gap-3" style={{ background: C.bg }}>
        <div>
          <p className="text-[10px] uppercase tracking-wider" style={{ color: C.textM }}>Financeiro · Fev 2026</p>
          <p className="text-sm font-bold mt-0.5" style={{ color: C.textP }}>Custos e Lucro</p>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <div className="rounded-lg p-2.5"
            style={{ background: 'rgba(16, 185, 129, 0.08)', border: `1px solid ${C.primary}40` }}>
            <p className="text-[9px]" style={{ color: C.primary }}>Faturamento</p>
            <p className="text-sm font-bold" style={{ color: C.primary }}>R$ 8.450</p>
          </div>
          <div className="rounded-lg p-2.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
            <p className="text-[9px]" style={{ color: C.textM }}>Custos</p>
            <p className="text-sm font-bold" style={{ color: C.textP }}>R$ 2.300</p>
          </div>
        </div>

        <div className="rounded-lg p-2.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center justify-between mb-0.5">
            <p className="text-[9px]" style={{ color: C.textM }}>Lucro líquido</p>
            <p className="text-[9px] font-bold" style={{ color: C.primary }}>72,8% margem</p>
          </div>
          <p className="text-lg font-bold" style={{ color: C.textP }}>R$ 6.150</p>
        </div>

        {/* Gráfico 6 meses */}
        <div className="rounded-lg p-2.5" style={{ background: C.surface, border: `1px solid ${C.border}` }}>
          <div className="flex items-center gap-3 mb-1">
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: C.primary }} />
              <span className="text-[8px]" style={{ color: C.textM }}>Receita</span>
            </div>
            <div className="flex items-center gap-1">
              <span className="w-1.5 h-1.5 rounded-full" style={{ background: '#F59E0B' }} />
              <span className="text-[8px]" style={{ color: C.textM }}>Custos</span>
            </div>
          </div>
          <svg viewBox={`0 0 ${W} ${H}`} width="100%" height="80">
            <path d={path(receitas)} stroke={C.primary} strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            <path d={path(custos)}   stroke="#F59E0B"  strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round" />
            {receitas.map((v, i) => (
              <circle key={`r${i}`} cx={xOf(i)} cy={yOf(v)} r="2" fill={C.primary} />
            ))}
          </svg>
          <div className="flex justify-between text-[7px] mt-0.5" style={{ color: C.textM }}>
            {meses.map(m => <span key={m}>{m}</span>)}
          </div>
        </div>

        {/* Categorias */}
        <div className="flex flex-col gap-1.5">
          {[
            { l: 'Academia',    v: 'R$ 1.200', pct: 52 },
            { l: 'Aluguel',     v: 'R$ 700',   pct: 30 },
            { l: 'Transporte',  v: 'R$ 400',   pct: 18 },
          ].map((c, i) => (
            <div key={i}>
              <div className="flex justify-between text-[9px]">
                <span style={{ color: C.textS }}>{c.l}</span>
                <span style={{ color: C.textP, fontWeight: 600 }}>{c.v}</span>
              </div>
              <div className="h-1 rounded-full mt-0.5 overflow-hidden" style={{ background: C.input }}>
                <div className="h-full rounded-full" style={{ width: `${c.pct}%`, background: C.primary }} />
              </div>
            </div>
          ))}
        </div>
      </div>
    </PhoneFrame>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  SEÇÕES
// ═════════════════════════════════════════════════════════════════════════════

function PromoBar() {
  return (
    <div className="ph-promo">
      <span>Oferta de lançamento: primeiro mês grátis com o código</span>
      <span className="ph-promo-code">PRIMEIROS20</span>
    </div>
  )
}

function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 20)
    window.addEventListener('scroll', onScroll)
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const scrollTo = useCallback((id: string) => {
    setMenuOpen(false)
    const el = document.getElementById(id)
    if (el) el.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [])

  return (
    <nav className="ph-nav" data-scrolled={scrolled ? '1' : '0'}>
      <div className="ph-nav-inner">
        {/* Logo */}
        <Link href="/" className="flex items-center gap-2">
          <span className="ph-nav-logo">PH</span>
          <span className="font-bold text-sm" style={{ color: C.textP }}>PersonalHub</span>
        </Link>

        {/* Links centralizados (desktop) */}
        <div className="ph-nav-links">
          {[
            { id: 'funcionalidades', l: 'Funcionalidades' },
            { id: 'modulos',         l: 'Módulos' },
            { id: 'preco',           l: 'Preço' },
            { id: 'faq',             l: 'FAQ' },
          ].map(k => (
            <button key={k.id} onClick={() => scrollTo(k.id)}
              className="ph-nav-link">
              {k.l}
            </button>
          ))}
        </div>

        <div className="flex items-center gap-2">
          <Link href="/login" className="ph-nav-entrar">Entrar</Link>
          {/* Hamburger mobile */}
          <button onClick={() => setMenuOpen(v => !v)} className="ph-nav-hamburger" aria-label="Menu">
            {menuOpen ? <X size={18} strokeWidth={2} /> : <Menu size={18} strokeWidth={2} />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      {menuOpen && (
        <div className="ph-nav-mobile">
          {[
            { id: 'funcionalidades', l: 'Funcionalidades' },
            { id: 'modulos',         l: 'Módulos' },
            { id: 'preco',           l: 'Preço' },
            { id: 'faq',             l: 'FAQ' },
          ].map(k => (
            <button key={k.id} onClick={() => scrollTo(k.id)}
              className="ph-nav-mobile-link">
              {k.l}
            </button>
          ))}
        </div>
      )}
    </nav>
  )
}

function Hero() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className="ph-hero" id="funcionalidades">
      <div className="ph-mesh" aria-hidden />
      <div className="ph-container ph-hero-inner" ref={ref} data-reveal={revealed ? '1' : '0'}>

        <div className="ph-hero-left">
          <h1 className="ph-hero-h1">
            Você não precisa de mais uma planilha.<br />
            <span style={{ color: C.primary }}>Precisa do PersonalHub.</span>
          </h1>
          <p className="ph-hero-sub">
            O app que calcula suas aulas, gera o fechamento e envia a cobrança direto no WhatsApp.
            Sem planilha, sem bloco de notas, sem calculadora.
          </p>

          <div className="flex flex-col gap-2">
            <CtaButton href="/register" large>Comece grátis por 7 dias</CtaButton>
            <p className="text-xs" style={{ color: C.textM }}>
              Sem cartão · Cancele quando quiser · Sem fidelidade
            </p>
          </div>

          <div className="ph-hero-price">
            <span style={{ color: C.primary, fontWeight: 700 }}>R$ 29,90/mês</span>
            <span style={{ color: C.textM }}> — menos de R$ 1 por dia</span>
          </div>
        </div>

        <div className="ph-hero-right">
          <MockupHero />
        </div>
      </div>

      {/* 3 benefícios */}
      <div className="ph-container ph-hero-benefits">
        {[
          { Icon: DollarSign,    t: 'Controle financeiro total',     d: 'Saiba quanto você realmente lucra.' },
          { Icon: CalendarCheck, t: 'Agenda e cobrança integradas',  d: 'Uma coisa alimenta a outra.' },
          { Icon: Layers,        t: 'Tudo em um só app',              d: 'Chega de planilha, bloco de notas e calculadora.' },
        ].map((b, i) => (
          <BenefitCard key={i} Icon={b.Icon} title={b.t} desc={b.d} delay={i * 100} />
        ))}
      </div>
    </section>
  )
}

function BenefitCard({
  Icon, title, desc, delay,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean }>
  title: string; desc: string; delay: number
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="ph-card ph-reveal"
      style={{ padding: 20, transitionDelay: `${delay}ms` }}
      data-reveal={revealed ? '1' : '0'}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
        <Icon size={18} strokeWidth={1.75} style={{ color: C.primary }} aria-hidden />
      </div>
      <h3 className="font-bold text-base mb-1" style={{ color: C.textP }}>{title}</h3>
      <p className="text-sm" style={{ color: C.textS }}>{desc}</p>
    </div>
  )
}

function DorSection() {
  const { ref: titleRef, revealed: titleRev } = useReveal<HTMLHeadingElement>()
  const { ref: transRef, revealed: transRev } = useReveal<HTMLParagraphElement>()

  const dores = [
    { Icon: FileSpreadsheet, t: 'Planilha num canto, bloco de notas no outro, e no final do mês nada fecha' },
    { Icon: Smartphone,      t: 'Bloco de notas do celular com nomes e horários que só você entende' },
    { Icon: Calculator,      t: 'Calculando aula por aula na calculadora do celular' },
    { Icon: Clock,           t: 'Fechamento atrasado porque dá preguiça só de pensar' },
    { Icon: HelpCircle,      t: 'Perguntando pro aluno "você veio na terça?" porque não lembra' },
    { Icon: TrendingDown,    t: 'No final do mês não sabe se teve lucro ou só trabalhou de graça' },
  ]
  return (
    <section className="ph-section-overlap" style={{ background: C.surface }}>
      <div className="ph-container">
        <h2 ref={titleRef} className="ph-h2 ph-reveal" data-reveal={titleRev ? '1' : '0'}>
          Você ainda controla seus alunos assim?
        </h2>

        <div className="ph-dor-grid">
          {dores.map((d, i) => (
            <DorCard key={i} Icon={d.Icon} text={d.t} delay={i * 80} />
          ))}
        </div>

        <p ref={transRef} className="ph-dor-transicao ph-reveal"
          data-reveal={transRev ? '1' : '0'}>
          E se tudo isso levasse 2 minutos?
        </p>
      </div>
    </section>
  )
}

function DorCard({
  Icon, text, delay,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean }>
  text: string; delay: number
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="ph-dor-card ph-reveal"
      data-reveal={revealed ? '1' : '0'}
      style={{ transitionDelay: `${delay}ms` }}>
      <Icon size={24} strokeWidth={1.75} style={{ color: C.danger, opacity: 0.85 }} aria-hidden />
      <p style={{ color: C.textS, fontSize: 14, lineHeight: 1.5, marginTop: 10 }}>{text}</p>
    </div>
  )
}

function BeneficiosSection() {
  const { ref: tRef, revealed: tRev } = useReveal<HTMLDivElement>()

  return (
    <section className="ph-section" id="beneficios">
      <div className="ph-container">
        <div ref={tRef} className="text-center ph-reveal" data-reveal={tRev ? '1' : '0'}>
          <h2 className="ph-h2">Tudo que você faz em horas,<br /><span style={{ color: C.primary }}>o PersonalHub faz em minutos</span></h2>
          <p className="ph-subtitle">O app que faz em 2 minutos o que você leva 2 horas.</p>
        </div>

        <BigBenefit
          num="01"
          catIcon={Calculator} catLabel="CÁLCULO"
          title="Cálculo automático de aulas"
          desc='Acabou o "quantas segundas tem em maio?" O app conta os dias exatos do mês. Zero conta manual.'
          mockup={<MockupCalculo />}
          reverse={false}
        />

        <BigBenefit
          num="02"
          catIcon={MessageSquare} catLabel="COBRANÇA"
          title="Cobrança pronta no WhatsApp"
          desc="Mensagem com datas, valor e Pix gerada em um toque. Não digita mais nada."
          mockup={<MockupCobranca />}
          reverse={true}
        />

        <BigBenefit
          num="03"
          catIcon={TrendingUp} catLabel="FINANCEIRO"
          title="Seu lucro real, não estimativa"
          desc="Quanto entrou, quanto saiu, quanto sobrou. Sem chute."
          mockup={<MockupFinanceiro />}
          reverse={false}
        />

        {/* Carrossel horizontal — 3 complementares */}
        <div className="ph-carousel">
          {[
            { Icon: Calendar,   t: 'Agenda inteligente',     d: 'Sua semana inteira na tela. Quem, onde e que horas.' },
            { Icon: RefreshCw,  t: 'Reposições sob controle', d: 'Prazo, crédito e alerta automático. Nenhuma aula se perde.' },
            { Icon: PlusCircle, t: 'Aulas extras na cobrança', d: 'Marcou aula extra? Já entra na cobrança do próximo mês. Esquecimento zero.' },
          ].map((c, i) => (
            <SmallBenefitCard key={i} Icon={c.Icon} title={c.t} desc={c.d} delay={i * 120} />
          ))}
        </div>
      </div>
    </section>
  )
}

function BigBenefit({
  num, catIcon: CatIcon, catLabel, title, desc, mockup, reverse,
}: {
  num: string
  catIcon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean }>
  catLabel: string
  title: string
  desc: string
  mockup: React.ReactNode
  reverse: boolean
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="ph-big-benefit ph-reveal" data-reveal={revealed ? '1' : '0'}
      data-reverse={reverse ? '1' : '0'}>
      <span className="ph-big-benefit-num">{num}</span>

      <div className="ph-big-benefit-text">
        <span className="ph-big-benefit-badge">
          <CatIcon size={12} strokeWidth={2} style={{ color: C.primary }} aria-hidden />
          {catLabel}
        </span>
        <h3 className="ph-big-benefit-h3">{title}</h3>
        <p className="ph-big-benefit-desc">{desc}</p>
      </div>
      <div className="ph-big-benefit-mockup">{mockup}</div>
    </div>
  )
}

function SmallBenefitCard({
  Icon, title, desc, delay,
}: {
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; style?: React.CSSProperties; 'aria-hidden'?: boolean }>
  title: string; desc: string; delay: number
}) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="ph-small-card ph-reveal" data-reveal={revealed ? '1' : '0'}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="w-10 h-10 rounded-xl flex items-center justify-center mb-3"
        style={{ background: 'rgba(16, 185, 129, 0.12)' }}>
        <Icon size={18} strokeWidth={1.75} style={{ color: C.primary }} aria-hidden />
      </div>
      <h4 className="font-bold text-sm" style={{ color: C.textP }}>{title}</h4>
      <p className="text-xs mt-1" style={{ color: C.textS, lineHeight: 1.5 }}>{desc}</p>
    </div>
  )
}

function ModulosSection() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  const modulos = ['Dashboard','Alunos','Agenda','Cálculo','Cobrança','Aulas Extras','Reposições','Financeiro']
  return (
    <section className="ph-section" id="modulos">
      <div className="ph-container text-center">
        <h2 className="ph-h2">Tudo que um personal trainer precisa.<br /><span style={{ color: C.textS }}>Nada além disso.</span></h2>
        <div ref={ref} className="ph-modulos ph-reveal" data-reveal={revealed ? '1' : '0'}>
          {modulos.map((m, i) => (
            <span key={m} className="ph-modulo-pill" style={{ transitionDelay: `${i * 50}ms` }}>{m}</span>
          ))}
        </div>
        <div style={{ marginTop: 40 }}>
          <CtaButton href="/register" large>Ver tudo em ação — 7 dias grátis</CtaButton>
        </div>
      </div>
    </section>
  )
}

function CredibilidadeSection() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section className="ph-section" style={{ paddingTop: 40, paddingBottom: 40 }}>
      <div className="ph-container ph-cred" ref={ref} data-reveal={revealed ? '1' : '0'}>
        <span className="ph-cred-quote" aria-hidden>“</span>
        <div className="ph-cred-inner">
          <div className="ph-cred-avatar">GB</div>
          <div className="ph-cred-text">
            <p className="ph-cred-tag">FEITO POR UM PERSONAL, PRA PERSONAL</p>
            <p className="ph-cred-body">
              Eu também dou aula. Também cansei de planilha, caderno e calculadora.
              Construí o PersonalHub pra resolver o meu problema primeiro — agora resolve o seu também.
            </p>
            <p className="ph-cred-sig">— Gabriel, fundador do PersonalHub e personal trainer</p>
          </div>
        </div>
      </div>
    </section>
  )
}

function ComparacaoSection() {
  const trans = [
    { from: 'Calculadora todo mês',        to: 'Automático e exato' },
    { from: 'Planilha ou bloco de notas',  to: 'Cadastro completo com histórico' },
    { from: 'Digitar mensagem por mensagem', to: '1 toque, Pix incluso' },
    { from: 'Esquece a remarcação',         to: 'Prazo, alerta e crédito automático' },
    { from: 'Não sabe o lucro real',        to: 'Custos, faturamento e margem' },
    { from: 'Esquece aula extra e perde',   to: 'Somada na cobrança automaticamente' },
  ]
  return (
    <section className="ph-section-overlap" style={{ background: C.surface }}>
      <div className="ph-container">
        <h2 className="ph-h2 text-center">Dois jeitos de trabalhar.<br /><span style={{ color: C.primary }}>Qual é o seu?</span></h2>
        <div className="ph-comp-list">
          {trans.map((t, i) => (
            <ComparacaoItem key={i} from={t.from} to={t.to} delay={i * 200} />
          ))}
        </div>
      </div>
    </section>
  )
}

function ComparacaoItem({ from, to, delay }: { from: string; to: string; delay: number }) {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <div ref={ref} className="ph-comp-item ph-reveal" data-reveal={revealed ? '1' : '0'}
      style={{ transitionDelay: `${delay}ms` }}>
      <div className="ph-comp-negative">
        <span className="ph-comp-x">✕</span>
        <span className="ph-comp-from"><span>{from}</span></span>
      </div>
      <div className="ph-comp-arrow">
        <ArrowRight size={18} strokeWidth={2.5} aria-hidden />
      </div>
      <div className="ph-comp-positive">
        <span className="ph-comp-check"><Check size={12} strokeWidth={3} style={{ color: '#fff' }} aria-hidden /></span>
        <span>{to}</span>
      </div>
    </div>
  )
}

function FaqSection() {
  const faqs = [
    { q: 'Demora muito pra cadastrar meus alunos?',
      a: 'Não. Você pode cadastrar só nome, dias, horário e valor — leva 30 segundos por aluno. Ou manda um link pro próprio aluno preencher os dados dele.' },
    { q: 'Funciona no celular?',
      a: 'Sim. Funciona direto no navegador do celular, tablet e computador. Sem instalar nada.' },
    { q: 'E se eu der aula extra ou remarcar? Preciso recalcular tudo?',
      a: 'Não. Marcou aula extra ou remarcou na agenda, a cobrança se ajusta sozinha. Zero retrabalho.' },
    { q: 'Cada aluno meu tem preço, dias e cobrança diferente. Consigo configurar individual?',
      a: 'Sim. Cada aluno tem sua própria configuração: valor, dias, horários, modelo de cobrança (por aula, mensalidade ou pacote). Tudo individual.' },
    { q: 'Meus dados e dos meus alunos ficam seguros?',
      a: 'Sim. Seus dados são criptografados, cada professor só acessa seus próprios alunos, e o sistema faz backups automáticos.' },
    { q: 'Tem período de teste?',
      a: 'Sim. 7 dias grátis com acesso a todas as funcionalidades, sem precisar de cartão.' },
    { q: 'Posso cancelar quando quiser?',
      a: 'Sim. Sem fidelidade, sem multa. Cancele a qualquer momento.' },
    { q: 'E se eu trocar de celular?',
      a: 'Nada muda. Seus dados ficam na nuvem. Abriu o navegador em qualquer aparelho, fez login e tudo está lá.' },
  ]
  return (
    <section className="ph-section" id="faq">
      <div className="ph-container" style={{ maxWidth: 720 }}>
        <h2 className="ph-h2 text-center">Perguntas frequentes</h2>
        <div className="ph-faq-list">
          {faqs.map((f, i) => <FaqItem key={i} q={f.q} a={f.a} />)}
        </div>
      </div>
    </section>
  )
}

function FaqItem({ q, a }: { q: string; a: string }) {
  const [open, setOpen] = useState(false)
  return (
    <button className="ph-faq-item" onClick={() => setOpen(v => !v)} data-open={open ? '1' : '0'}>
      <div className="ph-faq-q">
        <span>{q}</span>
        <Plus size={18} strokeWidth={2} className="ph-faq-icon" aria-hidden />
      </div>
      <div className="ph-faq-a-wrap">
        <p className="ph-faq-a">{a}</p>
      </div>
    </button>
  )
}

function CtaFinal() {
  const { ref, revealed } = useReveal<HTMLDivElement>()
  return (
    <section id="preco" className="ph-cta-final" ref={ref} data-reveal={revealed ? '1' : '0'}>
      <div className="ph-container text-center">
        <h2 className="ph-cta-h2">
          Comece a gerenciar seus alunos e ter o controle de suas finanças como profissional
        </h2>
        <p className="ph-cta-sub">Seu próximo fechamento pode levar 2 minutos.</p>
        <CtaButton href="/register" large dark>Começar meu teste grátis</CtaButton>
        <p className="ph-cta-small">Sem cartão · Cancele quando quiser · Pronto em 2 minutos</p>
        <p className="ph-cta-whisper">
          O primeiro mês que você fecha com o PersonalHub, você nunca mais volta.
        </p>
      </div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="ph-footer">
      <div className="ph-container ph-footer-inner">
        <div className="flex items-center gap-2">
          <span className="ph-nav-logo" style={{ width: 24, height: 24, fontSize: 10 }}>PH</span>
          <span className="text-xs font-semibold" style={{ color: C.textP }}>PersonalHub</span>
        </div>
        <div className="ph-footer-links">
          <button onClick={() => document.getElementById('funcionalidades')?.scrollIntoView({ behavior: 'smooth' })}>Funcionalidades</button>
          <button onClick={() => document.getElementById('faq')?.scrollIntoView({ behavior: 'smooth' })}>FAQ</button>
          <Link href="/login">Entrar</Link>
        </div>
        <div className="text-xs" style={{ color: C.textM }}>© 2026 PersonalHub</div>
      </div>
    </footer>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  MAIN
// ═════════════════════════════════════════════════════════════════════════════

export default function LandingPage() {
  return (
    <div className="ph-landing">
      <Styles />
      <PromoBar />
      <Navbar />
      <Hero />
      <DorSection />
      <BeneficiosSection />
      <ModulosSection />
      <CredibilidadeSection />
      <ComparacaoSection />
      <FaqSection />
      <CtaFinal />
      <Footer />
    </div>
  )
}

// ═════════════════════════════════════════════════════════════════════════════
//  ESTILOS GLOBAIS (scoped à landing via .ph-landing)
// ═════════════════════════════════════════════════════════════════════════════

function Styles() {
  return (
    <style jsx global>{`
      .ph-landing {
        background: ${C.bg};
        color: ${C.textP};
        min-height: 100vh;
        overflow-x: hidden;
        font-family: var(--font-geist), -apple-system, sans-serif;
      }

      .ph-container {
        max-width: 1200px;
        margin: 0 auto;
        padding: 0 20px;
      }
      @media (min-width: 768px) {
        .ph-container { padding: 0 32px; }
      }

      /* ═══ Promo bar ═══ */
      .ph-promo {
        position: relative;
        z-index: 40;
        background: ${C.surface};
        color: ${C.textP};
        padding: 10px 16px;
        text-align: center;
        font-size: 12px;
        font-weight: 500;
        border-bottom: 1px solid ${C.border};
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 8px;
        flex-wrap: wrap;
      }
      .ph-promo-code {
        background: ${C.primary};
        color: #000;
        padding: 2px 10px;
        border-radius: 99px;
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.02em;
      }

      /* ═══ Navbar ═══ */
      .ph-nav {
        position: sticky; top: 0; z-index: 30;
        background: rgba(11, 15, 25, 0.6);
        backdrop-filter: blur(14px);
        -webkit-backdrop-filter: blur(14px);
        transition: box-shadow 0.3s, background 0.3s;
      }
      .ph-nav[data-scrolled="1"] {
        background: rgba(11, 15, 25, 0.85);
        box-shadow: 0 2px 20px rgba(0,0,0,0.4);
      }
      .ph-nav-inner {
        max-width: 1200px; margin: 0 auto;
        padding: 14px 20px;
        display: flex; align-items: center; justify-content: space-between;
        gap: 16px;
      }
      @media (min-width: 768px) { .ph-nav-inner { padding: 16px 32px; } }
      .ph-nav-logo {
        width: 30px; height: 30px; border-radius: 8px;
        background: ${C.primary}; color: #fff;
        display: inline-flex; align-items: center; justify-content: center;
        font-weight: 800; font-size: 11px;
      }
      .ph-nav-links {
        display: none;
        background: ${C.bg};
        border: 1px solid ${C.border};
        border-radius: 99px;
        padding: 4px;
        gap: 0;
      }
      @media (min-width: 900px) { .ph-nav-links { display: flex; } }
      .ph-nav-link {
        padding: 6px 16px;
        border-radius: 99px;
        font-size: 13px; font-weight: 500;
        color: ${C.textS};
        background: transparent; border: none;
        cursor: pointer;
        transition: color 0.2s, background 0.2s;
      }
      .ph-nav-link:hover { color: ${C.textP}; background: ${C.surface}; }
      .ph-nav-entrar {
        background: ${C.primary}; color: #fff;
        padding: 8px 18px; border-radius: 99px;
        font-size: 13px; font-weight: 600;
        transition: background 0.2s, transform 0.15s;
      }
      .ph-nav-entrar:hover { background: ${C.primaryDk}; transform: translateY(-1px); }
      .ph-nav-hamburger {
        display: inline-flex; align-items: center; justify-content: center;
        width: 36px; height: 36px; border-radius: 8px;
        background: ${C.surface}; border: 1px solid ${C.border};
        color: ${C.textP}; cursor: pointer;
      }
      @media (min-width: 900px) { .ph-nav-hamburger { display: none; } }
      .ph-nav-mobile {
        background: ${C.surface};
        border-top: 1px solid ${C.border};
        padding: 8px 20px 16px;
        display: flex; flex-direction: column;
        animation: phFadeIn 0.2s ease-out;
      }
      @media (min-width: 900px) { .ph-nav-mobile { display: none; } }
      .ph-nav-mobile-link {
        background: transparent; border: none;
        text-align: left;
        padding: 12px 4px;
        color: ${C.textP}; font-size: 14px; font-weight: 500;
        border-bottom: 1px solid ${C.border};
        cursor: pointer;
      }

      /* ═══ CTA ═══ */
      .ph-cta {
        display: inline-flex; align-items: center; justify-content: center;
        gap: 8px;
        background: ${C.primary}; color: #fff;
        padding: 14px 28px;
        border-radius: 99px;
        font-weight: 700; font-size: 14px;
        transition: all 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        box-shadow: 0 0 0 0 rgba(16, 185, 129, 0);
      }
      .ph-cta[data-large="1"] { padding: 16px 32px; font-size: 15px; }
      .ph-cta[data-dark="1"]  { background: ${C.bg}; color: #fff; }
      .ph-cta:hover {
        background: ${C.primaryDk};
        transform: translateY(-2px) scale(1.02);
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.35);
      }
      .ph-cta[data-dark="1"]:hover {
        background: #000;
        box-shadow: 0 8px 32px rgba(0,0,0,0.6);
      }

      /* ═══ Seções ═══ */
      .ph-section { padding: 80px 0; position: relative; }
      .ph-section-overlap {
        padding: 80px 0;
        position: relative;
        border-top-left-radius: 40px;
        border-top-right-radius: 40px;
        margin-top: -40px;
      }
      @media (min-width: 768px) {
        .ph-section { padding: 120px 0; }
        .ph-section-overlap { padding: 120px 0; border-top-left-radius: 48px; border-top-right-radius: 48px; }
      }
      .ph-h2 {
        font-size: clamp(26px, 5vw, 44px);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: ${C.textP};
      }
      .ph-subtitle {
        font-size: 16px;
        color: ${C.textS};
        margin-top: 14px;
        max-width: 600px;
        margin-left: auto; margin-right: auto;
      }

      /* ═══ Reveal animations ═══ */
      .ph-reveal {
        opacity: 0;
        transform: translateY(24px);
        transition: opacity 0.7s cubic-bezier(0.16, 1, 0.3, 1),
                    transform 0.7s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ph-reveal[data-reveal="1"] {
        opacity: 1;
        transform: translateY(0);
      }

      /* ═══ Mesh background ═══ */
      .ph-mesh {
        position: absolute;
        inset: 0;
        pointer-events: none;
        overflow: hidden;
      }
      .ph-mesh::before, .ph-mesh::after {
        content: '';
        position: absolute;
        width: 500px; height: 500px;
        border-radius: 50%;
        filter: blur(100px);
        opacity: 0.35;
      }
      .ph-mesh::before {
        background: ${C.primary};
        top: -200px; right: -100px;
      }
      .ph-mesh::after {
        background: ${C.primaryDk};
        top: 100px; left: -150px;
        opacity: 0.2;
      }

      /* ═══ Hero ═══ */
      .ph-hero {
        position: relative;
        padding: 60px 0 40px;
        overflow: hidden;
      }
      @media (min-width: 768px) { .ph-hero { padding: 80px 0 60px; } }
      .ph-hero-inner {
        position: relative;
        display: grid;
        grid-template-columns: 1fr;
        gap: 40px;
        align-items: center;
      }
      @media (min-width: 900px) {
        .ph-hero-inner { grid-template-columns: 1.1fr 1fr; gap: 60px; }
      }
      .ph-hero-left { display: flex; flex-direction: column; gap: 24px; }
      .ph-hero-h1 {
        font-size: clamp(32px, 6vw, 56px);
        font-weight: 800;
        line-height: 1.05;
        letter-spacing: -0.03em;
        color: ${C.textP};
      }
      .ph-hero-sub {
        font-size: clamp(15px, 2vw, 18px);
        color: ${C.textS};
        line-height: 1.6;
        max-width: 540px;
      }
      .ph-hero-price {
        display: inline-flex;
        align-items: baseline;
        gap: 6px;
        padding: 8px 14px;
        border-radius: 99px;
        background: ${C.surface};
        border: 1px solid ${C.border};
        font-size: 13px;
        align-self: flex-start;
      }
      .ph-hero-right {
        display: flex; justify-content: center;
      }
      .ph-hero-benefits {
        margin-top: 60px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      @media (min-width: 768px) {
        .ph-hero-benefits { grid-template-columns: repeat(3, 1fr); gap: 20px; }
      }

      /* ═══ Phone frame ═══ */
      .ph-phone {
        position: relative;
        width: 280px;
        max-width: 100%;
        aspect-ratio: 9 / 19;
        background: #000;
        border-radius: 36px;
        padding: 8px;
        box-shadow:
          0 20px 60px rgba(16, 185, 129, 0.2),
          0 40px 80px rgba(0,0,0,0.5),
          inset 0 0 0 1px rgba(255,255,255,0.06);
      }
      @media (min-width: 768px) { .ph-phone { width: 300px; } }
      .ph-phone-notch {
        position: absolute;
        top: 12px; left: 50%;
        transform: translateX(-50%);
        width: 80px; height: 22px;
        border-radius: 99px;
        background: #000;
        z-index: 2;
      }
      .ph-phone-screen {
        background: ${C.bg};
        border-radius: 28px;
        height: 100%;
        overflow: hidden;
      }

      /* ═══ Cards ═══ */
      .ph-card {
        background: ${C.surface};
        border: 1px solid ${C.border};
        border-radius: 16px;
        transition: border-color 0.3s, box-shadow 0.3s, transform 0.3s;
      }
      .ph-card:hover {
        border-color: rgba(16, 185, 129, 0.4);
        box-shadow: 0 8px 32px rgba(16, 185, 129, 0.12);
        transform: translateY(-2px);
      }

      /* ═══ Dor section ═══ */
      .ph-dor-grid {
        margin-top: 48px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 14px;
      }
      @media (min-width: 600px) { .ph-dor-grid { grid-template-columns: repeat(2, 1fr); } }
      @media (min-width: 900px) { .ph-dor-grid { grid-template-columns: repeat(3, 1fr); } }
      .ph-dor-card {
        background: ${C.bg};
        border: 1px solid ${C.border};
        border-radius: 16px;
        padding: 22px;
      }
      .ph-dor-transicao {
        margin-top: 56px;
        text-align: center;
        font-size: clamp(22px, 4vw, 34px);
        font-weight: 800;
        color: ${C.primary};
        letter-spacing: -0.02em;
      }

      /* ═══ Big benefit ═══ */
      .ph-big-benefit {
        position: relative;
        display: grid;
        grid-template-columns: 1fr;
        gap: 32px;
        padding: 60px 0;
        align-items: center;
      }
      @media (min-width: 900px) {
        .ph-big-benefit { grid-template-columns: 1fr 1fr; gap: 80px; padding: 80px 0; }
        .ph-big-benefit[data-reverse="1"] .ph-big-benefit-text { order: 2; }
        .ph-big-benefit[data-reverse="1"] .ph-big-benefit-mockup { order: 1; }
      }
      .ph-big-benefit-num {
        position: absolute;
        top: 20px; right: 0;
        font-size: clamp(80px, 12vw, 160px);
        font-weight: 900;
        color: ${C.surface};
        line-height: 1;
        z-index: 0;
        pointer-events: none;
        letter-spacing: -0.05em;
      }
      .ph-big-benefit-text { position: relative; z-index: 1; }
      .ph-big-benefit-badge {
        display: inline-flex; align-items: center; gap: 8px;
        padding: 6px 12px;
        border-radius: 99px;
        background: ${C.surface};
        border: 1px solid ${C.border};
        font-size: 11px; font-weight: 700;
        color: ${C.textS};
        letter-spacing: 0.08em;
      }
      .ph-big-benefit-h3 {
        margin-top: 18px;
        font-size: clamp(24px, 4vw, 36px);
        font-weight: 800;
        line-height: 1.15;
        letter-spacing: -0.02em;
        color: ${C.textP};
      }
      .ph-big-benefit-desc {
        margin-top: 14px;
        font-size: 16px;
        color: ${C.textS};
        line-height: 1.65;
        max-width: 480px;
      }
      .ph-big-benefit-mockup {
        display: flex; justify-content: center;
        position: relative; z-index: 1;
      }

      /* ═══ Small cards carousel ═══ */
      .ph-carousel {
        margin-top: 40px;
        display: grid;
        grid-template-columns: 1fr;
        gap: 16px;
      }
      @media (min-width: 900px) {
        .ph-carousel { grid-template-columns: repeat(3, 1fr); }
      }
      @media (max-width: 899px) {
        .ph-carousel {
          display: flex;
          overflow-x: auto;
          scroll-snap-type: x mandatory;
          padding: 4px 0 20px;
          gap: 14px;
        }
        .ph-carousel > * {
          flex: 0 0 80%;
          scroll-snap-align: start;
        }
      }
      .ph-small-card {
        background: ${C.surface};
        border: 1px solid ${C.border};
        border-radius: 16px;
        padding: 20px;
        transition: border-color 0.3s, transform 0.3s;
      }
      .ph-small-card:hover { border-color: rgba(16, 185, 129, 0.4); transform: translateY(-2px); }

      /* ═══ Módulos ═══ */
      .ph-modulos {
        display: flex;
        flex-wrap: wrap;
        justify-content: center;
        gap: 10px;
        margin-top: 40px;
      }
      .ph-modulo-pill {
        padding: 10px 20px;
        border-radius: 99px;
        background: ${C.surface};
        border: 1px solid ${C.border};
        color: ${C.textP};
        font-size: 14px; font-weight: 500;
        transition: all 0.2s;
        cursor: default;
      }
      .ph-modulo-pill:hover {
        background: rgba(16, 185, 129, 0.12);
        border-color: ${C.primary};
        color: ${C.primary};
      }

      /* ═══ Credibilidade ═══ */
      .ph-cred {
        position: relative;
        max-width: 760px;
        padding: 80px 20px;
      }
      .ph-cred-inner {
        display: flex;
        align-items: center;
        gap: 24px;
        flex-direction: column;
        text-align: center;
      }
      @media (min-width: 700px) {
        .ph-cred-inner { flex-direction: row; text-align: left; }
      }
      .ph-cred-quote {
        position: absolute;
        top: 0; left: 20px;
        font-size: clamp(100px, 18vw, 200px);
        font-weight: 900;
        color: ${C.primary};
        opacity: 0.12;
        line-height: 1;
        pointer-events: none;
      }
      .ph-cred-avatar {
        width: 90px; height: 90px;
        border-radius: 50%;
        background: ${C.primary};
        color: #fff;
        display: flex; align-items: center; justify-content: center;
        font-size: 28px; font-weight: 800;
        border: 2px solid ${C.border};
        flex-shrink: 0;
      }
      .ph-cred-text { flex: 1; position: relative; z-index: 1; }
      .ph-cred-tag {
        font-size: 11px;
        font-weight: 700;
        letter-spacing: 0.12em;
        color: ${C.primary};
      }
      .ph-cred-body {
        margin-top: 14px;
        font-size: clamp(16px, 2vw, 19px);
        line-height: 1.6;
        color: ${C.textP};
      }
      .ph-cred-sig {
        margin-top: 12px;
        font-size: 13px;
        color: ${C.textS};
      }

      /* ═══ Comparação ═══ */
      .ph-comp-list {
        margin-top: 56px;
        display: flex;
        flex-direction: column;
        gap: 20px;
        max-width: 900px;
        margin-left: auto; margin-right: auto;
      }
      .ph-comp-item {
        display: grid;
        grid-template-columns: 1fr;
        gap: 10px;
        background: ${C.bg};
        border: 1px solid ${C.border};
        border-radius: 16px;
        padding: 18px;
      }
      @media (min-width: 700px) {
        .ph-comp-item {
          grid-template-columns: 1fr auto 1fr;
          gap: 16px;
          padding: 20px 24px;
          align-items: center;
        }
      }
      .ph-comp-negative {
        display: flex; align-items: center; gap: 10px;
      }
      .ph-comp-x {
        color: ${C.danger}; font-weight: 800;
        opacity: 0.8;
      }
      .ph-comp-from {
        position: relative;
        color: rgba(239, 68, 68, 0.55);
        font-size: 14px;
      }
      .ph-comp-from::after {
        content: '';
        position: absolute;
        left: 0; top: 50%;
        height: 2px;
        background: ${C.danger};
        width: 0%;
        transition: width 0.6s cubic-bezier(0.16, 1, 0.3, 1) 0.4s;
      }
      .ph-comp-item[data-reveal="1"] .ph-comp-from::after { width: 100%; }
      .ph-comp-item[data-reveal="1"] .ph-comp-from { color: rgba(239, 68, 68, 0.3); }
      .ph-comp-arrow {
        display: flex; align-items: center; justify-content: center;
        color: ${C.primary};
        transform: scale(0);
        transition: transform 0.4s cubic-bezier(0.34, 1.56, 0.64, 1) 0.7s;
      }
      @media (max-width: 699px) { .ph-comp-arrow { transform: rotate(90deg) scale(0); } }
      .ph-comp-item[data-reveal="1"] .ph-comp-arrow { transform: scale(1); }
      @media (max-width: 699px) { .ph-comp-item[data-reveal="1"] .ph-comp-arrow { transform: rotate(90deg) scale(1); } }
      .ph-comp-positive {
        display: flex; align-items: center; gap: 10px;
        color: #fff; font-weight: 600; font-size: 15px;
        opacity: 0;
        transform: translateX(-12px);
        transition: opacity 0.5s ease 0.9s, transform 0.5s cubic-bezier(0.16,1,0.3,1) 0.9s;
      }
      .ph-comp-item[data-reveal="1"] .ph-comp-positive { opacity: 1; transform: translateX(0); }
      .ph-comp-check {
        width: 22px; height: 22px;
        border-radius: 50%;
        background: ${C.primary};
        display: inline-flex; align-items: center; justify-content: center;
        box-shadow: 0 0 0 4px rgba(16, 185, 129, 0.15);
        flex-shrink: 0;
      }

      /* ═══ FAQ ═══ */
      .ph-faq-list { margin-top: 40px; }
      .ph-faq-item {
        display: block;
        width: 100%;
        text-align: left;
        background: transparent;
        border: none;
        border-bottom: 1px solid ${C.border};
        padding: 0;
        cursor: pointer;
        color: inherit;
      }
      .ph-faq-q {
        display: flex; align-items: center; justify-content: space-between;
        padding: 20px 4px;
        font-size: 15px; font-weight: 600;
        color: ${C.textP};
      }
      .ph-faq-icon {
        transition: transform 0.3s cubic-bezier(0.16, 1, 0.3, 1);
        color: ${C.textS};
      }
      .ph-faq-item[data-open="1"] .ph-faq-icon {
        transform: rotate(45deg);
        color: ${C.primary};
      }
      .ph-faq-a-wrap {
        display: grid;
        grid-template-rows: 0fr;
        transition: grid-template-rows 0.3s cubic-bezier(0.16, 1, 0.3, 1);
      }
      .ph-faq-item[data-open="1"] .ph-faq-a-wrap { grid-template-rows: 1fr; }
      .ph-faq-a {
        overflow: hidden;
        color: ${C.textS};
        font-size: 14px;
        line-height: 1.65;
        padding: 0 4px 0 4px;
      }
      .ph-faq-item[data-open="1"] .ph-faq-a { padding-bottom: 20px; }

      /* ═══ CTA final ═══ */
      .ph-cta-final {
        background: ${C.primary};
        padding: 80px 20px;
        text-align: center;
        border-top-left-radius: 48px;
        border-top-right-radius: 48px;
        margin-top: -48px;
      }
      @media (min-width: 768px) { .ph-cta-final { padding: 100px 32px; } }
      .ph-cta-h2 {
        font-size: clamp(26px, 4.5vw, 42px);
        font-weight: 800;
        line-height: 1.1;
        letter-spacing: -0.02em;
        color: ${C.bg};
        max-width: 780px;
        margin: 0 auto;
      }
      .ph-cta-sub {
        margin-top: 18px;
        font-size: 17px;
        color: rgba(11, 15, 25, 0.8);
      }
      .ph-cta-final .ph-cta {
        margin-top: 32px;
      }
      .ph-cta-small {
        margin-top: 14px;
        font-size: 12px;
        color: rgba(11, 15, 25, 0.7);
      }
      .ph-cta-whisper {
        margin-top: 40px;
        font-size: 14px;
        font-style: italic;
        color: rgba(11, 15, 25, 0.6);
        max-width: 520px; margin-left: auto; margin-right: auto;
      }

      /* ═══ Footer ═══ */
      .ph-footer {
        background: ${C.bg};
        padding: 32px 20px;
        border-top: 1px solid ${C.border};
      }
      .ph-footer-inner {
        display: flex;
        align-items: center;
        justify-content: space-between;
        flex-wrap: wrap;
        gap: 16px;
      }
      .ph-footer-links {
        display: flex;
        gap: 20px;
        flex-wrap: wrap;
      }
      .ph-footer-links button,
      .ph-footer-links a {
        background: transparent; border: none;
        color: ${C.textM};
        font-size: 13px;
        cursor: pointer;
        transition: color 0.2s;
      }
      .ph-footer-links button:hover,
      .ph-footer-links a:hover { color: ${C.textP}; }

      /* ═══ Keyframes ═══ */
      @keyframes phFadeIn {
        from { opacity: 0; transform: translateY(-8px); }
        to   { opacity: 1; transform: translateY(0); }
      }
    `}</style>
  )
}
