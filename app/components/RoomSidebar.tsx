'use client' 

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation' 
import { useState, useEffect, useRef } from 'react' 
import { createRoom, startDirectChat } from '../actions' // サーバーアクション

// ルームの型定義
type Room = {
  id: number
  name: string
}

export default function RoomSidebar() {
  const supabase = createClient()
  const pathname = usePathname() 

  const [rooms, setRooms] = useState<Room[]>([])
  const formRef = useRef<HTMLFormElement>(null) 
  
  // ★ モーダルの開閉状態を管理
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('') // モーダル内の入力値

  // 1. リアルタイムでルーム一覧を取得・監視する (変更なし)
  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('is_group', true) // Only fetch group rooms for the main list
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching rooms:', error)
      } else {
        setRooms(data || [])
      }
    }
    fetchRooms()

    const channel = supabase
      .channel('rooms-channel') 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rooms', filter: 'is_group=eq.true' },
        (payload) => {
          setRooms((currentRooms) => {
            if (currentRooms.find(room => room.id === payload.new.id)) {
              return currentRooms 
            }
            return [...currentRooms, payload.new as Room]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])


  // ★ 2. サーバーアクションを呼び出すフォームハンドラ (修正)
  const handleCreateRoom = async (formData: FormData) => {
    // サーバーアクションを実行
    await createRoom(formData)
    
    // フォームをリセットし、モーダルを閉じる
    setNewRoomName('')
    setIsModalOpen(false)
  }

  // 3. ユーザー一覧を取得
  const [users, setUsers] = useState<any[]>([])
  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .neq('id', user.id)
        .limit(20) // Limit for now
      
      setUsers(data || [])
    }
    fetchUsers()
  }, [supabase])

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      
      {/* ★ ヘッダー：「＋」ボタン */}
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-semibold">チャットルーム</h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="rounded p-1 text-gray-500 hover:bg-gray-200 hover:text-gray-900 dark:text-gray-400 dark:hover:bg-gray-800 dark:hover:text-white"
          title="Create new room"
        >
          <svg className="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
      </div>

      {/* ルーム一覧 */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {rooms.map((room) => {
          const isActive = pathname === `/room/${room.id}`
          return (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              // ★ ホバーエフェクトにトランジションを追加
              className={`block rounded px-3 py-2 text-gray-700 transition-colors duration-150 dark:text-gray-300 ${
                isActive
                  ? 'bg-gray-200 dark:bg-gray-700' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800' 
              }`}
            >
              # {room.name}
            </Link>
          )
        })}

        {/* DM Section */}
        <div className="mt-8">
          <h3 className="mb-2 px-2 text-xs font-semibold uppercase text-gray-500">ダイレクトメッセージ</h3>
          <div className="space-y-1">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={async () => {
                  await startDirectChat(user.id)
                }}
                className="block w-full rounded px-3 py-2 text-left text-gray-700 transition-colors duration-150 hover:bg-gray-200 dark:text-gray-300 dark:hover:bg-gray-800"
              >
                <div className="flex items-center gap-2">
                  <div className="h-2 w-2 rounded-full bg-green-500"></div>
                  <span>{user.username || 'Unknown'}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* ★ 3. 新規ルーム作成モーダル */}
      {isModalOpen && (
        // オーバーレイ (背景)
        <div 
          className="fixed inset-0 z-10 flex items-center justify-center bg-black/50"
          onClick={() => setIsModalOpen(false)} // 背景クリックで閉じる
        >
          {/* モーダル本体 */}
          <div 
            className="w-full max-w-md rounded-lg bg-white p-6 shadow-xl dark:bg-gray-900"
            onClick={(e) => e.stopPropagation()} // モーダル内クリックで閉じないように
          >
            <h2 className="text-xl font-semibold">新しいルームを作成</h2>
            <form 
              action={handleCreateRoom} // サーバーアクション を呼び出す
              className="mt-4"
            >
              <label htmlFor="room_name" className="block text-sm font-medium">
                ルーム名
              </label>
              <input
                id="room_name"
                name="room_name" // サーバーアクションが FormData で受け取るキー
                type="text"
                value={newRoomName}
                onChange={(e) => setNewRoomName(e.target.value)}
                placeholder="例: # general"
                className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                autoFocus // モーダルが開いたら自動でフォーカス
              />
              <div className="mt-6 flex justify-end space-x-3">
                <button
                  type="button" // form の submit を発火させない
                  onClick={() => setIsModalOpen(false)}
                  className="rounded px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
                >
                  キャンセル
                </button>
                <button
                  type="submit"
                  className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
                  disabled={newRoomName.trim() === ''}
                >
                  作成
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}