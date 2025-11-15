import { createClient } from '@/utils/supabase/server' //
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChatClient from './ChatClient' //

// ★ profiles テーブルの型を定義（username のみ）
type Profile = {
  username: string | null
}

export default async function Home() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/login')
  }

  // ★ ユーザーのプロフィール情報（username）を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  // 初期メッセージを取得
  const { data: initialMessages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles ( username )
    `)
    .order('created_at', { ascending: true })

  return (
    <ChatClient 
      user={user} 
      profile={profile as Profile} // ★ プロフィール情報を渡す
      initialMessages={initialMessages || []} 
    />
  )
}