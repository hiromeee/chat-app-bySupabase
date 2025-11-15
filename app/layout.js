import './globals.css' //
import { createClient } from '@/utils/supabase/server' //
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link' 

// signOut サーバーアクション (変更なし)
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
    // ★ `<html>` にダークモードクラスを追加
    <html lang="ja" className="dark">
      {/* ★ `<body>` にTailwindの基本スタイルとダークモードの背景/文字色を適用 */}
      <body className="min-h-screen bg-white text-gray-900 dark:bg-gray-950 dark:text-gray-100">
        
        {/* ★ ヘッダーをTailwindクラスで置き換え */}
        <header className="flex h-16 items-center justify-between border-b border-gray-200 px-6 dark:border-gray-800">
          <Link href="/" className="text-xl font-bold no-underline hover:opacity-80">
            <h2>Supabase Chat App</h2>
          </Link>
          
          {session && (
            <div className="flex items-center gap-4">
              <Link href="/profile" className="text-sm text-gray-600 underline hover:text-black dark:text-gray-400 dark:hover:text-white">
                プロフィール設定
              </Link>
              <form action={signOut}>
                <button 
                  type="submit" 
                  className="rounded bg-gray-200 px-4 py-2 text-sm font-medium text-gray-800 hover:bg-gray-300 dark:bg-gray-800 dark:text-gray-200 dark:hover:bg-gray-700"
                >
                  ログアウト
                </button>
              </form>
            </div>
          )}
        </header>
        
        {/* ★ mainコンテンツは変更なし */}
        <main>
          {children}
        </main>
      </body>
    </html>
  )
}