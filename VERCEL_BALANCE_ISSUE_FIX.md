# Vercel 余额获取问题修复方案

## 问题分析

### 核心问题：Vercel Serverless 函数超时限制

**症状**：
- ✅ 本地开发环境：余额正常获取
- ❌ Vercel 部署环境：无法获取余额

**根本原因**：
1. **Vercel 免费版函数超时限制为 10 秒**
2. 原代码设置了 30 秒超时，超过 Vercel 限制
3. 外部 API (`api.token.im`) 响应时间可能较长
4. 冷启动 + API 请求时间容易超过 10 秒

## 已实施的修复

### 1. 创建 Vercel 配置文件 (`vercel.json`)

```json
{
  "functions": {
    "src/app/api/v1/balance/**/route.ts": {
      "maxDuration": 10
    }
  }
}
```

**说明**：
- 明确设置函数最大执行时间为 10 秒
- 如果需要更长时间，需要升级到 Vercel Pro 计划（最多 60 秒）

### 2. 调整后端超时时间

**文件**: `src/balances/src/api/httpClient.js`

```javascript
// 从 30 秒降低到 8 秒
req.setTimeout(8000, () => {
  console.error('[httpClient] Request timeout after 8s for:', url);
  req.destroy();
  reject(new Error('Request timeout after 8s'));
});
```

**原因**：
- 为 Vercel 10 秒限制留出 2 秒余地
- 留出时间处理响应和返回数据

### 3. 调整前端超时时间

**文件**: `src/components/cases/case-dashboard-view.tsx`

```typescript
// 从 30 秒降低到 9 秒
const addrTimeoutId = setTimeout(() => addrController.abort(), 9000);
```

### 4. 添加详细日志

**所有 API 路由** (`btc/eth/tron`):
- 记录请求开始时间
- 记录执行时长
- 记录成功/失败状态
- 记录详细错误堆栈

**前端**:
- 记录每个余额请求的开始和结束
- 记录响应时间和状态

## 如何查看 Vercel 日志

1. 登录 Vercel Dashboard
2. 选择你的项目
3. 进入 "Functions" 标签
4. 选择具体的函数调用
5. 查看 Console 输出，会看到类似：
   ```
   [BTC API] Request received for address: bc1qq2mv...
   [BTC API] Request completed in 4523ms, success: true
   ```

## 进一步优化建议

### 方案 A: 升级 Vercel 计划（推荐）

**优点**：
- Pro 计划支持最多 60 秒函数执行时间
- 更稳定的性能
- 更好的冷启动时间

**成本**：
- $20/月起

### 方案 B: 实施缓存策略

```typescript
// 在 API 路由中添加缓存
export const revalidate = 60; // 60 秒缓存

export async function GET(request: NextRequest, { params }: any) {
  // ... 现有代码
}
```

**优点**：
- 减少对外部 API 的调用
- 提高响应速度
- 降低超时风险

**注意**：
- 余额数据会有最多 60 秒延迟

### 方案 C: 使用 Vercel Edge Functions

**优点**：
- 全球分布，更快的冷启动
- 更低的延迟
- 但也有 30 秒限制（免费版）

**实施**：
```typescript
// 在 API 路由文件顶部添加
export const runtime = 'edge';
```

### 方案 D: 实施重试机制

```typescript
async function fetchWithRetry(url: string, retries = 2) {
  for (let i = 0; i <= retries; i++) {
    try {
      const response = await fetch(url, { signal: AbortSignal.timeout(8000) });
      if (response.ok) return response;
    } catch (error) {
      if (i === retries) throw error;
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}
```

### 方案 E: 批量请求优化

当前每个地址发起单独的 API 请求，考虑：
- 合并同链多个地址为一次请求（如果 API 支持）
- 使用队列控制并发数量
- 优先加载可见的地址数据

## 测试步骤

1. **本地测试**：
   ```bash
   npm run dev
   # 查看控制台日志，确认超时时间已调整
   ```

2. **部署到 Vercel**：
   ```bash
   git add .
   git commit -m "fix: 优化 Vercel 余额获取超时问题"
   git push
   ```

3. **监控 Vercel 日志**：
   - 打开 Vercel Dashboard
   - 实时查看函数执行日志
   - 确认请求时长 < 10 秒

4. **测试不同场景**：
   - 单个地址
   - 多个地址（2-3 个）
   - 不同链类型（BTC/ETH/TRON）

## 预期结果

修复后应该看到：
- ✅ 大部分余额请求在 3-8 秒内完成
- ✅ Vercel 日志显示成功响应
- ✅ 前端正常显示余额数据
- ⚠️ 偶尔可能仍有超时（取决于外部 API 响应时间）

## 如果问题仍然存在

1. **检查 Vercel 日志**确认具体错误信息
2. **验证外部 API**：确认 `api.token.im` 可从 Vercel 访问
3. **考虑升级计划**：如果确实需要更长执行时间
4. **联系我**：提供 Vercel 日志截图以进一步分析

## 相关文件

- ✅ `vercel.json` - Vercel 配置
- ✅ `src/balances/src/api/httpClient.js` - HTTP 客户端超时
- ✅ `src/components/cases/case-dashboard-view.tsx` - 前端超时
- ✅ `src/app/api/v1/balance/btc/[address]/route.ts` - BTC API 日志
- ✅ `src/app/api/v1/balance/eth/[address]/route.ts` - ETH API 日志
- ✅ `src/app/api/v1/balance/tron/[address]/route.ts` - TRON API 日志

