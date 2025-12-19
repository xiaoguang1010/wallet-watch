# BTC Transaction List Demo

## 概述

这是一个演示如何获取比特币（BTC）地址交易记录的脚本，从项目代码库中提取并适配了BTC地址的特性。

## 功能特点

- 🔗 **统一API**: 使用与ETH相同的API基础URL (`https://biz.token.im`)，但使用BTC专用端点 (`/v1/bitcoin`)
- 🪙 **BTC专用**: 适配比特币地址格式（无 `0x` 前缀）
- 📊 **完整数据**: 获取交易哈希、金额、手续费、区块信息、确认数等
- 🎯 **方向识别**: 自动识别交易方向（发送/接收）
- ⚡ **实时查询**: 直接从API获取最新交易记录

## 使用方法

### 基础用法

```bash
node src/demo-get-tx-list-by-address-btc.js <BTC地址> [链ID]
```

### 参数说明

- `BTC地址`: 必需，比特币地址（支持所有格式：Legacy, SegWit, Native SegWit）
- `链ID`: 可选，链ID（0=主网，1=测试网），默认为 0

### 示例

#### 查询主网地址

```bash
node src/demo-get-tx-list-by-address-btc.js bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc
```

#### 查询测试网地址

```bash
node src/demo-get-tx-list-by-address-btc.js tb1qw508d6qejxtdg4y5r3zarvary0c5xw7kxpjzsx 1
```

#### 查询Legacy地址

```bash
node src/demo-get-tx-list-by-address-btc.js 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa
```

#### 输出原始JSON数据

```bash
node src/demo-get-tx-list-by-address-btc.js bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc --json
```

## 输出示例

```
================================================================================
BTC地址交易记录查询
================================================================================
地址: bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc
链ID: 0 (0=主网, 1=测试网)
API地址: https://biz.token.im/v1/bitcoin

正在查询交易记录...

找到 50 条交易记录

================================================================================
交易记录列表（按时间倒序）
================================================================================

1. 交易 #1
   交易哈希: 594e883f119d66cdf395698eea20186db7d429fcd349108e9fa9ecb50d7f1feb
   发送地址(From): bc1qk2rr9m7f98d5wvm0qc8fsgl3qgddkjstvsjga3
   接收地址(To):   bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc
   交易金额: 0.00044643 BTC
   手续费: 0.00000435 BTC
   区块号: 928537
   时间: 2025/12/19 17:59:37
   状态: SUCCESS
   方向: 接收

...

================================================================================
统计信息
================================================================================
总交易数: 50
成功交易: 50
失败交易: 0
最早交易: 2025/12/19 16:41:32
最新交易: 2025/12/19 17:59:37
================================================================================
```

## API端点

### BTC交易列表API

- **URL**: `https://biz.token.im/v1/bitcoin`
- **方法**: JSON-RPC POST
- **JSON-RPC方法**: `wallet.getTxListByAddress`

### 请求格式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "wallet.getTxListByAddress",
  "params": [
    {
      "address": "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc",
      "addresses": ["bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc"],
      "chainId": "0"
    }
  ]
}
```

### 响应格式

```json
{
  "jsonrpc": "2.0",
  "id": 1,
  "result": [
    {
      "txHash": "594e883f...",
      "amount": "44643",
      "fee": "435",
      "blockNumber": 928537,
      "timestamp": 1734602377,
      "status": "SUCCESS",
      "direction": "RECEIVE",
      "counterparty": "bc1qk2rr9...",
      "confirmations": 3,
      ...
    }
  ]
}
```

## BTC地址格式

### 支持的地址类型

| 类型 | 前缀 | 示例 |
|------|------|------|
| Legacy (P2PKH) | 1 | 1A1zP1eP5QGefi2DMPTfTL5SLmv7DivfNa |
| Script (P2SH) | 3 | 3PZgLMyTWbKFsNMJdXrMo2UpmkZNSQNCBq |
| SegWit (P2WPKH-P2SH) | 3 | 3J98t1WpEZ73CNmYviecrnyiWrnqRhWNLy |
| Native SegWit (Bech32) | bc1 | bc1qar0srrr7xfkvy5l643lydnw9re59gtzzwf5mdq |
| Taproot (Bech32m) | bc1p | bc1p... |

## 数据字段说明

### 交易基本信息

| 字段 | 类型 | 说明 |
|------|------|------|
| `txHash` | string | 交易哈希 |
| `from` | string | 发送地址 |
| `to` | string | 接收地址 |
| `value` | string | 交易金额（satoshi） |
| `decimal` | number | 小数位数（BTC为8） |
| `fee` | string | 手续费（satoshi） |
| `blockNumber` | number | 区块高度 |
| `blockTimestamp` | number | 区块时间戳（秒） |
| `status` | number | 状态（1=成功，0=失败） |
| `direction` | string | 方向（SEND/RECEIVE） |
| `confirmations` | number | 确认数 |

### 单位换算

- **1 BTC** = 100,000,000 satoshi
- **1 satoshi** = 0.00000001 BTC

## 与ETH的差异

| 特性 | BTC | ETH |
|------|-----|-----|
| 地址前缀 | 无或bc1 | 0x |
| 小数位数 | 8 | 18 |
| API端点 | /v1/bitcoin | /v1/ethereum |
| 合约地址 | 不支持 | 支持 |
| Gas机制 | 手续费 | Gas Price × Gas Used |
| 链ID（主网） | 0 | 1 |

## 代码集成

### 在Next.js API路由中使用

```typescript
import { createRequire } from 'module';
import path from 'path';

