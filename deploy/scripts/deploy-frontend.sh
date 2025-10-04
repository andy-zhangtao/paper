#!/bin/bash

# Paper AI 用户端前端部署脚本
# 用途：构建并部署用户端前端

set -e

echo "======================================"
echo "  Paper AI 用户端前端部署"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js，请先安装"
    exit 1
fi

echo "📦 Node.js 版本: $(node -v)"
echo "📦 npm 版本: $(npm -v)"
echo ""

# 进入前端目录
cd "$FRONTEND_DIR"

# 检查环境变量文件
if [ ! -f ".env.local" ]; then
    echo "⚠️  未找到 .env.local 文件"
    read -p "请输入后端 API 地址 [http://localhost:3000]: " API_URL
    API_URL=${API_URL:-http://localhost:3000}

    echo "VITE_API_BASE_URL=$API_URL/api" > .env.local
    echo "✅ 已创建 .env.local 文件"
fi

# 安装依赖
echo ""
echo "📥 安装依赖..."
npm install

if [ $? -ne 0 ]; then
    echo "❌ 依赖安装失败"
    exit 1
fi
echo "✅ 依赖安装成功"

# 构建项目
echo ""
echo "🔨 构建项目..."
npm run build

if [ $? -ne 0 ]; then
    echo "❌ 构建失败"
    exit 1
fi
echo "✅ 构建成功"

# 询问部署方式
echo ""
echo "请选择部署方式："
echo "  1) 开发预览 (npm run dev)"
echo "  2) 生产预览 (npm run preview)"
echo "  3) 部署到 Nginx"
echo "  4) 仅构建，不部署"
read -p "请输入选项 [1-4]: " DEPLOY_MODE

case $DEPLOY_MODE in
    1)
        echo ""
        echo "🚀 启动开发服务器..."
        npm run dev
        ;;
    2)
        echo ""
        echo "🚀 启动生产预览..."
        npm run preview
        ;;
    3)
        read -p "请输入 Nginx 静态文件目录 [/var/www/paper-frontend]: " NGINX_DIR
        NGINX_DIR=${NGINX_DIR:-/var/www/paper-frontend}

        echo ""
        echo "📦 部署到 Nginx..."

        # 检查目录是否存在
        if [ ! -d "$NGINX_DIR" ]; then
            echo "创建目录: $NGINX_DIR"
            sudo mkdir -p "$NGINX_DIR"
        fi

        # 复制文件
        echo "复制构建文件..."
        sudo cp -r dist/* "$NGINX_DIR/"

        echo "✅ 部署成功"
        echo ""
        echo "📝 Nginx 配置示例："
        echo "
server {
    listen 80;
    server_name your-domain.com;
    root $NGINX_DIR;
    index index.html;

    location / {
        try_files \$uri \$uri/ /index.html;
    }

    location /api {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade \$http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host \$host;
        proxy_cache_bypass \$http_upgrade;
    }
}
"
        ;;
    4)
        echo "✅ 构建完成，未部署"
        echo "构建文件位于: $FRONTEND_DIR/dist"
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "  ✅ 用户端前端部署完成"
echo "======================================"
echo ""
