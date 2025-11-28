export interface Profile {
  username: string | null
  // Add other fields if needed, but ChatRoom only uses username
}

export interface Room {
  id: number
  name: string
  created_at?: string
  is_direct?: boolean
  participants?: string[]
}

export interface Reaction {
  id: number
  emoji: string
  user_id: string
  message_id?: number
  created_at?: string
}

export interface Message {
  id: number
  content: string
  image_url: string | null
  created_at: string
  user_id: string
  room_id?: number
  profiles: Profile | null
  reactions?: Reaction[]
}

export interface UserPresence {
  username: string
  status: 'online' | 'typing'
}
