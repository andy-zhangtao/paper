/**
 * 系统常量配置
 * 集中管理所有业务常量,避免硬编码
 */

/**
 * AI积分消耗配置
 */
export const AI_CREDITS_COST = {
  polish: parseInt(process.env.CREDITS_COST_POLISH || '15'),        // 段落润色
  outline: parseInt(process.env.CREDITS_COST_OUTLINE || '10'),      // 生成大纲
  grammar: parseInt(process.env.CREDITS_COST_GRAMMAR || '20'),      // 语法检查
  references: parseInt(process.env.CREDITS_COST_REFERENCES || '10'), // 参考文献
  rewrite: parseInt(process.env.CREDITS_COST_REWRITE || '50'),      // 降重改写
  discussion: parseInt(process.env.CREDITS_COST_DISCUSSION || '20'), // AI讨论
};

/**
 * 运营奖励配置
 */
export const REWARDS = {
  // 注册奖励
  registration: parseInt(process.env.REWARD_REGISTRATION || '100'),

  // 签到奖励
  dailyCheckin: parseInt(process.env.REWARD_DAILY_CHECKIN || '5'),

  // 邀请奖励
  inviter: parseInt(process.env.REWARD_INVITER || '100'),  // 邀请人
  invitee: parseInt(process.env.REWARD_INVITEE || '50'),   // 被邀请人
};

/**
 * OpenRouter模型配置
 */
export const AI_MODELS = {
  // 默认模型(性价比高)
  default: process.env.OPENROUTER_MODEL_DEFAULT || 'openai/gpt-3.5-turbo',

  // 高级模型(用于复杂任务)
  premium: process.env.OPENROUTER_MODEL_PREMIUM || 'openai/gpt-4-turbo',

  // 廉价模型(用于简单任务)
  cheap: process.env.OPENROUTER_MODEL_CHEAP || 'openai/gpt-3.5-turbo',
};

/**
 * AI调用参数配置
 */
export const AI_PARAMS = {
  temperature: parseFloat(process.env.AI_TEMPERATURE || '0.7'),
  maxTokens: parseInt(process.env.AI_MAX_TOKENS || '2000'),
  timeout: parseInt(process.env.AI_TIMEOUT || '30000'), // 30秒
};

/**
 * 分页配置
 */
export const PAGINATION = {
  defaultPage: 1,
  defaultLimit: parseInt(process.env.PAGINATION_DEFAULT_LIMIT || '10'),
  maxLimit: parseInt(process.env.PAGINATION_MAX_LIMIT || '100'),
};

/**
 * 限流配置(请求次数/分钟)
 */
export const RATE_LIMITS = {
  // 免费用户
  free: {
    ai: parseInt(process.env.RATE_LIMIT_FREE_AI || '10'),           // AI接口: 10次/分钟
    upload: parseInt(process.env.RATE_LIMIT_FREE_UPLOAD || '5'),    // 上传: 5次/分钟
    paper: parseInt(process.env.RATE_LIMIT_FREE_PAPER || '20'),     // 创建论文: 20次/小时
  },

  // VIP用户
  vip: {
    ai: parseInt(process.env.RATE_LIMIT_VIP_AI || '30'),            // AI接口: 30次/分钟
    upload: parseInt(process.env.RATE_LIMIT_VIP_UPLOAD || '20'),    // 上传: 20次/分钟
    paper: parseInt(process.env.RATE_LIMIT_VIP_PAPER || '-1'),      // 创建论文: 无限制
  },
};

/**
 * 文本长度限制
 */
export const TEXT_LIMITS = {
  paperTitle: parseInt(process.env.LIMIT_PAPER_TITLE || '200'),          // 论文标题
  polishText: parseInt(process.env.LIMIT_POLISH_TEXT || '5000'),         // 润色段落
  grammarText: parseInt(process.env.LIMIT_GRAMMAR_TEXT || '10000'),      // 语法检查
  rewriteText: parseInt(process.env.LIMIT_REWRITE_TEXT || '3000'),       // 降重改写
  discussionQuestion: parseInt(process.env.LIMIT_DISCUSSION_Q || '500'),  // 讨论问题
  discussionContext: parseInt(process.env.LIMIT_DISCUSSION_CTX || '2000'), // 讨论上下文
  changeSummary: parseInt(process.env.LIMIT_CHANGE_SUMMARY || '100'),    // 变更摘要
};

