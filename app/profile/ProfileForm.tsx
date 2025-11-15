'use client'

import { createClient } from '@/utils/supabase/client' // クライアント用
import type { User } from '@supabase/supabase-js'
import { useState } from 'react'
import { useRouter } from 'next/navigation'

// Supabaseクライアントを初期化
const supabase = createClient()

type ProfileFormProps = {
  user: User
  currentUsername: string
}

export default function ProfileForm({ user, currentUsername }: ProfileFormProps) {
  const router = useRouter()
  // フォームの入力値を管理
  const [username, setUsername] = useState(currentUsername)
  const [loading, setLoading] = useState(false)
  const [message, setMessage] = useState('')

  // プロフィール更新処理
  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault()
    setMessage('')
    setLoading(true)

    // Supabaseの 'profiles' テーブルを更新 (UPDATE)
    const { error } = await supabase
      .from('profiles')
      .update({
        username: username,
        created_at: new Date().toISOString(), // 便宜上、更新日時をcreated_atに入れる
      })
      .eq('id', user.id) // RLSポリシーで保護されていますが、明示的に指定

    setLoading(false)

    if (error) {
      setMessage('エラーが発生しました: ' + error.message)
    } else {
      setMessage('プロフィールが更新されました！')
      // ページを再読み込みさせてサーバーコンポーネントのデータを最新にする
      router.refresh()
    }
  }

  return (
    <div style={{ maxWidth: '600px', margin: '50px auto', padding: '20px' }}>
      <h1>プロフィール設定</h1>
      <p>Email: {user.email}</p>
      
      <form onSubmit={handleUpdateProfile}>
        <div>
          <label htmlFor="username">ユーザー名 (3文字以上)</label>
        </div>
        <input
          id="username"
          type="text"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          placeholder="Your username"
          style={{ width: '300px', padding: '10px', border: '1px solid #999', borderRadius: '5px', marginTop: '5px' }}
        />
        
        <div>
          <button 
            type="submit" 
            disabled={loading || username.length < 3}
            style={{ padding: '10px 20px', marginTop: '20px', background: '#333', color: 'white', border: 'none', borderRadius: '5px' }}
          >
            {loading ? '更新中...' : '更新'}
          </button>
        </div>
      </form>
      
      {message && <p style={{ color: 'green', marginTop: '15px' }}>{message}</p>}
    </div>
  )
}