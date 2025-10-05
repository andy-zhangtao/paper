# Nginx 部署指南

本文档说明如何使用Nginx进行反向代理部署Paper AI项目。

## 架构说明

```
客户端请求
    ↓
Nginx (80端口) ← 统一入口
    ├─ /api/*      → 后端服务 (localhost:3000)
    ├─ /           → 用户前端 (localhost:5173)
    └─ /admin/*    → 管理后台 (localhost:5174)
```

## 安装Nginx

### macOS
```bash
brew install nginx
```

### Ubuntu/Debian
```bash
sudo apt update
sudo apt install nginx
```

### CentOS/RHEL
```bash
sudo yum install nginx
```

## 配置步骤

### 1. 复制配置文件

```bash
# macOS
sudo cp nginx.conf /usr/local/etc/nginx/servers/paper.conf

# Linux
sudo cp nginx.conf /etc/nginx/sites-available/paper.conf
sudo ln -s /etc/nginx/sites-available/paper.conf /etc/nginx/sites-enabled/
```

### 2. 创建日志目录

```bash
# macOS
sudo mkdir -p /usr/local/var/log/nginx

# Linux
sudo mkdir -p /var/log/nginx
```

### 3. 测试配置

```bash
# 测试配置文件语法
sudo nginx -t

# 如果显示 "test is successful"，则配置正确
```

### 4. 启动/重启Nginx

```bash
# macOS
brew services restart nginx

# Linux
sudo systemctl restart nginx

# 或使用
sudo nginx -s reload
```

## 使用说明

配置完成后，所有服务通过Nginx统一访问：

### 开发环境
- **用户前端**: http://localhost
- **管理后台**: http://localhost/admin
- **后端API**: http://localhost/api/*

### CORS配置
Nginx已自动配置CORS，允许以下来源：
- `http://localhost:5173` (用户前端)
- `http://localhost:5174` (管理后台)

**前端无需再配置CORS，所有跨域问题由Nginx处理！**

## 前端配置修改

使用Nginx后，前端API baseURL需要调整：

### 用户前端 (frontend/.env)
```env
# 开发环境 - 通过Nginx代理
VITE_API_URL=http://localhost/api

# 生产环境
VITE_API_URL=https://your-domain.com/api
```

### 管理后台 (admin-frontend/.env)
```env
# 开发环境 - 通过Nginx代理
VITE_API_URL=http://localhost/api

# 生产环境
VITE_API_URL=https://admin.your-domain.com/api
```

## 后端配置修改（可选）

使用Nginx后，可以简化后端的CORS配置：

**backend/src/index.ts** - 移除CORS中间件或限制为仅允许Nginx:
```typescript
app.use(cors({
  origin: 'http://localhost', // 仅允许Nginx
  credentials: true,
}));
```

## 常用命令

```bash
# 查看Nginx状态
sudo nginx -t                    # 测试配置
sudo nginx -s reload             # 重载配置
sudo nginx -s stop               # 停止服务
sudo nginx -s quit              # 优雅停止

# macOS
brew services start nginx        # 启动
brew services stop nginx         # 停止
brew services restart nginx      # 重启

# Linux
sudo systemctl start nginx       # 启动
sudo systemctl stop nginx        # 停止
sudo systemctl restart nginx     # 重启
sudo systemctl status nginx      # 查看状态
```

## 查看日志

```bash
# macOS
tail -f /usr/local/var/log/nginx/paper_access.log
tail -f /usr/local/var/log/nginx/paper_error.log

# Linux
tail -f /var/log/nginx/paper_access.log
tail -f /var/log/nginx/paper_error.log
```

## 生产环境部署

生产环境建议：

1. **启用HTTPS**: 取消nginx.conf中SSL配置的注释
2. **域名配置**: 修改`server_name`为实际域名
3. **静态资源**: 前端打包后直接由Nginx提供，不需要代理
4. **安全加固**: 配置防火墙、限流等

### 生产环境配置示例

```nginx
# 静态前端
location / {
    root /var/www/paper-frontend/dist;
    try_files $uri $uri/ /index.html;
}

# 管理后台
location /admin {
    root /var/www/paper-admin/dist;
    try_files $uri $uri/ /admin/index.html;
}

# API代理（同开发环境）
location /api/ {
    proxy_pass http://localhost:3000;
    # ... 其他配置
}
```

## 故障排查

### 1. 502 Bad Gateway
- 检查后端服务是否启动: `curl http://localhost:3000/health`
- 检查端口是否正确

### 2. CORS错误
- 确认Nginx配置中的origin设置正确
- 查看error log: `tail -f /var/log/nginx/paper_error.log`

### 3. 404错误
- 检查location路径配置
- 测试upstream服务: `curl http://localhost:5173`

### 4. 权限问题
- macOS: 确保Nginx有权限访问日志目录
- Linux: 检查SELinux设置: `sudo setsebool -P httpd_can_network_connect 1`

## 性能优化

```nginx
# 开启gzip压缩
gzip on;
gzip_types text/plain text/css application/json application/javascript;
gzip_min_length 1000;

# 连接优化
keepalive_timeout 65;
keepalive_requests 100;

# 缓冲优化
proxy_buffer_size 4k;
proxy_buffers 8 4k;
proxy_busy_buffers_size 8k;
```

## 注意事项

1. **开发环境**: Nginx主要用于统一入口和CORS处理
2. **HMR支持**: 配置已包含WebSocket支持，Vite热更新正常工作
3. **端口冲突**: 确保80端口未被占用
4. **日志监控**: 定期检查日志，及时发现问题
