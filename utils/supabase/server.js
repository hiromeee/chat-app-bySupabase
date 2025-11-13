import { createServerClient } from '@supabase/ssr'
// import { cookies } from 'next/headers' // 削除

export function createClient(cookieStore) { // cookieStore を引数で受け取る
  // const cookieStore = cookies() // 削除

  // .env.local から環境変数を読み込む (これは元のまま)
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name) {
        return cookieStore.get(name)?.value
      },
      set(name, value, options) {
        try {
          cookieStore.set({ name, value, ...options })
        } catch (error) {
          // Server Component から `set` が呼ばれた場合。
          // ミドルウェアがセッションを更新していれば無視できる。
        }
      },
      remove(name, options) {
        try {
          cookieStore.delete({ name, ...options })
        } catch (error) {
          // Server Component から `delete` が呼ばれた場合。
          // ミドルウェアがセッションを更新していれば無視できる。
        }
      },
    },
  })
}