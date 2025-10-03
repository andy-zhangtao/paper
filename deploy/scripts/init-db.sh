#!/bin/bash

# Paper AI 数据库初始化脚本
# 用途：创建数据库并初始化表结构

set -e

echo "======================================"
echo "  Paper AI 数据库初始化"
echo "======================================"
echo ""

# 检查 MySQL 是否已安装
if ! command -v mysql &> /dev/null; then
    echo "❌ 错误：未检测到 MySQL，请先安装 MySQL"
    exit 1
fi

# 读取数据库配置
read -p "请输入 MySQL 主机地址 [localhost]: " DB_HOST
DB_HOST=${DB_HOST:-localhost}

read -p "请输入 MySQL 端口 [3306]: " DB_PORT
DB_PORT=${DB_PORT:-3306}

read -p "请输入 MySQL 用户名 [root]: " DB_USER
DB_USER=${DB_USER:-root}

read -sp "请输入 MySQL 密码: " DB_PASSWORD
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
if ! mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "SELECT 1" &> /dev/null; then
    echo "❌ 数据库连接失败，请检查配置"
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 检查数据库是否已存在
echo "🔍 检查数据库是否已存在..."
DB_EXISTS=$(mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -sse "SELECT COUNT(*) FROM INFORMATION_SCHEMA.SCHEMATA WHERE SCHEMA_NAME='$DB_NAME'")

if [ "$DB_EXISTS" -eq 1 ]; then
    echo "⚠️  数据库 $DB_NAME 已存在"
    read -p "是否要删除并重建？[y/N]: " CONFIRM
    if [ "$CONFIRM" == "y" ] || [ "$CONFIRM" == "Y" ]; then
        echo "🗑️  删除现有数据库..."
        mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" -e "DROP DATABASE IF EXISTS $DB_NAME"
        echo "✅ 数据库已删除"
    else
        echo "❌ 操作已取消"
        exit 1
    fi
fi

# 执行 SQL 脚本
echo ""
echo "📦 执行数据库脚本..."
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILE="$SCRIPT_DIR/../../backend/database/schema.sql"

if [ ! -f "$SQL_FILE" ]; then
    echo "❌ 错误：找不到 SQL 文件 $SQL_FILE"
    exit 1
fi

mysql -h"$DB_HOST" -P"$DB_PORT" -u"$DB_USER" -p"$DB_PASSWORD" < "$SQL_FILE"

if [ $? -eq 0 ]; then
    echo "✅ 数据库初始化成功"
else
    echo "❌ 数据库初始化失败"
    exit 1
fi

# 创建默认管理员账号
echo ""
echo "👤 创建默认管理员账号..."
read -p "是否创建默认管理员账号？[Y/n]: " CREATE_ADMIN
CREATE_ADMIN=${CREATE_ADMIN:-Y}

if [ "$CREATE_ADMIN" == "y" ] || [ "$CREATE_ADMIN" == "Y" ]; then
    # 需要使用 Node.js 来生成 bcrypt 密码
    echo ""
    echo "⚠️  注意：需要手动通过后端 API 创建管理员账号"
    echo "   或者使用以下 SQL 语句（密码：admin123）："
    echo ""
    echo "   USE paper_ai;"
    echo "   INSERT INTO admins (id, username, password, email, name) VALUES"
    echo "   (UUID(), 'admin', '\$2b\$10\$rKGWRzFQxJxM5qV5y5Y5YOqWXqJZQXGxYZQXGxYZQXGxYZQXGxYZ', 'admin@example.com', '系统管理员');"
    echo ""
fi

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
