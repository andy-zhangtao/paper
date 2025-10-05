#!/bin/bash

# Paper AI 数据库初始化脚本 (PostgreSQL)
# 用途：幂等性初始化数据库和表结构

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

# 设置密码环境变量
export PGPASSWORD="$DB_PASSWORD"

# 测试数据库连接
echo "🔍 测试数据库连接..."
if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "SELECT 1" &> /dev/null; then
    echo "❌ 数据库连接失败，请检查配置"
    unset PGPASSWORD
    exit 1
fi
echo "✅ 数据库连接成功"
echo ""

# 检查用户权限
echo "🔍 检查用户权限..."
CAN_CREATE_DB=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER' AND rolcreatedb=true")
CAN_CREATE_ROLE=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER' AND rolcreaterole=true")
IS_SUPERUSER=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_roles WHERE rolname='$DB_USER' AND rolsuper=true")

if [ "$CAN_CREATE_DB" != "1" ] && [ "$IS_SUPERUSER" != "1" ]; then
    echo "⚠️  警告：当前用户没有创建数据库权限"
fi
echo "✅ 权限检查完成"
echo ""

# 检查数据库是否已存在
echo "🔍 检查数据库是否存在..."
DB_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -tAc "SELECT 1 FROM pg_database WHERE datname='$DB_NAME'")

if [ "$DB_EXISTS" = "1" ]; then
    echo "📦 数据库 $DB_NAME 已存在"
    echo ""
    echo "请选择操作模式："
    echo "  1) 增量初始化 - 只创建不存在的表和数据（推荐）"
    echo "  2) 完全重建 - 删除所有数据并重新创建（危险！）"
    echo "  3) 跳过初始化 - 保持现状"
    echo ""
    read -p "请选择 [1/2/3]: " INIT_MODE
    INIT_MODE=${INIT_MODE:-1}

    case $INIT_MODE in
        1)
            echo ""
            echo "✅ 选择增量初始化模式"
            INCREMENTAL=true
            ;;
        2)
            echo ""
            echo "⚠️  警告：完全重建将删除所有现有数据！"
            read -p "请输入数据库名称 '$DB_NAME' 以确认删除: " CONFIRM_NAME
            if [ "$CONFIRM_NAME" != "$DB_NAME" ]; then
                echo "❌ 数据库名称不匹配，操作已取消"
                unset PGPASSWORD
                exit 1
            fi

            echo ""
            echo "🗑️  删除现有数据库..."

            # 强制断开所有连接
            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "
                SELECT pg_terminate_backend(pg_stat_activity.pid)
                FROM pg_stat_activity
                WHERE pg_stat_activity.datname = '$DB_NAME'
                  AND pid <> pg_backend_pid();
            " &> /dev/null || true

            psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "DROP DATABASE IF EXISTS $DB_NAME"
            echo "✅ 数据库已删除"
            INCREMENTAL=false
            ;;
        3)
            echo "✅ 跳过初始化"
            unset PGPASSWORD
            exit 0
            ;;
        *)
            echo "❌ 无效的选择"
            unset PGPASSWORD
            exit 1
            ;;
    esac
else
    echo "📦 数据库 $DB_NAME 不存在，将创建新数据库"
    INCREMENTAL=false
fi

echo ""

# 创建数据库（如果不存在）
if [ "$DB_EXISTS" != "1" ]; then
    echo "📦 创建数据库 $DB_NAME..."
    psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d postgres -c "CREATE DATABASE $DB_NAME"
    echo "✅ 数据库创建成功"
    echo ""
fi

# 准备SQL脚本
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
SQL_FILES=(
    "$SCRIPT_DIR/../../backend/database/schema.sql"
    "$SCRIPT_DIR/prompt_templates.sql"
)

for SQL_FILE in "${SQL_FILES[@]}"; do
    if [ ! -f "$SQL_FILE" ]; then
        echo "❌ 错误：找不到 SQL 文件 $SQL_FILE"
        unset PGPASSWORD
        exit 1
    fi
done

# 执行SQL脚本
if [ "$INCREMENTAL" = true ]; then
    echo "📦 执行增量初始化..."
    echo "  - 创建扩展（如果不存在）"
    echo "  - 创建函数和触发器（如果不存在）"
    echo "  - 创建表（如果不存在）"
    echo "  - 插入初始数据（如果不存在）"
    echo ""

    for SQL_FILE in "${SQL_FILES[@]}"; do
        echo "🚀 运行 $(basename "$SQL_FILE")..."
        psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE" 2>&1 | while read -r line; do
            # 过滤掉"已存在"的警告信息，只显示错误
            if [[ ! "$line" =~ "already exists" ]] && [[ ! "$line" =~ "duplicate key" ]]; then
                echo "$line"
            fi
        done

        if [ "${PIPESTATUS[0]}" -ne 0 ]; then
            echo "❌ 执行 SQL 文件 $(basename "$SQL_FILE") 失败"
            unset PGPASSWORD
            exit 1
        fi
    done

    echo "✅ 增量初始化完成"
else
    echo "📦 执行完整初始化..."

    for SQL_FILE in "${SQL_FILES[@]}"; do
        echo "🚀 运行 $(basename "$SQL_FILE")..."
        if ! psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -f "$SQL_FILE"; then
            echo "❌ 执行 SQL 文件 $(basename "$SQL_FILE") 失败"
            unset PGPASSWORD
            exit 1
        fi
    done

    echo "✅ 数据库完整初始化成功"
fi

# 验证数据库结构
echo ""
echo "🔍 验证数据库结构..."
TABLE_COUNT=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "
    SELECT COUNT(*) FROM information_schema.tables
    WHERE table_schema = 'public' AND table_type = 'BASE TABLE'
")

echo "✅ 检测到 $TABLE_COUNT 个数据表"

# 列出所有表
echo ""
echo "📊 数据库表列表："
psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -c "
    SELECT
        schemaname as schema,
        tablename as table_name,
        pg_size_pretty(pg_total_relation_size(schemaname||'.'||tablename)) as size
    FROM pg_tables
    WHERE schemaname = 'public'
    ORDER BY tablename;
"

# 显示默认管理员信息
echo ""
echo "👤 默认管理员账号信息："
ADMIN_EXISTS=$(psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -tAc "SELECT COUNT(*) FROM admins WHERE username='admin'")

if [ "$ADMIN_EXISTS" -gt 0 ]; then
    echo "  - 用户名：admin"
    echo "  - 密码：admin123"
    echo "  - 邮箱：admin@example.com"
    echo ""
    echo "⚠️  重要提示："
    echo "  1. 请立即通过管理后台修改默认密码"
    echo "  2. 生产环境部署前务必删除或禁用默认账号"
else
    echo "  ⚠️  默认管理员账号不存在，请手动创建"
fi

# 清理环境变量
unset PGPASSWORD

echo ""
echo "======================================"
echo "  ✅ 数据库初始化完成"
echo "======================================"
echo ""
echo "📝 下一步："
echo "  1. 配置后端环境变量 (backend/.env)"
echo "     DB_HOST=$DB_HOST"
echo "     DB_PORT=$DB_PORT"
echo "     DB_USER=$DB_USER"
echo "     DB_NAME=$DB_NAME"
echo "  2. 启动后端服务: cd backend && npm run dev"
echo "  3. 启动前端服务: cd frontend && npm run dev"
echo ""
