#!/bin/bash

# Paper AI 后端部署脚本
# 用途：构建并部署后端服务

set -e

echo "======================================"
echo "  Paper AI 后端部署"
echo "======================================"
echo ""

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$SCRIPT_DIR/../.."
BACKEND_DIR="$PROJECT_ROOT/backend"

# 检查 Node.js
if ! command -v node &> /dev/null; then
    echo "❌ 错误：未检测到 Node.js，请先安装"
    exit 1
fi

echo "📦 Node.js 版本: $(node -v)"
echo "📦 npm 版本: $(npm -v)"
echo ""

# 进入后端目录
cd "$BACKEND_DIR"

# 检查环境变量文件
if [ ! -f ".env" ]; then
    echo "⚠️  未找到 .env 文件，正在从模板创建..."
    if [ -f ".env.example" ]; then
        cp .env.example .env
        echo "✅ 已创建 .env 文件，请编辑配置"
        echo ""
        read -p "是否现在编辑 .env 文件？[y/N]: " EDIT_ENV
        if [ "$EDIT_ENV" == "y" ] || [ "$EDIT_ENV" == "Y" ]; then
            ${EDITOR:-vi} .env
        fi
    else
        echo "❌ 错误：找不到 .env.example 文件"
        exit 1
    fi
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
echo "  1) 开发模式 (npm run dev)"
echo "  2) 生产模式 (PM2)"
echo "  3) 仅构建，不启动"
read -p "请输入选项 [1-3]: " DEPLOY_MODE

case $DEPLOY_MODE in
    1)
        echo ""
        echo "🚀 启动开发服务器..."
        npm run dev
        ;;
    2)
        # 检查 PM2
        if ! command -v pm2 &> /dev/null; then
            echo "❌ 错误：未安装 PM2"
            read -p "是否安装 PM2？[y/N]: " INSTALL_PM2
            if [ "$INSTALL_PM2" == "y" ] || [ "$INSTALL_PM2" == "Y" ]; then
                npm install -g pm2
            else
                exit 1
            fi
        fi

        echo ""
        echo "🚀 使用 PM2 启动生产服务..."

        # 检查是否已经在运行
        if pm2 list | grep -q "paper-backend"; then
            echo "⚠️  检测到服务已在运行，正在重启..."
            pm2 restart paper-backend
        else
            pm2 start dist/index.js --name paper-backend
        fi

        pm2 save
        echo "✅ 服务已启动"
        echo ""
        pm2 status
        ;;
    3)
        echo "✅ 构建完成，未启动服务"
        ;;
    *)
        echo "❌ 无效的选项"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "  ✅ 后端部署完成"
echo "======================================"
echo ""
echo "📝 后端服务信息："
echo "  - 端口: 3000 (默认)"
echo "  - 健康检查: http://localhost:3000/health"
echo "  - API 文档: http://localhost:3000/api"
echo ""
echo "📝 常用命令："
echo "  - 查看日志: pm2 logs paper-backend"
echo "  - 重启服务: pm2 restart paper-backend"
echo "  - 停止服务: pm2 stop paper-backend"
echo ""
