# ETH交易记录查询Demo

## 说明

这个demo提取自 `src/api/endpoint/txs/api.ts` 中的 `getTxListByAddress` 函数逻辑，用于查询ETH地址的交易记录。

## 使用方法

### ⚠️ 重要：需要先进入demo目录

```bash
cd demo
```

### 基本用法

```bash
node demo-get-tx-list-by-address.js <ETH_ADDRESS> [chainId] [contractAddress]
```

### 示例

```bash
# 1. 进入demo目录
cd demo

# 2. 查询主网地址的所有交易
node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901

# 指定链ID（主网是1）
node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 1

# 查询特定代币的交易（传入合约地址）
node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 1 0xdac17f958d2ee523a2206206994597c13d831ec7

# 输出原始JSON数据
node demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901 --json
```

### 或者从项目根目录执行

```bash
# 从项目根目录执行（使用相对路径）
node demo/demo-get-tx-list-by-address.js 0x16ac14eF9d1834c31828f4958aa4a6693846C901
```

## 代码来源

### 原始代码位置

- **文件**: `src/api/endpoint/txs/api.ts`
- **函数**: `getTxListByAddress` (第72-113行)
- **API端点**: `https://biz.token.im/v1/ethereum`
- **API方法**: `wallet.getTxListByAddress`

### 核心逻辑

```typescript
// ETH参数处理（第82-87行）
if (chainType === chainTypes.ETHEREUM) {
  let address = params.addresses[0]
  let { encXPub, segWit, propertyId, addresses, ...p } = params
  p.address = address
  p.chainId = String(params.chainId)
  requestParams = p
}

// API调用（第105-107行）
const data = await jsonrpc.get<InputTx[]>(url, 'wallet.getTxListByAddress', [
  requestParams,
])

// 数据格式化（第108-112行）
return (data || []).map((tx) => ({
  ...tx,
  chainId: params.chainId,
  contractAddress: params.contractAddress,
}))
```

## 参数说明

### 必需参数

- `address` (string): ETH地址，必须以0x开头

### 可选参数

- `chainId` (string|number): 链ID，默认为'1'（主网）
  - 1: 以太坊主网
  - 5: Goerli测试网
  - 11155111: Sepolia测试网
  - 其他: 其他EVM兼容链

- `contractAddress` (string): 合约地址（可选）
  - 如果提供，只返回与该合约相关的交易
  - 如果不提供，返回所有交易

## 返回数据

### 交易对象字段

```javascript
{
  txHash: string,           // 交易哈希
  txFrom: string,           // 发送地址
  txTo: string,             // 接收地址
  value: string,            // 交易金额（wei）
  blockNumber: number,      // 区块号
  blockTimestamp: number,   // 区块时间戳（秒）
  txStatus: 0 | 1,         // 交易状态（0=失败，1=成功）
  gasUsed: string,          // 使用的Gas
  gasPrice: string,         // Gas价格
  nonce: number,            // Nonce值
  functionName: string,     // 函数名
  functionSignature: string,// 函数签名
  chainId: string,         // 链ID
  contractAddress: string,  // 合约地址（如果有）
}
```

## 功能特性

- ✅ 查询ETH地址的所有交易记录
- ✅ 支持查询特定代币的交易（传入合约地址）
- ✅ 自动按时间倒序排序
- ✅ 格式化显示交易信息
- ✅ 统计信息（总数、成功/失败数、时间范围）
- ✅ 支持输出原始JSON数据

## API端点

- **URL**: `https://biz.token.im/v1/ethereum`
- **方法**: POST
- **协议**: JSON-RPC 2.0
- **方法名**: `wallet.getTxListByAddress`

## 请求示例

```javascript
{
  "jsonrpc": "2.0",
  "id": 1,
  "method": "wallet.getTxListByAddress",
  "params": [{
    "address": "0x16ac14eF9d1834c31828f4958aa4a6693846C901",
    "chainId": "1"
  }]
}
```

## 注意事项

1. **网络连接**: 确保能够访问 `biz.token.im`
2. **地址格式**: ETH地址必须以0x开头，长度为42字符
3. **数据格式**: API返回的数据格式可能与预期不同，代码已做兼容处理
4. **分页**: 当前demo返回所有交易，实际使用时可能需要分页处理

## 在代码中使用

```javascript
const { getTxListByAddress } = require('./demo-get-tx-list-by-address');

// 查询所有交易
const txList = await getTxListByAddress('0x16ac14eF9d1834c31828f4958aa4a6693846C901', '1');

// 查询特定代币的交易
const tokenTxList = await getTxListByAddress(
  '0x16ac14eF9d1834c31828f4958aa4a6693846C901',
  '1',
  '0xdac17f958d2ee523a2206206994597c13d831ec7' // USDT合约地址
);

console.log(`找到 ${txList.length} 条交易`);
```

## 相关文件

- `src/api/endpoint/txs/api.ts` - 原始实现
- `src/api/endpoint/txs/interface.ts` - 接口定义
- `src/api/request.ts` - JSON-RPC请求封装
- `src/api/host.ts` - API主机地址配置

