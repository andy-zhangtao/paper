import { Pool } from 'pg';
import dotenv from 'dotenv';

dotenv.config();

const pool = new Pool({
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '5432'),
  user: process.env.DB_USER || 'postgres',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'paper_ai',
  max: parseInt(process.env.DB_CONNECTION_LIMIT || '10'), // 连接池最大连接数
  idleTimeoutMillis: 30000, // 空闲连接超时时间
  connectionTimeoutMillis: 2000, // 连接超时时间
});

// 测试数据库连接
export async function testConnection() {
  try {
    const client = await pool.connect();
    console.log('✅ PostgreSQL 数据库连接成功');
    client.release();
    return true;
  } catch (error) {
    console.error('❌ PostgreSQL 数据库连接失败:', error);
    return false;
  }
}

export default pool;
