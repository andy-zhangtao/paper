# Paper AI 部署文档

本文档详细说明如何在生产环境部署 Paper AI 系统。

## 📋 系统架构

```
Paper AI
├── Backend (Node.js + Express)      # 后端 API 服务
├── Frontend (React + Vite)          # 用户端前端
└── Admin Frontend (React + Vite)   # 管理后台前端
```

## 🛠️ 环境要求

### 必需环境
- **Node.js**: >= 18.0.0
- **MySQL**: >= 8.0
- **npm** 或 **yarn**

### 可选环境
- **PM2**: 生产环境进程管理
- **Nginx**: 反向代理和静态文件服务
- **Docker**: 容器化部署（可选）

## 📦 快速部署

### 1. 克隆项目

```bash
git clone https://github.com/andy-zhangtao/paper.git
cd paper
```

### 2. 初始化数据库

```bash
./deploy/scripts/init-db.sh
```

这个脚本会：
- 测试数据库连接
- 创建 `paper_ai` 数据库
- 初始化所有表结构
- 创建默认管理员账号（可选）

### 3. 部署后端

```bash
./deploy/scripts/deploy-backend.sh
```

选择部署模式：
- **开发模式**: 使用 `npm run dev` 启动
- **生产模式**: 使用 PM2 管理进程
- **仅构建**: 只构建不启动

### 4. 部署用户端前端

```bash
./deploy/scripts/deploy-frontend.sh
```

### 5. 部署管理端前端

```bash
./deploy/scripts/deploy-admin.sh
```

## 🔧 详细配置

### 后端配置

1. 复制环境变量模板：
```bash
cd backend
cp .env.example .env
```

2. 编辑 `.env` 文件：
```env
# 数据库配置
DB_HOST=localhost
DB_PORT=3306
DB_USER=root
DB_PASSWORD=your_password
DB_NAME=paper_ai

# 服务器配置
PORT=3000
NODE_ENV=production

# JWT 密钥（请修改为随机字符串）
JWT_SECRET=your-super-secret-key-change-in-production

# OpenRouter API（AI 服务）
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_API_BASE=https://openrouter.ai/api/v1

# 代理配置（国内环境必需）
HTTP_PROXY=http://127.0.0.1:7890
HTTPS_PROXY=http://127.0.0.1:7890
```

### 前端配置

#### 用户端前端 (frontend/)
```bash
cd frontend
echo "VITE_API_BASE_URL=http://your-domain.com/api" > .env.local
```

#### 管理端前端 (admin-frontend/)
```bash
cd admin-frontend
echo "VITE_API_BASE_URL=http://your-domain.com/api" > .env.local
```

## 🌐 Nginx 配置

### 用户端配置示例

创建 `/etc/nginx/sites-available/paper-frontend`：

```nginx
server {
    listen 80;
    server_name your-domain.com;
    root /var/www/paper-frontend;
    index index.html;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

### 管理端配置示例

创建 `/etc/nginx/sites-available/paper-admin`：

```nginx
server {
    listen 80;
    server_name admin.your-domain.com;
    root /var/www/paper-admin;
    index index.html;

    # IP 访问限制（建议配置）
    # allow 192.168.1.0/24;
    # deny all;

    # 前端路由
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API 反向代理
    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }
}
```

启用配置：
```bash
sudo ln -s /etc/nginx/sites-available/paper-frontend /etc/nginx/sites-enabled/
sudo ln -s /etc/nginx/sites-available/paper-admin /etc/nginx/sites-enabled/
sudo nginx -t
sudo systemctl reload nginx
```

## 🔐 HTTPS 配置

使用 Let's Encrypt 免费证书：

```bash
sudo apt install certbot python3-certbot-nginx
sudo certbot --nginx -d your-domain.com
sudo certbot --nginx -d admin.your-domain.com
```

## 🚀 PM2 进程管理

### 启动后端服务
```bash
cd backend
pm2 start dist/index.js --name paper-backend
pm2 save
pm2 startup  # 开机自启
```

### 常用命令
```bash
pm2 list                    # 查看所有进程
pm2 logs paper-backend      # 查看日志
pm2 restart paper-backend   # 重启服务
pm2 stop paper-backend      # 停止服务
pm2 delete paper-backend    # 删除进程
pm2 monit                   # 监控面板
```

## 📊 默认管理员账号

首次部署后，使用默认管理员账号登录管理后台：

- **用户名**: `admin`
- **密码**: `admin123`

**⚠️ 安全警告**: 首次登录后请立即修改密码！

## 🔍 健康检查

### 后端健康检查
```bash
curl http://localhost:3000/health
```

预期响应：
```json
{
  "success": true,
  "message": "Server is running",
  "timestamp": "2025-10-03T12:00:00.000Z"
}
```

### 数据库连接检查
```bash
mysql -h localhost -u root -p -e "USE paper_ai; SHOW TABLES;"
```

## 🐛 常见问题

### 1. 数据库连接失败
- 检查 MySQL 是否运行：`sudo systemctl status mysql`
- 检查 `.env` 文件中的数据库配置
- 检查防火墙规则

### 2. 前端 404 错误
- 确认 Nginx 配置正确
- 检查 `try_files` 配置
- 重启 Nginx：`sudo systemctl reload nginx`

### 3. API 跨域问题
- 检查后端 CORS 配置
- 确认前端 API 地址配置正确

### 4. PM2 进程崩溃
- 查看日志：`pm2 logs paper-backend`
- 检查端口占用：`lsof -i :3000`

### 5. 管理员登录失败
- 检查数据库中是否存在 admin 账号
- 使用 SQL 直接插入默认管理员

## 📝 维护建议

### 日志管理
```bash
# PM2 日志轮转
pm2 install pm2-logrotate
pm2 set pm2-logrotate:max_size 10M
pm2 set pm2-logrotate:retain 30
```

### 数据库备份
```bash
# 每日备份脚本
mysqldump -u root -p paper_ai > backup_$(date +%Y%m%d).sql

# 定时备份（crontab）
0 2 * * * /path/to/backup.sh
```

### 监控告警
- 使用 PM2 Plus 进行应用监控
- 配置 Nginx access/error 日志分析
- 设置磁盘空间告警

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
cd frontend
npm install
npm run build
sudo cp -r dist/* /var/www/paper-frontend/
```

### 更新管理端
```bash
cd admin-frontend
npm install
npm run build
sudo cp -r dist/* /var/www/paper-admin/
```

## 📞 技术支持

如遇部署问题，请提交 Issue：
https://github.com/andy-zhangtao/paper/issues
