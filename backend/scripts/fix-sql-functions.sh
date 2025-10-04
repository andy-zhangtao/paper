#!/bin/bash

# 修复MySQL特有的SQL函数为PostgreSQL兼容

set -e

echo "======================================"
echo "  修复MySQL特有SQL函数"
echo "======================================"
echo ""

CONTROLLERS_DIR="../src/controllers"

# 1. 替换日期函数
echo "📅 替换日期函数..."

# CURDATE() -> CURRENT_DATE
find "$CONTROLLERS_DIR" -name "*.ts" -exec sed -i.bak 's/CURDATE()/CURRENT_DATE/g' {} \;
echo "  ✅ CURDATE() → CURRENT_DATE"

# NOW() -> CURRENT_TIMESTAMP
find "$CONTROLLERS_DIR" -name "*.ts" -exec sed -i.bak 's/\([^a-zA-Z]\)NOW()/\1CURRENT_TIMESTAMP/g' {} \;
echo "  ✅ NOW() → CURRENT_TIMESTAMP"

# DATE(field) -> field::date
find "$CONTROLLERS_DIR" -name "*.ts" -exec sed -i.bak 's/DATE(\([a-z_\.]*\))/\1::date/g' {} \;
echo "  ✅ DATE(field) → field::date"

# DATE_SUB(CURRENT_DATE, INTERVAL ? DAY) -> CURRENT_DATE - INTERVAL '? days'
# 这个需要手动处理，因为涉及参数位置

# 2. 替换JSON函数
echo ""
echo "📦 替换JSON函数..."

# JSON_CONTAINS(tags, ?) -> tags @> ?::jsonb
find "$CONTROLLERS_DIR" -name "*.ts" -exec sed -i.bak "s/JSON_CONTAINS(\([^,]*\), \(\?\|\$[0-9]\+\))/\1 @> \2::jsonb/g" {} \;
echo "  ✅ JSON_CONTAINS() → PostgreSQL JSONB操作符"

# 3. 清理备份文件
find "$CONTROLLERS_DIR" -name "*.bak" -delete

echo ""
echo "======================================"
echo "  ✅ SQL函数修复完成"
echo "======================================"
echo ""
echo "⚠️  需要手动检查:"
echo "  1. adminStatsController.ts中的DATE_SUB函数"
echo "  2. userController.ts中的日期计算"
echo "  3. 确认所有日期函数替换正确"
echo ""
