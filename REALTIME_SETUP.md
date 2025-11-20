# Supabase Realtime 实时同步功能设置指南

## 功能说明

现在你的 Todo 应用已经支持 Realtime 实时同步！这意味着：

- ✅ 在一个设备上添加 Todo，其他设备会立即看到
- ✅ 在一个设备上修改 Todo（完成/编辑），其他设备会实时更新
- ✅ 在一个设备上删除 Todo，其他设备会同步删除
- ✅ 只同步当前用户的数据，不会看到其他用户的操作
- ✅ 多个浏览器窗口/标签页之间实时同步

## 启用步骤

### 第一步：在 Supabase 控制台启用 Realtime

1. **登录 Supabase 控制台**
   - 访问：https://supabase.com/dashboard
   - 选择你的项目

2. **打开 SQL Editor**
   - 左侧菜单点击 **SQL Editor**
   - 或者：Database → SQL Editor

3. **执行以下 SQL 命令**

   复制并粘贴这段 SQL，然后点击 **Run**：

   ```sql
   -- 启用 Realtime 复制
   ALTER TABLE public.todos REPLICA IDENTITY FULL;

   -- 为 todos 表启用 Realtime
   ALTER PUBLICATION supabase_realtime ADD TABLE public.todos;
   ```

4. **验证是否成功**（可选）

   执行以下查询，如果能看到 `todos` 表，说明启用成功：

   ```sql
   SELECT schemaname, tablename 
   FROM pg_publication_tables 
   WHERE pubname = 'supabase_realtime';
   ```

### 第二步：测试 Realtime 功能

1. **打开两个浏览器窗口**
   - 窗口 A：http://localhost:3000
   - 窗口 B：http://localhost:3000
   - 使用同一个账号登录

2. **在窗口 A 中添加一个 Todo**
   - 输入任务内容，点击添加
   - 立即查看窗口 B，新 Todo 应该自动出现！

3. **在窗口 B 中修改这个 Todo**
   - 标记为完成或编辑内容
   - 窗口 A 会实时更新

4. **在窗口 A 中删除 Todo**
   - 点击删除按钮
   - 窗口 B 中的 Todo 立即消失

## 技术实现细节

### 前端实现

代码位置：`app/page.tsx`

```typescript
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
      // 根据事件类型更新本地状态
      switch (payload.eventType) {
        case 'INSERT': // 新增
        case 'UPDATE': // 更新
        case 'DELETE': // 删除
      }
    }
  )
  .subscribe()
```

### 数据过滤

使用 RLS（Row Level Security）+ Realtime Filter 双重保护：

1. **RLS 策略**：确保用户只能访问自己的数据
2. **Realtime Filter**：只订阅当前用户的数据变化
   ```typescript
   filter: `user_id=eq.${user.id}`
   ```

### 事件处理

- **INSERT**：新 Todo 添加到列表开头，避免重复
- **UPDATE**：找到对应的 Todo 并更新所有字段
- **DELETE**：从列表中移除对应的 Todo

### 自动清理

当组件卸载或用户退出登录时，自动取消订阅：

```typescript
return () => {
  supabase.removeChannel(channel)
}
```

## 调试

### 查看 Realtime 日志

打开浏览器的开发者工具（F12）→ Console，你会看到：

```
🔄 Setting up Realtime subscription for user: xxx
📡 Realtime subscription status: SUBSCRIBED
📡 Realtime event received: { eventType: 'INSERT', ... }
```

### 常见问题

**Q: 数据没有实时同步？**

A: 检查以下几点：
1. 确认已在 Supabase 控制台执行了启用 Realtime 的 SQL
2. 检查浏览器 Console 是否有错误
3. 确认两个窗口登录的是同一个账号
4. 刷新页面重新建立连接

**Q: 看到其他用户的数据变化？**

A: 不会！代码中使用了 `filter: user_id=eq.${user.id}` 确保只订阅当前用户的数据。

**Q: 性能影响？**

A: Realtime 使用 WebSocket 连接，非常高效。只有当数据真正变化时才会收到通知。

## 生产环境建议

1. **错误处理**：考虑添加重连逻辑
2. **连接状态**：可以显示"实时同步中"的指示器
3. **网络优化**：在网络断开时缓存操作，恢复后同步

## 总结

✅ 已完成的功能：
- 前端 Realtime 订阅逻辑
- INSERT/UPDATE/DELETE 事件处理
- 用户数据隔离
- 自动清理订阅

⚠️ 需要你执行的操作：
- 在 Supabase 控制台执行 SQL 启用 Realtime

🎉 完成后即可享受多设备实时同步的体验！
