import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAILS = ['gabrielbianchetti@hotmail.com', 'suporte.personalhub@outlook.com']

export async function proxy(request: NextRequest) {
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

  const { pathname } = request.nextUrl
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
    // Admin always has access
    if (ADMIN_EMAILS.includes(user.email ?? '')) {
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
    if (status === 'active') return supabaseResponse
    if (status === 'past_due') return supabaseResponse  // banner warns them
    if (status === 'trial' && trial_fim && new Date(trial_fim) > now) return supabaseResponse
    if (status === 'canceled' && periodo_fim && new Date(periodo_fim) > now) return supabaseResponse

    // Expired → redirect to subscription page
    return NextResponse.redirect(new URL('/assinar', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)'],
}
