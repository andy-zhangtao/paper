#!/bin/bash

# 数据库连接信息
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-5432}
DB_NAME=${DB_NAME:-paper_db}
DB_USER=${DB_USER:-postgres}

echo "=========================================="
echo "添加 is_vip 字段到 users 表"
echo "=========================================="
echo "数据库: $DB_NAME"
echo "主机: $DB_HOST:$DB_PORT"
echo "用户: $DB_USER"
echo ""

# 执行迁移脚本
echo "执行迁移..."
PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -f "$(dirname "$0")/add_is_vip_to_users.sql"

if [ $? -eq 0 ]; then
    echo ""
    echo "✅ 迁移成功完成！"
    echo ""
    echo "验证结果："
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT column_name, data_type, column_default, is_nullable
        FROM information_schema.columns 
        WHERE table_name = 'users' AND column_name = 'is_vip';
    "
    echo ""
    echo "检查现有用户的 is_vip 状态："
    PGPASSWORD=$DB_PASSWORD psql -h $DB_HOST -p $DB_PORT -U $DB_USER -d $DB_NAME -c "
        SELECT id, email, is_vip, credits 
        FROM users 
        LIMIT 5;
    "
else
    echo ""
    echo "❌ 迁移失败！请检查错误信息。"
    exit 1
fi

echo ""
echo "=========================================="
echo "迁移完成"
echo "=========================================="
