# Paper AI Assistant - 后端服务

基于 Express + TypeScript + MySQL 的 RESTful API 服务

## 🚀 快速开始

### 1. 安装依赖

```bash
npm install
```

### 2. 配置环境变量

复制 `.env.example` 为 `.env` 并填写配置：

```bash
cp .env.example .env
```

### 3. 初始化数据库

```bash
# 导入数据库结构
mysql -u root -p < database/schema.sql
```

### 4. 启动开发服务器

```bash
npm run dev
```

服务器默认运行在: http://localhost:3000

## 📚 API 文档

### 用户认证

#### 注册（仅限edu.cn邮箱）
```http
POST /api/auth/register
Content-Type: application/json

{
  "email": "student@university.edu.cn",
  "password": "Password123",
  "phone": "13800138000"  // 可选
}
```

#### 登录
```http
POST /api/auth/login
Content-Type: application/json

{
  "email": "student@university.edu.cn",
  "password": "Password123"
}
```

#### 刷新Token
```http
POST /api/auth/refresh
Content-Type: application/json

{
  "refresh_token": "your_refresh_token"
}
```

## 🔒 邮箱注册限制

**重要：** 本系统仅允许使用 **edu.cn 后缀的教育邮箱** 进行注册。

验证规则：
- 邮箱必须以 `.edu.cn` 结尾
- 例如：`student@tsinghua.edu.cn`、`teacher@pku.edu.cn`
- 非教育邮箱会返回错误：`只允许使用edu.cn后缀的教育邮箱注册`

## 🗄️ 数据库结构

- `users` - 用户表
- `papers` - 论文表
- `credit_transactions` - 积分流水表
- `recharge_packages` - 充值套餐表
- `recharge_orders` - 充值订单表
- `ai_usage_logs` - AI使用记录表
- `paper_versions` - 论文版本历史表

## 🛠️ 技术栈

- **Node.js** + **Express** - Web框架
- **TypeScript** - 类型安全
- **MySQL** - 数据库
- **JWT** - 身份认证
- **bcryptjs** - 密码加密
- **axios** - HTTP客户端（OpenRouter调用）

## 📝 开发命令

```bash
# 开发模式（热重载）
npm run dev

# 构建生产版本
npm run build

# 启动生产服务器
npm start
```

## 🔑 环境变量说明

| 变量名 | 说明 | 默认值 |
|--------|------|--------|
| PORT | 服务端口 | 3000 |
| DB_HOST | 数据库地址 | localhost |
| DB_PORT | 数据库端口 | 3306 |
| DB_USER | 数据库用户 | root |
| DB_PASSWORD | 数据库密码 | - |
| DB_NAME | 数据库名称 | paper_ai |
| JWT_SECRET | JWT密钥 | - |
| OPENROUTER_API_KEY | OpenRouter API密钥 | - |

## ⚠️ 注意事项

1. **密码强度要求**：
   - 至少8位
   - 必须包含大写字母
   - 必须包含小写字母
   - 必须包含数字

2. **JWT Token有效期**：
   - Access Token: 7天
   - Refresh Token: 30天

3. **初始积分**：
   - 新用户注册赠送100积分

## 📄 License

MIT
