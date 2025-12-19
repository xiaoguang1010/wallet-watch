# Multi-Chain Balance API

多链余额查询 API - 支持 BTC、ETH、TRON 三个链的余额查询和总价值计算。

## 快速开始

API 已集成到 Next.js 项目中，无需额外配置。启动开发服务器后即可使用：

```bash
npm run dev
```

## API 端点

### 1. 查询单个链余额

#### Bitcoin

```bash
GET /api/v1/balance/btc/:address
```

示例：

```bash
curl http://localhost:3000/api/v1/balance/btc/bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc
```

#### Ethereum

```bash
GET /api/v1/balance/eth/:address
```

示例：

```bash
curl http://localhost:3000/api/v1/balance/eth/0x16ac14eF9d1834c31828f4958aa4a6693846C901
```

#### TRON

```bash
GET /api/v1/balance/tron/:address
```

示例：

```bash
curl http://localhost:3000/api/v1/balance/tron/TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v
```

### 2. 查询多链资产组合

#### GET 方式

```bash
GET /api/v1/portfolio/multi?btc=<address>&eth=<address>&tron=<address>
```

示例：

```bash
curl "http://localhost:3000/api/v1/portfolio/multi?btc=bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc&eth=0x16ac14eF9d1834c31828f4958aa4a6693846C901&tron=TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v"
```

#### POST 方式（批量查询）

```bash
POST /api/v1/portfolio/batch
Content-Type: application/json
```

请求体：

```json
{
  "addresses": [
    { "chain": "btc", "address": "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc" },
    { "chain": "eth", "address": "0x16ac14eF9d1834c31828f4958aa4a6693846C901" },
    { "chain": "tron", "address": "TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v" }
  ]
}
```

示例：

```bash
curl -X POST http://localhost:3000/api/v1/portfolio/batch \
  -H "Content-Type: application/json" \
  -d '{
    "addresses": [
      {"chain": "btc", "address": "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc"},
      {"chain": "eth", "address": "0x16ac14eF9d1834c31828f4958aa4a6693846C901"},
      {"chain": "tron", "address": "TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v"}
    ]
  }'
```

### 3. 查询 Group1 钱包余额（预定义地址）

```bash
GET /api/group1-balances
```

示例：

```bash
curl http://localhost:3000/api/group1-balances
```

## 响应格式

### 成功响应

单个链：

```json
{
  "success": true,
  "data": {
    "chain": "BITCOIN",
    "tokens": [
      {
        "symbol": "BTC",
        "name": "Bitcoin",
        "address": "0x0000000000000000000000000000000000000000",
        "balance": "103733460",
        "formattedBalance": "1.0373346",
        "decimals": 8,
        "price": 85171.44,
        "usdValue": 88351.28,
        "usdValueFormatted": "88351.28",
        "tokenStandard": "NATIVE"
      }
    ],
    "totalValue": 88351.28,
    "totalValueFormatted": "88351.28"
  }
}
```

多链：

```json
{
  "success": true,
  "data": {
    "chains": {
      "btc": { ... },
      "eth": { ... },
      "tron": { ... }
    },
    "totalValue": 200792.01,
    "totalValueFormatted": "200792.01"
  }
}
```

### 错误响应

```json
{
  "success": false,
  "error": "Error message"
}
```

## 目录结构

```
src/balances/
├── src/
│   ├── api/           # API 客户端
│   │   ├── btc.js
│   │   ├── eth.js
│   │   ├── tron.js
│   │   ├── httpClient.js
│   │   └── prices.js
│   └── services/      # 业务逻辑
│       ├── balance.js
│       └── portfolio.js
└── README.md
```

## 在代码中使用

### 服务端使用

```typescript
import {
  getGroup1Balances,
  getSingleChainBalance,
  getMultiChainPortfolio,
} from "@/lib/balance-service";

// 获取 Group1 钱包余额
const result = await getGroup1Balances();

// 获取单个链余额
const btcBalance = await getSingleChainBalance(
  "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc",
  "BTC"
);

// 获取多链资产组合
const portfolio = await getMultiChainPortfolio({
  btc: "bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc",
  eth: "0x16ac14eF9d1834c31828f4958aa4a6693846C901",
  tron: "TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v",
});
```

### 客户端使用

```typescript
// 在 React 组件中
const response = await fetch("/api/group1-balances");
const result = await response.json();

if (result.success) {
  console.log("Total value:", result.data.totalValue);
  console.log("BTC balance:", result.data.chains.btc);
}
```

## 功能特性

- ✅ 支持 BTC、ETH、TRON 三个链
- ✅ 实时价格获取
- ✅ 自动计算总价值（USD）
- ✅ 批量查询支持
- ✅ 错误处理
- ✅ 格式化余额显示

## 测试页面

访问测试页面查看余额显示效果：

```
http://localhost:3000/zh/test-balance
```

## 依赖项

- `bignumber.js` - 大数计算
- Next.js API Routes - API 路由

所有依赖已包含在主项目的 `package.json` 中。
