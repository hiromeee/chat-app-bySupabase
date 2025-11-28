'use server'

import { createClient } from '@/utils/supabase/server'
import { cookies } from 'next/headers'
import { revalidatePath } from 'next/cache'

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
