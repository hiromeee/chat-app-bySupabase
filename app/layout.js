import './globals.css' //
import { createClient } from '@/utils/supabase/server' //
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link' // ★ Next.jsのLinkコンポーネントをインポート

// ログアウト用のサーバーアクション
async function signOut() {
  'use server' 
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  return redirect('/login')
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="ja">
      <body>
        {/* ★ ヘッダーを修正 */}
        <header style={{ 
          display: 'flex', 
          justifyContent: 'space-between', 
          alignItems: 'center', // 中央揃え
          padding: '10px 20px', // 少し広げる
          borderBottom: '1px solid #333' // 区切り線
        }}>
          <Link href="/" style={{ textDecoration: 'none', color: 'inherit' }}>
            <h2>Supabase Chat App</h2>
          </Link>
          {session && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '15px' }}>
              {/* ★ プロフィールへのリンク */}
              <Link href="/profile" style={{ textDecoration: 'underline' }}>
                プロフィール設定
              </Link>
              <form action={signOut}>
                <button type="submit" style={{ padding: '8px 12px' }}>ログアウト</button>
              </form>
            </div>
          )}
        </header>
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}