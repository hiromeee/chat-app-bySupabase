'use client'

import { createClient } from '@/utils/supabase/client' // クライアント用クライアント
import { useState, useEffect } from 'react'
import type { User } from '@supabase/supabase-js' // SupabaseのUser型

// ページ全体でSupabaseクライアントを初期化
const supabase = createClient()

export default function Home() {
  // 1. 送信するメッセージを管理
  const [message, setMessage] = useState('')
  // 2. ログイン中のユーザー情報を管理
  const [user, setUser] = useState<User | null>(null)

  // 3. ページ読み込み時にログインユーザーを取得
  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      setUser(user)
    }
    getUser()
  }, [])

  // 4. フォーム送信時の処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault() // ページリロードを防ぐ

    // ユーザーが存在しない、またはメッセージが空なら何もしない
    if (!user || message.trim() === '') {
      return
    }

    // 5. Supabaseの 'messages' テーブルにデータを挿入
    const { error } = await supabase.from('messages').insert({
      content: message,  // 入力されたメッセージ
      user_id: user.id   // ログイン中のユーザーのID
    })

    if (error) {
      console.error('Error sending message:', error)
    } else {
      // 成功したら入力欄をクリア
      setMessage('')
    }
  }

  // ユーザー情報が読み込まれるまで、または未ログインの場合（ミドルウェアで保護されますが）
  if (!user) {
    return <div>Loading...</div>
  }

  // 6. メッセージ入力フォームのUI
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>Supabase Realtime Chat</h1>
      <p>Logged in as: {user.email}</p>

      {/* --- メッセージ表示欄 (Step 6で実装) --- */}
      <div style={{ border: '1px solid #ccc', minHeight: '300px', padding: '10px', margin: '20px 0' }}>
        <h3>Messages:</h3>
        <p>(Step 6でここにメッセージがリアルタイム表示されます)</p>
      </div>
      {/* ------------------------------------ */}

      {/* --- メッセージ送信フォーム (Step 5) --- */}
      <form onSubmit={handleSubmit}>
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          style={{ width: 'calc(100% - 100px)', padding: '10px', border: '1px solid #999', borderRadius: '5px' }}
        />
        <button 
          type="submit" 
          style={{ width: '90px', padding: '10px', marginLeft: '10px', background: '#333', color: 'white', border: 'none', borderRadius: '5px' }}
        >
          Send
        </button>
      </form>
    </div>
  )
}