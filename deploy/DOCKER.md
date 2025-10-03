# Docker 部署指南

使用 Docker Compose 快速部署 Paper AI 全栈应用。

## 📋 前置要求

- Docker >= 20.10
- Docker Compose >= 2.0

## 🚀 快速开始

### 1. 克隆项目

```bash
git clone https://github.com/andy-zhangtao/paper.git
cd paper
```

### 2. 配置环境变量

```bash
cp .env.docker.example .env.docker
```

编辑 `.env.docker` 文件，修改以下配置：

```env
# 数据库密码（必改）
DB_PASSWORD=your_secure_password

# JWT 密钥（必改）
JWT_SECRET=your-random-secret-key

# OpenRouter API Key（必填）
OPENROUTER_API_KEY=sk-or-v1-xxx

# 代理配置（国内环境必需）
HTTP_PROXY=http://host.docker.internal:7890
HTTPS_PROXY=http://host.docker.internal:7890
```

### 3. 启动所有服务

```bash
docker-compose --env-file .env.docker up -d
```

### 4. 访问应用

- **用户端**: http://localhost:5173
- **管理后台**: http://localhost:5174
- **后端 API**: http://localhost:3000

## 📦 服务说明

### 服务列表

| 服务名 | 端口 | 说明 |
|--------|------|------|
| mysql | 3306 | MySQL 数据库 |
| backend | 3000 | Node.js 后端服务 |
| frontend | 5173 | 用户端前端（Nginx） |
| admin-frontend | 5174 | 管理端前端（Nginx） |
| nginx | 80/443 | 反向代理（可选） |

### 数据持久化

数据库数据存储在 Docker Volume `mysql_data` 中。

## 🔧 常用命令

### 查看服务状态
```bash
docker-compose ps
```

### 查看日志
```bash
# 所有服务
docker-compose logs -f

# 特定服务
docker-compose logs -f backend
docker-compose logs -f mysql
```

### 重启服务
```bash
# 重启所有服务
docker-compose restart

# 重启特定服务
docker-compose restart backend
```

### 停止服务
```bash
docker-compose down
```

### 停止并删除数据
```bash
docker-compose down -v
```

## 🔄 更新部署

### 拉取最新代码
```bash
git pull origin main
```

### 重新构建并启动
```bash
docker-compose --env-file .env.docker up -d --build
```

## 🛠️ 单独构建服务

### 构建后端
```bash
docker build -t paper-backend ./backend
```

### 构建用户端前端
```bash
docker build -t paper-frontend \
  --build-arg VITE_API_BASE_URL=http://localhost:3000/api \
  ./frontend
```

### 构建管理端前端
```bash
docker build -t paper-admin \
  --build-arg VITE_API_BASE_URL=http://localhost:3000/api \
  ./admin-frontend
```

## 🐛 故障排查

### 1. 数据库连接失败

检查 MySQL 健康状态：
```bash
docker-compose exec mysql mysqladmin ping -h localhost
```

查看 MySQL 日志：
```bash
docker-compose logs mysql
```

### 2. 后端启动失败

查看后端日志：
```bash
docker-compose logs backend
```

手动进入容器调试：
```bash
docker-compose exec backend sh
```

### 3. 前端无法访问 API

检查 API 地址配置：
```bash
docker-compose exec frontend cat /usr/share/nginx/html/index.html | grep VITE_API_BASE_URL
```

### 4. 端口冲突

修改 `docker-compose.yml` 中的端口映射：
```yaml
ports:
  - "新端口:容器端口"
```

## 🔐 生产环境建议

### 1. 使用 Nginx 反向代理

在 `docker-compose.yml` 中启用 nginx 服务，并配置域名和 SSL。

### 2. 数据库安全

- 修改默认密码
- 限制外部访问（移除端口映射）
- 定期备份数据

### 3. 环境变量管理

使用 Docker Secrets 或外部密钥管理服务：
```yaml
secrets:
  db_password:
    file: ./secrets/db_password.txt
```

### 4. 资源限制

为每个服务设置资源限制：
```yaml
services:
  backend:
    deploy:
      resources:
        limits:
          cpus: '1'
          memory: 1G
```

## 📊 监控和日志

### 查看容器资源使用
```bash
docker stats
```

### 导出日志
```bash
docker-compose logs --no-color > app.log
```

### 日志轮转配置

在 `docker-compose.yml` 中添加：
```yaml
services:
  backend:
    logging:
      driver: "json-file"
      options:
        max-size: "10m"
        max-file: "3"
```

## 🔄 数据备份与恢复

### 备份数据库
```bash
docker-compose exec mysql mysqldump -u root -p paper_ai > backup.sql
```

### 恢复数据库
```bash
docker-compose exec -T mysql mysql -u root -p paper_ai < backup.sql
```

### 备份 Volume
```bash
docker run --rm \
  -v paper_mysql_data:/data \
  -v $(pwd):/backup \
  alpine tar czf /backup/mysql_backup.tar.gz -C /data .
```

## 📝 开发环境使用

开发时可以挂载本地代码：

```yaml
services:
  backend:
    volumes:
      - ./backend:/app
      - /app/node_modules
    command: npm run dev
```

## 🌐 集成到 CI/CD

### GitHub Actions 示例

```yaml
name: Deploy

on:
  push:
    branches: [ main ]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3

      - name: Build and Deploy
        env:
          DB_PASSWORD: ${{ secrets.DB_PASSWORD }}
          JWT_SECRET: ${{ secrets.JWT_SECRET }}
        run: |
          docker-compose --env-file .env.docker up -d --build
```

## 📞 技术支持

遇到问题请提交 Issue：
https://github.com/andy-zhangtao/paper/issues
