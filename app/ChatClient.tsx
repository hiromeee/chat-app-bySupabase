'use client' 

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef } from 'react' 
import type { User } from '@supabase/supabase-js'

// Supabaseクライアントを初期化
const supabase = createClient()

// メッセージの型定義
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
  initialMessages: Message[] 
}

export default function ChatClient({ user, initialMessages }: ChatClientProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  // メッセージが更新されるたびに一番下にスクロールする
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  // ★★★ リアルタイム購読 (関数型アップデート版) ★★★
  useEffect(() => {

    // 新しいメッセージを受信したときの処理
    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new as Message

      // 他人からのメッセージの場合、username を取得
      // (自分のメッセージは handleSubmit で処理されるため、user_id が自分と違う場合のみ実行)
      if (newMessage.user_id !== user.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', newMessage.user_id)
          .single()

        if (error) {
          console.error('Error fetching profile for realtime message:', error)
          newMessage.profiles = { username: 'Unknown' } 
        } else {
          newMessage.profiles = { username: profile?.username ?? 'Unknown' }
        }
      }

      // ★ 3. state を「関数型アップデート」で更新
      setMessages((currentMessages) => {
        // ここで currentMessages (最新のstate) に対して重複チェック
        if (currentMessages.find((msg) => msg.id === newMessage.id)) {
          // 既に存在する場合は、state を変更しない (重複を防ぐ)
          return currentMessages
        }
        // 存在しない場合のみ、新しいメッセージを追加する
        return [
          ...currentMessages,
          newMessage,
        ]
      })
    }

    // 'messages' テーブルへの 'INSERT' イベントを監視
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage 
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
    // ★ 依存配列から messages を削除 (関数型アップデートにより不要になった)
  }, [supabase, user.id]) // user.id を追加 (handleNewMessage内で比較するため)
  // ★★★ 修正ここまで ★★★


  // ★★★ フォーム送信処理 (変更なし) ★★★
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === '') return

    const messageContent = message
    setMessage('') 

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert({
        content: messageContent,
        user_id: user.id
      })
      .select(`
        id,
        content,
        created_at,
        user_id,
        profiles ( username )
      `) 
      .single() 

    if (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) 
    } else if (insertedMessage) {
      // 送信した瞬間に、username付きでローカル state に追加
      setMessages((currentMessages) => [
        ...currentMessages,
        insertedMessage as Message,
      ])
    }
  }

  // UI (変更なし)
  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>Supabase Realtime Chat</h1>
      <p>Logged in as: {user.email}</p>

      {/* --- メッセージ表示欄 --- */}
      <div style={{ border: '1px solid #ccc', minHeight: '300px', padding: '10px', margin: '20px 0', maxHeight: '50vh', overflowY: 'auto' }}>
        <h3>Messages:</h3>
        {messages.length === 0 ? (
          <p>No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div key={msg.id} style={{ margin: '8px 0', padding: '5px', borderBottom: '1px solid #eee' }}>
              <p style={{ margin: 0, fontSize: '0.9em', color: '#555' }}>
                <strong>{msg.profiles?.username ?? '...'}</strong>
                <span style={{ marginLeft: '10px', fontSize: '0.8em', color: '#999' }}>
                  {new Date(msg.created_at).toLocaleString('ja-JP')}
                </span>
              </p>
              <p style={{ margin: '4px 0 0 0' }}>{msg.content}</p>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>
      {/* -------------------- */}

      {/* --- メッセージ送信フォーム --- */}
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