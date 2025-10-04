-- 快速授权脚本 - 使用postgres超级用户执行
-- 执行命令: psql -U postgres -f quick-grant.sql

-- 1. 创建paper用户(如果不存在,请修改密码)
CREATE ROLE paper WITH LOGIN PASSWORD 'paper123' CREATEDB;

-- 2. 如果paper_ai数据库已存在,授予权限
GRANT ALL PRIVILEGES ON DATABASE paper_ai TO paper;

-- 3. 连接到paper_ai数据库授予表权限
\c paper_ai

GRANT ALL PRIVILEGES ON SCHEMA public TO paper;
GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO paper;
GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO paper;
GRANT ALL PRIVILEGES ON ALL FUNCTIONS IN SCHEMA public TO paper;

-- 4. 设置默认权限
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON TABLES TO paper;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON SEQUENCES TO paper;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL PRIVILEGES ON FUNCTIONS TO paper;

-- 5. 验证
\du paper
