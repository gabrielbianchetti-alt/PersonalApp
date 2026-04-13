import { createServerClient } from '@supabase/ssr'
import { NextResponse, type NextRequest } from 'next/server'

const ADMIN_EMAIL = 'gabrielbianchetti@hotmail.com'

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Only intercept dashboard routes
  if (!pathname.startsWith('/dashboard')) {
    return NextResponse.next()
  }

  // Build a Supabase client that can read/refresh session cookies
  let response = NextResponse.next({ request })

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
          response = NextResponse.next({ request })
          cookiesToSet.forEach(({ name, value, options }) =>
            response.cookies.set(name, value, options)
          )
        },
      },
    }
  )

  // Get authenticated user (validates JWT, refreshes session if needed)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // Admin always passes through
  if (user.email === ADMIN_EMAIL) {
    return response
  }

  // Check the assinatura record
  const { data: assinatura } = await supabase
    .from('assinaturas')
    .select('status, trial_fim, periodo_fim')
    .eq('professor_id', user.id)
    .maybeSingle()

  // No record yet → first access, let dashboard layout create it
  if (!assinatura) {
    return response
  }

  const now = new Date()
  const { status, trial_fim, periodo_fim } = assinatura as {
    status: string
    trial_fim: string | null
    periodo_fim: string | null
  }

  // Access allowed
  if (status === 'active') return response
  if (status === 'past_due') return response  // banner warns them
  if (status === 'trial' && trial_fim && new Date(trial_fim) > now) return response
  if (status === 'canceled' && periodo_fim && new Date(periodo_fim) > now) return response

  // Expired — redirect to subscription page
  return NextResponse.redirect(new URL('/assinar', request.url))
}

export const config = {
  matcher: ['/dashboard/:path*'],
}
