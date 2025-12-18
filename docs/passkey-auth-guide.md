# Passkey 认证实现指南 (Wallet Watch)

本文档详细说明了本项目中 Passkey (WebAuthn) 注册与登录功能的实现原理、流程以及数据库设计。

## 1. 核心技术
- **标准**: FIDO2 / WebAuthn
- **库**: `@simplewebauthn/server` (后端), `@simplewebauthn/browser` (前端)
- **数据库**: MySQL 8.0
- **ORM**: Drizzle ORM

---

## 2. 身份验证流程设计

### 2.1 注册流程 (Registration)
目标：用户创建账号并绑定第一个 Passkey（如 TouchID, FaceID 或 YubiKey）。

1.  **前端发起请求**: 用户输入用户名，点击“注册”。客户端调用 `useAuth().startRegistration(username)`。
2.  **后端生成选项 (Generate Options)**:
    -   API: `generateRegistrationOptions`
    -   逻辑:
        -   检查用户是否存在（不存在则创建临时用户记录）。
        -   查询该用户已有的 Passkey（避免重复注册同一个）。
        -   调用 `SimpleWebAuthn` 生成随机 `challenge` (挑战码) 和注册选项。
        -   **关键**: 将 `challenge` 保存到数据库 `users.currentChallenge` 字段。
    -   返回: JSON 格式的注册选项。
3.  **前端签名 (Sign)**:
    -   浏览器调用 `navigator.credentials.create(options)`。
    -   用户验证生物特征或插入 Key。
    -   浏览器生成公私钥对，私钥保存在安全芯片中，公钥和签名数据返回给 JS。
4.  **后端验证 (Verify)**:
    -   前端将签名结果提交到后端。
    -   API: `verifyRegistration`
    -   逻辑:
        -   从数据库取出该用户的 `currentChallenge`。
        -   调用 `SimpleWebAuthn` 验证签名是否合法、Challenge 是否匹配、Origin 是否正确。
        -   **关键**: 验证通过后，将 Public Key (公钥)、Credential ID、Counter (计数器) 提取出来。
        -   写入 `authenticators` 表。
        -   清空 `users.currentChallenge`。
5.  **完成**: 用户即视为已登录。

### 2.2 登录流程 (Login)
目标：用户使用已绑定的 Passkey 登录。

1.  **前端发起请求**: 用户点击“登录”或输入用户名。客户端调用 `useAuth().startAuthentication(username)`。
2.  **后端生成选项 (Generate Options)**:
    -   API: `generateLoginOptions`
    -   逻辑:
        -   如果提供了用户名，查出该用户的所有 `credentialID` 放入 `allowCredentials` 列表（告知浏览器只允许这些 Key 登录）。
        -   生成随机 `challenge`。
        -   保存 `challenge` 到数据库。
    -   返回: 登录选项。
3.  **前端签名 (Sign)**:
    -   浏览器调用 `navigator.credentials.get(options)`。
    -   用户验证。
    -   浏览器使用私钥对 Challenge 签名。
4.  **后端验证 (Verify)**:
    -   前端提交签名结果。
    -   API: `verifyLogin`
    -   逻辑:
        -   根据结果中的 `id` (即 Credential ID) 在 `authenticators` 表中查找对应的公钥。
        -   取出用户对应的 `currentChallenge`。
        -   验证签名。
        -   **防重放攻击**: 检查并更新 `authenticators.counter` (计数器必须增加)。
        -   清空 Challenge。
5.  **完成**: 颁发 Session Cookie (通过 `next/headers` 设置)。

---

## 3. 数据库设计 (Schema)

### 3.1 用户表 (`users`)
存储用户的基本信息和当前的认证挑战。

| 字段名 | 类型 (MySQL) | 说明 |
| :--- | :--- | :--- |
| `id` | `varchar(36)` | 主键，UUID。唯一标识用户。 |
| `username` | `varchar(255)` | 用户名，唯一索引。用于登录查找。 |
| `display_name` | `varchar(255)` | 显示名称（昵称）。 |
| `current_challenge`| `varchar(255)` | **关键字段**。临时存储 WebAuthn 的 Challenge。每次流程开始时写入，验证结束后清空。 |
| `created_at` | `timestamp` | 创建时间。 |
| `updated_at` | `timestamp` | 更新时间。 |

### 3.2 认证器/Passkey 表 (`authenticators`)
存储用户绑定的公钥凭证。**一个用户可以有多个 Passkey**。

| 字段名 | 类型 (MySQL) | 说明 |
| :--- | :--- | :--- |
| `id` | `varchar(36)` | 主键，UUID。 |
| `user_id` | `varchar(36)` | 外键，关联 `users.id`。 |
| `credential_id` | `text` | **关键字段**。WebAuthn 生成的凭证 ID (Base64URL 编码)。用于在登录时索引公钥。因为长度可能很长，使用 Text 类型。 |
| `credential_public_key` | `text` | **关键字段**。用户的公钥 (Base64 编码 storage)。**私钥永远只在用户设备里**。后端用此公钥验证签名。 |
| `counter` | `bigint` | **安全字段**。防重放计数器。每次验证成功后，此数值必须大于数据库中的旧值，并更新。 |
| `transports` | `varchar(255)` | 传输方式 (如 `usb, nfc, ble, internal`)。用于前端 UI 提示或优化。 |
| `created_at` | `timestamp` | 绑定时间。 |

---

## 4. 关键代码路径
- **后端服务**: `src/modules/auth/auth.service.ts` (包含核心的 `generate` 和 `verify` 逻辑)
- **数据库定义**:
    - `src/data/schema/users.ts`
    - `src/data/schema/authenticators.ts`
- **前端 Hooks**: `src/modules/auth/use-auth.ts`
- **Server Actions**: `src/modules/auth/auth.actions.ts`

## 5. 常见问题 (Troubleshooting)
如果在开发中遇到问题，请参考以下常见情况：
1.  **User or challenge not found**: 检查前端是否正确回传了 Cookie，或 `userId` 格式是否一致（UUID vs Base64）。
2.  **Verification timeout / Not allowed**: 浏览器弹窗被取消，或未在 `localhost`/`https` 环境下运行。
3.  **Invalid signature**: 公钥存储格式错误（需确保是 Base64 还原后的 Uint8Array）。
