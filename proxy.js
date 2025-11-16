import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

// ★ 変更: 関数名を 'middleware' から 'proxy' に変更
export async function proxy(request) {
  
  // params が失われないよう、request オブジェクト全体を渡す
  let response = NextResponse.next({
    request: request, 
  })

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          request.cookies.set({
            name,
            value,
            ...options,
          })
          // params が失われないよう、request オブジェクト全体を渡す
          response = NextResponse.next({
            request: request, 
          })
          response.cookies.set({
            name,
            value,
            ...options,
          })
        },
        remove(name, options) {
          request.cookies.set({
            name,
            value: '',
            ...options,
          })
           // params が失われないよう、request オブジェクト全体を渡す
          response = NextResponse.next({
            request: request, 
          })
          response.cookies.set({
            name,
            value: '',
            ...options,
          })
        },
      },
    }
  )

  // セッションを取得 (これによりセッションがリフレッシュされる)
  const { data: { session } } = await supabase.auth.getSession()

  // 認証リダイレクトロジック
  const { pathname } = request.nextUrl

  if (!session) {
    // ログインしていない場合
    if (pathname !== '/login') {
      return NextResponse.redirect(new URL('/login', request.url))
    }
  } else {
    // ログインしている場合
    if (pathname === '/login') {
      return NextResponse.redirect(new URL('/', request.url))
    }
  }

  // 更新された可能性のあるクッキーを含むレスポンスを返す
  return response
}

// config オブジェクト (変更なし)
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