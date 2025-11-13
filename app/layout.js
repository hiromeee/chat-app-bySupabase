import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers' // ★ インポート

// ログアウト用のサーバーアクション
async function signOut() {
  'use server' // サーバーアクションとして定義
  
  const cookieStore = cookies() // ★ ここで呼び出す
  const supabase = createClient(cookieStore) // ★ 渡す
  
  await supabase.auth.signOut()
  return redirect('/login')
}

export default async function RootLayout({ children }) {
  const cookieStore = cookies() // ★ ここで呼び出す
  const supabase = createClient(cookieStore) // ★ 渡す

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="ja">
      <body>
        <header style={{ display: 'flex', justifyContent: 'space-between', padding: '10px' }}>
          <h2>Supabase Chat App</h2>
          {session && (
            <form action={signOut}>
              <button type="submit">ログアウト</button>
            </form>
          )}
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}