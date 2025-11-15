'use client' 

import { createClient } from '@/utils/supabase/client' //
import { useState, useEffect, useRef } from 'react' 
import type { User } from '@supabase/supabase-js'

const supabase = createClient()

type Message = {
  id: number
  content: string
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null 
}

type ChatClientProps = {
  user: User
  initialMessages: Message[] 
}

export default function ChatClient({ user, initialMessages }: ChatClientProps) {
  const [message, setMessage] = useState('')
  const [messages, setMessages] = useState(initialMessages)
  const messagesEndRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  useEffect(() => {
    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new as Message
      if (newMessage.user_id !== user.id) {
        const { data: profile, error } = await supabase
          .from('profiles')
          .select('username')
          .eq('id', newMessage.user_id)
          .single()

        newMessage.profiles = error ? { username: 'Unknown' } : { username: profile?.username ?? 'Unknown' }
      }

      setMessages((currentMessages) => {
        if (currentMessages.find((msg) => msg.id === newMessage.id)) {
          return currentMessages
        }
        return [...currentMessages, newMessage]
      })
    }

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
  }, [supabase, user.id]) 

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

  // ★ UIをTailwindクラスに変更
  return (
    // 全体をフレックスコンテナにし、高さを画面いっぱい(ヘッダーを除く)にする
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col">
      {/* メッセージ表示エリア */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            // ★ 自分が送信したメッセージかを判断
            <div
              key={msg.id}
              // 自分のメッセージは右寄せ (flex-row-reverse)
              className={`flex ${msg.user_id === user.id ? 'flex-row-reverse' : 'flex-row'}`}
            >
              <div
                // 自分のメッセージは青背景、他人はグレー背景
                className={`max-w-xs rounded-lg px-4 py-2 shadow-md lg:max-w-md ${
                  msg.user_id === user.id
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-200 text-gray-900 dark:bg-gray-800 dark:text-white'
                }`}
              >
                {/* ユーザー名 (他人からのメッセージのみ表示) */}
                {msg.user_id !== user.id && (
                  <p className="text-xs font-semibold opacity-80">
                    {msg.profiles?.username ?? '...'}
                  </p>
                )}
                {/* メッセージ本文 */}
                <p className="mt-1 text-base">{msg.content}</p>
                {/* タイムスタンプ */}
                <p className="mt-1 text-right text-xs opacity-60">
                  {new Date(msg.created_at).toLocaleString('ja-JP', { timeStyle: 'short' })}
                </p>
              </div>
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ送信フォーム (フッター固定) */}
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
        />
        <button 
          type="submit" 
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={message.trim() === ''}
        >
          Send
        </button>
      </form>
    </div>
  )
}