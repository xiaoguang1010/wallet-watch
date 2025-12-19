# 余额 API 限制说明

## 当前实现

### 支持的查询类型
- ✅ **实时余额查询** - 查询当前链上的最新余额状态
- ✅ **多链余额聚合** - 同时查询 BTC、ETH、TRON 的余额
- ✅ **代币价格计算** - 自动获取代币价格并计算 USD 价值

### 不支持的查询类型
- ❌ **历史余额查询** - 无法查询指定时间点（如七天前）的余额
- ❌ **区块高度查询** - 无法查询指定区块高度的余额
- ❌ **时间序列数据** - 无法获取余额变化历史

## 技术原因

### 1. API 方法限制

当前使用的 API 方法 `wallet.getTokenListByAddress` 只接受以下参数：

```javascript
{
  accountAddress: address,      // 地址
  addressType: null,
  caip2: BTC_CAIP2,             // 链标识
  riskLevel: 2,
  tokenStandard: ['NATIVE', 'ERC20'],
  position: ['Account']
}
```

**没有时间戳或区块高度参数**，因此只能查询当前最新状态。

### 2. 区块链查询的本质

区块链余额查询通常有两种方式：

#### 方式 1: 查询当前状态（当前实现）
- 直接查询链上当前最新状态
- 快速、简单
- 不需要历史数据

#### 方式 2: 查询历史状态（需要额外实现）
- 需要指定区块高度或时间戳
- 需要回放交易历史
- 需要额外的数据服务支持

## 如何实现历史余额查询

如果需要支持历史余额查询，需要以下改动：

### 方案 1: 使用区块高度查询

```javascript
// 需要修改 API 调用，添加区块高度参数
async function getTokenListByAddressAtBlock(address, blockHeight, riskLevel = 2) {
  const params = [{
    accountAddress: address,
    blockHeight: blockHeight,  // 新增：指定区块高度
    caip2: BTC_CAIP2,
    riskLevel: riskLevel,
    tokenStandard: ['NATIVE', 'ERC20'],
    position: ['Account'],
  }];
  
  return await sendJsonRpcRequest(WALLET_API_URL, 'wallet.getTokenListByAddress', params);
}
```

**前提条件**：
- 底层 API 服务需要支持 `blockHeight` 参数
- 或者需要切换到支持历史查询的 API 服务

### 方案 2: 使用时间戳查询

```javascript
// 需要将时间戳转换为区块高度
async function getTokenListByAddressAtTime(address, timestamp, riskLevel = 2) {
  // 1. 根据时间戳查找对应的区块高度
  const blockHeight = await getBlockHeightByTimestamp(timestamp);
  
  // 2. 使用区块高度查询余额
  return await getTokenListByAddressAtBlock(address, blockHeight, riskLevel);
}
```

**前提条件**：
- 需要区块浏览器 API 或索引服务
- 需要时间戳到区块高度的映射

### 方案 3: 本地存储历史快照

```javascript
// 定期快照余额数据
async function snapshotBalances(addresses) {
  const balances = await getMultiChainPortfolio(addresses);
  
  // 存储到数据库
  await db.balanceSnapshots.create({
    timestamp: new Date(),
    addresses: addresses,
    balances: balances,
  });
}

// 查询历史快照
async function getHistoricalBalances(addresses, date) {
  return await db.balanceSnapshots.findOne({
    where: {
      addresses: addresses,
      timestamp: {
        $lte: date,
        $gte: new Date(date.getTime() - 24 * 60 * 60 * 1000) // 24小时内
      }
    },
    orderBy: { timestamp: 'desc' }
  });
}
```

**优点**：
- 不依赖外部 API
- 可以自定义快照频率
- 查询速度快

**缺点**：
- 需要定期运行快照任务
- 需要存储空间
- 只能查询有快照的时间点

## 当前 API 服务能力

根据代码分析，当前使用的 API 服务（`wallet.getTokenListByAddress`）**只支持实时查询**，不支持历史查询。

### 验证方法

可以通过以下方式验证：

1. **查看 API 文档** - 检查 `wallet.getTokenListByAddress` 方法是否支持历史查询参数
2. **测试 API 调用** - 尝试传入时间戳或区块高度参数，看是否被接受
3. **联系 API 提供商** - 确认是否有历史查询的 API 端点

## 建议

### 如果不需要历史余额
- ✅ 当前实现已经足够
- ✅ 实时余额查询满足大部分需求

### 如果需要历史余额
1. **短期方案**：实现本地快照功能
   - 每天/每小时快照一次余额
   - 存储到数据库
   - 查询时从数据库读取

2. **长期方案**：集成支持历史查询的 API
   - 寻找支持历史查询的区块链数据服务
   - 或使用区块浏览器 API（如 Etherscan、Blockchain.com）
   - 实现时间戳到区块高度的转换

## 总结

**当前余额接口不支持查询七天前的余额状态**，这是正确的理解。

如果需要历史余额功能，需要：
1. 修改 API 调用以支持历史查询参数
2. 或实现本地快照机制
3. 或集成支持历史查询的第三方服务

