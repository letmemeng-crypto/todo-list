'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Sparkles, LogIn, UserPlus, LogOut } from 'lucide-react'
import { useUser } from '@/hooks/useUser'
import { createClient } from '@/lib/supabase/client'

export function AppHeader() {
  const pathname = usePathname()
  const isAuthPage = pathname.startsWith('/auth')
  const { user, loading } = useUser()
  const supabase = createClient()

  const handleLogout = async () => {
    await supabase.auth.signOut()
    window.location.href = '/' // 退出后刷新首页
  }

  return (
    <header className="absolute top-0 left-0 right-0 z-50 w-full">
      <div className="max-w-screen-2xl mx-auto flex h-20 items-center justify-between px-4 sm:px-6 lg:px-8">
        <div className="flex items-center gap-4">
          <Link href="/" className="flex items-center gap-2 font-bold text-lg hover:opacity-80 transition-opacity">
            <Sparkles className="w-5 h-5 text-purple-400" />
            <span className="hidden sm:inline bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 bg-clip-text text-transparent">
              超级待办清单
            </span>
          </Link>
        </div>

        {!isAuthPage && (
          <div className="flex items-center gap-3">
            {user ? (
              <button
                onClick={handleLogout}
                className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-red-500/50 text-red-400 hover:bg-red-950/30 hover:scale-105"
              >
                <LogOut className="w-4 h-4 group-hover:-translate-x-0.5 transition-transform" />
                <span>退出登录</span>
              </button>
            ) : (
              <>
                <Link
                  href="/auth/login"
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all border border-purple-500/50 text-purple-400 hover:bg-purple-950/30 hover:scale-105"
                >
                  <LogIn className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
                  <span>登录</span>
                </Link>
                
                <Link
                  href="/auth/sign-up"
                  className="group flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-all bg-gradient-to-r from-purple-500 to-pink-500 text-white hover:from-purple-600 hover:to-pink-600 hover:scale-105 shadow-lg"
                >
                  <UserPlus className="w-4 h-4 group-hover:rotate-12 transition-transform" />
                  <span>注册</span>
                </Link>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  )
}