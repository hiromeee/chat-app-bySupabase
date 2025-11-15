import { createServerClient } from '@supabase/ssr'
import { NextResponse } from 'next/server'

export async function middleware(request) {
  
  // ★ 1. すべてのロジックをバイパスし、リクエストをそのまま次に渡す
  return NextResponse.next({
    request: request,
  })

  // (ここから下はすべて実行されない)

  // let response = NextResponse.next({
  //   request: request, 
  // })

  // ... (Supabaseクライアント作成ロジック) ...
  
  // ... (セッション取得ロジック) ...

  // ... (認証リダイレクトロジック) ...
  
  // return response
}

// ★ 2. config.matcher を空にして、ミドルウェアがどのパスでも実行されないようにする
export const config = {
  matcher: [
    // '/((?!_next/static|_next/image|favicon.ico).*)', // ★ 一時的にコメントアウト
  ],
}