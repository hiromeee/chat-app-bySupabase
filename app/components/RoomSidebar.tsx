'use client' 

import { createClient } from '@/utils/supabase/client'
import Link from 'next/link'
import { usePathname } from 'next/navigation' 
import { useState, useEffect, useRef } from 'react' 
import { createRoom, startDirectChat, deleteRoom } from '../actions' // サーバーアクション

// ルームの型定義
type Room = {
  id: number
  name: string
}

export default function RoomSidebar() {
  const supabase = createClient()
  const pathname = usePathname() 

  const [rooms, setRooms] = useState<Room[]>([])
  const [adminRoomIds, setAdminRoomIds] = useState<Set<number>>(new Set())
  const [isModalOpen, setIsModalOpen] = useState(false)
  const [newRoomName, setNewRoomName] = useState('')
  const [users, setUsers] = useState<any[]>([])

  useEffect(() => {
    const fetchRooms = async () => {
      const { data, error } = await supabase
        .from('rooms')
        .select('id, name')
        .eq('is_group', true)
        .order('created_at', { ascending: true })
      
      if (error) {
        console.error('Error fetching rooms:', error)
      } else {
        setRooms(data || [])
      }

      // Fetch admin rooms
      const { data: { user } } = await supabase.auth.getUser()
      if (user) {
          const { data: adminData } = await supabase
            .from('room_participants')
            .select('room_id')
            .eq('user_id', user.id)
            .eq('role', 'admin')
          
          if (adminData) {
              setAdminRoomIds(new Set(adminData.map(r => r.room_id)))
          }
      }
    }
    fetchRooms()

    const channel = supabase
      .channel('rooms-channel') 
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'rooms', filter: 'is_group=eq.true' },
        (payload) => {
          setRooms((currentRooms) => {
            if (currentRooms.find(room => room.id === payload.new.id)) {
              return currentRooms 
            }
            return [...currentRooms, payload.new as Room]
          })
        }
      )
      .subscribe()

    return () => {
      supabase.removeChannel(channel)
    }
  }, [supabase])

  const handleCreateRoom = async (formData: FormData) => {
    await createRoom(formData)
    setNewRoomName('')
    setIsModalOpen(false)
  }

  useEffect(() => {
    const fetchUsers = async () => {
      const { data: { user } } = await supabase.auth.getUser()
      if (!user) return

      const { data } = await supabase
        .from('profiles')
        .select('id, username')
        .neq('id', user.id)
        .limit(20)
      
      setUsers(data || [])
    }
    fetchUsers()
  }, [supabase])

  return (
    <aside className="flex h-full w-72 flex-col border-r border-white/20 bg-white/40 dark:bg-slate-900/40 backdrop-blur-xl">
      
      {/* Header */}
      <div className="flex items-center justify-between p-4 pt-6">
        <h3 className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          Channels
        </h3>
        <button
          onClick={() => setIsModalOpen(true)}
          className="group rounded-full bg-indigo-50 p-1.5 text-indigo-600 transition-all hover:bg-indigo-100 hover:scale-110 dark:bg-indigo-500/10 dark:text-indigo-400 dark:hover:bg-indigo-500/20"
          title="Create new room"
        >
          <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 6v6m0 0v6m0-6h6m-6 0H6"></path>
          </svg>
        </button>
      </div>

      {/* Room List */}
      <nav className="flex-1 overflow-y-auto px-3 pb-4 space-y-6">
        <div className="space-y-1">
          {rooms.map((room) => {
            const isActive = pathname === `/room/${room.id}`
            return (
              <div key={room.id} className="group relative flex items-center">
                  <Link
                    href={`/room/${room.id}`}
                    className={`flex-1 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-medium transition-all duration-200 ${
                      isActive
                        ? 'bg-white/80 text-indigo-600 shadow-sm dark:bg-slate-800/80 dark:text-indigo-400' 
                        : 'text-slate-600 hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200' 
                    }`}
                  >
                    <span className={`flex h-6 w-6 items-center justify-center rounded-lg text-xs font-bold transition-colors ${
                        isActive ? 'bg-indigo-100 text-indigo-600 dark:bg-indigo-500/20' : 'bg-slate-200 text-slate-500 group-hover:bg-indigo-50 group-hover:text-indigo-500 dark:bg-slate-800 dark:text-slate-500 dark:group-hover:bg-slate-700'
                    }`}>#</span>
                    {room.name}
                  </Link>
                  {adminRoomIds.has(room.id) && (
                      <button
                        onClick={(e) => {
                            e.preventDefault()
                            if (confirm('Are you sure you want to delete this room?')) {
                                deleteRoom(room.id)
                            }
                        }}
                        className="absolute right-2 p-1.5 text-slate-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity z-10"
                        title="Delete Room"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                  )}
              </div>
            )
          })}
        </div>

        {/* DM Section */}
        <div>
          <h3 className="mb-3 px-2 text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Direct Messages
          </h3>
          <div className="space-y-1">
            {users.map((user) => (
              <button
                key={user.id}
                onClick={async () => {
                  await startDirectChat(user.id)
                }}
                className="group flex w-full items-center gap-3 rounded-xl px-3 py-2 text-left text-sm font-medium text-slate-600 transition-all hover:bg-white/50 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-800/50 dark:hover:text-slate-200"
              >
                <div className="relative">
                    <div className="h-8 w-8 rounded-full bg-gradient-to-br from-pink-400 to-rose-400 flex items-center justify-center text-white text-xs font-bold shadow-sm">
                        {user.username?.[0]?.toUpperCase() || '?'}
                    </div>
                    <div className="absolute bottom-0 right-0 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white dark:ring-slate-900"></div>
                </div>
                <span>{user.username || 'Unknown'}</span>
              </button>
            ))}
          </div>
        </div>
      </nav>

      {/* Modal */}
      {isModalOpen && (
        <div 
          className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/20 backdrop-blur-sm p-4"
          onClick={() => setIsModalOpen(false)}
        >
          <div 
            className="w-full max-w-md overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-slate-900/5 dark:bg-slate-900 dark:ring-white/10"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="bg-gradient-to-r from-indigo-500 to-purple-600 p-6 text-white">
                <h2 className="text-xl font-bold">Create New Room</h2>
                <p className="mt-1 text-indigo-100 text-sm">Start a new topic for discussion</p>
            </div>
            
            <form action={handleCreateRoom} className="p-6">
              <label htmlFor="room_name" className="block text-sm font-medium text-slate-700 dark:text-slate-300">
                Room Name
              </label>
              <div className="mt-2 relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <span className="text-slate-400">#</span>
                </div>
                <input
                    id="room_name"
                    name="room_name"
                    type="text"
                    value={newRoomName}
                    onChange={(e) => setNewRoomName(e.target.value)}
                    placeholder="general"
                    className="block w-full rounded-lg border-0 py-2.5 pl-7 pr-4 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-indigo-600 sm:text-sm sm:leading-6 dark:bg-slate-800 dark:text-white dark:ring-slate-700 dark:focus:ring-indigo-500"
                    autoFocus
                />
              </div>
              
              <div className="mt-8 flex justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-lg px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-slate-800 transition-colors"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm hover:bg-indigo-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-indigo-600 disabled:opacity-50 disabled:cursor-not-allowed transition-all"
                  disabled={newRoomName.trim() === ''}
                >
                  Create Channel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </aside>
  )
}