-- Paper AI Assistant 数据库结构 (PostgreSQL)
-- 需要启用 UUID 扩展
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 创建更新时间触发器函数
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  credits INTEGER NOT NULL DEFAULT 0,
  credits_expire_at TIMESTAMP,
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'banned')),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_users_email ON users(email);
CREATE INDEX idx_users_status ON users(status);

CREATE TRIGGER update_users_updated_at
  BEFORE UPDATE ON users
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 2. 论文表
CREATE TABLE IF NOT EXISTS papers (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  title VARCHAR(500) NOT NULL,
  content TEXT,
  word_count INTEGER DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_papers_user_id ON papers(user_id);
CREATE INDEX idx_papers_created_at ON papers(created_at);

CREATE TRIGGER update_papers_updated_at
  BEFORE UPDATE ON papers
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 3. 积分流水表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type VARCHAR(20) NOT NULL CHECK (type IN ('recharge', 'consume', 'refund', 'bonus', 'adjustment')),
  amount INTEGER NOT NULL,
  balance_after INTEGER NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_credit_trans_user_id ON credit_transactions(user_id);
CREATE INDEX idx_credit_trans_created_at ON credit_transactions(created_at);

-- 4. 充值套餐表
CREATE TABLE IF NOT EXISTS recharge_packages (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  credits INTEGER NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  bonus_credits INTEGER DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recharge_packages_is_active ON recharge_packages(is_active);

-- 5. 充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  package_id UUID NOT NULL REFERENCES recharge_packages(id),
  amount DECIMAL(10,2) NOT NULL,
  credits INTEGER NOT NULL,
  status VARCHAR(20) DEFAULT 'pending' CHECK (status IN ('pending', 'success', 'failed', 'refunded')),
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_recharge_orders_user_id ON recharge_orders(user_id);
CREATE INDEX idx_recharge_orders_status ON recharge_orders(status);
CREATE INDEX idx_recharge_orders_created_at ON recharge_orders(created_at);

CREATE TRIGGER update_recharge_orders_updated_at
  BEFORE UPDATE ON recharge_orders
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 5.1 积分设置表
CREATE TABLE IF NOT EXISTS credit_settings (
  id SMALLINT PRIMARY KEY DEFAULT 1,
  token_to_credit_ratio NUMERIC(10,4) NOT NULL DEFAULT 1.0,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TRIGGER update_credit_settings_updated_at
  BEFORE UPDATE ON credit_settings
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

INSERT INTO credit_settings (id, token_to_credit_ratio)
VALUES (1, 1.0)
ON CONFLICT (id) DO NOTHING;

-- 6. AI使用记录表
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  paper_id UUID REFERENCES papers(id) ON DELETE SET NULL,
  service_type VARCHAR(20) NOT NULL CHECK (service_type IN (
    'polish', 'translate', 'expand', 'summarize', 'chat', 'outline', 'grammar', 'references', 'rewrite', 'discussion'
  )),
  credits_consumed INTEGER NOT NULL,
  input_tokens INTEGER,
  output_tokens INTEGER,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_ai_usage_logs_user_id ON ai_usage_logs(user_id);
CREATE INDEX idx_ai_usage_logs_paper_id ON ai_usage_logs(paper_id);
CREATE INDEX idx_ai_usage_logs_created_at ON ai_usage_logs(created_at);

-- 7. 论文版本历史表
CREATE TABLE IF NOT EXISTS paper_versions (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  paper_id UUID NOT NULL REFERENCES papers(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  version_number INTEGER NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_paper_versions_paper_id ON paper_versions(paper_id);
CREATE INDEX idx_paper_versions_version ON paper_versions(paper_id, version_number);

-- 8. 管理员表
CREATE TABLE IF NOT EXISTS admins (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  username VARCHAR(50) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  email VARCHAR(255),
  name VARCHAR(100),
  status VARCHAR(20) DEFAULT 'active' CHECK (status IN ('active', 'disabled')),
  last_login_at TIMESTAMP,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admins_username ON admins(username);
CREATE INDEX idx_admins_status ON admins(status);

CREATE TRIGGER update_admins_updated_at
  BEFORE UPDATE ON admins
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- 9. 管理员操作日志表
CREATE TABLE IF NOT EXISTS admin_operation_logs (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  admin_id UUID NOT NULL REFERENCES admins(id) ON DELETE CASCADE,
  operation_type VARCHAR(50) NOT NULL,
  target_type VARCHAR(50),
  target_id UUID,
  details JSONB,
  ip_address VARCHAR(45),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_admin_logs_admin_id ON admin_operation_logs(admin_id);
CREATE INDEX idx_admin_logs_operation_type ON admin_operation_logs(operation_type);
CREATE INDEX idx_admin_logs_created_at ON admin_operation_logs(created_at);

-- 10. 提示词阶段表
DO $$
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_type WHERE typname = 'prompt_template_scope') THEN
        CREATE TYPE prompt_template_scope AS ENUM ('system', 'user');
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE TABLE IF NOT EXISTS prompt_stages (
  id BIGSERIAL PRIMARY KEY,
  code VARCHAR(40) NOT NULL UNIQUE,
  display_name VARCHAR(80) NOT NULL,
  description TEXT,
  order_index SMALLINT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS prompt_templates (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  scope prompt_template_scope NOT NULL DEFAULT 'system',
  stage_id BIGINT NOT NULL REFERENCES prompt_stages(id) ON DELETE CASCADE,
  language_code VARCHAR(8) NOT NULL DEFAULT 'zh-CN',
  title VARCHAR(120) NOT NULL,
  content TEXT NOT NULL,
  variables JSONB NOT NULL DEFAULT '{}'::jsonb,
  owner_user_id UUID REFERENCES users(id) ON DELETE SET NULL,
  is_active BOOLEAN NOT NULL DEFAULT TRUE,
  version INTEGER NOT NULL DEFAULT 1,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT prompt_templates_scope_owner_chk CHECK (
    (scope = 'system' AND owner_user_id IS NULL) OR
    (scope = 'user' AND owner_user_id IS NOT NULL)
  )
);

CREATE INDEX idx_prompt_templates_stage_scope ON prompt_templates(stage_id, scope);
CREATE INDEX idx_prompt_templates_owner ON prompt_templates(owner_user_id);
CREATE INDEX idx_prompt_templates_active ON prompt_templates(is_active);

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_prompt_stages_updated_at'
    ) THEN
        CREATE TRIGGER update_prompt_stages_updated_at
            BEFORE UPDATE ON prompt_stages
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$ LANGUAGE plpgsql;

DO $$
BEGIN
    IF NOT EXISTS (
        SELECT 1
        FROM pg_trigger
        WHERE tgname = 'update_prompt_templates_updated_at'
    ) THEN
        CREATE TRIGGER update_prompt_templates_updated_at
            BEFORE UPDATE ON prompt_templates
            FOR EACH ROW
            EXECUTE FUNCTION update_updated_at_column();
    END IF;
END;
$$ LANGUAGE plpgsql;

-- 插入默认充值套餐
INSERT INTO recharge_packages (credits, price, bonus_credits, is_popular) VALUES
  (1000, 10.00, 0, FALSE),
  (5000, 45.00, 500, TRUE),
  (10000, 80.00, 2000, FALSE),
  (50000, 350.00, 15000, FALSE);

-- 插入默认管理员账号（用户名：admin，密码：admin123）
-- 注意：这是 bcrypt 加密后的 'admin123'，实际部署时需要修改
INSERT INTO admins (username, password, email, name) VALUES
  ('admin', '$2b$10$N9qo8uLOickgx2ZMRZoMyeIjZAgcfl7p92ldGxad68LJZdL17lhWy', 'admin@example.com', '系统管理员');
