'use client' 

import { createClient } from '@/utils/supabase/client' //
import { useState, useEffect, useRef } from 'react' 
import type { User } from '@supabase/supabase-js'

const supabase = createClient()

// Message型 (変更なし)
type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null 
}

// Profile型 (app/page.tsxから渡される)
type Profile = {
  username: string | null
}

// Presenceで共有する状態の型
type UserPresence = {
  username: string
  status: 'online' | 'typing'
}

// Propsの型 (profile を追加)
type ChatClientProps = {
  user: User
  profile: Profile // 自分のプロフィール情報
  initialMessages: Message[] 
}

export default function ChatClient({ user, profile, initialMessages }: ChatClientProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  // 入力中のユーザーリスト（名前の配列）を管理
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  
  // 自分の現在のユーザー名を取得（プロフィール未設定ならEmail）
  const myUsername = profile?.username ?? user.email ?? 'Unknown User'

  // スクロール処理 (変更なし)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  // リアルタイム購読 (Presence を追加)
  useEffect(() => {
    
    // チャンネル名を定義（DB変更とPresenceで共通）
    const channelName = 'messages-channel'
    const channel = supabase.channel(channelName)

    // 1. 新規メッセージ (INSERT) の処理
    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new as Message
      if (newMessage.user_id === user.id) return
      
      const { data: profileData, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', newMessage.user_id)
        .single()
      newMessage.profiles = error ? { username: 'Unknown' } : { username: profileData?.username ?? 'Unknown' }

      setMessages((current) => current.find((m) => m.id === newMessage.id) ? current : [...current, newMessage])
    }

    // 2. 削除メッセージ (DELETE) の処理
    const handleDeleteMessage = (payload: any) => {
      setMessages((current) => current.filter((msg) => msg.id !== payload.old.id))
    }
    
    // 3. リアルタイムチャンネルの設定 (DB変更)
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages' }, handleNewMessage)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages' }, handleDeleteMessage)

    // 4. Presence (在室状況) の設定
      .on('presence', { event: 'sync' }, () => {
        // 'sync' イベントで、全ユーザーの最新状態を取得
        const newState = channel.presenceState<UserPresence>()
        
        // "typing" 中の "他人" のリストを作成
        const typingUsernames = Object.keys(newState)
          .filter(key => key !== user.id) // 自分自身を除く
          .map(key => newState[key][0]) // 各ユーザーの最新の状態を取得
          .filter(userState => userState.status === 'typing')
          .map(userState => userState.username)

        setTypingUsers(typingUsernames)
      })

    // 5. チャンネル購読 (subscribe)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          // チャンネル購読完了時に、自分の状態を 'online' として通知
          await channel.track({
            username: myUsername,
            status: 'online',
          })
        }
      })

    // 6. クリーンアップ
    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id, myUsername]) 


  // フォーム送信処理 (変更なし)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === '') return
    const messageContent = message
    setMessage('') 

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert({ content: messageContent, user_id: user.id })
      .select(`id, content, created_at, user_id, profiles ( username )`) 
      .single() 

    if (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) 
    } else if (insertedMessage) {
      setMessages((currentMessages) => [
        ...currentMessages,
        insertedMessage as Message,
      ])
    }
  }

  // 削除実行処理 (変更なし)
  const handleDelete = async (messageId: number) => {
    setMessages((currentMessages) => 
      currentMessages.filter((msg) => msg.id !== messageId)
    )
    const { error } = await supabase.from('messages').delete().eq('id', messageId)
    if (error) {
      console.error('Error deleting message:', error)
      window.location.reload()
    }
  }

  // 「入力中」状態を通知する関数 (変更なし)
  const handleTyping = (status: 'typing' | 'online') => {
    const channel = supabase.channel('messages-channel')
    channel.track({
      username: myUsername,
      status: status,
    })
  }


  // UI
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col">
      {/* メッセージ表示エリア */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group flex items-center gap-2 ${
              msg.user_id === user.id ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {msg.user_id === user.id && (
              <button
                onClick={() => handleDelete(msg.id)}
                className="hidden rounded-full p-1 text-gray-400 opacity-50 hover:bg-gray-200 hover:text-red-500 group-hover:block dark:hover:bg-gray-800"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>
              </button>
            )}
            <div
              className={`max-w-xs rounded-lg px-4 py-2 shadow-md lg:max-w-md ${
                msg.user_id === user.id
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white'
              }`}
            >
              {msg.user_id !== user.id && (
                <p className="text-xs font-semibold opacity-80">
                  {msg.profiles?.username ?? '...'}
                </p>
              )}
              <p className="mt-1 text-base">{msg.content}</p>
              <p className="mt-1 text-right text-xs opacity-60">
                {new Date(msg.created_at).toLocaleString('ja-JP', { timeStyle: 'short' })}
              </p>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      {/* 「入力中...」表示エリア */}
      <div className="h-6 px-4 pb-2 text-sm text-gray-500 dark:text-gray-400">
        {typingUsers.length > 0 && (
          <span>
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'が' : 'が'}入力中...
          </span>
        )}
      </div>

      {/* メッセージ送信フォーム (inputのdisabledを削除) */}
      <form 
        onSubmit={handleSubmit} 
        className="flex w-full items-center space-x-2 border-t border-gray-200 p-4 dark:border-gray-800"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          // ★ 修正点: この input から disabled={message.trim() === ''} を削除
          onFocus={() => handleTyping('typing')}
          onBlur={() => handleTyping('online')}
        />
        <button 
          type="submit" 
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={message.trim() === ''} // ★ ボタンの disabled は正しい
        >
          Send
        </button>
      </form>
    </div>
  )
}