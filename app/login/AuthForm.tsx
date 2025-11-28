'use client'

import { createClient } from '@/utils/supabase/client'
import { Auth } from '@supabase/auth-ui-react'
import { ThemeSupa } from '@supabase/auth-ui-shared'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'

export default function AuthForm() {
  const supabase = createClient()
  const router = useRouter()

  useEffect(() => {
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

  const customThemeVariables = {
    default: {
      colors: {
        brand: '#4f46e5',
        brandAccent: '#4338ca',
        brandButtonText: 'white',
        defaultButtonBackground: 'white',
        defaultButtonBackgroundHover: '#f8fafc',
        defaultButtonBorder: '#e2e8f0',
        defaultButtonText: '#1e293b',
        dividerBackground: '#e2e8f0',
        inputBackground: 'transparent',
        inputBorder: '#e2e8f0',
        inputBorderHover: '#cbd5e1',
        inputBorderFocus: '#4f46e5',
        inputText: '#1e293b',
        inputLabelText: '#64748b',
        inputPlaceholder: '#94a3b8',
      },
      space: {
        spaceSmall: '4px',
        spaceMedium: '8px',
        spaceLarge: '16px',
        labelBottomMargin: '8px',
        anchorBottomMargin: '4px',
        emailInputSpacing: '4px',
        socialAuthSpacing: '4px',
        buttonPadding: '12px 16px',
        inputPadding: '12px 16px',
      },
      fontSizes: {
        baseBodySize: '14px',
        baseInputSize: '15px',
        baseLabelSize: '14px',
        baseButtonSize: '15px',
      },
      fonts: {
        bodyFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
        buttonFontFamily: `ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, "Helvetica Neue", Arial, "Noto Sans", sans-serif, "Apple Color Emoji", "Segoe UI Emoji", "Segoe UI Symbol", "Noto Color Emoji"`,
      },
      borderWidths: {
        buttonBorderWidth: '1px',
        inputBorderWidth: '1px',
      },
      radii: {
        borderRadiusButton: '9999px',
        buttonBorderRadius: '9999px',
        inputBorderRadius: '12px',
      },
    },
    dark: {
      colors: {
        brand: '#6366f1',
        brandAccent: '#4f46e5',
        brandButtonText: 'white',
        defaultButtonBackground: '#1e293b',
        defaultButtonBackgroundHover: '#334155',
        defaultButtonBorder: '#334155',
        defaultButtonText: '#f8fafc',
        dividerBackground: '#334155',
        inputBackground: 'transparent',
        inputBorder: '#334155',
        inputBorderHover: '#475569',
        inputBorderFocus: '#6366f1',
        inputText: '#f8fafc',
        inputLabelText: '#94a3b8',
        inputPlaceholder: '#64748b',
      },
    },
  }

  return (
    <div className="w-full">
      <Auth
        supabaseClient={supabase}
        appearance={{
          theme: ThemeSupa,
          variables: customThemeVariables,
          style: {
            button: {
              fontWeight: '600',
            },
            anchor: {
              color: 'var(--colors-brand)',
              textDecoration: 'none',
              fontSize: '14px',
            },
            container: {
              gap: '16px',
            },
            divider: {
              margin: '24px 0',
            },
            label: {
              fontWeight: '500',
              color: 'var(--colors-inputLabelText)',
            },
            input: {
              fontWeight: '500',
            },
          },
        }}
        theme="default"
        providers={['github']}
        localization={{
          variables: {
            sign_in: {
              email_label: 'メールアドレス',
              password_label: 'パスワード',
              button_label: 'ログイン',
              social_provider_text: '{{provider}}でログイン',
            },
            sign_up: {
              email_label: 'メールアドレス',
              password_label: 'パスワード',
              button_label: 'アカウント作成',
              social_provider_text: '{{provider}}で登録',
            },
            forgotten_password: {
              link_text: 'パスワードをお忘れですか？',
              email_label: 'メールアドレス',
              button_label: 'パスワードリセットのメールを送信',
            },
          },
        }}
      />
    </div>
  )
}