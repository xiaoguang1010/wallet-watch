# 提醒系统实现文档

## 已完成功能

### 1. 数据库 Schema ✅

创建了三个数据表：

- **`balance_snapshots`** - 余额快照表
  - 存储每个地址的余额历史记录
  - 包含完整的代币信息和总价值
  - 支持时间范围查询

- **`alert_rules`** - 提醒规则表
  - 存储用户配置的提醒策略
  - 支持四种规则类型
  - 可启用/禁用

- **`alerts`** - 提醒记录表
  - 存储触发的提醒
  - 包含详细信息
  - 支持已读/未读状态

### 2. 余额快照服务 ✅

`src/modules/alerts/balance-snapshot.service.ts`

- ✅ `createBalanceSnapshot` - 创建单个快照
- ✅ `createBalanceSnapshots` - 批量创建快照
- ✅ `getLatestSnapshot` - 获取最新快照
- ✅ `getSnapshotsInTimeRange` - 获取时间范围内的快照
- ✅ `getLatestSnapshotsForCase` - 获取 case 的所有最新快照

### 3. 提醒检测服务 ✅

`src/modules/alerts/alert-detection.service.ts`

实现了四种提醒检测：

- ✅ **大额转出检测** (`detectLargeOutflow`)
  - 检测单笔转出 ≥ 阈值
  - 严重程度: `error`（安全型）

- ✅ **大额转入检测** (`detectLargeInflow`)
  - 检测单笔转入 ≥ 阈值
  - 严重程度: `info`（信息型）

- ✅ **余额异常波动检测** (`detectBalanceVolatility`)
  - 检测指定时间窗口内的余额变化百分比
  - 支持自定义时间窗口和百分比阈值
  - 严重程度: `warning`

- ✅ **资产清空检测** (`detectAssetEmptied`)
  - 检测余额从非零变为接近0
  - 检测短时间内余额大幅减少（≥80%/90%）
  - 严重程度: `error`

### 4. API 路由 ✅

`src/app/api/cases/[caseId]/snapshot/route.ts`

- ✅ POST `/api/cases/[caseId]/snapshot`
  - 创建余额快照
  - 自动触发提醒检测
  - 返回触发的提醒列表

### 5. Alerts Actions ✅

`src/modules/alerts/alerts.actions.ts`

- ✅ `getCaseAlerts` - 获取 case 的所有提醒
- ✅ `getUnreadAlertCount` - 获取未读提醒数量
- ✅ `markAlertAsRead` - 标记单个提醒为已读
- ✅ `markAllAlertsAsRead` - 标记所有提醒为已读
- ✅ `createAlertRule` - 创建提醒规则
- ✅ `getCaseAlertRules` - 获取 case 的所有规则
- ✅ `updateAlertRule` - 更新提醒规则
- ✅ `deleteAlertRule` - 删除提醒规则

### 6. UI 组件 ✅

#### AlertsList 组件
`src/components/alerts/alerts-list.tsx`

- ✅ 显示提醒列表
- ✅ 按严重程度显示不同图标和颜色
- ✅ 支持标记为已读
- ✅ 自动刷新（每30秒）
- ✅ 显示未读数量

#### CaseDashboardView 集成
`src/components/cases/case-dashboard-view.tsx`

- ✅ 在获取余额后自动创建快照
- ✅ 集成 AlertsList 组件显示提醒

## 待完成功能

### 1. 提醒规则配置 UI ⏳

需要创建以下组件：

- **AlertRulesDialog** - 提醒规则配置对话框
  - 创建/编辑提醒规则
  - 配置规则参数（阈值、时间窗口等）
  - 启用/禁用规则

- **AlertRulesList** - 提醒规则列表
  - 显示所有已配置的规则
  - 支持编辑和删除

### 2. 数据库迁移 ⏳

需要创建数据库迁移文件：

```sql
-- 创建 balance_snapshots 表
-- 创建 alert_rules 表
-- 创建 alerts 表
```

### 3. 默认规则创建 ⏳

在创建 case 时，可以自动创建默认的提醒规则：

- 大额转出：≥ 1000 USDT
- 大额转入：≥ 1000 USDT
- 余额波动：15分钟内 ≥ 20%，1小时内 ≥ 30%
- 资产清空：余额 < 0.01 USDT 或减少 ≥ 80%

## 使用流程

### 1. 自动快照

当用户访问 case dashboard 时：
1. 获取当前余额
2. 自动创建余额快照
3. 检测是否触发提醒规则
4. 如有触发，创建提醒记录

### 2. 查看提醒

在 case dashboard 页面：
- 显示 AlertsList 组件
- 显示所有未读和已读提醒
- 可以标记为已读

### 3. 配置规则（待实现）

- 在 case 设置页面配置提醒规则
- 设置阈值和参数
- 启用/禁用规则

## 数据流

```
用户访问 Dashboard
    ↓
获取余额数据
    ↓
创建余额快照 (POST /api/cases/[caseId]/snapshot)
    ↓
检测提醒规则 (detectAlerts)
    ↓
如有触发 → 创建提醒记录
    ↓
显示在 AlertsList 组件中
```

## 提醒规则配置示例

### 大额转出
```json
{
  "ruleType": "large_outflow",
  "name": "大额转出提醒",
  "config": {
    "threshold": 1000
  }
}
```

### 大额转入
```json
{
  "ruleType": "large_inflow",
  "name": "大额转入提醒",
  "config": {
    "threshold": 1000
  }
}
```

### 余额波动
```json
{
  "ruleType": "balance_volatility",
  "name": "15分钟余额波动",
  "config": {
    "timeWindow": 15,
    "percentage": 20
  }
}
```

### 资产清空
```json
{
  "ruleType": "asset_emptied",
  "name": "资产清空提醒",
  "config": {
    "threshold": 0.01,
    "percentage": 80
  }
}
```

## 下一步

1. 创建数据库迁移文件
2. 实现提醒规则配置 UI
3. 添加默认规则创建逻辑
4. 测试提醒检测功能
5. 优化性能和用户体验

