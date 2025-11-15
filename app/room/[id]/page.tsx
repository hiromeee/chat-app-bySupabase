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

// 1. Props の型定義を削除（またはコメントアウト）
// type RoomPageProps = {
//   params: { id: string }
// }

// 2. ページコンポーネントが "params の Promise" を直接受け取るように変更
export default async function RoomPage(
  paramsPromise: Promise<{ id: string }> // ★ 変更
) {
  
  // 3. Promise を await して params オブジェクトを直接取り出す
  const params = await paramsPromise // ★ 変更

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // 4. params.id を数値に変換 (ここは前回の修正のまま)
  const roomId = parseInt(params.id, 10)

  // ★ 追加: 変換後のIDが数値でない場合（例: /room/abc）はリダイレクト
  if (isNaN(roomId)) {
    redirect('/')
  }

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
    .eq('id', roomId) // ★ 数値の roomId で検索
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
    .eq('room_id', roomId) // ★ 数値の roomId でフィルタリング
    .order('created_at', { ascending: true })

  // 5. 取得した全データをクライアントコンポーネントに渡す
  return (
    <ChatRoom 
      user={user} 
      profile={profile as Profile}
      initialMessages={initialMessages || []} 
      room={room as Room} 
    />
  )
}