import { NextResponse } from 'next/server'
import { createClient } from '@/utils/supabase/server' // server.js をインポート

export async function middleware(request) {
  const supabase = createClient()

  // セッション情報を取得・更新
  const {
    data: { session },
  } = await supabase.auth.getSession()

  const { pathname } = request.nextUrl

  // ログインしていない場合
  if (!session) {
    // ログインページ以外にアクセスしようとしたら、ログインページにリダイレクト
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // ログインしている場合
    // ログインページにアクセスしようとしたら、ホームページにリダイレクト
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  return NextResponse.next()
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!_next/static|_next/image|favicon.ico).*)',
  ],
}