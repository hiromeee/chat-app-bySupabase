'use client'

import { createClient } from '@/utils/supabase/client' //
import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

const supabase = createClient()

type ProfileFormProps = {
  user: User
  currentUsername: string
}

export default function ProfileForm({ user, currentUsername }: ProfileFormProps) {
  const router = useRouter()
  const [username, setUsername] = useState(currentUsername)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    const { error } = await supabase
      .from('profiles')
      .update({
        username: username,
        created_at: new Date().toISOString(), 
      })
      .eq('id', user.id) 

    setLoading(false)

    if (error) {
      setMessage('エラーが発生しました: ' + error.message)
    } else {
      setMessage('プロフィールが更新されました！')
      router.refresh()
    }
  }

  // ★ UIをTailwindクラスに変更
  return (
    <div className="mx-auto mt-16 max-w-md px-4">
      <h1 className="text-2xl font-semibold">プロフィール設定</h1>
      <p className="mt-2 text-gray-600 dark:text-gray-400">
        Email: {user.email}
      </p>
      
      <form onSubmit={handleUpdateProfile} className="mt-8 space-y-4">
        <div>
          <label htmlFor="username" className="block text-sm font-medium">
            ユーザー名 (3文字以上)
          </label>
          <input
            id="username"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Your username"
            className="mt-1 block w-full rounded border border-gray-300 bg-white p-2 text-gray-900 shadow-sm focus:border-blue-500 focus:ring-blue-500 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
          />
        </div>
        
        <div>
          <button 
            type="submit" 
            disabled={loading || username.length < 3}
            className="rounded bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50"
          >
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      </form>
      
      {message && (
        <p className={`mt-4 text-sm ${message.startsWith('エラー') ? 'text-red-500' : 'text-green-500'}`}>
          {message}
        </p>
      )}
    </div>
  )
}