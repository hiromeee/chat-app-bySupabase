// 'use client' を削除 (サーバーコンポーネントにする)

import { createClient } from '@/utils/supabase/server' // サーバー用
import { cookies } from 'next/headers' // サーバー用
import { redirect } from 'next/navigation'
import ChatClient from './ChatClient' // 先ほど作成したクライアントコンポーネント

export default async function Home() {
  const cookieStore = await cookies() // ★ サーバーサイドでcookieStoreを取得
  const supabase = createClient(cookieStore)

  // サーバーサイドでユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()

  // サーバーサイドでユーザーがいなければ/loginにリダイレクト
  // (ミドルウェアと二重保護)
  if (!user) {
    redirect('/login')
  }

  // ログインしていれば、ユーザー情報をpropsとしてChatClientに渡す
  return (
    <ChatClient user={user} />
  )
}