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

  if (!user) {
    redirect('/login')
  }

  // ★ Step 6: 初期メッセージをサーバーサイドで取得
  // profilesテーブルと結合(join)して、user_idからusernameを取得する
  const { data: initialMessages, error } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles ( username )
    `)
    .order('created_at', { ascending: true }) //古い順

  if (error) {
    console.error('Error fetching initial messages:', error)
  }

  // ユーザー情報と初期メッセージをChatClientに渡す
  return (
    <ChatClient user={user} initialMessages={initialMessages || []} />
  )
}