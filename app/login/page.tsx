import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server' //
import AuthForm from './AuthForm' //
import { cookies } from 'next/headers'

export default async function Login() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/')
  }

  // ★ UIをTailwindクラスに変更
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-2xl font-semibold">チャットアプリへようこそ</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        サインアップまたはログインしてください
      </p>
      <div className="mt-8">
        <AuthForm />
      </div>
    </div>
  )
}