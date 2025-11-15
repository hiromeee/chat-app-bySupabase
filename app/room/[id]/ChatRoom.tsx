'use client' 

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef } from 'react' 
import type { User } from '@supabase/supabase-js'

const supabase = createClient()

// 型定義 (変更なし)
type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null 
}
type Profile = {
  username: string | null
}
type Room = {
  id: number
  name: string
}
type UserPresence = {
  username: string
  status: 'online' | 'typing'
}

// Propsの型 (変更なし)
type ChatRoomProps = {
  user: User
  profile: Profile
  initialMessages: Message[] 
  room: Room
}

export default function ChatRoom({ user, profile, initialMessages, room }: ChatRoomProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const myUsername = profile?.username ?? user.email ?? 'Unknown User'

  // スクロール処理 (変更なし)
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // リアルタイム購読 (変更なし)
  useEffect(() => {
    const channelName = `room-${room.id}`
    const channel = supabase.channel(channelName)

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

    const handleDeleteMessage = (payload: any) => {
      setMessages((current) => current.filter((msg) => msg.id !== payload.old.id))
    }
    
    channel
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, handleNewMessage)
      .on('postgres_changes', { event: 'DELETE', schema: 'public', table: 'messages', filter: `room_id=eq.${room.id}` }, handleDeleteMessage)
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<UserPresence>()
        const typingUsernames = Object.keys(newState)
          .filter(key => key !== user.id)
          .map(key => newState[key][0]) 
          .filter(userState => userState.status === 'typing')
          .map(userState => userState.username)
        setTypingUsers(typingUsernames)
      })
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
          await channel.track({ username: myUsername, status: 'online' })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id, myUsername, room.id]) 

  // フォーム送信処理 (修正)
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === '') return
    const messageContent = message
    setMessage('') 

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert({ content: messageContent, user_id: user.id, room_id: room.id })
      .select(`id, content, created_at, user_id, profiles ( username )`) 
      .single() 

    if (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) 
    } else if (insertedMessage) {
      setMessages((currentMessages) => [
        ...currentMessages,
        // ★★★ 修正点: unknown を介して Message にキャスト ★★★
        insertedMessage as unknown as Message, 
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
    const channel = supabase.channel(`room-${room.id}`)
    channel.track({
      username: myUsername,
      status: status,
    })
  }


  // UI (変更なし)
  return (
    <div className="flex h-full w-full flex-col">
      {/* ルーム名ヘッダー */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <h1 className="text-xl font-bold"># {room.name}</h1>
      </div>

      {/* メッセージ表示エリア */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.map((msg) => {
          const isMe = msg.user_id === user.id
          return (
            <div
              key={msg.id}
              className={`flex ${isMe ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`group flex items-center gap-2 ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* 削除ボタン */}
                {isMe && (
                  <button
                    onClick={() => handleDelete(msg.id)}
                    className="shrink-0 rounded-full p-1 text-gray-400 opacity-0 transition-all duration-150 hover:bg-gray-200 hover:text-red-500 group-hover:opacity-100 dark:hover:bg-gray-800"
                    title="Delete"
                  >
                    {/* ゴミ箱アイコン */}
                    <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"></path>
                    </svg>
                  </button>
                )}

                {/* チャットバブル */}
                <div
                  className={`max-w-xs rounded-lg px-4 py-2 shadow-md lg:max-w-md ${
                    isMe
                      ? 'rounded-br-none bg-blue-600 text-white' // 自分のバブル
                      : 'rounded-bl-none bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white' // 他人のバブル
                  }`}
                >
                  {!isMe && (
                    <p className="text-xs font-semibold text-blue-400 dark:text-blue-300">
                      {msg.profiles?.username ?? '...'}
                    </p>
                  )}
                  <p className="mt-1 break-words text-base">{msg.content}</p> 
                  <p className="mt-1 text-right text-xs opacity-60">
                    {new Date(msg.created_at).toLocaleString('ja-JP', { timeStyle: 'short' })}
                  </p>
                </div>
              </div>
            </div>
          )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* 「入力中...」表示エリア */}
      <div className="h-6 px-4 pb-2 text-sm text-gray-500 dark:text-gray-400">
        {typingUsers.length > 0 && (
          <span className="italic">
            {typingUsers.join(', ')} {typingUsers.length > 1 ? 'が' : 'が'}入力中...
          </span>
        )}
      </div>

      {/* メッセージ送信フォーム */}
      <form 
        onSubmit={handleSubmit} 
        className="flex w-full items-center space-x-2 border-t border-gray-200 p-4 transition-all duration-150 focus-within:border-blue-500 focus-within:ring-1 focus-within:ring-blue-500 dark:border-gray-800"
      >
        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 border-none bg-transparent p-2 text-gray-900 outline-none focus:ring-0 dark:text-white"
          onFocus={() => handleTyping('typing')}
          onBlur={() => handleTyping('online')}
        />
        <button 
          type="submit" 
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white transition-colors duration-150 hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={message.trim() === ''}
        >
          Send
        </button>
      </form>
    </div>
  )
}