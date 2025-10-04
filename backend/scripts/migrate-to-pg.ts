/**
 * MySQL to PostgreSQL 自动迁移工具
 *
 * 功能:
 * 1. 替换 ? 占位符为 $1, $2, $3...
 * 2. 替换MySQL日期函数为PG函数
 * 3. 替换事务处理代码
 * 4. 替换JSON函数
 */

import * as fs from 'fs';
import * as path from 'path';

// 占位符替换函数
function replacePlaceholders(sql: string): { newSql: string; count: number } {
  let count = 0;
  const newSql = sql.replace(/\?/g, () => {
    count++;
    return `$${count}`;
  });
  return { newSql, count };
}

// MySQL日期函数替换
function replaceDateFunctions(code: string): string {
  return code
    .replace(/CURDATE\(\)/g, 'CURRENT_DATE')
    .replace(/NOW\(\)/g, 'CURRENT_TIMESTAMP')
    .replace(/DATE_SUB\(CURDATE\(\),\s*INTERVAL\s+(\?|\$\d+)\s+DAY\)/gi, 'CURRENT_DATE - INTERVAL \'$1 days\'')
    .replace(/DATE\(([^)]+)\)/g, '$1::date');
}

// JSON函数替换
function replaceJsonFunctions(code: string): string {
  // JSON_CONTAINS(tags, ?) -> tags @> ?::jsonb
  return code.replace(/JSON_CONTAINS\(([^,]+),\s*(\?|\$\d+)\)/g, '$1 @> $2::jsonb');
}

// 事务处理替换
function replaceTransactions(code: string): string {
  return code
    .replace(/pool\.getConnection\(\)/g, 'pool.connect()')
    .replace(/connection\.beginTransaction\(\)/g, 'connection.query(\'BEGIN\')')
    .replace(/connection\.commit\(\)/g, 'connection.query(\'COMMIT\')')
    .replace(/connection\.rollback\(\)/g, 'connection.query(\'ROLLBACK\')');
}

// 布尔值替换
function replaceBooleans(code: string): string {
  // manual ? 1 : 0 -> manual
  return code.replace(/(\w+)\s*\?\s*1\s*:\s*0/g, '$1');
}

// 处理单个文件
function processFile(filePath: string): void {
  console.log(`📝 处理文件: ${filePath}`);

  let content = fs.readFileSync(filePath, 'utf-8');
  const originalContent = content;

  // 执行所有替换
  content = replaceDateFunctions(content);
  content = replaceJsonFunctions(content);
  content = replaceTransactions(content);
  content = replaceBooleans(content);

  // 替换SQL查询中的占位符
  const sqlPattern = /`([^`]*\?[^`]*)`/g;
  content = content.replace(sqlPattern, (match, sql) => {
    const { newSql } = replacePlaceholders(sql);
    return `\`${newSql}\``;
  });

  // 如果内容有变化，写入文件
  if (content !== originalContent) {
    fs.writeFileSync(filePath, content, 'utf-8');
    console.log(`  ✅ 已更新`);
  } else {
    console.log(`  ⏭️  无需更新`);
  }
}

// 递归处理目录
function processDirectory(dirPath: string): void {
  const files = fs.readdirSync(dirPath);

  files.forEach(file => {
    const filePath = path.join(dirPath, file);
    const stat = fs.statSync(filePath);

    if (stat.isDirectory()) {
      processDirectory(filePath);
    } else if (file.endsWith('.ts') && !file.endsWith('.d.ts')) {
      processFile(filePath);
    }
  });
}

// 主函数
function main() {
  console.log('====================================');
  console.log('  MySQL → PostgreSQL 代码迁移工具');
  console.log('====================================\n');

  const srcDir = path.join(__dirname, '../src');

  if (!fs.existsSync(srcDir)) {
    console.error('❌ 错误: 找不到 src 目录');
    process.exit(1);
  }

  processDirectory(srcDir);

  console.log('\n====================================');
  console.log('  ✅ 迁移完成！');
  console.log('====================================');
  console.log('\n⚠️  注意：请手动检查以下内容:');
  console.log('  1. 连接池事务处理逻辑');
  console.log('  2. JSON操作符是否正确');
  console.log('  3. 日期函数替换是否符合预期');
}

main();
