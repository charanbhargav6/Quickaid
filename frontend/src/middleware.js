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
  if (url.pathname === '/' || url.pathname.startsWith('/login') || url.pathname.startsWith('/signup') || url.pathname.startsWith('/register') || url.pathname.startsWith('/download')) {
    return supabaseResponse
  }

  // Redirect unauthenticated users
  if (!user) {
    return NextResponse.redirect(new URL('/login', request.url))
  }

  // We removed RBAC checks from middleware because app_metadata is not synced yet.
  // Row Level Security (RLS) will protect the database queries.

  return supabaseResponse
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|downloads|manifest.json|.*\\.(?:svg|png|jpg|jpeg|gif|webp|apk|json)$).*)',
  ],
}
