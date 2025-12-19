# Vercel bignumber.js 模块问题深度分析

## 错误信息

```
[ETH API] Error: Cannot find module '/var/task/node_modules/bignumber.js'
Require stack:
- /var/task/src/balances/src/services/portfolio.js
- /var/task/package.json
```

## 问题分析

### 1. 为什么 Fallback 方案失败了？

#### 当前 Fallback 逻辑
```javascript
let BigNumber;
try {
  BigNumber = require('bignumber.js');  // 第一次尝试失败
} catch (e) {
  const path = require('path');
  const bignumberPath = path.join(process.cwd(), 'node_modules', 'bignumber.js');
  BigNumber = require(bignumberPath);  // 第二次尝试也失败
}
```

#### 失败原因

**核心问题：Vercel Serverless 函数的依赖打包机制**

1. **Vercel 使用 webpack/nft (Node File Trace) 分析依赖**
   - Next.js 在构建时会分析所有 import/require
   - **但只分析 TypeScript/JavaScript 文件中的静态 import/require**
   - 动态 require 和 CommonJS 模块的 require 可能被忽略

2. **`src/balances/` 目录不在 Next.js 的标准路径中**
   - Next.js 主要关注 `src/app/` 和直接 import 的模块
   - `src/balances/` 是通过 `createRequire` 动态加载的
   - Vercel 的依赖分析器**可能没有检测到** `src/balances/` 中的依赖

3. **实际的文件系统结构**
   ```
   Vercel Serverless Function (/var/task/):
   ├── .next/
   ├── src/
   │   ├── app/
   │   ├── balances/    ← 这个目录被包含了
   │   └── lib/
   ├── node_modules/    ← 问题：bignumber.js 可能不在这里！
   └── package.json
   ```

4. **为什么 node_modules/bignumber.js 不存在？**
   - Vercel 只打包**被检测到使用**的依赖
   - 由于 `src/balances/` 的 CommonJS require 是动态的
   - `bignumber.js` 没有被识别为必需依赖
   - 因此没有被包含在 Serverless 函数包中

### 2. 架构问题：CommonJS vs ES Modules

#### 当前架构的问题

```
项目结构：
src/
├── app/                    (Next.js App Router - ES Modules)
│   └── api/
│       └── v1/balance/
│           └── [chain]/route.ts  → 调用 balance-service.ts
├── lib/
│   └── balance-service.ts  (ES Module) → 使用 createRequire 加载 portfolio.js
└── balances/               (独立的 CommonJS 模块集合)
    └── src/
        ├── api/            (纯 CommonJS)
        └── services/
            ├── portfolio.js  → require('bignumber.js')
            └── balance.js    → require('bignumber.js')
```

**问题点：**

1. **混合模块系统**
   - Next.js (ES Modules) → createRequire → CommonJS → require('bignumber.js')
   - 这种混合架构在本地开发可以工作，但在生产环境（Vercel）失败

2. **依赖追踪断裂**
   - Vercel 的 nft (Node File Trace) 工具无法跟踪跨越 createRequire 边界的依赖
   - `bignumber.js` 在 CommonJS 模块中被 require，但 Vercel 看不到这个依赖

3. **动态加载的副作用**
   ```typescript
   // balance-service.ts
   const require = createRequire(process.cwd() + '/package.json');
   const portfolioPath = path.join(process.cwd(), 'src', 'balances', '...');
   portfolioModule = require(portfolioPath);  // 动态路径，无法静态分析
   ```

### 3. 为什么本地开发正常？

在本地开发环境：
- ✅ 完整的 `node_modules/` 目录存在
- ✅ Node.js 可以自由访问所有已安装的包
- ✅ 没有依赖打包和优化的限制

在 Vercel 生产环境：
- ❌ 只有被检测到的依赖才会被打包
- ❌ Serverless 函数有大小限制（50MB），会进行严格的依赖优化
- ❌ 动态 require 的依赖可能被遗漏

## 可能的解决方案对比

### 方案 A：配置 Vercel 包含依赖（复杂）

```json
// vercel.json
{
  "functions": {
    "src/app/api/v1/balance/**/route.ts": {
      "includeFiles": ["src/balances/**", "node_modules/bignumber.js/**"]
    }
  }
}
```

**优点：**
- 保持现有架构不变

**缺点：**
- ❌ 不保证有效，因为模块解析仍然有问题
- ❌ 需要为每个依赖配置
- ❌ 维护成本高

### 方案 B：使用 Webpack externals（不适用）

Next.js 默认使用 webpack，但配置 externals 对 CommonJS require 无效。

### 方案 C：重构为 ES Modules（推荐）⭐

**彻底解决架构问题**

```typescript
// 新结构
src/
├── app/
│   └── api/v1/balance/[chain]/route.ts
├── lib/
│   └── balance/
│       ├── types.ts
│       ├── http-client.ts     ← 从 httpClient.js 转换
│       ├── btc-api.ts          ← 从 btc.js 转换
│       ├── eth-api.ts          ← 从 eth.js 转换
│       ├── tron-api.ts         ← 从 tron.js 转换
│       ├── balance-service.ts  ← 从 balance.js 转换
│       └── portfolio-service.ts ← 从 portfolio.js 转换
```

