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

// 1. Props の型を、中身が Promise であることを示すように変更
type RoomPageProps = {
  params: Promise<{ id: string }>
}

// 2. ページコンポーネントが "Props の Promise" を受け取る
export default async function RoomPage(
  propsPromise: Promise<RoomPageProps> 
) {
  
  // 3. 外側の Promise を await して props オブジェクトを取り出す
  const props = await propsPromise
  
  // 4. props.params の存在をチェック
  if (!props || !props.params) {
    redirect('/')
    return; 
  }
  
  // 5. 内側の Promise を await して params オブジェクトを取り出す
  const params = await props.params;
  
  // 6. params.id を数値に変換
  const roomId = parseInt(params.id, 10) 

  // 7. 変換後のIDが数値でない場合
  if (isNaN(roomId)) {
    redirect('/')
    return; 
  }
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 8. ユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect('/login')
  }

  // 9. プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()

  // 10. ルームの情報を取得
  const { data: room } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('id', roomId) // ★ 数値の roomId で検索
    .single()
  
  if (!room) {
    // ルームが存在しない場合はトップにリダイレクト
    redirect('/')
  }

  // 11. 初期メッセージを取得
  const { data: initialMessages } = await supabase
    .from('messages')
    .select(`
      id,
      content,
      created_at,
      user_id,
      profiles!inner ( username )
    `) // ★ 変更: profiles!inner ( username )
    .eq('room_id', roomId) // ★ 数値の roomId で検索
    .order('created_at', { ascending: true })

  // 12. クライアントコンポーネントに渡す
  return (
    <ChatRoom 
      user={user} 
      profile={profile as Profile}
      initialMessages={(initialMessages || []).map((m: any) => ({
        id: m.id,
        content: m.content,
        created_at: m.created_at,
        user_id: m.user_id,
        // Convert profiles array (returned by the query) to a single object or null to match Message type
        profiles: Array.isArray(m.profiles) ? m.profiles[0] : m.profiles ?? null,
      }))} 
      room={room as Room} 
    />
  )
}