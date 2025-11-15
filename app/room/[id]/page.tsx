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

// ★ 1. Props の型を、中身が Promise であることを示すように変更
type RoomPageProps = {
  params: Promise<{ id: string }>
}

// ★ 2. ページコンポーネントが "Props の Promise" を受け取る
export default async function RoomPage(
  propsPromise: Promise<RoomPageProps> 
) {
  
  // ★ 3. 外側の Promise を await して props オブジェクトを取り出す
  const props = await propsPromise
  
  console.log('--- [RoomPage] 1. Awaited props object:', props) 

  // ★ 4. props.params の存在をチェック
  if (!props || !props.params) {
    console.error('--- [RoomPage] ERROR: props or props.params is missing. Redirecting to /')
    redirect('/')
    return; 
  }
  
  // ★ 5. ★★★ 内側の Promise を await して params オブジェクトを取り出す ★★★
  const params = await props.params;
  console.log('--- [RoomPage] 2. Destructured params:', params) 

  // 6. params.id を数値に変換
  const roomId = parseInt(params.id, 10) 
  console.log('--- [RoomPage] 3. roomId (parsed):', roomId) 

  // 7. 変換後のIDが数値でない場合
  if (isNaN(roomId)) {
    console.error('--- [RoomPage] ERROR: roomId is NaN. Redirecting to /')
    redirect('/')
    return; 
  }
  
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // ... (以降のコードは変更なし) ...

  // 8. ユーザー情報を取得
  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    console.warn('--- [RoomPage] WARN: No user found. Redirecting to /login')
    redirect('/login')
  }
  console.log('--- [RoomPage] 4. User ID:', user.id)

  // 9. プロフィール情報を取得
  const { data: profile } = await supabase
    .from('profiles')
    .select('username')
    .eq('id', user.id)
    .single()
  console.log('--- [RoomPage] 5. Profile:', profile)

  // 10. ルームの情報を取得
  const { data: room, error: roomError } = await supabase
    .from('rooms')
    .select('id, name')
    .eq('id', roomId)
    .single()
  
  console.log('--- [RoomPage] 6. Room query result:', room)
  if (roomError) {
    console.error('--- [RoomPage] 6b. Room query ERROR:', roomError.message)
  }

  if (!room) {
    console.warn(`--- [RoomPage] WARN: Room not found (id: ${roomId}). Redirecting to /`)
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
      profiles ( username )
    `)
    .eq('room_id', roomId)
    .order('created_at', { ascending: true })
  console.log('--- [RoomPage] 7. Initial messages count:', initialMessages?.length ?? 0)

  // 12. クライアントコンポーネントに渡す
  return (
    <ChatRoom 
      user={user} 
      profile={profile as Profile}
      initialMessages={initialMessages || []} 
      room={room as Room} 
    />
  )
}