/**
 * 邀请码配置
 */
export const INVITE_CODE = {
  length: parseInt(process.env.INVITE_CODE_LENGTH || '9'), // 邀请码长度(不含分隔符)
  separator: process.env.INVITE_CODE_SEPARATOR || '-',      // 分隔符
  segmentLength: parseInt(process.env.INVITE_CODE_SEGMENT || '3'), // 每段长度
  chars: process.env.INVITE_CODE_CHARS || 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', // 可用字符
};

/**
 * JWT配置
 */
export const JWT_CONFIG = {
  secret: process.env.JWT_SECRET || 'fallback-secret',
  refreshSecret: process.env.JWT_REFRESH_SECRET || 'fallback-refresh-secret',
  expiresIn: process.env.JWT_EXPIRES_IN || '7d',
  refreshExpiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d',
  expiresInSeconds: 604800, // 7天(秒)
};

/**
 * 密码强度要求
 */
export const PASSWORD_POLICY = {
  minLength: parseInt(process.env.PASSWORD_MIN_LENGTH || '8'),
  requireUppercase: process.env.PASSWORD_REQUIRE_UPPERCASE !== 'false',
  requireLowercase: process.env.PASSWORD_REQUIRE_LOWERCASE !== 'false',
  requireNumber: process.env.PASSWORD_REQUIRE_NUMBER !== 'false',
  requireSpecial: process.env.PASSWORD_REQUIRE_SPECIAL === 'true',
};

/**
 * 版本管理配置
 */
export const VERSION_CONFIG = {
  maxVersions: parseInt(process.env.MAX_VERSIONS_PER_PAPER || '50'),   // 每篇论文最多保存版本数
  autoSaveInterval: parseInt(process.env.AUTO_SAVE_INTERVAL || '300'), // 自动保存间隔(秒)
  enableAutoSave: process.env.ENABLE_AUTO_SAVE !== 'false',            // 是否启用自动保存
};

/**
 * 签到配置
 */
export const CHECKIN_CONFIG = {
  maxStreakDays: parseInt(process.env.MAX_STREAK_DAYS || '365'),      // 最大连续签到天数
  streakBonusThreshold: parseInt(process.env.STREAK_BONUS_THRESHOLD || '7'), // 连续N天有额外奖励
  streakBonusCredits: parseInt(process.env.STREAK_BONUS_CREDITS || '10'),    // 连续签到奖励积分
};

/**
 * 文件上传配置
 */
export const UPLOAD_CONFIG = {
  maxFileSize: parseInt(process.env.UPLOAD_MAX_FILE_SIZE || '10485760'), // 10MB
  allowedImageTypes: (process.env.UPLOAD_ALLOWED_IMAGE_TYPES || 'image/jpeg,image/png,image/gif,image/webp').split(','),
  allowedDocTypes: (process.env.UPLOAD_ALLOWED_DOC_TYPES || 'application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document').split(','),
};

/**
 * 业务规则配置
 */
export const BUSINESS_RULES = {
  // 邮箱限制
  allowedEmailDomains: (process.env.ALLOWED_EMAIL_DOMAINS || 'edu.cn').split(','),

  // 论文数量限制
  maxPapersPerUser: parseInt(process.env.MAX_PAPERS_PER_USER || '100'),    // 免费用户
  maxPapersPerVip: parseInt(process.env.MAX_PAPERS_PER_VIP || '-1'),       // VIP无限制

  // 讨论数量限制
  maxDiscussionsPerPaper: parseInt(process.env.MAX_DISCUSSIONS_PER_PAPER || '100'),

  // 最小充值积分
  minRechargeCredits: parseInt(process.env.MIN_RECHARGE_CREDITS || '100'),
};

/**
 * 错误重试配置
 */
export const RETRY_CONFIG = {
  maxRetries: parseInt(process.env.MAX_RETRIES || '3'),
  retryDelay: parseInt(process.env.RETRY_DELAY || '1000'), // 毫秒
  retryMultiplier: parseFloat(process.env.RETRY_MULTIPLIER || '2'), // 指数退避
};

/**
 * 日志配置
 */
