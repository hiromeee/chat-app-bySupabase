'use client' 

import { createClient } from '@/utils/supabase/client'
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


  // ★★★ リアルタイム購読 (INSERT と DELETE を監視) ★★★
  useEffect(() => {
    
    // 1. 新規メッセージ (INSERT) の処理
    const handleNewMessage = async (payload: any) => {
      const newMessage = payload.new as Message
      
      // 自分のメッセージは handleSubmit で処理するので無視
      if (newMessage.user_id === user.id) return

      // 他人のメッセージは profile を取得
      const { data: profile, error } = await supabase
        .from('profiles')
        .select('username')
        .eq('id', newMessage.user_id)
        .single()
      newMessage.profiles = error ? { username: 'Unknown' } : { username: profile?.username ?? 'Unknown' }

      // 関数型アップデートで state に追加
      setMessages((currentMessages) => {
        if (currentMessages.find((msg) => msg.id === newMessage.id)) {
          return currentMessages
        }
        return [...currentMessages, newMessage]
      })
    }

    // 2. 削除メッセージ (DELETE) の処理
    const handleDeleteMessage = (payload: any) => {
      const deletedMessageId = payload.old.id as number
      
      // 関数型アップデートで state から削除
      setMessages((currentMessages) => {
        // 削除されたIDと一致しないメッセージだけを残す
        return currentMessages.filter((msg) => msg.id !== deletedMessageId)
      })
    }

    // 3. リアルタイムチャンネルの設定
    const channel = supabase
      .channel('messages-channel')
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'messages' },
        handleNewMessage 
      )
      .on( // ★ DELETE イベントの監視を追加
        'postgres_changes',
        { event: 'DELETE', schema: 'public', table: 'messages' },
        handleDeleteMessage
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id]) 
  // ★★★ 修正ここまで ★★★


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

  // ★★★ 削除実行処理 (新規追加) ★★★
  const handleDelete = async (messageId: number) => {
    // UIから即時削除（オプティミスティック・アップデート）
    setMessages((currentMessages) => 
      currentMessages.filter((msg) => msg.id !== messageId)
    )

    // DBから削除
    const { error } = await supabase
      .from('messages')
      .delete()
      .eq('id', messageId) // RLSポリシーがあるので自分のしか消せないが、明示的にID指定

    if (error) {
      console.error('Error deleting message:', error)
      // エラーが発生したら、リロードしてUIをDBと同期させる（簡易的なエラー処理）
      window.location.reload()
    }
  }

  // ★ UI (削除ボタンの追加)
  return (
    <div className="flex h-[calc(100vh-4rem)] w-full flex-col">
      {/* メッセージ表示エリア */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4">
        {messages.length === 0 ? (
          <p className="text-center text-gray-500">No messages yet.</p>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`group flex items-center gap-2 ${ // ★ group と gap-2 を追加
                msg.user_id === user.id ? 'flex-row-reverse' : 'flex-row'
              }`}
            >
              {/* ★ 削除ボタン (自分のメッセージにのみ表示) */}
              {msg.user_id === user.id && (
                <button
                  onClick={() => handleDelete(msg.id)}
                  className="hidden rounded-full p-1 text-gray-400 opacity-50 hover:bg-gray-200 hover:text-red-500 group-hover:block dark:hover:bg-gray-800"
                  title="Delete"
                >
                  {/* ゴミ箱アイコン (簡易的な 'X') */}
                  <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                    <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                    <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                  </svg>
                </button>
              )}

              {/* メッセージ本体 */}
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
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* メッセージ送信フォーム (変更なし) */}
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