/**
 * PostgreSQL 查询适配器
 * 将MySQL风格的查询转换为PostgreSQL风格
 */

import { FieldDef, Pool, PoolClient, QueryResult, QueryResultRow } from 'pg';

/**
 * 将MySQL占位符(?)转换为PostgreSQL占位符($1, $2, $3...)
 */
function convertPlaceholders(sql: string): string {
  let index = 0;
  return sql.replace(/\?/g, () => {
    index++;
    return `$${index}`;
  });
}

/**
 * 执行查询(兼容MySQL返回格式)
 */
export async function query<T extends QueryResultRow = Record<string, unknown>>(
  pool: Pool | PoolClient,
  sql: string,
  params: any[] = []
): Promise<[T[], FieldDef[]]> {
  const pgSql = convertPlaceholders(sql);
  const result: QueryResult<T> = await pool.query<T>(pgSql, params);

  // 返回格式兼容MySQL: [rows, fields]
  return [result.rows, result.fields];
}

/**
 * 执行查询(PostgreSQL原生格式)
 */
export async function execute<T extends QueryResultRow = Record<string, unknown>>(
  pool: Pool | PoolClient,
  sql: string,
  params: any[] = []
): Promise<QueryResult<T>> {
  const pgSql = convertPlaceholders(sql);
  return await pool.query<T>(pgSql, params);
}

/**
 * 事务包装器
 */
export async function transaction<T>(
  pool: Pool,
  callback: (client: PoolClient) => Promise<T>
): Promise<T> {
  const client = await pool.connect();

  try {
    await client.query('BEGIN');
    const result = await callback(client);
    await client.query('COMMIT');
    return result;
  } catch (error) {
    await client.query('ROLLBACK');
    throw error;
  } finally {
    client.release();
  }
}