**优点：**
- ✅ 统一使用 ES Modules，符合 Next.js 最佳实践
- ✅ Vercel 可以正确分析所有依赖
- ✅ 支持 TypeScript 类型检查
- ✅ 更好的 Tree Shaking（减小包体积）
- ✅ 不需要 createRequire hack
- ✅ 代码更现代化、可维护性更好

**缺点：**
- ❌ 需要重构现有代码（约 5-8 个文件）
- ❌ 需要测试确保功能一致

### 方案 D：将 bignumber.js 换成 ES Module 版本

bignumber.js 本身支持 ES Modules：

```javascript
// 改为 ES import
import BigNumber from 'bignumber.js';
```

**问题：**
- ❌ 但 src/balances/ 中的其他文件仍然是 CommonJS
- ❌ 无法在 CommonJS 文件中使用 import
- ❌ 不是根本解决方案

## 为什么重构是最佳方案

### 1. 根本原因

**当前问题的本质**：
- 项目使用了两种不兼容的模块系统
- Vercel/webpack 无法正确处理这种混合架构
- CommonJS 的动态 require 在生产环境中不可靠

### 2. 长期考虑

**未来可能遇到的相同问题**：
- 如果添加其他依赖到 src/balances/，会遇到同样的问题
- 每次都需要手动配置或 hack
- 技术债累积，维护困难

### 3. Next.js 的最佳实践

Next.js 官方推荐：
- ✅ 在 src/lib/ 或 src/utils/ 中放置共享逻辑
- ✅ 使用 ES Modules
- ✅ 充分利用 TypeScript
- ❌ 避免使用 createRequire
- ❌ 避免混合模块系统

## 重构工作量评估

### 需要转换的文件

1. **API 客户端** (4 个文件)
   - `src/balances/src/api/httpClient.js` → `src/lib/balance/http-client.ts`
   - `src/balances/src/api/btc.js` → `src/lib/balance/btc-api.ts`
   - `src/balances/src/api/eth.js` → `src/lib/balance/eth-api.ts`
   - `src/balances/src/api/tron.js` → `src/lib/balance/tron-api.ts`
   - `src/balances/src/api/prices.js` → `src/lib/balance/prices-api.ts`

2. **服务层** (2 个文件)
   - `src/balances/src/services/balance.js` → `src/lib/balance/balance-service.ts`
   - `src/balances/src/services/portfolio.js` → `src/lib/balance/portfolio-service.ts`

3. **调用方** (1 个文件)
   - `src/lib/balance-service.ts` → 简化或删除（不再需要 createRequire）

### 转换工作

每个文件的转换步骤：
1. 将 `module.exports` 改为 `export`
2. 将 `require()` 改为 `import`
3. 添加 TypeScript 类型定义
4. 确保 Promise 和 async/await 语法正确
5. 测试功能

**预计时间**：2-3 小时

## 对比：现有方案 vs 重构

| 方面 | 当前架构（CommonJS） | 重构（ES Modules） |
|------|---------------------|-------------------|
| Vercel 兼容性 | ❌ 有问题 | ✅ 完全兼容 |
| 依赖追踪 | ❌ 不可靠 | ✅ 可靠 |
| TypeScript 支持 | ⚠️ 有限 | ✅ 完整 |
| 维护性 | ⚠️ 中等 | ✅ 好 |
| 性能 | ⚠️ 正常 | ✅ 更好（Tree Shaking） |
| 符合最佳实践 | ❌ 否 | ✅ 是 |
| 工作量 | ✅ 0 | ⚠️ 2-3 小时 |

## 结论与建议

### 根本原因

**src/balances/ 的 CommonJS 架构与 Next.js/Vercel 的 ES Module 生态不兼容**

Vercel 的依赖分析器无法跟踪通过 `createRequire` 动态加载的 CommonJS 模块的依赖，导致 `bignumber.js` 没有被包含在 Serverless 函数包中。

### 推荐方案

**重构 src/balances/ 为 ES Modules**

这是唯一能从根本上解决问题的方案：
1. ✅ 彻底解决依赖问题
2. ✅ 符合 Next.js 最佳实践
3. ✅ 避免未来类似问题
4. ✅ 提升代码质量和可维护性
5. ✅ 工作量可控（2-3 小时）

### 临时方案（如果不能立即重构）

如果暂时无法重构，可以尝试：

1. **手动指定 bignumber.js 为外部依赖**
   ```typescript
   // next.config.ts
   const nextConfig = {
     experimental: {
       serverComponentsExternalPackages: ['bignumber.js']
     }
   }
   ```

2. **直接在 API route 中 import bignumber.js**
   ```typescript
   // route.ts
   import BigNumber from 'bignumber.js';
   // 然后通过参数传递给 portfolio 函数
   ```

但这些都是临时解决方案，不能解决根本问题。

### 下一步行动

建议：
1. 确认是否接受重构方案
2. 如接受，我可以协助进行代码重构
3. 重构后进行本地测试
4. 部署到 Vercel 验证

你的判断是对的——**独立的 src/balances/ CommonJS 结构确实是问题的根源**。

