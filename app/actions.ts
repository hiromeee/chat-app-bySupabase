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

export async function startDirectChat(targetUserId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1. 既存のDMがあるか確認
  // 自分の参加しているルームIDを取得
  const { data: myRooms } = await supabase
    .from('room_participants')
    .select('room_id')
    .eq('user_id', user.id)

  if (myRooms && myRooms.length > 0) {
    const myRoomIds = myRooms.map(r => r.room_id)
    
    // 相手も参加していて、かつ is_group = false のルームを探す
    const { data: commonRooms } = await supabase
      .from('room_participants')
      .select('room_id, rooms!inner(is_group)')
      .eq('user_id', targetUserId)
      .in('room_id', myRoomIds)
      .eq('rooms.is_group', false)
      .limit(1)
      
    if (commonRooms && commonRooms.length > 0) {
      redirect(`/room/${commonRooms[0].room_id}`)
      return
    }
  }

  // 2. 新しいDMルームを作成
  const { data: newRoom, error } = await supabase
    .from('rooms')
    .insert({ name: 'Direct Chat', is_group: false })
    .select('id')
    .single()

  if (error || !newRoom) {
    console.error('Error creating DM:', error)
    return
  }

  // 3. 参加者を追加
  const { error: participantError } = await supabase
    .from('room_participants')
    .insert([
      { room_id: newRoom.id, user_id: user.id },
      { room_id: newRoom.id, user_id: targetUserId }
    ])
    
  if (participantError) {
    console.error('Error adding participants:', participantError)
    return
  }

  revalidatePath('/room')
  redirect(`/room/${newRoom.id}`)
}