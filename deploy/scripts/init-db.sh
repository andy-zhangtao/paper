#!/bin/bash

# Paper AI 数据库初始化脚本 (PostgreSQL)
# 用途：创建数据库并初始化表结构

set -e

echo "======================================"
echo "  Paper AI 数据库初始化 (PostgreSQL)"
echo "======================================"
echo ""

# 检查 PostgreSQL 是否已安装
if ! command -v psql &> /dev/null; then
    echo "❌ 错误：未检测到 PostgreSQL，请先安装 PostgreSQL"
    exit 1
fi

# 读取数据库配置
read -p "请输入 PostgreSQL 主机地址 [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "请输入 PostgreSQL 端口 [5432]: " DB_PORT
DB_PORT=${DB_PORT:-5432}

read -p "请输入 PostgreSQL 用户名 [postgres]: " DB_USER
DB_USER=${DB_USER:-postgres}

read -sp "请输入 PostgreSQL 密码: " DB_PASSWORD
echo ""

DB_NAME="paper_ai"

echo ""
echo "📋 数据库配置："
echo "  - 主机：$DB_HOST:$DB_PORT"
echo "  - 用户：$DB_USER"
echo "  - 数据库：$DB_NAME"
echo ""

# 测试数据库连接
echo "🔍 测试数据库连接..."
export PGPASSWORD="$DB_PASSWORD"
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" &> /dev/null; then
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 检查数据库是否已存在
echo "🔍 检查数据库是否已存在..."
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "⚠️  数据库 $DB_NAME 已存在"
    read -p "是否要删除并重建？[y/N]: " CONFIRM
    if [ "$CONFIRM" == "y" ] || [ "$CONFIRM" == "Y" ]; then
        echo "🗑️  删除现有数据库..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME"
        echo "✅ 数据库已删除"
    else
        echo "❌ 操作已取消"
        exit 1
    fi
fi

# 创建数据库
echo "📦 创建数据库 $DB_NAME..."
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME"
echo "✅ 数据库创建成功"

# 执行 SQL 脚本
echo ""
echo "📦 执行数据库脚本..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/../../backend/database/schema.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 错误：找不到 SQL 文件 $SQL_FILE"
    exit 1
fi

psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功"
else
    echo "❌ 数据库初始化失败"
    exit 1
fi

# 显示默认管理员信息
echo ""
echo "👤 默认管理员账号信息："
echo "  - 用户名：admin"
echo "  - 密码：admin123"
echo "  - 邮箱：admin@example.com"
echo ""
echo "⚠️  重要提示："
echo "  1. 请立即通过管理后台修改默认密码"
echo "  2. 生产环境部署前务必删除默认账号"
echo ""

# 清理环境变量
unset PGPASSWORD

echo ""
echo "======================================"
echo "  ✅ 数据库初始化完成"
echo "======================================"
echo ""
echo "📝 下一步："
echo "  1. 配置后端环境变量 (backend/.env)"
echo "  2. 启动后端服务"
echo "  3. 启动前端服务"
echo ""
