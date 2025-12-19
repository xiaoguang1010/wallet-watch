# Vercel 模块解析问题修复

## 问题描述

### 错误信息
```
Error: Cannot find module 'bignumber.js'
Require stack:
- /var/task/src/balances/src/services/portfolio.js
- /var/task/package.json
```

### 环境
- ✅ **本地开发**：正常工作
- ❌ **Vercel 部署**：找不到 bignumber.js 模块

## 根本原因

### 项目结构问题
```
project-root/
├── node_modules/
│   └── bignumber.js/
├── src/
│   ├── balances/
│   │   └── src/
│   │       └── services/
│   │           ├── portfolio.js    // require('bignumber.js')
│   │           └── balance.js      // require('bignumber.js')
│   └── lib/
│       └── balance-service.ts      // 加载 portfolio.js
```

### Node.js 模块解析机制
当 `portfolio.js` 执行 `require('bignumber.js')` 时，Node.js 会：
1. 从 `portfolio.js` 所在目录开始向上查找 `node_modules`
2. 查找路径：
   - `/var/task/src/balances/src/services/node_modules` ❌ 不存在
   - `/var/task/src/balances/src/node_modules` ❌ 不存在
   - `/var/task/src/balances/node_modules` ❌ 不存在
   - `/var/task/src/node_modules` ❌ 不存在
   - `/var/task/node_modules` ✅ 应该在这里，但 Vercel 的打包机制可能有所不同

### Vercel 特殊性
- Vercel 的 Serverless 函数有特殊的文件系统布局
- 打包后的 `node_modules` 位置可能与本地开发不同
- CommonJS 模块的 require 解析可能受到限制

## 解决方案

### 实施的修复

在 `portfolio.js` 和 `balance.js` 中添加 **fallback 逻辑**：

```javascript
// 在 Vercel/Next.js 环境中，需要从项目根目录加载 bignumber.js
let BigNumber;
try {
  // 首先尝试正常的 require
  BigNumber = require('bignumber.js');
} catch (e) {
  // 如果失败，尝试从项目根目录的 node_modules 加载
  const path = require('path');
  const bignumberPath = path.join(process.cwd(), 'node_modules', 'bignumber.js');
  BigNumber = require(bignumberPath);
}
```

### 为什么这个方案有效

1. **优先使用标准解析**：首先尝试正常的 `require('bignumber.js')`
   - 本地开发环境会成功
   - 某些 Vercel 配置下也可能成功

2. **Fallback 到绝对路径**：如果失败，使用 `process.cwd()` 获取项目根目录
   - `process.cwd()` 在 Vercel 中指向 `/var/task`
   - 从那里访问 `node_modules/bignumber.js`
   - 绕过了相对路径的模块解析问题

3. **兼容性好**：
   - 本地开发：使用第一种方式（标准 require）
   - Vercel 部署：自动切换到第二种方式（绝对路径）
   - 无需修改构建配置或添加额外依赖

## 受影响的文件

### 修改的文件
1. ✅ `src/balances/src/services/portfolio.js`
   - 添加 bignumber.js 的 fallback 加载逻辑

2. ✅ `src/balances/src/services/balance.js`
   - 添加 bignumber.js 的 fallback 加载逻辑

3. ✅ `src/lib/balance-service.ts`
   - 添加调试日志（可选，帮助排查问题）

## 其他尝试过的方案（未采用）

### 方案 A：创建 src/balances/package.json
```json
{
  "dependencies": {
    "bignumber.js": "^9.3.1"
  }
}
```
**问题**：需要在该目录运行 `npm install`，增加构建复杂度

### 方案 B：修改 Node.js 模块解析路径
```javascript
Module._resolveLookupPaths = function(request, parent) {
  // 修改模块查找路径...
}
```
**问题**：过于复杂，可能影响其他模块的加载

### 方案 C：使用 Vercel 的 includeFiles 配置
```json
{
  "functions": {
    "src/app/api/**/route.ts": {
      "includeFiles": ["node_modules/bignumber.js/**"]
    }
  }
}
```
**问题**：不够灵活，需要为每个依赖配置

## 验证步骤

1. **推送代码到 GitHub**
   ```bash
   git push origin main
   ```

2. **等待 Vercel 自动部署**
   - 查看 Vercel Dashboard
   - 等待部署完成（约 2-3 分钟）

3. **测试余额获取功能**
   - 访问部署的网站
   - 添加或查看钱包地址
   - 检查余额是否正常显示

4. **查看 Vercel 日志**
   - 进入 Vercel Dashboard > Functions
   - 查看最近的函数调用
   - 确认没有 "Cannot find module" 错误

## 预期结果

修复后应该看到：
- ✅ 本地开发环境：继续正常工作
- ✅ Vercel 部署环境：成功加载 bignumber.js
- ✅ 余额数据：正常获取和显示
- ✅ 日志输出：
  ```
  [balance-service] Loading portfolio module from: /var/task/src/balances/src/services/portfolio.js
  [BTC API] Request completed in 3245ms, success: true
  ```

## 类似问题的通用解决方案

如果将来遇到其他 npm 包在 Vercel 中找不到，可以使用相同的模式：

```javascript
let SomePackage;
try {
  SomePackage = require('some-package');
} catch (e) {
  const path = require('path');
  SomePackage = require(path.join(process.cwd(), 'node_modules', 'some-package'));
}
```

## 相关文档

- [Node.js Module Resolution](https://nodejs.org/api/modules.html#modules_all_together)
- [Vercel Serverless Functions](https://vercel.com/docs/concepts/functions/serverless-functions)
- [Next.js and CommonJS](https://nextjs.org/docs/advanced-features/compiler#commonjs-support)

## 提交记录

```bash
commit 422ec8e
fix: 修复 Vercel 环境中 bignumber.js 模块找不到的问题

- 在 portfolio.js 和 balance.js 中添加 fallback 逻辑
- 如果正常 require 失败，尝试从项目根目录的 node_modules 加载
- 添加日志输出以便调试模块加载路径
```

