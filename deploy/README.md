# Paper AI 部署指南

本目录包含 Paper AI 项目的完整部署脚本和文档。

## 📁 目录结构

```
deploy/
├── scripts/              # 部署脚本
│   ├── init-db.sh       # 数据库初始化脚本
│   ├── deploy-backend.sh    # 后端部署脚本
│   ├── deploy-frontend.sh   # 用户端前端部署脚本
│   └── deploy-admin.sh      # 管理端前端部署脚本
├── DEPLOYMENT.md        # 详细部署文档
├── DOCKER.md           # Docker 部署指南
└── README.md           # 本文件
```

## 🚀 快速开始

### 方式一：传统部署

适合直接在服务器上部署的场景。

#### 1. 初始化数据库
```bash
./deploy/scripts/init-db.sh
```

#### 2. 部署后端
```bash
./deploy/scripts/deploy-backend.sh
```

#### 3. 部署前端
```bash
./deploy/scripts/deploy-frontend.sh  # 用户端
./deploy/scripts/deploy-admin.sh     # 管理端
```

详细说明请参考：[DEPLOYMENT.md](./DEPLOYMENT.md)

### 方式二：Docker 部署

适合快速部署和容器化环境。

```bash
# 配置环境变量
cp .env.docker.example .env.docker
vim .env.docker

# 启动所有服务
docker-compose --env-file .env.docker up -d
```

详细说明请参考：[DOCKER.md](./DOCKER.md)

## 📋 部署脚本说明

### init-db.sh - 数据库初始化

**功能**：
- 创建 MySQL 数据库
- 初始化表结构
- 创建默认管理员账号（可选）

**使用示例**：
```bash
./deploy/scripts/init-db.sh
```

交互式输入：
- MySQL 主机地址
- 端口号
- 用户名/密码
- 是否创建默认管理员

### deploy-backend.sh - 后端部署

**功能**：
- 安装依赖
- 构建项目
- 启动服务（开发模式/PM2）

**使用示例**：
```bash
./deploy/scripts/deploy-backend.sh
```

**部署模式**：
1. 开发模式（npm run dev）
2. 生产模式（PM2）
3. 仅构建

### deploy-frontend.sh - 用户端前端部署

**功能**：
- 安装依赖
- 构建项目
- 部署到 Nginx（可选）

**使用示例**：
```bash
./deploy/scripts/deploy-frontend.sh
```

**部署模式**：
1. 开发预览
2. 生产预览
3. 部署到 Nginx
4. 仅构建

### deploy-admin.sh - 管理端前端部署

**功能**：
- 安装依赖
- 构建项目
- 部署到 Nginx（可选）

**使用示例**：
```bash
./deploy/scripts/deploy-admin.sh
```

**注意**：管理后台建议使用独立域名和 IP 访问限制。

## 🔧 环境要求

### 必需环境
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **npm** 或 **yarn**

### 可选环境
- **PM2**: 生产环境进程管理
- **Nginx**: 反向代理和静态文件服务
- **Docker**: 容器化部署

## 📝 配置文件说明

### 后端配置 (backend/.env)
```env
# 数据库
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=paper_ai

# 服务器
PORT=3000
NODE_ENV=production

# JWT 密钥
JWT_SECRET=your-secret-key

# OpenRouter API
OPENROUTER_API_KEY=your-api-key
OPENROUTER_API_BASE=https://openrouter.ai/api/v1

# 代理配置（国内环境）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 前端配置
```env
# 用户端 (frontend/.env.local)
VITE_API_BASE_URL=http://your-domain.com/api

# 管理端 (admin-frontend/.env.local)
VITE_API_BASE_URL=http://your-domain.com/api
```

## 🌐 架构说明

```
用户端前端 (port 5173)
    ↓
管理端前端 (port 5174)
    ↓
后端 API (port 3000)
    ↓
MySQL 数据库 (port 3306)
```

### 推荐部署架构

```
Internet
    ↓
Nginx (80/443)
    ├─> /           → 用户端前端
    ├─> /admin      → 管理端前端
    └─> /api        → 后端 API
            ↓
        MySQL 数据库
```

## 🔐 安全建议

1. **数据库安全**
   - 修改默认密码
   - 限制远程访问
   - 定期备份

2. **API 安全**
   - 修改 JWT_SECRET
   - 配置 CORS
   - 启用 HTTPS

3. **管理后台安全**
   - 使用独立域名
   - 配置 IP 白名单
   - 强制 HTTPS
   - 修改默认管理员密码

4. **环境变量**
   - 不要提交 .env 文件到 Git
   - 使用强密码
   - 定期更新密钥

## 🐛 故障排查

### 数据库连接失败
```bash
# 检查 MySQL 服务
sudo systemctl status mysql

# 测试连接
mysql -h localhost -u root -p
```

### 后端启动失败
```bash
# 查看日志
pm2 logs paper-backend

# 检查端口占用
lsof -i :3000
```

### 前端 404 错误
```bash
# 检查 Nginx 配置
sudo nginx -t

# 查看错误日志
sudo tail -f /var/log/nginx/error.log
```

### Docker 相关问题
```bash
# 查看服务状态
docker-compose ps

# 查看日志
docker-compose logs -f

# 重启服务
docker-compose restart
```

## 📊 监控和维护

### PM2 监控
```bash
pm2 list          # 查看进程列表
pm2 monit         # 监控面板
pm2 logs          # 查看日志
```

### 日志管理
```bash
# 后端日志
pm2 logs paper-backend

# Nginx 日志
sudo tail -f /var/log/nginx/access.log
sudo tail -f /var/log/nginx/error.log

# Docker 日志
docker-compose logs -f
```

### 数据备份
```bash
# 数据库备份
mysqldump -u root -p paper_ai > backup_$(date +%Y%m%d).sql

# 恢复
mysql -u root -p paper_ai < backup.sql
```

## 🔄 更新部署

### 拉取最新代码
```bash
git pull origin main
```

### 更新后端
```bash
cd backend
npm install
npm run build
pm2 restart paper-backend
```

### 更新前端
```bash
# 用户端
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/paper-frontend/

# 管理端
cd admin-frontend
npm install
npm run build
sudo cp -r dist/* /var/www/paper-admin/
```

### Docker 更新
```bash
docker-compose --env-file .env.docker up -d --build
```

## 📚 相关文档

- [详细部署文档](./DEPLOYMENT.md)
- [Docker 部署指南](./DOCKER.md)
- [后端 API 文档](../backend/README.md)
- [项目主文档](../README.md)

## 🆘 获取帮助

如遇问题，请：

1. 查看相关文档
2. 检查日志输出
3. 提交 Issue：https://github.com/andy-zhangtao/paper/issues

---

**⚠️ 重要提示**：
- 首次部署后请修改默认管理员密码
- 生产环境务必配置 HTTPS
- 定期备份数据库
- 及时更新依赖包
