import { redirect } from 'next/navigation'
import { createClient } from '@/utils/supabase/server'
import AuthForm from './AuthForm'
import { cookies } from 'next/headers'

export default async function Login() {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)

  const {
    data: { session },
  } = await supabase.auth.getSession()

  if (session) {
    redirect('/')
  }

  return (
    <div className="flex min-h-screen w-full">
      {/* Left Column - Visuals */}
      <div className="hidden w-1/2 flex-col justify-between bg-gradient-to-br from-indigo-600 to-violet-600 p-12 text-white lg:flex">
        <div>
          <div className="flex items-center gap-2 font-semibold">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-white/20 backdrop-blur-sm">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
                className="h-5 w-5"
              >
                <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
              </svg>
            </div>
            <span className="text-lg tracking-tight">Supabase Chat</span>
          </div>
          
          <div className="mt-24 max-w-lg">
            <h1 className="text-5xl font-bold leading-tight tracking-tight">
              チームと、<br/>もっとスマートにつながろう。
            </h1>
            <p className="mt-6 text-lg text-indigo-100">
              AIによるインサイトとリアルタイムメッセージングで、次世代のチームコラボレーションを体験しましょう。
            </p>
          </div>
        </div>

        <div className="relative mt-auto rounded-2xl bg-white/10 p-6 backdrop-blur-md border border-white/10">
          <div className="mb-4 flex gap-1 text-yellow-300">
            {[...Array(5)].map((_, i) => (
              <svg key={i} xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="currentColor" className="h-5 w-5">
                <path fillRule="evenodd" d="M10.788 3.21c.448-1.077 1.976-1.077 2.424 0l2.082 5.007 5.404.433c1.164.093 1.636 1.545.749 2.305l-4.117 3.527 1.257 5.273c.271 1.136-.964 2.033-1.96 1.425L12 18.354 7.373 21.18c-.996.608-2.231-.29-1.96-1.425l1.257-5.273-4.117-3.527c-.887-.76-.415-2.212.749-2.305l5.404-.433 2.082-5.006z" clipRule="evenodd" />
              </svg>
            ))}
          </div>
          <p className="text-lg font-medium leading-relaxed">
            「AI要約機能のおかげで、スレッドの確認にかかる時間を大幅に節約できました。単なるチャットアプリではなく、生産性を向上させるツールです。」
          </p>
          <div className="mt-4 flex items-center gap-3">
            <div className="h-10 w-10 rounded-full bg-indigo-400/30" />
            <div>
              <div className="font-semibold">田中 さくら</div>
              <div className="text-sm text-indigo-200">プロダクトマネージャー @ TechFlow</div>
            </div>
          </div>
        </div>
      </div>

      {/* Right Column - Form */}
      <div className="flex w-full flex-col items-center justify-center bg-white px-4 dark:bg-slate-950 lg:w-1/2">
        <div className="w-full max-w-sm space-y-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
              さあ、始めましょう
            </h2>
            <p className="mt-2 text-sm text-slate-600 dark:text-slate-400">
              アカウントを作成するか、ログインして続行してください
            </p>
          </div>

          <AuthForm />

          <p className="px-8 text-center text-sm text-slate-500 dark:text-slate-400">
            続行することで、
            <a href="#" className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400">
              利用規約
            </a>
            と
            <a href="#" className="underline underline-offset-4 hover:text-indigo-600 dark:hover:text-indigo-400">
              プライバシーポリシー
            </a>
            に同意したものとみなされます。
          </p>
        </div>
      </div>
    </div>
  )
}