export const LOG_CONFIG = {
  level: process.env.LOG_LEVEL || 'info',
  enableConsole: process.env.LOG_ENABLE_CONSOLE !== 'false',
  enableFile: process.env.LOG_ENABLE_FILE === 'true',
  filePath: process.env.LOG_FILE_PATH || './logs/app.log',
};

/**
 * CORS配置
 */
export const CORS_CONFIG = {
  origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
  credentials: true,
};

/**
 * 前端URL配置
 */
export const FRONTEND_URL = process.env.FRONTEND_URL || 'http://localhost:5173';

/**
 * 服务器配置
 */
export const SERVER_CONFIG = {
  port: parseInt(process.env.PORT || '3000'),
  env: process.env.NODE_ENV || 'development',
  isDevelopment: process.env.NODE_ENV !== 'production',
  isProduction: process.env.NODE_ENV === 'production',
};

/**
 * 数据库配置
 */
export const DB_CONFIG = {
  host: process.env.DB_HOST || 'localhost',
  port: parseInt(process.env.DB_PORT || '3306'),
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'paper_ai',
  connectionLimit: parseInt(process.env.DB_CONNECTION_LIMIT || '10'),
};

/**
 * 支付配置(预留)
 */
export const PAYMENT_CONFIG = {
  alipay: {
    appId: process.env.ALIPAY_APP_ID || '',
    privateKey: process.env.ALIPAY_PRIVATE_KEY || '',
    publicKey: process.env.ALIPAY_PUBLIC_KEY || '',
    gateway: process.env.ALIPAY_GATEWAY || 'https://openapi.alipay.com/gateway.do',
    notifyUrl: process.env.ALIPAY_NOTIFY_URL || '',
  },
  packages: {
    basic: {
      credits: parseInt(process.env.PACKAGE_BASIC_CREDITS || '1000'),
      price: parseFloat(process.env.PACKAGE_BASIC_PRICE || '9.9'),
    },
    standard: {
      credits: parseInt(process.env.PACKAGE_STANDARD_CREDITS || '2000'),
      price: parseFloat(process.env.PACKAGE_STANDARD_PRICE || '29.9'),
    },
    premium: {
      credits: parseInt(process.env.PACKAGE_PREMIUM_CREDITS || '5000'),
      price: parseFloat(process.env.PACKAGE_PREMIUM_PRICE || '99.9'),
    },
  },
};

/**
 * 缓存配置
 */
export const CACHE_CONFIG = {
  enabled: process.env.CACHE_ENABLED === 'true',
  ttl: parseInt(process.env.CACHE_TTL || '3600'), // 1小时
  redis: {
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD || '',
    db: parseInt(process.env.REDIS_DB || '0'),
  },
};

/**
 * 导出所有配置的类型定义(供TypeScript使用)
 */
export type Config = {
  AI_CREDITS_COST: typeof AI_CREDITS_COST;
  REWARDS: typeof REWARDS;
  AI_MODELS: typeof AI_MODELS;
  AI_PARAMS: typeof AI_PARAMS;
  PAGINATION: typeof PAGINATION;
  RATE_LIMITS: typeof RATE_LIMITS;
  TEXT_LIMITS: typeof TEXT_LIMITS;
  INVITE_CODE: typeof INVITE_CODE;
  JWT_CONFIG: typeof JWT_CONFIG;
  PASSWORD_POLICY: typeof PASSWORD_POLICY;
  VERSION_CONFIG: typeof VERSION_CONFIG;
  CHECKIN_CONFIG: typeof CHECKIN_CONFIG;
  UPLOAD_CONFIG: typeof UPLOAD_CONFIG;
  BUSINESS_RULES: typeof BUSINESS_RULES;
  RETRY_CONFIG: typeof RETRY_CONFIG;
  LOG_CONFIG: typeof LOG_CONFIG;
  CORS_CONFIG: typeof CORS_CONFIG;
  FRONTEND_URL: typeof FRONTEND_URL;
  SERVER_CONFIG: typeof SERVER_CONFIG;
  DB_CONFIG: typeof DB_CONFIG;
  PAYMENT_CONFIG: typeof PAYMENT_CONFIG;
  CACHE_CONFIG: typeof CACHE_CONFIG;
};
