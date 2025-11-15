import { createClient } from '@/utils/supabase/server' // サーバー用
import { cookies } from 'next/headers'
import Link from 'next/link'

// ルームの型定義
type Room = {
  id: number
  name: string
}

export default async function RoomSidebar() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // サーバーサイドでルーム一覧を取得
  const { data: rooms, error } = await supabase
    .from('rooms')
    .select('id, name')
    .order('created_at', { ascending: true })

  if (error) {
    console.error('Error fetching rooms:', error)
  }

  return (
    // サイドバーのコンテナ
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold">チャットルーム</h3>
      
      {/* ルーム一覧 */}
      <nav className="mt-4 flex-1 space-y-2">
        {(rooms as Room[] || []).map((room) => (
          <Link
            key={room.id}
            href={`/room/${room.id}`} // 動的ルート（次のステップで作成）
            className="block rounded px-3 py-2 text-gray-700 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
          >
            # {room.name}
          </Link>
        ))}
      </nav>

      {/* (ここにルーム作成フォームを追加できますが、まずは一覧のみ)
      */}
      
      <div className="mt-auto">
        <p className="text-xs text-gray-500">
          Logged in. (Sidebar)
        </p>
      </div>
    </aside>
  )
}