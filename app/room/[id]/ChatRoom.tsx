'use client'

import { createClient } from '@/utils/supabase/client'
import { sendMessageToAI, deleteMessage } from '@/app/actions'
import { useState, useEffect, useRef } from 'react'
import type { User } from '@supabase/supabase-js'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeHighlight from 'rehype-highlight'
import 'highlight.js/styles/github-dark.css'
import EmojiPicker, { Theme } from 'emoji-picker-react'
import LinkPreview from '@/app/components/LinkPreview'

const supabase = createClient()

// 型定義
type Reaction = {
  id: number
  emoji: string
  user_id: string
  message_id?: number // Optional for local state updates
}

type Message = {
  id: number
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  profiles: {
    username: string | null
  } | null
  reactions?: Reaction[]
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
  const [messages, setMessages] = useState<Message[]>(initialMessages)
  const [typingUsers, setTypingUsers] = useState<string[]>([])
  const [isUploading, setIsUploading] = useState(false)
  const [pendingImageUrl, setPendingImageUrl] = useState<string | null>(null)
  const [deletingMessageId, setDeletingMessageId] = useState<number | null>(null)
  const [activeReactionMessageId, setActiveReactionMessageId] = useState<number | null>(null)
  const [isRoomAdmin, setIsRoomAdmin] = useState(false)
  const [adminUserIds, setAdminUserIds] = useState<Set<string>>(new Set())

  const messagesEndRef = useRef<HTMLDivElement | null>(null)
  const fileInputRef = useRef<HTMLInputElement>(null)
  const myUsername = profile?.username ?? user.email ?? 'Unknown User'

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages])

  // Check User Role & Fetch Admins
  useEffect(() => {
    const checkRole = async () => {
      const { data, error } = await supabase
        .from('room_participants')
        .select('user_id')
        .eq('room_id', room.id)
        .eq('role', 'admin')
      
      if (data) {
        const admins = new Set(data.map(p => p.user_id))
        setAdminUserIds(admins)
        setIsRoomAdmin(admins.has(user.id))
      }
    }
    checkRole()
  }, [room.id, user.id])

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
      newMessage.reactions = []

      setMessages((current) => current.find((m) => m.id === newMessage.id) ? current : [...current, newMessage])
    }

    const handleDeleteMessage = (payload: any) => {
      setMessages((current) => current.filter((msg) => msg.id !== payload.old.id))
    }

    const handleNewReaction = (payload: any) => {
      const newReaction = payload.new as Reaction
      setMessages((current) => current.map((msg) => {
        if (msg.id === newReaction.message_id) {
           return {
             ...msg,
             reactions: [...(msg.reactions || []), newReaction]
           }
        }
        return msg
      }))
    }

    const handleDeleteReaction = (payload: any) => {
      const oldReaction = payload.old as Reaction
      setMessages((current) => current.map((msg) => ({
        ...msg,
        reactions: (msg.reactions || []).filter((r) => r.id !== oldReaction.id)
      })))
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
      .on('postgres_changes', {
        event: 'INSERT',
        schema: 'public',
        table: 'message_reactions',
      }, handleNewReaction)
      .on('postgres_changes', {
        event: 'DELETE',
        schema: 'public',
        table: 'message_reactions',
      }, handleDeleteReaction)

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
        reactions: []
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

  const confirmDelete = (messageId: number) => {
    setDeletingMessageId(messageId)
  }

  const handleDelete = async () => {
    if (deletingMessageId === null) return

    const messageId = deletingMessageId
    setDeletingMessageId(null) // Close modal immediately

    // Optimistic update
    setMessages((currentMessages) => 
      currentMessages.filter((msg) => msg.id !== messageId)
    )

    try {
        await deleteMessage(messageId, room.id)
    } catch (error) {
        console.error('Error deleting message:', error)
        alert('Failed to delete message')
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

  const toggleReaction = async (messageId: number, emoji: string) => {
    const message = messages.find(m => m.id === messageId)
    if (!message) return

    const existingReaction = message.reactions?.find(
      r => r.user_id === user.id && r.emoji === emoji
    )

    if (existingReaction) {
      // Optimistic Delete
      setMessages(current => current.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            reactions: (m.reactions || []).filter(r => r.id !== existingReaction.id)
          }
        }
        return m
      }))
      await supabase.from('message_reactions').delete().eq('id', existingReaction.id)
    } else {
      // Optimistic Insert
      const tempId = Date.now()
      const newReaction = { id: tempId, emoji, user_id: user.id, message_id: messageId }
      setMessages(current => current.map(m => {
        if (m.id === messageId) {
          return {
            ...m,
            reactions: [...(m.reactions || []), newReaction]
          }
        }
        return m
      }))

      const { data, error } = await supabase.from('message_reactions').insert({
        message_id: messageId,
        user_id: user.id,
        emoji
      }).select().single()

      if (data) {
        setMessages(current => current.map(m => {
          if (m.id === messageId) {
            return {
              ...m,
              reactions: (m.reactions || []).map(r => r.id === tempId ? data : r)
            }
          }
          return m
        }))
      } else if (error) {
        console.error('Error adding reaction:', error)
        // Revert
        setMessages(current => current.map(m => {
            if (m.id === messageId) {
              return {
                ...m,
                reactions: (m.reactions || []).filter(r => r.id !== tempId)
              }
            }
            return m
          }))
      }
    }
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
            
            // Group reactions
            const reactionGroups = (msg.reactions || []).reduce((acc, r) => {
                if (!acc[r.emoji]) acc[r.emoji] = { count: 0, hasReacted: false }
                acc[r.emoji].count++
                if (r.user_id === user.id) acc[r.emoji].hasReacted = true
                return acc
            }, {} as Record<string, { count: number, hasReacted: boolean }>)

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
                      <span className="mb-1 ml-1 text-xs font-medium text-slate-500 dark:text-slate-400 flex items-center gap-1">
                        {msg.profiles?.username ?? 'Unknown'}
                        {adminUserIds.has(msg.user_id) && (
                            <span className="px-1.5 py-0.5 rounded-full bg-indigo-100 text-[10px] font-bold text-indigo-600 dark:bg-indigo-500/20 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-500/30">
                                Admin
                            </span>
                        )}
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
                          {msg.content && (
                            <div className="text-sm leading-relaxed break-words markdown-content">
                              <ReactMarkdown
                                remarkPlugins={[remarkGfm]}
                                rehypePlugins={[rehypeHighlight]}
                                components={{
                                  p: ({node, ...props}) => <div className="mb-1 last:mb-0" {...props} />,
                                  a: ({node, ...props}) => (
                                    <>
                                      <a className="underline hover:text-indigo-300" target="_blank" rel="noopener noreferrer" {...props} />
                                      {props.href && <LinkPreview url={props.href} />}
                                    </>
                                  ),
                                  ul: ({node, ...props}) => <ul className="list-disc list-inside mb-2" {...props} />,
                                  ol: ({node, ...props}) => <ol className="list-decimal list-inside mb-2" {...props} />,
                                  li: ({node, ...props}) => <li className="mb-1" {...props} />,
                                  code: ({node, className, children, ...props}: any) => {
                                    const match = /language-(\w+)/.exec(className || '')
                                    const isInline = !match && !String(children).includes('\n')
                                    return isInline ? (
                                      <code className="bg-black/20 rounded px-1 py-0.5 text-[0.9em] font-mono" {...props}>
                                        {children}
                                      </code>
                                    ) : (
                                      <code className={className} {...props}>
                                        {children}
                                      </code>
                                    )
                                  },
                                  pre: ({node, ...props}) => (
                                    <pre className="bg-[#0d1117] rounded-lg p-3 my-2 overflow-x-auto text-xs" {...props} />
                                  ),
                                  table: ({node, ...props}) => <table className="border-collapse border border-white/20 my-2 w-full text-xs" {...props} />,
                                  th: ({node, ...props}) => <th className="border border-white/20 px-2 py-1 bg-white/10" {...props} />,
                                  td: ({node, ...props}) => <td className="border border-white/20 px-2 py-1" {...props} />,
                                  blockquote: ({node, ...props}) => <blockquote className="border-l-4 border-white/30 pl-2 italic my-2" {...props} />,
                                }}
                              >
                                {msg.content}
                              </ReactMarkdown>
                            </div>
                          )}
                        </div>
                        
                        {/* Actions (Delete) */}
                        {(isMe || isRoomAdmin) && (
                            <button
                                onClick={() => confirmDelete(msg.id)}
                                className="absolute -left-8 top-1/2 -translate-y-1/2 opacity-0 transition-opacity group-hover/bubble:opacity-100 text-slate-400 hover:text-red-500"
                                title="Delete"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                            </button>
                        )}
                    </div>

                    {/* Reactions */}
                    <div className="flex flex-wrap gap-1 mt-1.5">
                        {Object.entries(reactionGroups).map(([emoji, { count, hasReacted }]) => (
                            <button
                                key={emoji}
                                onClick={() => toggleReaction(msg.id, emoji)}
                                className={`flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium transition-all ${
                                    hasReacted 
                                    ? 'bg-indigo-100 text-indigo-700 border border-indigo-200 dark:bg-indigo-500/30 dark:text-indigo-200 dark:border-indigo-500/50' 
                                    : 'bg-white/50 text-slate-600 border border-slate-200 hover:bg-slate-100 dark:bg-slate-800/50 dark:text-slate-400 dark:border-slate-700 dark:hover:bg-slate-700'
                                }`}
                            >
                                <span>{emoji}</span>
                                {count > 1 && <span>{count}</span>}
                            </button>
                        ))}
                        
                        <div className="relative">
                            <button
                                onClick={() => setActiveReactionMessageId(activeReactionMessageId === msg.id ? null : msg.id)}
                                className={`flex h-5 w-5 items-center justify-center rounded-full bg-white/50 text-slate-400 hover:bg-slate-100 hover:text-slate-600 dark:bg-slate-800/50 dark:hover:bg-slate-700 transition-all ${
                                    activeReactionMessageId === msg.id || Object.keys(reactionGroups).length > 0 ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
                                }`}
                                title="Add reaction"
                            >
                                <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14.828 14.828a4 4 0 01-5.656 0M9 10h.01M15 10h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                                </svg>
                            </button>
                            
                            {activeReactionMessageId === msg.id && (
                                <div className="absolute bottom-8 left-0 z-50">
                                    <div className="fixed inset-0 z-40" onClick={() => setActiveReactionMessageId(null)} />
                                    <div className="relative z-50 shadow-xl rounded-lg overflow-hidden">
                                        <EmojiPicker 
                                            onEmojiClick={(e) => {
                                                toggleReaction(msg.id, e.emoji)
                                                setActiveReactionMessageId(null)
                                            }}
                                            width={300}
                                            height={400}
                                            theme={Theme.AUTO}
                                            searchDisabled
                                            skinTonesDisabled
                                        />
                                    </div>
                                </div>
                            )}
                        </div>
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
                <textarea
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Type a message..."
                  className="w-full bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none dark:text-white resize-none"
                  rows={1}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
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

      {/* Delete Confirmation Modal */}
      {deletingMessageId !== null && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
          onClick={() => setDeletingMessageId(null)}
        >
          <div 
            className="w-full max-w-sm overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="p-6 text-center">
                <h3 className="text-lg font-bold text-slate-900 dark:text-white">メッセージを送信を取り消しますか？</h3>
                
                <div className="mt-8 flex flex-col gap-3">
                    <button
                        onClick={handleDelete}
                        className="w-full rounded-xl bg-red-500 py-3 text-sm font-bold text-white shadow-sm hover:bg-red-600 transition-colors"
                    >
                        送信取消
                    </button>
                    <button
                        onClick={() => setDeletingMessageId(null)}
                        className="w-full rounded-xl bg-slate-100 py-3 text-sm font-bold text-slate-700 hover:bg-slate-200 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700 transition-colors"
                    >
                        閉じる
                    </button>
                </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}