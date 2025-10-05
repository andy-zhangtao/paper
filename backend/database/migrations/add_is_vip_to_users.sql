-- 添加 is_vip 字段到 users 表
-- 执行方式: psql -U postgres -d paper_db -f add_is_vip_to_users.sql

-- 添加 is_vip 列
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;

-- 创建索引以优化查询
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip);

-- 验证修改
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_vip';
