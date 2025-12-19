# 余额集成功能测试说明

## 已实现的功能

### 1. API 路由 (`/api/cases/[caseId]/balances`)
- ✅ 获取指定 case 的所有监控地址
- ✅ 使用批量查询获取多链余额数据
- ✅ 处理用户认证和权限验证
- ✅ 返回格式化的余额数据

### 2. Case Dashboard View 组件更新

#### 2.1 余额数据获取
- ✅ 使用 `useEffect` 在组件加载时自动获取余额数据
- ✅ 处理加载状态和错误状态
- ✅ 支持 30 秒超时保护

#### 2.2 监控地址列表显示
- ✅ 显示每个地址的链类型和网络
- ✅ 显示地址字符串
- ✅ **显示每个地址的总价值（Total Value）**
- ✅ **显示每个地址的所有代币列表（过滤掉 < 1 USDT 的代币）**
- ✅ 显示每个代币的 USD 价值

#### 2.3 资产总估值更新
- ✅ 根据实际余额数据自动计算总估值
- ✅ 实时更新显示（替换原来的 mock 数据）
- ✅ 显示加载状态

#### 2.4 资产分布图表更新
- ✅ 根据实际余额数据自动计算资产分布
- ✅ 按代币类型聚合所有地址的余额
- ✅ 计算每个代币的占比（百分比）
- ✅ 显示前 5 个主要资产
- ✅ 实时更新饼图和图例

### 3. 数据处理逻辑

#### 3.1 BTC 处理
- ✅ 处理 `tokens` 为空的情况
- ✅ 从 `allTokens` 或 `mainToken` 获取数据
- ✅ 过滤余额为 0 的代币

#### 3.2 ETH/TRON 处理
- ✅ 过滤掉 USD 价值小于 1 USDT 的代币
- ✅ 只显示有意义的代币余额

#### 3.3 资产分布计算
- ✅ 聚合所有地址的所有代币
- ✅ 按代币符号（symbol）分组
- ✅ 计算每个代币的总 USD 价值
- ✅ 转换为百分比占比
- ✅ 排序并取前 5 名

## 测试方法

### 方法 1: 使用测试页面
访问 `http://localhost:3000/zh/test-case-dashboard`
- 使用 mock 数据，但会尝试调用 API
- 如果 API 调用失败，会显示 "No balance data"

### 方法 2: 使用实际的 Dashboard
1. 登录系统
2. 创建一个 case 并添加监控地址
3. 访问该 case 的详情页面
4. 观察以下内容：
   - 监控地址列表是否显示余额信息
   - 资产总估值是否更新为实际值
   - 资产分布图表是否显示实际数据

### 方法 3: 直接测试 API
```bash
# 需要有效的 session cookie
curl -X GET "http://localhost:3000/api/cases/{caseId}/balances" \
  -H "Cookie: session_user_id={userId}"
```

## 预期行为

1. **加载时**：
   - 显示加载动画
   - 资产总估值显示 "Loading..."

2. **加载成功后**：
   - 监控地址列表显示每个地址的余额信息
   - 资产总估值更新为实际总价值
   - 资产分布图表显示实际的代币分布

3. **加载失败时**：
   - 显示 "No balance data"
   - 资产总估值显示 $0.00
   - 资产分布图表显示 "暂无资产数据"

## 注意事项

1. **API 认证**：API 路由需要有效的用户 session
2. **超时设置**：API 调用有 30 秒超时限制
3. **代币过滤**：ETH 和 TRON 链上价值 < 1 USDT 的代币会被自动过滤
4. **BTC 特殊处理**：BTC 可能没有 `tokens` 数组，需要从 `allTokens` 或 `mainToken` 获取
5. **多地址支持**：当前实现中，如果同一链有多个地址，只会查询第一个地址的余额（`getBatchPortfolio` 的限制）

## 代码文件

- `src/app/api/cases/[caseId]/balances/route.ts` - API 路由
- `src/components/cases/case-dashboard-view.tsx` - Dashboard 组件
- `src/lib/balance-service.ts` - 余额服务（已存在）

