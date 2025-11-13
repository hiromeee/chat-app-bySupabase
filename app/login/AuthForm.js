'use client'

import { createClient } from '@/utils/supabase/client' // クライアント用クライアント
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthForm() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // 認証状態の変化を監視
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        // ログインしたらホームページにリダイレクト
        router.push('/')
        router.refresh() // サーバーコンポーネントを再読み込みさせる
      } else if (event === 'SIGNED_OUT') {
        // ログアウトしたらログインページにリダイレクト
        router.push('/login')
        router.refresh()
      }
    })

    // クリーンアップ
    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ theme: ThemeSupa }} // 見た目をSupabase風に
      providers={['github']} // GitHubログインも許可する場合 (任意)
      localization={{
        variables: {
          sign_in: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'ログイン' },
          sign_up: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'サインアップ' },
        },
      }}
    />
  )
}