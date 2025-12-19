# 风险地址测试指南

## 测试方法

### 方法 1: 使用测试页面（推荐）

访问测试页面：`http://localhost:3000/zh/test-risk-address`

1. 选择链类型（ETH/BTC/TRON）
2. 输入要测试的地址
3. 点击"测试"按钮
4. 查看 API 返回的完整数据结构
5. 特别关注风险相关字段（`riskLevel`、`risk` 等）

### 方法 2: 直接调用 API

```bash
# 测试 ETH 地址
curl http://localhost:3000/api/v1/balance/eth/0x16ac14eF9d1834c31828f4958aa4a6693846C901

# 测试 BTC 地址
curl http://localhost:3000/api/v1/balance/btc/bc1qq2mvrp4g3ugd424dw4xv53rgsf8szkrv853jrc

# 测试 TRON 地址
curl http://localhost:3000/api/v1/balance/tron/TH1tFgoYEsPtz11vEbbSfiERUiVrcNTS3v
```

### 方法 3: 在浏览器控制台测试

打开浏览器开发者工具，在 Console 中运行：

```javascript
// 测试 ETH 地址
fetch("/api/v1/balance/eth/0x16ac14eF9d1834c31828f4958aa4a6693846C901")
  .then((r) => r.json())
  .then((data) => {
    console.log("完整响应:", data);
    console.log("风险字段:", {
      riskLevel: data.data?.riskLevel,
      risk: data.data?.risk,
      allKeys: Object.keys(data.data || {}),
    });
  });
```

## 需要确认的信息

### 1. 风险字段的位置

请检查 API 返回的数据中，风险信息在哪个位置：

- **地址级别**：整个地址的风险等级

  ```json
  {
    "data": {
      "riskLevel": 3,
      "risk": 3
      // 或其他字段名
    }
  }
  ```

- **代币级别**：每个代币的风险等级
  ```json
  {
    "data": {
      "tokens": [
        {
          "riskLevel": 3
          // ...
        }
      ]
    }
  }
  ```

### 2. 风险字段的名称

可能的字段名：

- `riskLevel`
- `risk`
- `riskScore`
- `riskRating`
- `addressRisk`
- 或其他名称

### 3. 风险等级的值

风险等级通常是数字，请确认：

- 范围是多少？（例如：1-5，0-10）
- 每个等级的含义是什么？

## 测试步骤

1. **使用测试页面或 API 测试几个地址**

   - 包括正常地址
   - 包括已知的风险地址（如果你有的话）

2. **查看返回的数据结构**

   - 检查是否有风险相关字段
   - 记录字段名称和值

3. **提供测试结果**

   - 告诉我风险字段的名称
   - 告诉我风险字段的位置（地址级别还是代币级别）
   - 提供几个测试地址的响应示例

4. **根据结果调整代码**
   - 如果字段名不同，我会调整提取逻辑
   - 如果位置不同，我会调整数据访问路径

## 如果你有风险地址

如果你有已知的风险地址，请提供：

1. **地址列表**

   - ETH 地址（如果有）
   - BTC 地址（如果有）
   - TRON 地址（如果有）

2. **预期风险等级**

   - 每个地址的预期风险等级
   - 这样我可以验证检测逻辑是否正确

3. **测试场景**
   - 新增地址场景
   - 风险等级变化场景

## 当前代码的假设

当前代码假设：

- 风险字段在地址级别（不在代币级别）
- 字段名可能是 `riskLevel` 或 `risk`
- 风险等级是数字（1-5）

如果实际情况不同，我会根据你提供的测试结果进行调整。
