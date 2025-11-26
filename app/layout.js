import './globals.css'
import { createClient } from '@/utils/supabase/server'
import { redirect } from 'next/navigation'
import { cookies } from 'next/headers'
import Link from 'next/link' 
import RoomSidebar from './components/RoomSidebar'

async function signOut() {
  'use server' 
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  await supabase.auth.signOut()
  return redirect('/login')
}

export default async function RootLayout({ children }) {
  const cookieStore = await cookies()
  const supabase = createClient(cookieStore)
  const {
    data: { session },
  } = await supabase.auth.getSession()

  return (
    <html lang="ja" className="h-full">
      <body className="h-full bg-gradient-to-br from-indigo-50 via-white to-purple-50 dark:from-slate-950 dark:via-slate-900 dark:to-slate-950 text-slate-900 dark:text-slate-100 overflow-hidden">
        
        {/* Main Application Wrapper */}
        <div className="flex h-full flex-col">
          
          {/* Header */}
          <header className="flex h-16 shrink-0 items-center justify-between px-6 backdrop-blur-md bg-white/50 dark:bg-slate-900/50 border-b border-slate-200/50 dark:border-slate-800/50 z-20">
            <Link href="/" className="flex items-center gap-2 group">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-tr from-indigo-500 to-purple-500 flex items-center justify-center text-white font-bold shadow-lg shadow-indigo-500/20 group-hover:scale-105 transition-transform">
                S
              </div>
              <h2 className="text-lg font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-purple-600 dark:from-indigo-400 dark:to-purple-400">
                Supabase Chat
              </h2>
            </Link>
            
            {session && (
              <div className="flex items-center gap-4">
                <Link href="/profile" className="text-sm font-medium text-slate-600 hover:text-indigo-600 dark:text-slate-400 dark:hover:text-indigo-400 transition-colors">
                  Profile
                </Link>
                <form action={signOut}>
                  <button 
                    type="submit" 
                    className="rounded-full bg-white/80 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 px-4 py-1.5 text-sm font-medium text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-700 transition-all shadow-sm hover:shadow"
                  >
                    Sign Out
                  </button>
                </form>
              </div>
            )}
          </header>
          
          {/* Content Area */}
          <div className="flex flex-1 overflow-hidden relative">
            {/* Background Decoration */}
            <div className="absolute top-0 left-0 w-full h-full overflow-hidden -z-10 pointer-events-none">
                <div className="absolute top-[-10%] left-[-10%] w-[40%] h-[40%] rounded-full bg-purple-400/10 blur-3xl"></div>
                <div className="absolute bottom-[-10%] right-[-10%] w-[40%] h-[40%] rounded-full bg-indigo-400/10 blur-3xl"></div>
            </div>

            {session && (
              <RoomSidebar />
            )}

            <main className="flex-1 relative flex flex-col min-w-0 bg-white/30 dark:bg-slate-900/30 backdrop-blur-sm">
              {children}
            </main>
          </div>
        </div>
        
      </body>
    </html>
  )
}