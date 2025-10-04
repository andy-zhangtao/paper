#!/bin/bash

# PostgreSQL批量迁移脚本
# 替换所有Controller文件中的pool.query为query(pool, ...)

set -e

echo "======================================"
echo "  批量替换 pool.query 为 PG兼容方式"
echo "======================================"
echo ""

CONTROLLERS_DIR="../src/controllers"

if [ ! -d "$CONTROLLERS_DIR" ]; then
  echo "❌ 错误: 找不到controllers目录"
  exit 1
fi

# 备份原文件
echo "📦 创建备份..."
BACKUP_DIR="../backups/$(date +%Y%m%d_%H%M%S)"
mkdir -p "$BACKUP_DIR"
cp -r "$CONTROLLERS_DIR" "$BACKUP_DIR/"
echo "✅ 备份完成: $BACKUP_DIR"
echo ""

# 统计文件数
TOTAL_FILES=$(find "$CONTROLLERS_DIR" -name "*.ts" | wc -l | tr -d ' ')
echo "📊 找到 $TOTAL_FILES 个TypeScript文件"
echo ""

# 遍历所有Controller文件
MODIFIED=0
for file in "$CONTROLLERS_DIR"/*.ts; do
  if [ -f "$file" ]; then
    BASENAME=$(basename "$file")
    echo "🔧 处理: $BASENAME"

    # 1. 添加import { query }如果不存在
    if ! grep -q "import { query } from '../utils/pgQuery'" "$file"; then
      # 在pool import后添加
      sed -i.bak "/import pool from '\.\.\/config\/database';/a\\
import { query } from '../utils/pgQuery';
" "$file"
      echo "  ✅ 添加import { query }"
    fi

    # 2. 替换 await pool.query( 为 await query(pool,
    if grep -q "await pool.query(" "$file"; then
      sed -i.bak 's/await pool\.query(/await query(pool, /g' "$file"
      echo "  ✅ 替换pool.query调用"
      MODIFIED=$((MODIFIED + 1))
    fi

    # 3. 替换 pool.getConnection() 为 pool.connect()
    if grep -q "pool.getConnection()" "$file"; then
      sed -i.bak 's/pool\.getConnection()/pool.connect()/g' "$file"
      echo "  ✅ 替换getConnection为connect"
    fi

    # 4. 替换事务方法
    if grep -q "beginTransaction()" "$file"; then
      sed -i.bak "s/await connection\.beginTransaction()/await connection.query('BEGIN')/g" "$file"
      sed -i.bak "s/await connection\.commit()/await connection.query('COMMIT')/g" "$file"
      sed -i.bak "s/await connection\.rollback()/await connection.query('ROLLBACK')/g" "$file"
      echo "  ✅ 替换事务处理方法"
    fi

    # 清理.bak文件
    rm -f "${file}.bak"

    echo ""
  fi
done

echo "======================================"
echo "  ✅ 批量替换完成"
echo "======================================"
echo ""
echo "📊 统计:"
echo "  - 处理文件数: $TOTAL_FILES"
echo "  - 修改文件数: $MODIFIED"
echo "  - 备份位置: $BACKUP_DIR"
echo ""
echo "⚠️  下一步:"
echo "  1. 检查替换结果是否正确"
echo "  2. 手动处理特殊SQL语法(日期函数、JSON操作)"
echo "  3. 运行npm run dev测试"
echo ""
