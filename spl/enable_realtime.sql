-- =============================================
-- 为 todos 表启用 Realtime 功能
-- =============================================

-- 1. 启用 Realtime 复制
ALTER TABLE public.todos REPLICA IDENTITY FULL;

-- 2. 为 todos 表启用 Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;

-- 3. 验证 Realtime 是否启用（可选）
-- SELECT schemaname, tablename 
-- FROM pg_publication_tables 
-- WHERE pubname = 'supabase_realtime';

-- =============================================
-- 说明：
-- - REPLICA IDENTITY FULL: 确保所有列的变化都会被捕获
-- - supabase_realtime: Supabase 默认的 Realtime publication
-- =============================================
