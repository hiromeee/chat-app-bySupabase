import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ログインチェック (未ログインなら /login へ)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // ログイン済みの場合、チャットルームではなく案内を表示
  return (
    <div className="flex h-full w-full items-center justify-center p-4">
      <div className="text-center">
        <h2 className="text-xl font-semibold">ようこそ！</h2>
        <p className="mt-2 text-gray-500 dark:text-gray-400">
          ← 左のサイドバーからルームを選択してください。
        </p>
      </div>
    </div>
  )
}