import { createClient } from '@/utils/supabase/server' // サーバー用
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ProfileForm from './ProfileForm' // 次に作成するクライアントコンポーネント

export default async function ProfilePage() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ユーザーセッションを取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login') // 未ログインなら/loginへ
  }

  // 現在のプロフィール情報（usernameなど）を取得
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id) // ログイン中のユーザーIDと一致する行
    .single() // 1行だけ取得

  if (error) {
    console.error('Error fetching profile:', error)
  }

  // ユーザー情報とプロフィール情報をクライアントコンポーネントに渡す
  return (
    <ProfileForm user={user} currentUsername={profile?.username || ''} />
  )
}