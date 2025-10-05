# 修复积分余额 API 错误 - is_vip 字段缺失

## 问题描述

调用 `/api/credits/balance` 接口时报错：

```
查询积分余额错误: error: column "is_vip" does not exist
```

**原因**：数据库 `users` 表中缺少 `is_vip` 字段，但代码中尝试查询该字段。

## 解决方案

### 方案一：执行迁移脚本（推荐）

**快速执行**：

```bash
cd backend/database/migrations

# 方式1：使用 bash 脚本
chmod +x run_add_is_vip.sh
./run_add_is_vip.sh

# 方式2：直接使用 psql
psql -U postgres -d paper_db -f add_is_vip_to_users.sql
```

### 方案二：手动添加字段

连接到数据库并执行：

```sql
-- 添加 is_vip 字段
ALTER TABLE users 
ADD COLUMN IF NOT EXISTS is_vip BOOLEAN NOT NULL DEFAULT FALSE;

-- 创建索引
CREATE INDEX IF NOT EXISTS idx_users_is_vip ON users(is_vip);

-- 验证
SELECT column_name, data_type, column_default 
FROM information_schema.columns 
WHERE table_name = 'users' AND column_name = 'is_vip';
```

## 迁移内容

### 添加的字段

| 字段名 | 类型 | 默认值 | 说明 |
|--------|------|--------|------|
| `is_vip` | BOOLEAN | FALSE | 是否为VIP用户 |

### 添加的索引

- `idx_users_is_vip` - 优化 VIP 用户查询

## 验证步骤

### 1. 检查字段是否添加成功

```sql
-- 查看 users 表结构
\d users

-- 或者
SELECT column_name, data_type, column_default, is_nullable
FROM information_schema.columns 
WHERE table_name = 'users'
ORDER BY ordinal_position;
```

**预期输出**：应该看到 `is_vip` 字段，类型为 `boolean`，默认值为 `false`。

### 2. 检查现有用户数据

```sql
SELECT id, email, is_vip, credits, credits_expire_at
FROM users
LIMIT 10;
```

**预期结果**：所有现有用户的 `is_vip` 应该为 `false`（默认值）。

### 3. 测试 API

重启后端服务，然后调用积分余额接口：

```bash
# 使用 curl 测试
curl -X GET http://localhost:3000/api/credits/balance \
  -H "Authorization: Bearer <your_token>"
```

**预期响应**：

```json
{
  "success": true,
  "data": {
    "credits": 1000,
    "is_vip": false,
    "credits_expire_at": null,
    "token_to_credit_ratio": 0.005
  }
}
```

## 功能说明

### is_vip 字段的用途

VIP 用户标识字段，可用于：

1. **差异化定价**：VIP 用户可能享受更低的积分消耗
2. **功能权限**：VIP 用户可能有额外功能访问权限
3. **优先级服务**：VIP 用户的请求可能有更高优先级
4. **统计分析**：区分普通用户和 VIP 用户的使用情况

### 设置用户为 VIP

```sql
-- 将特定用户设置为 VIP
UPDATE users 
SET is_vip = TRUE 
WHERE email = 'vip@example.com';

-- 批量设置
UPDATE users 
SET is_vip = TRUE 
WHERE id IN ('user-id-1', 'user-id-2');
```

### 取消 VIP 状态

```sql
UPDATE users 
SET is_vip = FALSE 
WHERE email = 'user@example.com';
```

## 回滚方案

如果需要移除该字段：

```sql
-- 删除索引
DROP INDEX IF EXISTS idx_users_is_vip;

-- 删除字段
ALTER TABLE users DROP COLUMN IF EXISTS is_vip;
```

## 相关文件

- ✅ `/backend/database/schema.sql` - 已更新主 schema
- ✅ `/backend/database/migrations/add_is_vip_to_users.sql` - 迁移脚本
- ✅ `/backend/database/migrations/run_add_is_vip.sh` - 执行脚本
- 📝 `/backend/src/controllers/creditsController.ts` - 使用该字段

## 注意事项

1. **执行前备份**：建议在执行迁移前备份数据库
   ```bash
   pg_dump -U postgres paper_db > backup_$(date +%Y%m%d_%H%M%S).sql
   ```

2. **生产环境**：在生产环境执行前，先在测试环境验证

3. **服务重启**：执行迁移后需要重启后端服务

4. **默认值**：所有现有用户的 `is_vip` 将自动设置为 `FALSE`

## 故障排查

### 问题1：权限不足

```
ERROR: permission denied for table users
```

**解决**：确保数据库用户有 ALTER TABLE 权限：

```sql
GRANT ALL PRIVILEGES ON TABLE users TO your_user;
```

### 问题2：字段已存在

```
ERROR: column "is_vip" of relation "users" already exists
```

**说明**：字段已经添加过了，可以忽略此错误。使用 `ADD COLUMN IF NOT EXISTS` 可以避免。

### 问题3：索引已存在

```
ERROR: relation "idx_users_is_vip" already exists
```

**说明**：索引已经创建过了，可以忽略。使用 `CREATE INDEX IF NOT EXISTS` 可以避免。

## 部署检查清单

- [ ] 备份数据库
- [ ] 执行迁移脚本
- [ ] 验证字段和索引创建成功
- [ ] 检查现有用户数据
- [ ] 重启后端服务
- [ ] 测试 `/api/credits/balance` 接口
- [ ] 检查应用日志无错误
- [ ] 前端积分显示正常
