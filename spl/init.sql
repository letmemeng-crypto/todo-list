-- =============================================
-- Todo List 应用数据库表和 RLS 策略
-- =============================================

-- 1. 创建 todos 表
CREATE TABLE IF NOT EXISTS public.todos (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  text TEXT NOT NULL,
  completed BOOLEAN NOT NULL DEFAULT false,
  priority TEXT NOT NULL CHECK (priority IN ('low', 'medium', 'high')),
  category TEXT,
  image_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- 2. 创建索引以提高查询性能
CREATE INDEX IF NOT EXISTS idx_todos_user_id ON public.todos(user_id);
CREATE INDEX IF NOT EXISTS idx_todos_created_at ON public.todos(created_at DESC);
CREATE INDEX IF NOT EXISTS idx_todos_completed ON public.todos(completed);
CREATE INDEX IF NOT EXISTS idx_todos_priority ON public.todos(priority);

-- 3. 创建 updated_at 自动更新触发器函数
CREATE OR REPLACE FUNCTION public.handle_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 4. 为 todos 表添加更新时间触发器
DROP TRIGGER IF EXISTS set_updated_at ON public.todos;
CREATE TRIGGER set_updated_at
  BEFORE UPDATE ON public.todos
  FOR EACH ROW
  EXECUTE FUNCTION public.handle_updated_at();

-- 5. 启用 Row Level Security (RLS)
ALTER TABLE public.todos ENABLE ROW LEVEL SECURITY;

-- 6. 删除现有策略（如果存在）
DROP POLICY IF EXISTS "用户只能查看自己的 todos" ON public.todos;
DROP POLICY IF EXISTS "用户只能创建自己的 todos" ON public.todos;
DROP POLICY IF EXISTS "用户只能更新自己的 todos" ON public.todos;
DROP POLICY IF EXISTS "用户只能删除自己的 todos" ON public.todos;

-- 7. 创建 RLS 策略

-- SELECT 策略：用户只能查看自己的 todos
CREATE POLICY "用户只能查看自己的 todos"
  ON public.todos
  FOR SELECT
  TO authenticated
  USING (auth.uid() = user_id);

-- INSERT 策略：用户只能创建属于自己的 todos
CREATE POLICY "用户只能创建自己的 todos"
  ON public.todos
  FOR INSERT
  TO authenticated
  WITH CHECK (auth.uid() = user_id);

-- UPDATE 策略：用户只能更新自己的 todos
CREATE POLICY "用户只能更新自己的 todos"
  ON public.todos
  FOR UPDATE
  TO authenticated
  USING (auth.uid() = user_id)
  WITH CHECK (auth.uid() = user_id);

-- DELETE 策略：用户只能删除自己的 todos
CREATE POLICY "用户只能删除自己的 todos"
  ON public.todos
  FOR DELETE
  TO authenticated
  USING (auth.uid() = user_id);

-- 8. 授予权限
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT ALL ON public.todos TO authenticated;

-- =============================================
-- 完成！现在用户必须登录才能操作 todos
-- =============================================