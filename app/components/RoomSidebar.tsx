'use client' 

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation' 
import { useState, useEffect, useRef } from 'react' // ★ useRef をインポート
import { createRoom } from '../actions' // ★ 作成したサーバーアクションをインポート

// ルームの型定義
type Room = {
  id: number
  name: string
}

export default function RoomSidebar() {
  const supabase = createClient()
  const pathname = usePathname() 

  const [rooms, setRooms] = useState<Room[]>([])
  // const [newRoomName, setNewRoomName] = useState('') // ★ フォームが管理するので不要
  const formRef = useRef<HTMLFormElement>(null) // ★ フォーム参照

  // 1. リアルタイムでルーム一覧を取得・監視する (変更なし)
  useEffect(() => {
    // 最初に全ルームを取得
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name')
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching rooms:', error)
      } else {
        setRooms(data || [])
      }
    }
    fetchRooms()

    // rooms テーブルの INSERT を監視
    const channel = supabase
      .channel('rooms-channel') 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rooms' },
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

    // クリーンアップ
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])


  // ★ 2. サーバーアクションを呼び出すフォームハンドラ
  const handleCreateRoom = async (formData: FormData) => {
    // フォームをリセット
    formRef.current?.reset()
    
    // サーバーアクションを実行
    await createRoom(formData)
  }

  return (
    <aside className="flex h-full w-64 flex-col border-r border-gray-200 bg-gray-50 p-4 dark:border-gray-800 dark:bg-gray-900">
      <h3 className="text-lg font-semibold">チャットルーム</h3>
      
      {/* ★ 3. サーバーアクションを使うフォームに変更 */}
      <form ref={formRef} action={handleCreateRoom} className="mt-4 flex space-x-2">
        <input
          type="text"
          name="room_name" // ★ name 属性が重要
          placeholder="New room..."
          className="flex-1 rounded border border-gray-300 bg-white px-2 py-1 text-sm text-gray-900 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
        />
        <button
          type="submit"
          className="rounded bg-blue-600 px-3 py-1 text-sm text-white hover:bg-blue-700"
        >
          作成
        </button>
      </form>

      {/* ルーム一覧 (変更なし) */}
      <nav className="mt-4 flex-1 space-y-1 overflow-y-auto">
        {rooms.map((room) => {
          const isActive = pathname === `/room/${room.id}`
          return (
            <Link
              key={room.id}
              href={`/room/${room.id}`}
              className={`block rounded px-3 py-2 text-gray-700 dark:text-gray-300 ${
                isActive
                  ? 'bg-gray-200 dark:bg-gray-700' 
                  : 'hover:bg-gray-200 dark:hover:bg-gray-800' 
              }`}
            >
              # {room.name}
            </Link>
          )
        })}
      </nav>
      
    </aside>
  )
}