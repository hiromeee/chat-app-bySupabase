'use client' // ★ これはクライアントコンポーネント

import { createClient } from '@/utils/supabase/client' // クライアント用
import { useState, useEffect } from 'react' // useEffect をインポート
import type { User } from '@supabase/supabase-js'

// Supabaseクライアントを初期化
const supabase = createClient()

// ★ Step 6: メッセージの型定義 (profilesテーブルのusernameを含む)
// any型を許容（開発を容易にするため）
type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null
}

// サーバーから渡されるPropsの型定義
type ChatClientProps = {
  user: User
  initialMessages: Message[] // ★ Step 6: 初期メッセージを受け取る
}

export default function ChatClient({ user, initialMessages }: ChatClientProps) {
  // 1. 送信するメッセージを管理
  const [message, setMessage] = useState('')
  // ★ Step 6: 表示するメッセージ一覧を管理 (初期値にサーバーからのデータをセット)
  const [messages, setMessages] = useState(initialMessages)

  // ★ Step 6: リアルタイム購読のセットアップ
  useEffect(() => {
    // 'messages' テーブルへの 'INSERT' イベントを監視
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        (payload) => {
          // INSERTされた新しいデータを取得
          const newMessage = payload.new as Message

          // ★ 注意: このままでは username が取得できません
          // リアルタイムでJOINはできないため、別途取得するか、
          // ここでは一旦、初期データと同じ構造を「仮」で作ります
          
          // profilesが取得できないため、自前で取得するか、
          // もしくは送信者の情報（user）を使って仮の表示を行う
          // ここでは簡易的に、新メッセージをそのまま追加します（usernameはnullになります）
          
          // ※ 本番では、別途profilesを取得する処理が必要です
          // ※ RLSポリシーで profiles の SELECT を許可していないと、ここでエラーになる可能性があります
          
          // stateを更新して画面に反映
          // (より堅牢にするには、profilesをIDで検索する必要があります)
          setMessages((currentMessages) => [
            ...currentMessages,
            newMessage, // 新しいメッセージを追加
          ])
        }
      )
      .subscribe()

    // コンポーネントがアンマウント（画面から消える）時に購読を解除
    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase]) // 依存配列にsupabaseを追加（変更なし）


  // 2. フォーム送信時の処理 (変更なし)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === '') return

    const { error } = await supabase.from('messages').insert({
      content: message,
      user_id: user.id
    })

    if (error) {
      console.error('Error sending message:', error)
    } else {
      setMessage('')
    }
  }

  // 4. UI
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>Supabase Realtime Chat</h1>
      <p>Logged in as: {user.email}</p>

      {/* --- メッセージ表示欄 (Step 6) --- */}
      <div style={{ border: '1px solid #ccc', minHeight: '300px', padding: '10px', margin: '20px 0', maxHeight: '50vh', overflowY: 'auto' }}>
        <h3>Messages:</h3>
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ margin: '8px 0', padding: '5px', borderBottom: '1px solid #eee' }}>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
                {/* profilesが存在し、usernameが存在すれば表示。
                  存在しない場合（リアルタイムで追加された直後など）は "Loading user..." と表示 
                */}
                <strong>{msg.profiles?.username ?? 'Loading user...'}</strong>
                <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#999' }}>
                  {new Date(msg.created_at).toLocaleString('ja-JP')}
                </span>
              </p>
              <p style={{ margin: '4px 0 0 0' }}>{msg.content}</p>
            </div>
          ))
        )}
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