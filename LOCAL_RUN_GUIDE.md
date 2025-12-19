# 本地运行 wallet-watch 指南

## 当前状态

✅ 开发服务器已在运行（进程 ID: 99718）
✅ 端口 3000 已被占用
⚠️ 需要确认 `.env.local` 文件是否存在并配置正确

## 启动步骤

### 1. 检查环境变量

确保项目根目录下有 `.env.local` 文件，内容如下：

```bash
# Environment: development, production, test
NODE_ENV=development

# Database Connection (MySQL)
DATABASE_URL="mysql://root:password@localhost:3306/wallet_watch"

# Application URL
NEXT_PUBLIC_APP_URL="http://localhost:3000"

# WebAuthn (Passkey) Settings
RP_ID="localhost"
RP_NAME="Wallet Watch"
RP_ORIGIN="http://localhost:3000"

# Session Security (必须至少 32 个字符)
SESSION_SECRET="change-this-to-a-secure-random-string-minimum-32-chars"
```

**注意**: 请根据你的实际数据库配置修改 `DATABASE_URL`。

### 2. 安装依赖（如果需要）

```bash
npm install
```

### 3. 启动开发服务器

如果服务器未运行，使用以下命令：

```bash
npm run dev
```

如果服务器已在运行，但需要重启（例如修改了环境变量），可以：

1. 停止当前服务器（按 `Ctrl+C` 或找到进程并终止）
2. 重新运行 `npm run dev`

### 4. 访问应用

开发服务器启动后，访问：

- **主页**: http://localhost:3000
- **中文主页**: http://localhost:3000/zh
- **测试余额页面**: http://localhost:3000/zh/test-balance
- **测试 Dashboard**: http://localhost:3000/zh/test-case-dashboard
- **Dashboard** (需要登录): http://localhost:3000/zh/dashboard

## 检查服务器状态

### 查看运行中的进程

```bash
ps aux | grep "next dev"
```

### 检查端口占用

```bash
lsof -ti:3000
```

### 测试服务器响应

```bash
curl http://localhost:3000
```

## 常见问题

### 1. "Invalid environment variables" 错误

**原因**: 缺少或配置错误的环境变量

**解决**:
- 确保 `.env.local` 文件存在
- 检查所有必需的环境变量都已设置
- 确保 `SESSION_SECRET` 至少 32 个字符
- 重启开发服务器

### 2. 数据库连接错误

**原因**: `DATABASE_URL` 配置不正确或数据库未运行

**解决**:
- 检查 MySQL 服务是否运行
- 确认数据库名称、用户名、密码正确
- 确保数据库已创建

### 3. 端口已被占用

**原因**: 3000 端口已被其他进程使用

**解决**:
```bash
# 查找占用端口的进程
lsof -ti:3000

# 终止进程（替换 PID 为实际进程 ID）
kill -9 <PID>

# 或者使用其他端口
PORT=3001 npm run dev
```

### 4. 模块未找到错误

**原因**: 依赖未安装

**解决**:
```bash
npm install
```

## 开发命令

- `npm run dev` - 启动开发服务器
- `npm run build` - 构建生产版本
- `npm run start` - 启动生产服务器（需要先 build）
- `npm run lint` - 运行代码检查

## 测试页面

项目包含以下测试页面（无需登录）：

1. **测试余额页面**: `/zh/test-balance`
   - 测试余额 API 和显示功能
   - 显示 BTC、ETH、TRON 的余额

2. **测试 Dashboard**: `/zh/test-case-dashboard`
   - 测试新的 dashboard 样式
   - 使用 mock 数据

## 下一步

1. 确保 `.env.local` 文件存在并配置正确
2. 如果服务器未运行，执行 `npm run dev`
3. 访问 http://localhost:3000/zh 查看应用
4. 登录后访问 dashboard 测试余额集成功能

