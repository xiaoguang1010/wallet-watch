# 地址风险等级提醒功能实现

## 功能说明

实现了地址风险等级检测和提醒功能，当检测到地址存在风险时，会自动触发提醒。

## 实现的功能

### 1. 风险等级检测 ✅

- 从余额 API 返回的数据中提取风险信息（`riskLevel` 或 `risk` 字段）
- 支持检测新增地址（首次添加的地址）
- 支持检测指定风险等级的地址

### 2. 提醒规则配置 ✅

新增了 `address_risk` 提醒规则类型：

```typescript
{
  ruleType: 'address_risk',
  name: '地址风险提醒',
  config: {
    riskLevels: [3, 4, 5],  // 需要提醒的风险等级列表
    alertOnNewAddress: true // 新增地址时是否立即提醒
  }
}
```

### 3. 风险等级定义

- **1**: 低风险
- **2**: 中低风险
- **3**: 中风险
- **4**: 中高风险
- **5**: 高风险

### 4. 提醒严重程度

- 风险等级 >= 4: `error` 级别（红色）
- 风险等级 < 4: `warning` 级别（黄色）
- 新增地址: `warning` 级别（黄色）

## 数据流

```
获取余额数据
    ↓
提取风险等级 (riskLevel/risk)
    ↓
保存到余额快照
    ↓
检测风险提醒规则
    ↓
如有风险 → 创建提醒记录
    ↓
显示在提醒列表中
```

## 代码变更

### 1. Schema 更新

- `src/modules/alerts/alert-rules.schema.ts`
  - 添加 `addressRiskRuleSchema`
  - 添加 `address_risk` 规则类型

### 2. 检测服务更新

- `src/modules/alerts/alert-detection.service.ts`
  - 添加 `detectAddressRisk` 函数
  - 支持检测新增地址
  - 支持检测指定风险等级

### 3. UI 组件更新

- `src/components/cases/case-dashboard-view.tsx`
  - 提取并保存风险等级信息
  - 在快照中包含风险等级

## 使用方式

### 创建风险提醒规则

```typescript
await createAlertRule({
  caseId: "xxx",
  ruleType: "address_risk",
  name: "高风险地址提醒",
  config: {
    riskLevels: [4, 5], // 检测中高风险和高风险
    alertOnNewAddress: true, // 新增地址时也提醒
  },
  enabled: true,
});
```

### 默认规则建议

```json
{
  "ruleType": "address_risk",
  "name": "地址风险提醒",
  "config": {
    "riskLevels": [3, 4, 5],
    "alertOnNewAddress": true
  }
}
```

## 注意事项

1. **API 返回格式**

   - 需要确认余额 API 返回的数据中是否包含 `riskLevel` 或 `risk` 字段
   - 如果 API 返回的字段名不同，需要调整提取逻辑

2. **新增地址检测**

   - 通过检查是否有历史快照来判断是否为新增地址
   - 如果配置了 `alertOnNewAddress: true`，新增地址会立即触发提醒

3. **风险等级来源**
   - 风险等级应该来自余额 API 的返回数据
   - 如果 API 不返回风险信息，需要联系 API 提供商或使用其他数据源

## 待确认

1. ✅ 余额 API 是否返回风险字段？
2. ✅ 风险字段的名称是什么？（`riskLevel` 还是 `risk`？）
3. ✅ 风险等级的具体含义是什么？
4. ⏳ 是否需要从其他 API 获取风险信息？

## 下一步

1. 测试 API 返回数据，确认风险字段的存在和格式
2. 根据实际 API 响应调整风险提取逻辑
3. 创建风险提醒规则配置 UI
4. 测试风险检测和提醒功能
