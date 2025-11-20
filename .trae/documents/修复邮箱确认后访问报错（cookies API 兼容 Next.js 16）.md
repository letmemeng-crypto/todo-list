## 问题原因
- 错误信息：`cookieStore.getAll is not a function`，出现在 `lib/supabase/server.ts:18`（调用 `cookieStore.getAll()`）。
- 根因：在 Next.js 16 中，`cookies()` 已变为异步函数，需要 `await cookies()`；当前代码用同步方式获取，导致拿到的是 `Promise`，从而 `getAll` 不是函数。
- 触发场景：邮箱确认链接会重定向到 `'/protected'`，该页使用服务端 Supabase 客户端读取/写入会话 Cookie，命中上述不兼容代码。

## 修改方案
- 更新 `lib/supabase/server.ts`：
  - 将 `export function createClient()` 改为 `export async function createClient()`。
  - 修改获取 CookieStore：`const cookieStore = await cookies()`。
  - 其余逻辑保持不变，`setAll` 的 try/catch 也可保留（用于 Server Component 情况）。
- 统一环境变量键名：
  - `lib/supabase/middleware.ts` 里使用 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，与 `server.ts` 保持一致，避免使用不存在的 `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY`。

## 代码位置
- `lib/supabase/server.ts:16-21` 调整为异步获取 cookies 并调用 `getAll()`。
- `app/protected/page.tsx:7-12` 已按异步方式使用 `await createClient()`，无需额外修改。
- `lib/supabase/middleware.ts:18-21` 将 `PUBLISHABLE_KEY` 改为 `ANON_KEY`（保持与 `.env.local` 中键名一致）。

## 验证步骤
- 重启本地开发服务器：`npm run dev`。
- 在浏览器：
  - 点击邮件里的确认链接或直接访问 `http://localhost:3000/protected`。
  - 预期：不再出现 `getAll` 报错，页面能正确读取 `supabase.auth.getClaims()` 并显示用户信息；未登录会被重定向到 `/auth/login`。
- 终端日志应显示 `GET /protected 200`，无 500 服务器错误。

## 可能的后续清理
- 如果曾经引入 `@supabase/supabase-js` 创建浏览器客户端，统一改为 `@supabase/ssr` 的 `createBrowserClient` 并通过封装的 `createClient()` 使用（当前 `lib/supabase/client.ts` 已如此）。
- 保持 `.env.local` 仅包含 `NEXT_PUBLIC_SUPABASE_URL` 与 `NEXT_PUBLIC_SUPABASE_ANON_KEY`，不要泄露到日志或仓库。

请确认是否按此方案进行修改与验证，我将立即应用这些更改并为你完成本地验证。