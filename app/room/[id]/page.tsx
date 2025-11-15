import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import ChatRoom from './ChatRoom'

// 型定義
type Profile = {
  username: string | null
}
type Room = {
  id: number
  name: string
}
// ★★★ エラー解決のため、Message 型をここにも定義 ★★★
type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null 
}

// Props の型を定義
type RoomPageProps = {
  params: { id: string }
}

// ページコンポーネントが Props の "Promise" を受け取るように変更
export default async function RoomPage(propsPromise: Promise<RoomPageProps>) {
  
  // Promise を await して params を取り出す
  const { params } = await propsPromise

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // これで params.id が正しく読み込める
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
  // ★ data を 'initialMessages' ではなく 'data' として受け取る
  const { data } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles ( username )
    `)
    .eq('room_id', roomId) // room_id でフィルタリング
    .order('created_at', { ascending: true })

  // ★★★ 修正点: 取得結果を Message[] 型として強制キャスト ★★★
  const initialMessages = (data || []) as unknown as Message[];


  // 5. 取得した全データをクライアントコンポーネントに渡す
  return (
    <ChatRoom 
      user={user} 
      profile={profile as Profile}
      initialMessages={initialMessages} // ★ キャスト済みのデータを渡す
      room={room as Room} 
    />
  )
}