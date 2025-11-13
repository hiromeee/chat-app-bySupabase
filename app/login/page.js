import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server' // サーバー用クライアント
import AuthForm from './AuthForm' // 次に作成するクライアントコンポーネント
import { cookies } from 'next/headers' // ★ インポート

export default async function Login() {
  const cookieStore = cookies() // ★ ここで呼び出す
  const supabase = createClient(cookieStore) // ★ 渡す

  const {
    data: { session },
  } = await supabase.auth.getSession()

  // もしセッションがあれば（ログイン済みなら）ホームページにリダイレクト
  if (session) {
    redirect('/')
  }

  // ログインフォームを表示
  return (
    <div style={{ maxWidth: '400px', margin: '50px auto' }}>
      <h1>チャットアプリへようこそ</h1>
      <p>サインアップまたはログインしてください</p>
      <AuthForm />
    </div>
  )
}