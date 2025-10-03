import { Request, Response } from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import {
  validateEduEmail,
  validatePassword,
  validatePhone,
} from '../utils/validation';

/**
 * 用户注册
 * 限制：只允许edu.cn邮箱注册
 */
export const register = async (req: Request, res: Response) => {
  try {
    const { email, password, phone } = req.body;

    // 1. 验证邮箱格式（必须是edu.cn后缀）
    if (!validateEduEmail(email)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_EMAIL',
          message: '只允许使用edu.cn后缀的教育邮箱注册',
        },
      });
    }

    // 2. 验证密码强度
    const passwordValidation = validatePassword(password);
    if (!passwordValidation.valid) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'WEAK_PASSWORD',
          message: passwordValidation.message,
        },
      });
    }

    // 3. 验证手机号（可选）
    if (phone && !validatePhone(phone)) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVALID_PHONE',
          message: '手机号格式不正确',
        },
      });
    }

    // 4. 检查邮箱是否已注册
    const [existingUsers] = await pool.query(
      'SELECT id FROM users WHERE email = ?',
      [email]
    );

    if (Array.isArray(existingUsers) && existingUsers.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'EMAIL_EXISTS',
          message: '该邮箱已被注册',
        },
      });
    }

    // 5. 加密密码
    const hashedPassword = await bcrypt.hash(password, 10);

    // 6. 创建用户（初始赠送100积分）
    const userId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO users (id, email, password, phone, credits, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [userId, email, hashedPassword, phone || null, 100, now, now]
    );

    // 7. 生成JWT token
    const accessToken = jwt.sign(
      { userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // 8. 返回用户信息和token
    return res.status(201).json({
      success: true,
      data: {
        user: {
          id: userId,
          email,
          credits: 100,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 604800, // 7天（秒）
        },
      },
      message: '注册成功',
    });
  } catch (error) {
    console.error('注册错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
};

/**
 * 用户登录
 */
export const login = async (req: Request, res: Response) => {
  try {
    const { email, password } = req.body;

    // 1. 查找用户
    const [users] = await pool.query(
      'SELECT id, email, password, credits FROM users WHERE email = ?',
      [email]
    );

    if (!Array.isArray(users) || users.length === 0) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误',
        },
      });
    }

    const user = users[0] as any;

    // 2. 验证密码
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({
        success: false,
        error: {
          code: 'INVALID_CREDENTIALS',
          message: '邮箱或密码错误',
        },
      });
    }

    // 3. 生成JWT token
    const accessToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    const refreshToken = jwt.sign(
      { userId: user.id },
      process.env.JWT_REFRESH_SECRET!,
      { expiresIn: process.env.JWT_REFRESH_EXPIRES_IN || '30d' }
    );

    // 4. 返回用户信息和token
    return res.status(200).json({
      success: true,
      data: {
        user: {
          id: user.id,
          email: user.email,
          credits: user.credits,
        },
        tokens: {
          access_token: accessToken,
          refresh_token: refreshToken,
          expires_in: 604800,
        },
      },
      message: '登录成功',
    });
  } catch (error) {
    console.error('登录错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
};

/**
 * 刷新Token
 */
export const refreshToken = async (req: Request, res: Response) => {
  try {
    const { refresh_token } = req.body;

    if (!refresh_token) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'MISSING_REFRESH_TOKEN',
          message: '缺少刷新令牌',
        },
      });
    }

    // 验证refresh token
    const decoded = jwt.verify(
      refresh_token,
      process.env.JWT_REFRESH_SECRET!
    ) as { userId: string };

    // 生成新的access token
    const newAccessToken = jwt.sign(
      { userId: decoded.userId },
      process.env.JWT_SECRET!,
      { expiresIn: process.env.JWT_EXPIRES_IN || '7d' }
    );

    return res.status(200).json({
      success: true,
      data: {
        access_token: newAccessToken,
        expires_in: 604800,
      },
      message: 'Token刷新成功',
    });
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: {
        code: 'INVALID_REFRESH_TOKEN',
        message: '无效的刷新令牌',
      },
    });
  }
};
