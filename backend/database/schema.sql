-- Paper AI Assistant 数据库结构

CREATE DATABASE IF NOT EXISTS paper_ai CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
USE paper_ai;

-- 1. 用户表
CREATE TABLE IF NOT EXISTS users (
  id VARCHAR(36) PRIMARY KEY,
  email VARCHAR(255) NOT NULL UNIQUE,
  password VARCHAR(255) NOT NULL,
  phone VARCHAR(20),
  credits INT NOT NULL DEFAULT 0,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_email (email)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 2. 论文表
CREATE TABLE IF NOT EXISTS papers (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  title VARCHAR(500) NOT NULL,
  content LONGTEXT,
  word_count INT DEFAULT 0,
  is_archived BOOLEAN DEFAULT FALSE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 3. 积分流水表
CREATE TABLE IF NOT EXISTS credit_transactions (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  type ENUM('recharge', 'consume', 'refund', 'bonus') NOT NULL,
  amount INT NOT NULL,
  balance_after INT NOT NULL,
  description VARCHAR(500),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  INDEX idx_user_id (user_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 4. 充值套餐表
CREATE TABLE IF NOT EXISTS recharge_packages (
  id VARCHAR(36) PRIMARY KEY,
  credits INT NOT NULL,
  price DECIMAL(10,2) NOT NULL,
  bonus_credits INT DEFAULT 0,
  is_popular BOOLEAN DEFAULT FALSE,
  is_active BOOLEAN DEFAULT TRUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_is_active (is_active)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 5. 充值订单表
CREATE TABLE IF NOT EXISTS recharge_orders (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  package_id VARCHAR(36) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,
  credits INT NOT NULL,
  status ENUM('pending', 'success', 'failed', 'refunded') DEFAULT 'pending',
  payment_method VARCHAR(50),
  payment_id VARCHAR(255),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (package_id) REFERENCES recharge_packages(id),
  INDEX idx_user_id (user_id),
  INDEX idx_status (status),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 6. AI使用记录表
CREATE TABLE IF NOT EXISTS ai_usage_logs (
  id VARCHAR(36) PRIMARY KEY,
  user_id VARCHAR(36) NOT NULL,
  paper_id VARCHAR(36),
  service_type ENUM('polish', 'translate', 'expand', 'summarize', 'chat') NOT NULL,
  credits_consumed INT NOT NULL,
  input_tokens INT,
  output_tokens INT,
  model VARCHAR(100),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE SET NULL,
  INDEX idx_user_id (user_id),
  INDEX idx_paper_id (paper_id),
  INDEX idx_created_at (created_at)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 7. 论文版本历史表
CREATE TABLE IF NOT EXISTS paper_versions (
  id VARCHAR(36) PRIMARY KEY,
  paper_id VARCHAR(36) NOT NULL,
  content LONGTEXT NOT NULL,
  version_number INT NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (paper_id) REFERENCES papers(id) ON DELETE CASCADE,
  INDEX idx_paper_id (paper_id),
  INDEX idx_version (paper_id, version_number)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- 插入默认充值套餐
INSERT INTO recharge_packages (id, credits, price, bonus_credits, is_popular) VALUES
  (UUID(), 1000, 10.00, 0, FALSE),
  (UUID(), 5000, 45.00, 500, TRUE),
  (UUID(), 10000, 80.00, 2000, FALSE),
  (UUID(), 50000, 350.00, 15000, FALSE);
