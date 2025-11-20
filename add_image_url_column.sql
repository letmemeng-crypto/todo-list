-- 为现有的 todos 表添加 image_url 字段
-- 如果你的数据库表是在添加 image_url 字段之前创建的，请执行此 SQL

ALTER TABLE public.todos ADD COLUMN IF NOT EXISTS image_url TEXT;

-- 验证字段是否添加成功
-- SELECT column_name, data_type FROM information_schema.columns WHERE table_name = 'todos';
