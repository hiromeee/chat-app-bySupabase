'use server' // サーバーアクションの宣言

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache' // キャッシュを更新する関数

export async function createRoom(formData: FormData) {
  const roomName = formData.get('room_name') as string

  if (roomName.trim() === '') {
    return // 何もしない
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // 1. 新しいルームをDBに挿入
  const { data: newRoom, error } = await supabase
    .from('rooms')
    .insert({ name: roomName })
    .select('id') // 新しく作成されたルームのIDだけ取得
    .single()

  if (error) {
    console.error('Error creating room:', error)
    return
  }

  // 2. サイドバーのキャッシュを更新
  revalidatePath('/room') // /room/[id] ページと / (レイアウト) を再検証

  // 3. 新しいルームにリダイレクト
  redirect(`/room/${newRoom.id}`)
}