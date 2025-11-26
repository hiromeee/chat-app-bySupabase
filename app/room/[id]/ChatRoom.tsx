'use client' 

import { createClient } from '@/utils/supabase/client'
import { sendMessageToAI } from '@/app/actions'
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

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])


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
          await channel.track({
            username: myUsername,
            status: 'online',
          })
        }
      })

    return () => {
      channel.untrack()
      supabase.removeChannel(channel)
    }
  }, [supabase, user.id, myUsername, room.id]) 


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
      alert('Error uploading image')
    } finally {
      setIsUploading(false)
    }
  }

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
      `) 
      .single() 

    if (error) {
      console.error('Error sending message:', error)
      setMessage(messageContent) 
      setPendingImageUrl(imageUrlToSend)
    } else if (insertedMessage) {
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

      if (messageContent.includes('@ai')) {
        sendMessageToAI(messageContent, room.id)
      }
    }
  }

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

  const handleTyping = (status: 'typing' | 'online') => {
    const channel = supabase.channel(`room-${room.id}`)
    channel.track({
      username: myUsername,
      status: status,
    })
  }

  return (
    <div className="flex h-full w-full flex-col"> 
      {/* Header */}
      <div className="flex items-center justify-between border-b border-white/20 bg-white/40 p-4 backdrop-blur-md dark:bg-slate-900/40">
        <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-full bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-400">
                <span className="text-lg font-bold">#</span>
            </div>
            <div>
                <h1 className="text-lg font-bold text-slate-900 dark:text-white">{room.name}</h1>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                    {typingUsers.length > 0 ? (
                        <span className="text-indigo-500 font-medium animate-pulse">
                            {typingUsers.join(', ')} is typing...
                        </span>
                    ) : (
                        'Active now'
                    )}
                </p>
            </div>
        </div>
      </div>

      {/* Messages Area */}
      <div className="flex-1 space-y-6 overflow-y-auto p-6 scroll-smooth">
        {messages.map((msg, index) => {
            const isMe = msg.user_id === user.id;
            const showAvatar = !isMe && (index === 0 || messages[index - 1].user_id !== msg.user_id);
            
            return (
              <div
                key={msg.id}
                className={`group flex items-end gap-3 ${
                  isMe ? 'flex-row-reverse' : 'flex-row'
                }`}
              >
                {/* Avatar */}
                {!isMe && (
                  <div className={`flex-shrink-0 w-8 ${!showAvatar ? 'invisible' : ''}`}>
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                       {msg.profiles?.username?.[0]?.toUpperCase() ?? '?'}
                    </div>
                  </div>
                )}

                <div className={`flex flex-col max-w-[70%] ${isMe ? 'items-end' : 'items-start'}`}>
                    {/* Username */}
                    {!isMe && showAvatar && (
                      <span className="mb-1 ml-1 text-xs font-medium text-slate-500 dark:text-slate-400">
                        {msg.profiles?.username ?? 'Unknown'}
                      </span>
                    )}

                    <div className="relative group/bubble">
                        {/* Bubble */}
                        <div
                          className={`relative px-5 py-3 shadow-sm ${
                            isMe
                              ? 'bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-2xl rounded-tr-sm' 
                              : 'bg-white text-slate-800 dark:bg-slate-800 dark:text-slate-100 rounded-2xl rounded-tl-sm' 
                          }`}
                        >
                          {msg.image_url && (
                            <div className="mb-2 overflow-hidden rounded-lg">
                              <img 
                                src={msg.image_url} 
                                alt="Sent image" 
                                className="max-w-full object-cover transition-transform hover:scale-105"
                                style={{ maxHeight: '300px' }}
                              />
                            </div>
                          )}
                          {msg.content && <p className="text-sm leading-relaxed whitespace-pre-wrap break-words">{msg.content}</p>}
                        </div>
                        
                        {/* Actions (Delete) */}
                        {isMe && (
                            <button
                                onClick={() => handleDelete(msg.id)}
                                className="absolute -left-8 top-1/2 -translate-y/2 opacity-0 transition-opacity group-hover/bubble:opacity-100 text-slate-400 hover:text-red-500"
                                title="Delete"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>
                    
                    {/* Timestamp */}
                    <span className={`mt-1 text-[10px] text-slate-400 ${isMe ? 'mr-1' : 'ml-1'}`}>
                        {new Date(msg.created_at).toLocaleString('ja-JP', { hour: '2-digit', minute: '2-digit' })}
                    </span>
                </div>
              </div>
            )
        })}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-4 bg-white/60 dark:bg-slate-900/60 backdrop-blur-md border-t border-white/20 dark:border-slate-800/50">
          <form 
            onSubmit={handleSubmit} 
            className="flex items-end gap-2 rounded-2xl bg-white p-2 shadow-lg ring-1 ring-slate-900/5 dark:bg-slate-800 dark:ring-white/10"
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
              className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-xl transition-colors ${
                  isUploading ? 'cursor-not-allowed opacity-50' : 'text-slate-400 hover:bg-slate-100 hover:text-indigo-600 dark:hover:bg-slate-700 dark:hover:text-indigo-400'
              }`}
              disabled={isUploading}
            >
              {isUploading ? (
                <div className="h-5 w-5 animate-spin rounded-full border-2 border-slate-300 border-t-indigo-600" />
              ) : (
                <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              )}
            </button>
            
            <div className="flex-1 py-2">
                {pendingImageUrl && (
                  <div className="relative mb-2 inline-block">
                    <img src={pendingImageUrl} alt="Preview" className="h-20 w-auto rounded-lg object-cover shadow-sm ring-1 ring-slate-200 dark:ring-slate-700" />
                    <button
                      type="button"
                      onClick={() => setPendingImageUrl(null)}
                      className="absolute -right-2 -top-2 rounded-full bg-white shadow-md p-1 text-slate-500 hover:text-red-500 dark:bg-slate-800"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5">
                        <path d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                )}
                <input
                  type="text"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white"
                  onFocus={() => handleTyping('typing')}
                  onBlur={() => handleTyping('online')}
                />
            </div>

            <button 
              type="submit" 
              className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-indigo-600 text-white shadow-md transition-all hover:bg-indigo-500 hover:shadow-lg disabled:opacity-50 disabled:shadow-none"
              disabled={message.trim() === '' && !pendingImageUrl}
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
              </svg>
            </button>
          </form>
      </div>
    </div>
  )
}