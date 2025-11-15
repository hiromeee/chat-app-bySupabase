'use client'

import { createClient } from '@/utils/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa, Variables } from '@supabase/auth-ui-shared' // ★ type キーワードを削除
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

  // ダークモード対応のカスタムテーマ (型定義のみ残す)
  const customThemeVariables: Variables = {
    default: {
      colors: {
        brand: '#4f46e5', // Indigo-600
        brandAccent: '#4338ca',
        inputText: '#111827',
        inputBackground: '#ffffff',
        inputBorder: '#d1d5db',
      },
    },
    dark: {
      colors: {
        brand: '#6366f1', // Indigo-500
        brandAccent: '#4f46e5',
        inputText: '#f9fafb',
        inputBackground: '#1f2937', // Gray-800
        inputBorder: '#4b5563', // Gray-600
        defaultButtonBackground: '#374151', // Gray-700
        defaultButtonBackgroundHover: '#4b5563',
      },
    },
  }


  return (
    <Auth
      supabaseClient={supabase}
      appearance={{ 
        theme: ThemeSupa, 
        variables: customThemeVariables
      }} 
      theme="dark" 
      
      providers={['github']} // GitHub認証を有効化
      
      localization={{
        variables: {
          sign_in: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'ログイン' },
          sign_up: { email_label: 'メールアドレス', password_label: 'パスワード', button_label: 'サインアップ' },
        },
      }}
    />
  )
}