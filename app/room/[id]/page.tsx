import { createClient } from '@/utils/supabase/server' // サーバー用
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChatRoom from './ChatRoom' // ★ 次に作成するクライアントコンポーネント

// 型定義
type Profile = {
  username: string | null
}
type Room = {
  id: number
  name: string
}

// ページコンポーネントは params を受け取る
export default async function RoomPage({ params }: { params: { id: string } }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const roomId = params.id

  // 1. ユーザー情報を取得 (必須)
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 2. ユーザーのプロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  // 3. ルームの情報を取得 (ルーム名表示のため)
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('id', roomId)
    .single()
  
  if (!room) {
    // ルームが存在しない場合はトップにリダイレクト（または404）
    redirect('/')
  }

  // 4. このルームの初期メッセージを取得
  const { data: initialMessages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles ( username )
    `)
    .eq('room_id', roomId) // ★ room_id でフィルタリング
    .order('created_at', { ascending: true })

  // 5. 取得した全データをクライアントコンポーネントに渡す
  return (
    <ChatRoom 
      user={user} 
      profile={profile as Profile}
      initialMessages={initialMessages || []} 
      room={room as Room} // ★ ルーム情報も渡す
    />
  )
}