import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = ['gabrielbianchetti@hotmail.com', 'suporte.personalhub@outlook.com']

// Cache curto do resultado do check de assinatura (cookie). Evita N queries
// Supabase pra cada navegação. 3 min é suficiente — quando a assinatura muda
// de status, os server actions que alteram assinatura limpam esse cookie.
const ASSINATURA_CACHE_COOKIE = 'ph-assin-ok'
const CACHE_TTL_SECONDS = 3 * 60

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl

  // ── Fast-path: rotas que não precisam de nenhum check Supabase ────────────
  // API routes de Stripe, webhooks e assets internos.
  if (pathname.startsWith('/api/')) {
    return NextResponse.next({ request })
  }

  let supabaseResponse = NextResponse.next({ request })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            supabaseResponse.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  const {
    data: { user },
  } = await supabase.auth.getUser()

  const authRoutes = ['/login', '/register', '/forgot-password', '/register/success']

  // ── Unauthenticated: redirect to /login (except public routes) ────────────
  if (!user && !authRoutes.includes(pathname) && pathname !== '/') {
    const url = request.nextUrl.clone()
    url.pathname = '/login'
    return NextResponse.redirect(url)
  }

  // ── Authenticated on auth pages: redirect to dashboard ───────────────────
  if (user && authRoutes.includes(pathname)) {
    const url = request.nextUrl.clone()
    url.pathname = '/dashboard'
    return NextResponse.redirect(url)
  }

  // ── Dashboard routes: verify subscription ────────────────────────────────
  if (user && pathname.startsWith('/dashboard')) {
    // Admin sempre tem acesso (sem query ao banco)
    if (ADMIN_EMAILS.includes(user.email ?? '')) {
      return supabaseResponse
    }

    // Modo demo — pula verificação de assinatura
    if (request.cookies.get('ph-demo-mode')?.value === '1') {
      return supabaseResponse
    }

    // Cache curto: se o cookie "ok" estiver setado, libera sem ir ao Supabase
    if (request.cookies.get(ASSINATURA_CACHE_COOKIE)?.value === '1') {
      return supabaseResponse
    }

    const { data: assinatura } = await supabase
      .from('assinaturas')
      .select('status, trial_fim, periodo_fim')
      .eq('professor_id', user.id)
      .maybeSingle()

    // No record yet → first visit, dashboard layout will create the trial
    if (!assinatura) {
      return supabaseResponse
    }

    const now = new Date()
    const { status, trial_fim, periodo_fim } = assinatura as {
      status: string
      trial_fim: string | null
      periodo_fim: string | null
    }

    // Access allowed conditions
    const allowed =
      status === 'active' ||
      status === 'past_due' ||   // banner warns them
      (status === 'trial'    && trial_fim   && new Date(trial_fim)   > now) ||
      (status === 'canceled' && periodo_fim && new Date(periodo_fim) > now)

    if (allowed) {
      // Grava cache pra próximas navegações (TTL curto)
      supabaseResponse.cookies.set(ASSINATURA_CACHE_COOKIE, '1', {
        maxAge: CACHE_TTL_SECONDS,
        httpOnly: false,
        sameSite: 'lax',
        path: '/',
      })
      return supabaseResponse
    }

    // Expired → redirect to subscription page
    return NextResponse.redirect(new URL('/assinar', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
