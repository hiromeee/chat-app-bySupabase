'use client' 

import { createClient } from '@/utils/supabase/client'
import { useState, useEffect, useRef } from 'react' 
import type { User } from '@supabase/supabase-js'

const supabase = createClient()

// 型定義
type Message = {
  id: number
  content: string
  image_url: string | null
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

// Propsの型
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
  const [isUploading, setIsUploading] = useState(false)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  
  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const myUsername = profile?.username ?? user.email ?? 'Unknown User'

  // スクロール処理
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


  // リアルタイム購読
  useEffect(() => {
    
    const channelName = `room-${room.id}`
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
      .on('postgres_changes', { 
        event: 'INSERT', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${room.id}` 
      }, handleNewMessage)
      .on('postgres_changes', { 
        event: 'DELETE', 
        schema: 'public', 
        table: 'messages',
        filter: `room_id=eq.${room.id}` 
      }, handleDeleteMessage)

    // 4. Presence (在室状況) の設定
      .on('presence', { event: 'sync' }, () => {
        const newState = channel.presenceState<UserPresence>()
        const typingUsernames = Object.keys(newState)
          .filter(key => key !== user.id)
          .map(key => newState[key][0]) 
          .filter(userState => userState.status === 'typing')
          .map(userState => userState.username)
        setTypingUsers(typingUsernames)
      })

    // 5. チャンネル購読 (subscribe)
      .subscribe(async (status) => {
        if (status === 'SUBSCRIBED') {
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
  }, [supabase, user.id, myUsername, room.id]) 


  // 画像アップロード処理
  const handleImageSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || e.target.files.length === 0) return
    
    const file = e.target.files[0]
    setIsUploading(true)

    try {
      const fileExt = file.name.split('.').pop()
      const fileName = `${Date.now()}-${Math.random().toString(36).substring(2)}.${fileExt}`
      const filePath = `${fileName}`

      const { error: uploadError } = await supabase.storage
        .from('chat-images')
        .upload(filePath, file)

      if (uploadError) {
        throw uploadError
      }

      const { data } = supabase.storage.from('chat-images').getPublicUrl(filePath)
      setPendingImageUrl(data.publicUrl)
    } catch (error) {
      console.error('Error uploading image:', error)
      alert('画像のアップロードに失敗しました')
    } finally {
      setIsUploading(false)
    }
  }

  // フォーム送信処理
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (message.trim() === '' && !pendingImageUrl) return
    
    const messageContent = message
    const imageUrlToSend = pendingImageUrl
    
    setMessage('') 
    setPendingImageUrl(null)
    if (fileInputRef.current) fileInputRef.current.value = '' 

    const { data: insertedMessage, error } = await supabase
      .from('messages')
      .insert({ 
        content: messageContent, 
        image_url: imageUrlToSend,
        user_id: user.id,
        room_id: room.id 
      })
      .select(`
        id, 
        content, 
        image_url,
        created_at, 
        user_id, 
        profiles!inner ( username )
      `) // ★ 変更: profiles!inner ( username )
      .single() 

    if (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) 
      setPendingImageUrl(imageUrlToSend)
    } else if (insertedMessage) {
      // Supabase returns related rows as arrays for `profiles!inner`, normalize to the Message.profiles shape
      const normalizedProfiles = Array.isArray((insertedMessage as any).profiles)
        ? ((insertedMessage as any).profiles[0] ?? null)
        : ((insertedMessage as any).profiles ?? null)

      const normalizedMessage: Message = {
        id: (insertedMessage as any).id,
        content: (insertedMessage as any).content,
        image_url: (insertedMessage as any).image_url,
        created_at: (insertedMessage as any).created_at,
        user_id: (insertedMessage as any).user_id,
        profiles: normalizedProfiles,
      }

      setMessages((currentMessages) => [
        ...currentMessages,
        normalizedMessage,
      ])
    }
  }

  // 削除実行処理
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

  // 「入力中」状態を通知する関数
  const handleTyping = (status: 'typing' | 'online') => {
    const channel = supabase.channel(`room-${room.id}`)
    channel.track({
      username: myUsername,
      status: status,
    })
  }

  // UI
  return (
    <div className="flex h-full w-full flex-col"> 
      {/* ルーム名ヘッダー */}
      <div className="border-b border-gray-200 p-4 dark:border-gray-800">
        <h1 className="text-xl font-bold"># {room.name}</h1>
      </div>

      {/* メッセージ表示エリア */}
      <div className="flex-1 space-y-4 overflow-y-auto p-4 bg-[#7297b9]">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`group flex items-end gap-2 ${
              msg.user_id === user.id ? 'flex-row-reverse' : 'flex-row'
            }`}
          >
            {/* Avatar for others */}
            {msg.user_id !== user.id && (
              <div className="flex flex-col items-center">
                <div className="h-8 w-8 rounded-full bg-gray-300 flex items-center justify-center overflow-hidden">
                   {/* Placeholder or profile image */}
                   <span className="text-xs font-bold text-gray-600">{msg.profiles?.username?.[0]?.toUpperCase() ?? '?'}</span>
                </div>
              </div>
            )}

            <div className={`flex flex-col ${msg.user_id === user.id ? 'items-end' : 'items-start'}`}>
                {/* Username for others (optional, LINE usually shows it above bubble in group, but for DM maybe not needed? Let's keep it small) */}
                {msg.user_id !== user.id && (
                  <span className="mb-1 text-xs text-white opacity-80">
                    {msg.profiles?.username ?? 'Unknown'}
                  </span>
                )}

                <div className="flex items-end gap-1">
                    {/* Timestamp for Me (Left of bubble) */}
                    {msg.user_id === user.id && (
                        <span className="text-[10px] text-white opacity-70 mb-1">
                            {new Date(msg.created_at).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}

                    {/* Bubble */}
                    <div
                      className={`max-w-xs rounded-2xl px-4 py-2 shadow-sm lg:max-w-md relative ${
                        msg.user_id === user.id
                          ? 'bg-[#06c755] text-white rounded-tr-none' // Green for me
                          : 'bg-white text-gray-900 rounded-tl-none' // White for others
                      }`}
                    >
                      {msg.image_url && (
                        <div className="mb-1">
                          <img 
                            src={msg.image_url} 
                            alt="Sent image" 
                            className="max-w-[200px] rounded-lg object-cover"
                            style={{ maxHeight: '300px' }}
                          />
                        </div>
                      )}
                      {msg.content && <p className="text-sm whitespace-pre-wrap break-words">{msg.content}</p>}
                    </div>

                     {/* Timestamp for Others (Right of bubble) */}
                     {msg.user_id !== user.id && (
                        <span className="text-[10px] text-white opacity-70 mb-1">
                            {new Date(msg.created_at).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                        </span>
                    )}
                </div>
            </div>
            
            {/* Delete button (only for me) */}
            {msg.user_id === user.id && (
              <button
                onClick={() => handleDelete(msg.id)}
                className="hidden rounded-full p-1 text-white opacity-50 hover:bg-black/20 group-hover:block"
                title="Delete"
              >
                <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" fill="currentColor" viewBox="0 0 16 16">
                  <path d="M5.5 5.5A.5.5 0 0 1 6 6v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m2.5 0a.5.5 0 0 1 .5.5v6a.5.5 0 0 1-1 0V6a.5.5 0 0 1 .5-.5m3 .5a.5.5 0 0 0-1 0v6a.5.5 0 0 0 1 0z"/>
                  <path d="M14.5 3a1 1 0 0 1-1 1H13v9a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V4h-.5a1 1 0 0 1-1-1V2a1 1 0 0 1 1-1H6a1 1 0 0 1 1-1h2a1 1 0 0 1 1 1h3.5a1 1 0 0 1 1 1zM4.118 4 4 4.059V13a1 1 0 0 0 1 1h6a1 1 0 0 0 1-1V4.059L11.882 4zM2.5 3h11V2h-11z"/>
                </svg>
              </button>
            )}

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

      {/* メッセージ送信フォーム */}
      <form 
        onSubmit={handleSubmit} 
        className="flex w-full items-center space-x-2 border-t border-gray-200 p-4 dark:border-gray-800"
      >
        <input
          type="file"
          accept="image/*"
          className="hidden"
          ref={fileInputRef}
          onChange={handleImageSelect}
        />
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          className="rounded-full p-2 text-gray-500 hover:bg-gray-100 dark:text-gray-400 dark:hover:bg-gray-800"
          disabled={isUploading}
        >
          {isUploading ? (
            <div className="h-6 w-6 animate-spin rounded-full border-2 border-gray-300 border-t-blue-600" />
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          )}
        </button>
        
        {pendingImageUrl && (
          <div className="relative h-10 w-10">
            <img src={pendingImageUrl} alt="Preview" className="h-full w-full rounded object-cover" />
            <button
              type="button"
              onClick={() => setPendingImageUrl(null)}
              className="absolute -right-1 -top-1 rounded-full bg-red-500 p-0.5 text-white"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </div>
        )}

        <input
          type="text"
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          placeholder="Type your message..."
          className="flex-1 rounded border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-900 dark:text-white"
          onFocus={() => handleTyping('typing')}
          onBlur={() => handleTyping('online')}
        />
        <button 
          type="submit" 
          className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          disabled={message.trim() === '' && !pendingImageUrl}
        >
          Send
        </button>
      </form>
    </div>
  )
}