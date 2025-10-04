import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import { addCredits } from './creditsController';
import { REWARDS, INVITE_CODE, FRONTEND_URL } from '../config/constants';

/**
 * 每日签到
 */
export const checkin = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // 检查今日是否已签到
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const [existingCheckin] = await pool.query(
      `SELECT id FROM user_checkins
       WHERE user_id = ? AND DATE(checkin_date) = DATE(?)`,
      [userId, today]
    );

    if (Array.isArray(existingCheckin) && existingCheckin.length > 0) {
      return res.status(409).json({
        success: false,
        error: {
          code: 'ALREADY_CHECKED_IN',
          message: '今日已签到',
        },
      });
    }

    // 获取连续签到天数
    const [lastCheckin] = await pool.query(
      `SELECT checkin_date FROM user_checkins
       WHERE user_id = ?
       ORDER BY checkin_date DESC
       LIMIT 1`,
      [userId]
    );

    let streakDays = 1;

    if (Array.isArray(lastCheckin) && lastCheckin.length > 0) {
      const lastDate = new Date((lastCheckin[0] as any).checkin_date);
      lastDate.setHours(0, 0, 0, 0);
      const yesterday = new Date(today);
      yesterday.setDate(yesterday.getDate() - 1);

      if (lastDate.getTime() === yesterday.getTime()) {
        // 连续签到
        const [streakResult] = await pool.query(
          `SELECT COUNT(*) as count FROM user_checkins
           WHERE user_id = ?
           AND checkin_date >= DATE_SUB(?, INTERVAL 30 DAY)`,
          [userId, today]
        );
        streakDays = ((streakResult as any)[0].count || 0) + 1;
      }
    }

    // 记录签到
    await pool.query(
      'INSERT INTO user_checkins (id, user_id, checkin_date) VALUES (?, ?, ?)',
      [uuidv4(), userId, new Date()]
    );

    // 增加积分
    const newBalance = await addCredits(userId, REWARDS.dailyCheckin, '每日签到');

    return res.status(200).json({
      success: true,
      data: {
        credits_earned: REWARDS.dailyCheckin,
        credits_total: newBalance,
        streak_days: streakDays,
      },
    });
  } catch (error) {
    console.error('签到错误:', error);
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
 * 生成邀请码
 */
export const generateInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;

    // 查询用户是否已有邀请码
    const [existingCode] = await pool.query(
      'SELECT invite_code FROM users WHERE id = ?',
      [userId]
    );

    let inviteCode = (existingCode as any)[0]?.invite_code;

    // 如果没有邀请码,生成一个
    if (!inviteCode) {
      inviteCode = generateRandomCode();

      await pool.query(
        'UPDATE users SET invite_code = ? WHERE id = ?',
        [inviteCode, userId]
      );
    }

    const inviteUrl = `${FRONTEND_URL}/register?invite=${inviteCode}`;

    return res.status(200).json({
      success: true,
      data: {
        code: inviteCode,
        invite_url: inviteUrl,
        rewards: {
          inviter: REWARDS.inviter,
          invitee: REWARDS.invitee,
        },
      },
    });
  } catch (error) {
    console.error('生成邀请码错误:', error);
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
 * 使用邀请码
 */
export const redeemInviteCode = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId!;
    const { code } = req.body;

    if (!code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '邀请码不能为空',
        },
      });
    }

    // 检查用户是否已使用过邀请码
    const [currentUser] = await pool.query(
      'SELECT used_invite_code FROM users WHERE id = ?',
      [userId]
    );

    if ((currentUser as any)[0]?.used_invite_code) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'INVITE_CODE_USED',
          message: '您已使用过邀请码',
        },
      });
    }

    // 查找邀请人
    const [inviter] = await pool.query(
      'SELECT id, invite_code FROM users WHERE invite_code = ?',
      [code]
    );

    if (!Array.isArray(inviter) || inviter.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'INVALID_INVITE_CODE',
          message: '邀请码无效',
        },
      });
    }

    const inviterId = (inviter[0] as any).id;

    // 不能使用自己的邀请码
    if (inviterId === userId) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'SELF_INVITE',
          message: '不能使用自己的邀请码',
        },
      });
    }

    // 给邀请人和被邀请人加积分
    await Promise.all([
      addCredits(inviterId, REWARDS.inviter, '邀请好友奖励'),
      addCredits(userId, REWARDS.invitee, '使用邀请码奖励'),
    ]);

    // 标记用户已使用邀请码
    await pool.query(
      'UPDATE users SET used_invite_code = ? WHERE id = ?',
      [code, userId]
    );

    // 记录邀请关系
    await pool.query(
      'INSERT INTO user_invites (id, inviter_id, invitee_id, invite_code, created_at) VALUES (?, ?, ?, ?, ?)',
      [uuidv4(), inviterId, userId, code, new Date()]
    );

    // 获取新余额
    const [userBalance] = await pool.query(
      'SELECT credits FROM users WHERE id = ?',
      [userId]
    );

    const creditsTotal = (userBalance as any)[0].credits;

    return res.status(200).json({
      success: true,
      data: {
        credits_earned: REWARDS.invitee,
        credits_total: creditsTotal,
      },
    });
  } catch (error) {
    console.error('使用邀请码错误:', error);
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
 * 生成随机邀请码
 */
function generateRandomCode(): string {
  const chars = INVITE_CODE.chars;
  const length = INVITE_CODE.length;
  const separator = INVITE_CODE.separator;
  const segmentLength = INVITE_CODE.segmentLength;

  let code = '';
  for (let i = 0; i < length; i++) {
    if (i > 0 && i % segmentLength === 0) {
      code += separator;
    }
    code += chars[Math.floor(Math.random() * chars.length)];
  }
  return code;
}
