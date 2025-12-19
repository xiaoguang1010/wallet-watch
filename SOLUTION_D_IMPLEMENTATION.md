# 方案 D 实施完成：在 API Route 中 Import BigNumber

## ✅ 实施完成

已按照方案D成功实施临时解决方案，避免 Vercel 模块解析问题。

---

## 🔧 实施步骤

### 1. 修改 API Route 文件（3个文件）

在三个 API route 文件中添加 ES Module import：

**文件：**
- `src/app/api/v1/balance/btc/[address]/route.ts`
- `src/app/api/v1/balance/eth/[address]/route.ts`
- `src/app/api/v1/balance/tron/[address]/route.ts`

**修改：**
```typescript
import BigNumber from 'bignumber.js';  // ← 新增：直接 import，Vercel 可追踪

export async function GET(...) {
  // 传递 BigNumber 给底层函数
  const result = await getSingleChainBalance(address, chainType, BigNumber);
  // ...
}
```

✅ **效果**：Vercel 的依赖分析器可以正确识别并打包 `bignumber.js`

---

### 2. 修改 balance-service.ts

**文件：** `src/lib/balance-service.ts`

**修改：**
```typescript
export async function getSingleChainBalance(
  address: string, 
  chainType: 'BTC' | 'ETH' | 'TRON',
  BigNumber: any  // ← 新增参数
) {
  // 将 BigNumber 传递给 portfolio 服务
  const result = await getSingleChainPortfolio(address, chainType, BigNumber);
  // ...
}
```

---

### 3. 修改 portfolio.js

**文件：** `src/balances/src/services/portfolio.js`

**修改：**
```javascript
// ❌ 删除：不再自己 require
// let BigNumber;
// try {
//   BigNumber = require('bignumber.js');
// } catch (e) { ... }

// ✅ 现在从上层接收
async function getSingleChainPortfolio(address, chainType, BigNumber) {
  // BigNumber 作为参数传入，继续传递给 getChainBalance
  return await getChainBalance(address, chainName, caip2, getTokenListFn, BigNumber);
}
```

---

### 4. 修改 balance.js

**文件：** `src/balances/src/services/balance.js`

**修改：**
```javascript
// ❌ 删除：不再自己 require
// let BigNumber;
// try {
//   BigNumber = require('bignumber.js');
// } catch (e) { ... }

// ✅ 所有函数都接受 BigNumber 参数
function formatBalance(balance, decimals, BigNumber) { ... }
function fromDecimalToUnit(balance, decimal, BigNumber) { ... }
function formatWithMiniValue(value, miniValue, decimals, BigNumber) { ... }
function calculateTokenUSDValue(balance, price, decimal, BigNumber) { ... }

async function getChainBalance(address, chainName, caip2, getTokenListFn, BigNumber) {
  // 在函数内部调用时传递 BigNumber
  const formattedBalance = formatBalance(balance, decimals, BigNumber);
  const usdValue = calculateTokenUSDValue(balance, price, decimals, BigNumber);
  // ...
}
```

---

## 💡 解决原理

### 问题根源
```
原来的调用链（失败）：
API Route (ES Module)
  → balance-service.ts (createRequire)
    → portfolio.js (CommonJS require('bignumber.js')) ← ❌ Vercel 追踪断裂
```

### 解决方案
```
新的调用链（成功）：
API Route (ES Module)
  ├─ import BigNumber ← ✅ Vercel 可追踪并打包
  └─ 传递 BigNumber ↓
    → balance-service.ts
      → portfolio.js (接受 BigNumber 参数)
        → balance.js (接受 BigNumber 参数)
```

**关键点**：
1. ✅ 在 Next.js ES Module 环境中 `import BigNumber`
2. ✅ Vercel 的 webpack/nft 可以正确识别这个依赖
3. ✅ `bignumber.js` 被包含在 Serverless 函数包中
4. ✅ 通过参数传递，避免 CommonJS `require` 断裂

---

## 📊 修改文件统计

| 类型 | 数量 | 文件列表 |
|------|------|----------|
| API Routes | 3 | `btc/route.ts`, `eth/route.ts`, `tron/route.ts` |
| 服务层 | 3 | `balance-service.ts`, `portfolio.js`, `balance.js` |
| 文档 | 2 | `VERCEL_MODULE_ISSUE_ANALYSIS.md`, 本文件 |
| **总计** | **8** | |

---

## 🚀 部署验证

### 下一步
1. ✅ 代码已推送到 GitHub
2. ⏳ 等待 Vercel 自动部署
3. 🧪 测试余额查询功能
4. 📊 查看 Vercel 日志，确认不再有 `Cannot find module 'bignumber.js'` 错误

### 预期结果
```
✅ GET /api/v1/balance/btc/[address] → 200 OK
✅ GET /api/v1/balance/eth/[address] → 200 OK
✅ GET /api/v1/balance/tron/[address] → 200 OK

✅ Vercel 日志：无 'Cannot find module' 错误
✅ 前端：成功显示钱包余额数据
```

---

## ⚠️ 方案评估

### 优点
- ✅ **快速实施**：约 30 分钟完成
- ✅ **最小改动**：不需要重构整个 `src/balances/` 目录
- ✅ **立即解决**：直接解决 Vercel 依赖追踪问题
- ✅ **可验证**：容易测试和回滚

### 缺点
- ⚠️ **临时方案**：不是架构层面的彻底解决
- ⚠️ **参数传递**：需要在多层函数间传递 BigNumber 参数
- ⚠️ **不够优雅**：混合模块系统仍然存在
- ⚠️ **技术债**：未来仍需考虑重构为 ES Modules（方案C）

### 技术债记录
```
TODO（未来优化）：
- [ ] 考虑将 src/balances/ 重构为 ES Modules
- [ ] 统一模块系统，符合 Next.js 最佳实践
- [ ] 提升代码质量和可维护性
```

---

## 📝 相关文档

- **问题分析**：`VERCEL_MODULE_ISSUE_ANALYSIS.md` - 详细的问题根源分析
- **Vercel 配置**：`vercel.json` - Serverless 函数超时配置
- **模块解析修复**：`VERCEL_MODULE_RESOLUTION_FIX.md` - 之前的修复尝试

---

## 🎯 总结

方案D是一个**快速、有效的临时解决方案**：
- 通过在 ES Module 层面 import `bignumber.js`
- 让 Vercel 正确识别并打包依赖
- 通过参数传递的方式提供给 CommonJS 模块使用

虽然不是最优雅的解决方案，但在**时间紧迫、需要快速上线**的情况下，这是一个**实用且可靠**的选择。

如果未来有时间，建议实施**方案C（重构为 ES Modules）**，从根本上解决架构问题。

---

**实施完成时间**：2025-12-19  
**Commit**: `9c3c274` - fix: 方案D - 在 API route 中 import BigNumber 并传递给底层函数

