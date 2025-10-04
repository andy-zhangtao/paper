-- ==========================================
-- Paper AI 用户权限配置脚本
-- 用途: 为paper用户授予所需的数据库权限
-- ==========================================

-- 注意: 此脚本需要使用超级用户(如postgres)执行
-- 执行方式: psql -U postgres -f grant-permissions.sql

-- ==========================================
-- 1. 创建paper用户(如果不存在)
-- ==========================================
DO $$
BEGIN
    IF NOT EXISTS (SELECT FROM pg_roles WHERE rolname = 'paper') THEN
        CREATE ROLE paper WITH LOGIN PASSWORD 'your_password_here';
        RAISE NOTICE '✅ 用户 paper 创建成功';
    ELSE
        RAISE NOTICE '📦 用户 paper 已存在';
    END IF;
END
$$;

-- ==========================================
-- 2. 授予创建数据库权限
-- ==========================================
ALTER ROLE paper CREATEDB;
COMMENT ON ROLE paper IS 'Paper AI应用数据库用户';

-- ==========================================
-- 3. 授予paper_ai数据库的所有权限
-- ==========================================

-- 如果数据库已存在,授予所有权限
DO $$
BEGIN
    IF EXISTS (SELECT FROM pg_database WHERE datname = 'paper_ai') THEN
        -- 授予数据库连接权限
        GRANT CONNECT ON DATABASE paper_ai TO paper;

        -- 授予public schema的使用权限
        GRANT USAGE ON SCHEMA public TO paper;

        -- 授予所有表的权限
        GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO paper;

        -- 授予所有序列的权限(用于自增ID)
        GRANT USAGE, SELECT ON ALL SEQUENCES IN SCHEMA public TO paper;

        -- 授予所有函数的执行权限
        GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO paper;

        -- 设置默认权限(对未来创建的对象自动授权)
        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT SELECT, INSERT, UPDATE, DELETE ON TABLES TO paper;

        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT USAGE, SELECT ON SEQUENCES TO paper;

        ALTER DEFAULT PRIVILEGES IN SCHEMA public
            GRANT EXECUTE ON FUNCTIONS TO paper;

        RAISE NOTICE '✅ 已授予 paper 用户对 paper_ai 数据库的所有权限';
    ELSE
        RAISE NOTICE '⚠️  数据库 paper_ai 不存在,将在用户创建数据库后自动拥有权限';
    END IF;
END
$$;

-- ==========================================
-- 4. (可选) 授予创建角色权限
-- ==========================================
-- 如果需要paper用户能够创建其他用户,取消下面的注释
-- ALTER ROLE paper CREATEROLE;

-- ==========================================
-- 5. (可选) 授予超级用户权限
-- ==========================================
-- ⚠️ 生产环境不推荐! 仅开发环境使用
-- ALTER ROLE paper SUPERUSER;

-- ==========================================
-- 验证权限
-- ==========================================
SELECT
    rolname AS "用户名",
    rolsuper AS "超级用户",
    rolinherit AS "继承权限",
    rolcreaterole AS "创建角色",
    rolcreatedb AS "创建数据库",
    rolcanlogin AS "可登录",
    rolconnlimit AS "连接限制",
    rolvaliduntil AS "有效期"
FROM pg_roles
WHERE rolname = 'paper';

-- ==========================================
-- 检查数据库权限
-- ==========================================
SELECT
    datname AS "数据库",
    datacl AS "访问控制列表"
FROM pg_database
WHERE datname = 'paper_ai';

-- ==========================================
-- 完成提示
-- ==========================================
DO $$
BEGIN
    RAISE NOTICE '';
    RAISE NOTICE '====================================';
    RAISE NOTICE '  ✅ 权限配置完成';
    RAISE NOTICE '====================================';
    RAISE NOTICE '';
    RAISE NOTICE '📝 下一步:';
    RAISE NOTICE '  1. 修改paper用户密码:';
    RAISE NOTICE '     ALTER ROLE paper WITH PASSWORD ''新密码'';';
    RAISE NOTICE '';
    RAISE NOTICE '  2. 使用paper用户连接测试:';
    RAISE NOTICE '     psql -U paper -d paper_ai';
    RAISE NOTICE '';
    RAISE NOTICE '  3. 运行初始化脚本:';
    RAISE NOTICE '     ./init-db.sh';
    RAISE NOTICE '';
END
$$;
