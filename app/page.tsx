'use client'

import { useState, useEffect, type ChangeEvent } from 'react'
import { useRouter } from 'next/navigation'
import { 
  Plus, 
  Trash2, 
  Check, 
  Circle, 
  Sparkles, 
  Calendar, 
  Clock, 
  Star,
  Zap,
  Target,
  TrendingUp,
  Flame,
  CheckCircle2,
  ListTodo,
  Rocket,
  Save,
  X,
  Edit2,
  Image as ImageIcon,
  Upload
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { createClient } from '@/lib/supabase/client'
import { useUser } from '@/hooks/useUser'

interface Todo {
  id: string
  user_id: string
  text: string
  completed: boolean
  priority: 'low' | 'medium' | 'high'
  category?: string
  image_url?: string
  created_at: string
  updated_at: string
}

export default function Home() {
  const router = useRouter()
  const supabase = createClient()
  const { user, loading } = useUser()
  
  const [todos, setTodos] = useState<Todo[]>([])
  const [inputValue, setInputValue] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('medium')
  const [filter, setFilter] = useState<'all' | 'active' | 'completed'>('all')
  const [mounted, setMounted] = useState(false)
  const [isLoading, setIsLoading] = useState(false)
  const [isFetching, setIsFetching] = useState(true)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [editingText, setEditingText] = useState('')
  const [selectedImage, setSelectedImage] = useState<File | null>(null)
  const [imagePreview, setImagePreview] = useState<string | null>(null)
  const [isUploading, setIsUploading] = useState(false)

  // 获取用户的 todos
  const fetchTodos = async () => {
    if (!user) {
      setTodos([])
      setIsFetching(false)
      return
    }

    try {
      setIsFetching(true)
      const { data, error } = await supabase
        .from('todos')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })

      if (error) {
        console.error('获取 todos 失败:', error)
        return
      }

      setTodos(data || [])
    } catch (error) {
      console.error('获取 todos 异常:', error)
    } finally {
      setIsFetching(false)
    }
  }

  useEffect(() => {
    setMounted(true)
    const handleAuthCallback = async () => {
      try {
        const href = window.location.href
        const url = new URL(href)

        if (url.searchParams.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(href)
          if (!error) {
            window.history.replaceState({}, document.title, window.location.pathname)
            router.refresh()
            return
          }
        }

        const hash = window.location.hash
        if (hash && hash.includes('access_token')) {
          const params = new URLSearchParams(hash.substring(1))
          const accessToken = params.get('access_token')
          const refreshToken = params.get('refresh_token')

          if (accessToken && refreshToken) {
            const { data, error } = await supabase.auth.setSession({
              access_token: accessToken,
              refresh_token: refreshToken
            })
            if (!error && data.session) {
              window.history.replaceState({}, document.title, window.location.pathname)
              router.refresh()
            }
          }
        }
      } catch (e) {}
    }

    handleAuthCallback()
  }, [router, supabase.auth])

  // 用户登录后获取 todos
  useEffect(() => {
    if (user) {
      fetchTodos()
    } else {
      setTodos([])
      setIsFetching(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user])

  // Realtime 订阅 - 实时同步 todos 数据
  useEffect(() => {
    if (!user) return

    console.log('🔄 Setting up Realtime subscription for user:', user.id)

    // 订阅当前用户的 todos 表变化
    const channel = supabase
      .channel('todos-changes')
      .on(
        'postgres_changes',
        {
          event: '*', // 监听所有事件：INSERT, UPDATE, DELETE
          schema: 'public',
          table: 'todos',
          filter: `user_id=eq.${user.id}` // 只监听当前用户的数据
        },
        (payload) => {
          console.log('📡 Realtime event received:', payload)

          switch (payload.eventType) {
            case 'INSERT':
              // 新增 todo - 添加到列表开头
              setTodos((currentTodos) => {
                const newTodo = payload.new as Todo
                // 检查是否已存在（避免重复）
                if (currentTodos.some(t => t.id === newTodo.id)) {
                  return currentTodos
                }
                return [newTodo, ...currentTodos]
              })
              break

            case 'UPDATE':
              // 更新 todo - 更新对应项
              setTodos((currentTodos) => 
                currentTodos.map((todo) =>
                  todo.id === payload.new.id ? (payload.new as Todo) : todo
                )
              )
              break

            case 'DELETE':
              // 删除 todo - 从列表移除
              setTodos((currentTodos) => 
                currentTodos.filter((todo) => todo.id !== payload.old.id)
              )
              break

            default:
              break
          }
        }
      )
      .subscribe((status) => {
        console.log('📡 Realtime subscription status:', status)
      })

    // 清理函数：组件卸载或用户变化时取消订阅
    return () => {
      console.log('🔌 Unsubscribing from Realtime channel')
      supabase.removeChannel(channel)
    }
  }, [user, supabase])

  // 上传图片到 Supabase Storage
  const uploadImage = async (file: File): Promise<string | null> => {
    if (!user) return null

    try {
      setIsUploading(true)
      const fileExt = file.name.split('.').pop()
      const fileName = `${user.id}/${Date.now()}.${fileExt}`

      const { error: uploadError } = await supabase.storage
        .from('my-todo')
        .upload(fileName, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        console.error('上传图片失败:', uploadError)
        return null
      }

      // 获取公共 URL
      const { data: urlData } = supabase.storage
        .from('my-todo')
        .getPublicUrl(fileName)

      return urlData.publicUrl
    } catch (error) {
      console.error('上传图片异常:', error)
      return null
    } finally {
      setIsUploading(false)
    }
  }

  // 处理图片选择
  const handleImageSelect = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      // 验证文件类型
      if (!file.type.startsWith('image/')) {
        alert('请选择图片文件')
        return
      }
      // 验证文件大小（限制为5MB）
      if (file.size > 5 * 1024 * 1024) {
        alert('图片大小不能超过5MB')
        return
      }
      setSelectedImage(file)
      // 创建预览
      const reader = new FileReader()
      reader.onloadend = () => {
        setImagePreview(reader.result as string)
      }
      reader.readAsDataURL(file)
    }
  }

  // 清除选中的图片
  const clearImage = () => {
    setSelectedImage(null)
    setImagePreview(null)
  }

  const addTodo = async () => {
    // 检查用户是否登录
    if (!user) {
      router.push('/auth/login')
      return
    }
    
    if (!inputValue.trim()) return

    try {
      setIsLoading(true)
      
      // 如果有选中的图片，先上传
      let imageUrl: string | null = null
      if (selectedImage) {
        imageUrl = await uploadImage(selectedImage)
        if (!imageUrl) {
          alert('图片上传失败，请重试')
          setIsLoading(false)
          return
        }
      }

      const { data, error } = await supabase
        .from('todos')
        .insert([
          {
            user_id: user.id,
            text: inputValue.trim(),
            completed: false,
            priority,
            category: null,
            image_url: imageUrl,
          }
        ])
        .select()

      if (error) {
        console.error('添加 todo 失败:', error)
        alert('添加失败，请重试')
        return
      }

      if (data && data.length > 0) {
        setTodos([data[0], ...todos])
        setInputValue('')
        setPriority('medium')
        clearImage()
      }
    } catch (error) {
      console.error('添加 todo 异常:', error)
      alert('添加失败，请重试')
    } finally {
      setIsLoading(false)
    }
  }

  const toggleTodo = async (id: string) => {
    const todo = todos.find(t => t.id === id)
    if (!todo || !user) return

    // 乐观更新 UI
    setTodos(todos.map(t =>
      t.id === id ? { ...t, completed: !t.completed } : t
    ))

    try {
      const { error } = await supabase
        .from('todos')
        .update({ completed: !todo.completed })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('切换完成状态失败:', error)
        // 回滚
        setTodos(todos.map(t =>
          t.id === id ? { ...t, completed: todo.completed } : t
        ))
        alert('操作失败，请重试')
      }
    } catch (error) {
      console.error('切换完成状态异常:', error)
      // 回滚
      setTodos(todos.map(t =>
        t.id === id ? { ...t, completed: todo.completed } : t
      ))
      alert('操作失败，请重试')
    }
  }

  const deleteTodo = async (id: string) => {
    if (!user) return

    // 乐观更新 UI
    const originalTodos = [...todos]
    setTodos(todos.filter(todo => todo.id !== id))

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('删除 todo 失败:', error)
        // 回滚
        setTodos(originalTodos)
        alert('删除失败，请重试')
      }
    } catch (error) {
      console.error('删除 todo 异常:', error)
      // 回滚
      setTodos(originalTodos)
      alert('删除失败，请重试')
    }
  }

  const clearCompleted = async () => {
    if (!user) return

    const completedIds = todos.filter(t => t.completed).map(t => t.id)
    if (completedIds.length === 0) return

    // 乐观更新 UI
    const originalTodos = [...todos]
    setTodos(todos.filter(todo => !todo.completed))

    try {
      const { error } = await supabase
        .from('todos')
        .delete()
        .eq('user_id', user.id)
        .eq('completed', true)

      if (error) {
        console.error('清除已完成任务失败:', error)
        // 回滚
        setTodos(originalTodos)
        alert('清除失败，请重试')
      }
    } catch (error) {
      console.error('清除已完成任务异常:', error)
      // 回滚
      setTodos(originalTodos)
      alert('清除失败，请重试')
    }
  }

  const startEditing = (todo: Todo) => {
    setEditingId(todo.id)
    setEditingText(todo.text)
  }

  const cancelEditing = () => {
    setEditingId(null)
    setEditingText('')
  }

  const updateTodo = async (id: string) => {
    if (!user || !editingText.trim()) {
      cancelEditing()
      return
    }

    const todo = todos.find(t => t.id === id)
    if (!todo) return

    // 乐观更新 UI
    setTodos(todos.map(t =>
      t.id === id ? { ...t, text: editingText.trim() } : t
    ))
    cancelEditing()

    try {
      const { error } = await supabase
        .from('todos')
        .update({ text: editingText.trim() })
        .eq('id', id)
        .eq('user_id', user.id)

      if (error) {
        console.error('更新 todo 失败:', error)
        // 回滚
        setTodos(todos.map(t =>
          t.id === id ? { ...t, text: todo.text } : t
        ))
        alert('更新失败，请重试')
      }
    } catch (error) {
      console.error('更新 todo 异常:', error)
      // 回滚
      setTodos(todos.map(t =>
        t.id === id ? { ...t, text: todo.text } : t
      ))
      alert('更新失败，请重试')
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'high':
        return 'from-red-500 to-pink-500'
      case 'medium':
        return 'from-yellow-500 to-orange-500'
      case 'low':
        return 'from-green-500 to-emerald-500'
      default:
        return 'from-blue-500 to-cyan-500'
    }
  }

  const getPriorityIcon = (priority: string) => {
    switch (priority) {
      case 'high':
        return <Flame className="w-4 h-4" />
      case 'medium':
        return <Zap className="w-4 h-4" />
      case 'low':
        return <Target className="w-4 h-4" />
      default:
        return <Star className="w-4 h-4" />
    }
  }

  const completedCount = todos.filter(t => t.completed).length
  const totalCount = todos.length
  const activeCount = totalCount - completedCount
  const completionRate = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0

  const filteredTodos = todos.filter(todo => {
    if (filter === 'active') return !todo.completed
    if (filter === 'completed') return todo.completed
    return true
  })

  if (!mounted) return null

  // 显示加载状态
  if (isFetching && user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 flex items-center justify-center">
        <div className="text-center">
          <div className="relative inline-block mb-6">
            <Circle className="w-24 h-24 text-white/10 mx-auto animate-spin" style={{ animationDuration: '1s' }} />
            <div className="absolute inset-0 flex items-center justify-center">
              <Sparkles className="w-12 h-12 text-purple-400 animate-pulse" />
            </div>
          </div>
          <p className="text-white/60 text-xl font-medium">加载中...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-950 via-purple-950 to-slate-950 pt-24 pb-8 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* 动态背景装饰 */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none">
        {/* 主要光晕效果 */}
        <div className="absolute top-1/4 left-1/4 w-[600px] h-[600px] bg-purple-500/30 rounded-full blur-[128px] animate-pulse"></div>
        <div className="absolute bottom-1/4 right-1/4 w-[600px] h-[600px] bg-blue-500/30 rounded-full blur-[128px] animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-1/2 left-1/2 w-[400px] h-[400px] bg-pink-500/20 rounded-full blur-[96px] animate-pulse" style={{ animationDelay: '2s' }}></div>
        
        {/* 星星效果 */}
        <div className="absolute top-20 left-10 w-2 h-2 bg-white/60 rounded-full animate-pulse"></div>
        <div className="absolute top-40 right-20 w-1 h-1 bg-white/40 rounded-full animate-pulse" style={{ animationDelay: '0.5s' }}></div>
        <div className="absolute bottom-32 left-1/3 w-1.5 h-1.5 bg-white/50 rounded-full animate-pulse" style={{ animationDelay: '1s' }}></div>
        <div className="absolute top-60 right-1/3 w-1 h-1 bg-white/30 rounded-full animate-pulse" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-5xl mx-auto relative z-10">
        {/* 头部区域 - 增强版 */}
        <div className="text-center mb-10 space-y-6">
          {/* 主标题 */}
          <div className="relative inline-block">
            <div className="flex items-center justify-center gap-4 mb-2">
              <div className="relative">
                <Sparkles className="w-14 h-14 text-yellow-400 animate-pulse" />
                <div className="absolute inset-0 w-14 h-14 bg-yellow-400/20 rounded-full blur-xl animate-pulse"></div>
              </div>
              <h1 className="text-6xl md:text-7xl font-black text-transparent bg-clip-text bg-gradient-to-r from-purple-400 via-pink-400 to-blue-400 animate-gradient">
                超级待办清单
              </h1>
              <div className="relative">
                <Rocket className="w-14 h-14 text-blue-400 animate-bounce" />
                <div className="absolute inset-0 w-14 h-14 bg-blue-400/20 rounded-full blur-xl animate-pulse"></div>
              </div>
            </div>
            <p className="text-white/60 text-lg font-medium">让每一天都充满成就感 ✨</p>
          </div>
          
          {/* 进度环 - 新增 */}
          <div className="flex items-center justify-center gap-4 mb-6">
            <div className="relative w-32 h-32">
              <svg className="w-32 h-32 transform -rotate-90">
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="currentColor"
                  strokeWidth="8"
                  fill="none"
                  className="text-white/10"
                />
                <circle
                  cx="64"
                  cy="64"
                  r="56"
                  stroke="url(#gradient)"
                  strokeWidth="8"
                  fill="none"
                  strokeDasharray={`${2 * Math.PI * 56}`}
                  strokeDashoffset={`${2 * Math.PI * 56 * (1 - completionRate / 100)}`}
                  className="transition-all duration-1000 ease-out"
                  strokeLinecap="round"
                />
                <defs>
                  <linearGradient id="gradient" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#a855f7" />
                    <stop offset="50%" stopColor="#ec4899" />
                    <stop offset="100%" stopColor="#3b82f6" />
                  </linearGradient>
                </defs>
              </svg>
              <div className="absolute inset-0 flex flex-col items-center justify-center">
                <span className="text-3xl font-bold text-white">{completionRate}%</span>
                <span className="text-xs text-white/60">完成率</span>
              </div>
            </div>
          </div>

          {/* 统计卡片 - 升级版 */}
          <div className="flex flex-wrap items-center justify-center gap-4 text-sm">
            <div className="group bg-gradient-to-br from-purple-500/20 to-purple-600/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-purple-400/30 shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-purple-500/30 rounded-lg">
                  <ListTodo className="w-6 h-6 text-purple-300" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{totalCount}</div>
                  <div className="text-xs text-white/70">总任务</div>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-green-500/20 to-green-600/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-green-400/30 shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-green-500/30 rounded-lg">
                  <CheckCircle2 className="w-6 h-6 text-green-300" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{completedCount}</div>
                  <div className="text-xs text-white/70">已完成</div>
                </div>
              </div>
            </div>
            
            <div className="group bg-gradient-to-br from-blue-500/20 to-blue-600/20 backdrop-blur-xl rounded-2xl px-6 py-4 border border-blue-400/30 shadow-2xl hover:scale-105 transition-all cursor-pointer">
              <div className="flex items-center gap-3">
                <div className="p-2 bg-blue-500/30 rounded-lg">
                  <TrendingUp className="w-6 h-6 text-blue-300" />
                </div>
                <div className="text-left">
                  <div className="text-2xl font-bold text-white">{activeCount}</div>
                  <div className="text-xs text-white/70">进行中</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* 筛选器 */}
        <div className="flex items-center justify-center gap-3 mb-6">
          {(['all', 'active', 'completed'] as const).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}
              className={cn(
                'px-6 py-2.5 rounded-xl font-medium transition-all border backdrop-blur-sm',
                filter === f
                  ? 'bg-white/20 border-white/40 text-white scale-105 shadow-lg'
                  : 'bg-white/5 border-white/10 text-white/60 hover:bg-white/10 hover:text-white/80'
              )}
            >
              {f === 'all' && '全部'}
              {f === 'active' && '进行中'}
              {f === 'completed' && '已完成'}
            </button>
          ))}
          
          {completedCount > 0 && (
            <button
              onClick={clearCompleted}
              className="px-4 py-2.5 rounded-xl font-medium transition-all bg-red-500/20 border border-red-400/30 text-red-300 hover:bg-red-500/30 hover:scale-105"
            >
              清除已完成
            </button>
          )}
        </div>

        {/* 输入区域 - 增强版 */}
        <div className="relative group mb-8">
          <div className="absolute inset-0 bg-gradient-to-r from-purple-500/50 via-pink-500/50 to-blue-500/50 rounded-3xl blur-xl group-hover:blur-2xl transition-all opacity-50"></div>
          <div className="relative bg-white/10 backdrop-blur-2xl rounded-3xl p-6 border border-white/20 shadow-2xl">
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row gap-4">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && addTodo()}
                  placeholder="✨ 输入你的下一个目标..."
                  className="flex-1 bg-white/20 backdrop-blur-sm text-white text-lg placeholder-white/60 rounded-2xl px-6 py-4 outline-none focus:ring-2 focus:ring-purple-400/50 transition-all border border-white/10 font-medium"
                />
                
                <div className="flex gap-3">
                  {/* 优先级选择 - 升级版 */}
                  <div className="flex gap-2">
                    {(['low', 'medium', 'high'] as const).map((p) => (
                      <button
                        key={p}
                        onClick={() => setPriority(p)}
                        className={cn(
                          'px-4 py-2 rounded-xl font-medium transition-all border backdrop-blur-sm relative overflow-hidden',
                          priority === p
                            ? 'bg-white/25 border-white/50 text-white scale-110 shadow-lg'
                            : 'bg-white/5 border-white/20 text-white/70 hover:bg-white/15 hover:scale-105'
                        )}
                      >
                        <div className="flex items-center gap-2">
                          {getPriorityIcon(p)}
                          <span className="text-xs font-bold uppercase">
                            {p === 'high' && '高'}
                            {p === 'medium' && '中'}
                            {p === 'low' && '低'}
                          </span>
                        </div>
                      </button>
                    ))}
                  </div>

                  <button
                    onClick={addTodo}
                    disabled={!inputValue.trim() || isLoading || isUploading}
                    className={cn(
                      "relative overflow-hidden bg-gradient-to-r from-purple-500 to-pink-500 hover:from-purple-600 hover:to-pink-600 text-white rounded-2xl px-8 py-4 font-bold transition-all shadow-lg flex items-center gap-2 group",
                      inputValue.trim() && !isLoading && !isUploading ? "hover:scale-105 active:scale-95" : "opacity-50 cursor-not-allowed"
                    )}
                  >
                    {isLoading || isUploading ? (
                      <Circle className="w-6 h-6 animate-spin" />
                    ) : (
                      <Plus className="w-6 h-6 group-hover:rotate-90 transition-transform duration-300" />
                    )}
                    <span className="hidden sm:inline">{isLoading || isUploading ? '添加中...' : '添加任务'}</span>
                  </button>
                </div>
              </div>

              {/* 图片上传区域 */}
              <div className="flex items-center gap-3">
                <label className="cursor-pointer bg-white/10 hover:bg-white/20 border border-white/20 rounded-xl px-4 py-2 transition-all hover:scale-105 flex items-center gap-2 text-white/80 hover:text-white">
                  <Upload className="w-5 h-5" />
                  <span className="text-sm font-medium">上传图片</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handleImageSelect}
                    className="hidden"
                  />
                </label>
                {imagePreview && (
                  <div className="relative group/preview">
                    <img
                      src={imagePreview}
                      alt="Preview"
                      className="h-16 w-16 rounded-lg object-cover border-2 border-white/30"
                    />
                    <button
                      onClick={clearImage}
                      className="absolute -top-2 -right-2 bg-red-500 hover:bg-red-600 text-white rounded-full p-1 transition-all opacity-0 group-hover/preview:opacity-100"
                    >
                      <X className="w-4 h-4" />
                    </button>
                  </div>
                )}
                {imagePreview && (
                  <span className="text-xs text-white/60">
                    {selectedImage?.name}
                  </span>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Todo 列表 - 超级升级版 */}
        <div className="space-y-4">
          {filteredTodos.length === 0 ? (
            <div className="text-center py-20">
              <div className="relative inline-block mb-6">
                <Circle className="w-24 h-24 text-white/10 mx-auto animate-spin" style={{ animationDuration: '3s' }} />
                <div className="absolute inset-0 flex items-center justify-center">
                  <Sparkles className="w-12 h-12 text-white/20" />
                </div>
              </div>
              <p className="text-white/50 text-xl font-medium mb-2">
                {filter === 'completed' && '还没有完成的任务'}
                {filter === 'active' && '没有进行中的任务'}
                {filter === 'all' && '还没有任务，开始添加吧！'}
              </p>
              <p className="text-white/30 text-sm">
                {user ? '添加你的第一个任务，开启高效之旅 🚀' : '登录后制定Todo'}
              </p>
            </div>
          ) : (
            filteredTodos.map((todo, index) => (
              <div
                key={todo.id}
                className={cn(
                  'group relative bg-white/10 backdrop-blur-2xl rounded-2xl p-6 border border-white/20 shadow-xl transition-all hover:scale-[1.02] hover:shadow-2xl animate-in fade-in slide-in-from-bottom-4',
                  todo.completed && 'opacity-70'
                )}
                style={{ animationDelay: `${index * 50}ms`, animationDuration: '500ms', animationFillMode: 'both' }}
              >
                {/* 光晕效果 */}
                <div className={cn(
                  'absolute inset-0 rounded-2xl opacity-0 group-hover:opacity-100 transition-opacity blur-xl -z-10',
                  'bg-gradient-to-r',
                  getPriorityColor(todo.priority)
                )}></div>

                <div className="flex items-center gap-4">
                  {/* 优先级指示器 - 增强版 */}
                  <div className="relative">
                    <div className={cn(
                      'w-1.5 h-20 rounded-full bg-gradient-to-b shadow-lg',
                      getPriorityColor(todo.priority)
                    )}></div>
                    <div className={cn(
                      'absolute top-0 left-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-gradient-to-b animate-pulse',
                      getPriorityColor(todo.priority)
                    )}></div>
                  </div>

                  {/* 完成按钮 - 增强版 */}
                  <button
                    onClick={() => toggleTodo(todo.id)}
                    className={cn(
                      'relative w-10 h-10 rounded-full border-2 flex items-center justify-center transition-all hover:scale-110 group/check',
                      todo.completed
                        ? 'bg-gradient-to-r from-green-400 to-emerald-400 border-green-400 shadow-lg shadow-green-500/50'
                        : 'border-white/40 hover:border-white/70 bg-white/5'
                    )}
                  >
                    {todo.completed ? (
                      <Check className="w-6 h-6 text-white animate-in zoom-in" />
                    ) : (
                      <Circle className="w-5 h-5 text-white/50 group-hover/check:text-white/70 transition-colors" />
                    )}
                  </button>

                  {/* 任务内容 */}
                  <div className="flex-1 min-w-0">
                    {editingId === todo.id ? (
                      // 编辑模式
                      <div className="space-y-2">
                        <input
                          type="text"
                          value={editingText}
                          onChange={(e) => setEditingText(e.target.value)}
                          onKeyPress={(e) => {
                            if (e.key === 'Enter') {
                              updateTodo(todo.id)
                            } else if (e.key === 'Escape') {
                              cancelEditing()
                            }
                          }}
                          className="w-full bg-white/20 backdrop-blur-sm text-white text-lg rounded-xl px-4 py-2 outline-none focus:ring-2 focus:ring-purple-400/50 transition-all border border-white/10 font-medium"
                          autoFocus
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => updateTodo(todo.id)}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-green-500/20 hover:bg-green-500/30 text-green-300 border border-green-400/30 text-sm font-medium transition-all"
                          >
                            <Save className="w-4 h-4" />
                            保存
                          </button>
                          <button
                            onClick={cancelEditing}
                            className="flex items-center gap-1 px-3 py-1.5 rounded-lg bg-red-500/20 hover:bg-red-500/30 text-red-300 border border-red-400/30 text-sm font-medium transition-all"
                          >
                            <X className="w-4 h-4" />
                            取消
                          </button>
                        </div>
                      </div>
                    ) : (
                      // 显示模式
                      <>
                        <p 
                          className={cn(
                            'text-lg font-semibold transition-all mb-1 cursor-pointer hover:text-purple-300',
                            todo.completed
                              ? 'line-through text-white/50'
                              : 'text-white'
                          )}
                          onDoubleClick={() => !todo.completed && startEditing(todo)}
                          title="双击编辑"
                        >
                          {todo.text}
                        </p>
                        <div className="flex flex-wrap items-center gap-2 mb-2">
                          <span className={cn(
                            'inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-bold border',
                            todo.priority === 'high' && 'bg-red-500/20 text-red-300 border-red-400/30',
                            todo.priority === 'medium' && 'bg-yellow-500/20 text-yellow-300 border-yellow-400/30',
                            todo.priority === 'low' && 'bg-green-500/20 text-green-300 border-green-400/30'
                          )}>
                            {getPriorityIcon(todo.priority)}
                            {todo.priority === 'high' && '高优先级'}
                            {todo.priority === 'medium' && '中优先级'}
                            {todo.priority === 'low' && '低优先级'}
                          </span>
                          {todo.category && (
                            <span className="text-xs px-3 py-1 rounded-full font-medium bg-blue-500/20 text-blue-300 border border-blue-400/30">
                              {todo.category}
                            </span>
                          )}
                          {todo.image_url && (
                            <span className="inline-flex items-center gap-1.5 text-xs px-3 py-1 rounded-full font-medium bg-purple-500/20 text-purple-300 border border-purple-400/30">
                              <ImageIcon className="w-3 h-3" />
                              附件
                            </span>
                          )}
                        </div>
                        {/* 图片预览 */}
                        {todo.image_url && (
                          <div className="mt-3">
                            <img
                              src={todo.image_url}
                              alt="Todo attachment"
                              className="max-w-xs max-h-48 rounded-xl border-2 border-white/20 object-cover cursor-pointer hover:border-white/40 transition-all"
                              onClick={() => window.open(todo.image_url, '_blank')}
                              title="点击查看大图"
                            />
                          </div>
                        )}
                      </>
                    )}
                  </div>

                  {/* 编辑和删除按钮 */}
                  {editingId !== todo.id && (
                    <div className="flex gap-2">
                      {!todo.completed && (
                        <button
                          onClick={() => startEditing(todo)}
                          className="opacity-0 group-hover:opacity-100 transition-all bg-blue-500/20 hover:bg-blue-500/40 text-blue-300 rounded-xl p-3 hover:scale-110 active:scale-95 border border-blue-400/30"
                          title="编辑"
                        >
                          <Edit2 className="w-5 h-5" />
                        </button>
                      )}
                      <button
                        onClick={() => deleteTodo(todo.id)}
                        className="opacity-0 group-hover:opacity-100 transition-all bg-red-500/20 hover:bg-red-500/40 text-red-300 rounded-xl p-3 hover:scale-110 active:scale-95 border border-red-400/30"
                        title="删除"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  )}
                </div>
              </div>
            ))
          )}
        </div>

        {/* 底部激励文案 - 增强版 */}
        {todos.length > 0 && (
          <div className="mt-10 text-center space-y-4">
            <div className="inline-block bg-white/10 backdrop-blur-xl rounded-2xl px-8 py-4 border border-white/20 shadow-xl">
              <p className="text-white/80 text-lg font-medium">
                {completedCount === totalCount && totalCount > 0 ? (
                  <span className="flex items-center gap-2">
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                    🎉 太棒了！所有任务都完成了！你真是效率之王！
                    <Sparkles className="w-5 h-5 text-yellow-400" />
                  </span>
                ) : (
                  <span className="flex items-center gap-2">
                    <Flame className="w-5 h-5 text-orange-400" />
                    继续加油！还有 {activeCount} 个任务等待征服 💪
                  </span>
                )}
              </p>
            </div>
          </div>
        )}
      </div>

      <style jsx>{`
        @keyframes gradient {
          0%, 100% {
            background-position: 0% 50%;
          }
          50% {
            background-position: 100% 50%;
          }
        }
        .animate-gradient {
          background-size: 200% 200%;
          animation: gradient 3s ease infinite;
        }
        @keyframes spin {
          from {
            transform: rotate(0deg);
          }
          to {
            transform: rotate(360deg);
          }
        }
      `}</style>
    </div>
  )
}