const require = createRequire(process.cwd() + '/package.json');
const txModulePath = path.join(process.cwd(), 'src', 'demo-get-tx-list-by-address-btc.js');
const { getTxListByAddress, formatTx } = require(txModulePath);

// 调用函数
const txList = await getTxListByAddress(address, chainId);
const formattedTxList = txList.map(tx => formatTx(tx, address));
```

### 在React组件中使用

```typescript
const fetchBTCTransactions = async (address: string) => {
  const url = new URL(`/api/v1/transactions/btc/${encodeURIComponent(address)}`, window.location.origin);
  url.searchParams.set('chainId', '0');
  
  const response = await fetch(url.toString());
  const result = await response.json();
  
  if (result.success) {
    return result.data.transactions;
  }
  throw new Error(result.error);
};
```

## 错误处理

### 常见错误

| 错误 | 原因 | 解决方案 |
|------|------|----------|
| Request timeout | 请求超时 | 检查网络连接，增加超时时间 |
| JSON-RPC Error | API返回错误 | 检查地址格式，查看error详情 |
| Parse response error | 响应解析失败 | 检查API返回格式 |
| 未找到交易记录 | 地址没有交易 | 确认地址正确，可能是新地址 |

### 调试技巧

1. 使用 `--json` 参数查看原始响应
2. 检查网络连接和API可访问性
3. 验证BTC地址格式是否正确
4. 查看错误堆栈了解详细信息

## 性能优化

### 请求优化

- 默认超时：30秒
- 支持并发请求
- 自动重试机制（可自行实现）

### 数据缓存

建议实现以下缓存策略：

```typescript
// 缓存最近查询的交易列表
const cache = new Map();
const CACHE_TTL = 60000; // 1分钟

async function getCachedTransactions(address: string) {
  const cached = cache.get(address);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL) {
    return cached.data;
  }
  
  const data = await getTxListByAddress(address);
  cache.set(address, { data, timestamp: Date.now() });
  return data;
}
```

## 扩展功能

### 分页支持

```javascript
async function getTxListByAddress(address, chainId = '0', options = {}) {
  const params = {
    address: replaceAddrPrefix(address),
    addresses: [replaceAddrPrefix(address)],
    chainId: String(chainId),
    page: options.page || 1,
    pageSize: options.pageSize || 50,
    ...options,
  };
  // ...
}
```

### 筛选功能

```javascript
// 按方向筛选
const receivedTxs = txList.filter(tx => tx.direction === 'RECEIVE');
const sentTxs = txList.filter(tx => tx.direction === 'SEND');

// 按金额筛选
const largeTxs = txList.filter(tx => BigInt(tx.amount) > BigInt('100000000')); // > 1 BTC

// 按时间筛选
const recentTxs = txList.filter(tx => tx.timestamp > Date.now()/1000 - 86400); // 最近24小时
```

## 相关资源

- **Bitcoin区块浏览器**: https://blockchair.com/bitcoin
- **Bitcoin开发者文档**: https://developer.bitcoin.org/
- **比特币地址格式**: https://en.bitcoin.it/wiki/Address
- **Bech32地址格式**: https://github.com/bitcoin/bips/blob/master/bip-0173.mediawiki

## 注意事项

⚠️ **重要**

1. **API限流**: API可能有请求频率限制，请合理控制请求频率
2. **地址验证**: 建议在调用前验证BTC地址格式
3. **错误处理**: 生产环境中应实现完善的错误处理机制
4. **数据准确性**: 交易数据来自第三方API，建议关键业务进行二次验证
5. **隐私保护**: 避免在日志中记录完整的用户地址

## 许可证

本演示脚本基于项目代码库提取，仅供学习和开发使用。

## 更新日志

### 2025-12-19
- ✅ 初始版本
- ✅ 支持BTC主网和测试网
- ✅ 支持所有BTC地址格式
- ✅ 完整的交易信息展示
- ✅ 统计信息汇总

## 支持

如有问题或建议，请参考：
- ETH交易查询参考: `src/demo-get-tx-list-README.md`
- 实现文档: `BTC_TRANSACTIONS_IMPLEMENTATION.md`
- API路由: `src/app/api/v1/transactions/btc/[address]/route.ts`

