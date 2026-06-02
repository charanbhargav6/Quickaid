import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  let supabaseResponse = NextResponse.next({
    request: {
      headers: request.headers,
    },
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll()
        },
        setAll(cookiesToSet) {
          cookiesToSet.forEach(({ name, value, options }) => request.cookies.set(name, value))
          supabaseResponse = NextResponse.next({
            request,
          })
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

  const url = request.nextUrl
  
  // Public routes that don't need auth checking
  if (url.pathname === '/' || url.pathname.startsWith('/login') || url.pathname.startsWith('/signup')) {
    return supabaseResponse
  }

  // Redirect unauthenticated users
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // RBAC checks
  const role = user.app_metadata?.role || 'user'
  
  if (url.pathname.startsWith('/admin') && role !== 'admin') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (url.pathname.startsWith('/helper') && role !== 'helper') {
    return NextResponse.redirect(new URL('/login', request.url))
  }
  if (url.pathname.startsWith('/seeker') && role !== 'seeker') {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
}
