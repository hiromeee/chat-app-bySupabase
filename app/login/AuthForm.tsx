'use client'

import { createClient } from '@/utils/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa, type Variables } from '@supabase/auth-ui-shared' // 'type Variables' はあってもなくてもOK
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthForm() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
    // 認証状態の変化を監視 (変更なし)
    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event === 'SIGNED_IN') {
        router.push('/')
        router.refresh() 
      } else if (event === 'SIGNED_OUT') {
        router.push('/login')
        router.refresh()
      }
    })

    return () => {
      subscription.unsubscribe()
    }
  }, [supabase, router])

  // ★ ダークモード対応のカスタムテーマ (修正)
  //   ThemeSupaを継承するのではなく、上書きしたい変数だけを定義する
  const customThemeVariables: Variables = {
    default: {
      colors: {
        brand: '#4f46e5', // 濃い青 (Tailwind の indigo-600)
        brandAccent: '#4338ca', // さらに濃い青
        inputText: '#111827', // 濃いグレー
        inputBackground: '#ffffff',
        inputBorder: '#d1d5db',
      },
    },
    dark: {
      colors: {
        brand: '#6366f1', // 少し明るい青 (Tailwind の indigo-500)
        brandAccent: '#4f46e5',
        inputText: '#f9fafb', // ほぼ白
        inputBackground: '#1f2937', // 濃いグレー (gray-800)
        inputBorder: '#4b5563', // やや明るいグレー (gray-600)
        defaultButtonBackground: '#374151', // (gray-700)
        defaultButtonBackgroundHover: '#4b5563', // (gray-600)
      },
    },
  }


  return (
    <Auth
      supabaseClient={supabase}
      // ★ appearance にカスタムテーマを適用
      appearance={{ 
        theme: ThemeSupa, // ★ ベースのテーマとして ThemeSupa を指定
        variables: customThemeVariables // ★ 上書きする変数として customThemeVariables を指定
      }} 
      // ★ OSのテーマ設定（ダークモード）に自動で追従する
      theme="dark" 
      
      providers={[]} 
      localization={{
        variables: {
          sign_in: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'ログイン' },
          sign_up: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'サインアップ' },
        },
      }}
    />
  )
}