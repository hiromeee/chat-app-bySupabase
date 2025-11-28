'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { redirect } from 'next/navigation'
import { revalidatePath } from 'next/cache'

// ルーム作成アクション
export async function createRoom(formData: FormData) {
  const roomName = formData.get('room_name') as string

  if (roomName.trim() === '') {
    return
  }

  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const { data: { user } } = await supabase.auth.getUser()

  if (!user) {
    return
  }

  const { data: newRoom, error } = await supabase
    .from('rooms')
    .insert({ name: roomName })
    .select('id')
    .single()

  if (error) {
    console.error('Error creating room:', error)
    return
  }

  // 作成者を管理者として追加
  const { error: participantError } = await supabase
    .from('room_participants')
    .insert({ 
      room_id: newRoom.id, 
      user_id: user.id,
      role: 'admin' 
    })

  if (participantError) {
    console.error('Error adding admin participant:', participantError)
    // 失敗した場合のロールバック処理などは簡易アプリなので省略
  }

  revalidatePath('/room')
  redirect(`/room/${newRoom.id}`)
}

// ダイレクトチャット開始アクション
export async function startDirectChat(targetUserId: string) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  const { data: { user } } = await supabase.auth.getUser()
  if (!user) return

  // 1. 既存のDMがあるか確認
  const { data: myRooms } = await supabase
    .from('room_participants')
    .select('room_id')
    .eq('user_id', user.id)

  if (myRooms && myRooms.length > 0) {
    const myRoomIds = myRooms.map(r => r.room_id)
    
    const { data: commonRooms } = await supabase
      .from('room_participants')
      .select('room_id, rooms!inner(is_group)')
      .eq('user_id', targetUserId)
      .in('room_id', myRoomIds)
      .eq('rooms.is_group', false)
      .limit(1)
      
    if (commonRooms && commonRooms.length > 0) {
      redirect(`/room/${commonRooms[0].room_id}`)
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

// AIへのメッセージ送信アクション（日時認識機能付き）
export async function sendMessageToAI(messageContent: string, roomId: number) {
  try {
    // 環境変数からAPIキーを取得
    const apiKey = process.env.GEMINI_API_KEY
    
    // ★環境変数が読み込めない場合の予備（必要ならコメントを外してキーを入れてください）
    // const apiKey = "ここにAPIキー" 

    if (!apiKey) {
      console.error('GEMINI_API_KEY is not set')
      return
    }

    // 1. Geminiの初期化
    const { GoogleGenAI } = await import('@google/genai')
    const genAI = new GoogleGenAI({ apiKey })

    // 2. 現在時刻を取得（日本時間）
    const now = new Date().toLocaleString('ja-JP', { 
      timeZone: 'Asia/Tokyo',
      dateStyle: 'full',
      timeStyle: 'medium'
    })

    // 3. AIへの指示書（システムプロンプト）を作成
    const promptWithContext = `
Instructions:
- あなたはチャットアプリの優秀なAIアシスタントです。
- 現在の日時は【 ${now} 】です。ユーザーから日付や時刻を聞かれたら、この時間を基準に答えてください。
- 常に丁寧かつフレンドリーな日本語で返答してください。

User message:
${messageContent}
    `.trim()

    // 4. AIに回答を生成させる
    const result = await genAI.models.generateContent({
      model: 'gemini-2.0-flash',
      contents: [
        {
          role: 'user',
          parts: [
            {
              text: promptWithContext
            }
          ]
        }
      ]
    })
    
    const aiText = result.candidates?.[0]?.content?.parts?.[0]?.text || 'Error: No response text'

    // 5. SupabaseにAIの回答を保存する
    const cookieStore = await cookies()
    const supabase = createClient(cookieStore)
    
    const { error } = await supabase.from('messages').insert({
      content: aiText,
      room_id: roomId,
      user_id: '00000000-0000-0000-0000-000000000000'
    })

    if (error) {
      console.error('Supabase Insert Error (AI):', error)
    }

  } catch (error) {
    console.error('AI Action Error:', error)
  }
}

// メッセージ削除アクション
export async function deleteMessage(messageId: number, roomId: number) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  
  // RLSポリシーにより、作成者または管理者のみが削除可能
  const { error } = await supabase.from('messages').delete().eq('id', messageId)
  
  if (error) {
    console.error('Error deleting message:', error)
    throw error
  }
  
  revalidatePath(`/room/${roomId}`)
}

// ルーム削除アクション
export async function deleteRoom(roomId: number) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  // RLSポリシーにより、管理者のみが削除可能
  const { error } = await supabase.from('rooms').delete().eq('id', roomId)

  if (error) {
    console.error('Error deleting room:', error)
    throw error
  }

  revalidatePath('/room')
  redirect('/room')
}