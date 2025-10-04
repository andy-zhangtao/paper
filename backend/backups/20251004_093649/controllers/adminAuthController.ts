import { Request, Response } from 'express';
import bcrypt from 'bcrypt';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { RowDataPacket } from 'mysql2';
import { AdminRequest } from '../middleware/adminAuth';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

interface Admin extends RowDataPacket {
  id: string;
  username: string;
  password: string;
  email: string;
  name: string;
  status: 'active' | 'disabled';
  last_login_at: Date;
}

// 管理员登录
export const adminLogin = async (req: Request, res: Response) => {
  try {
    const { username, password } = req.body;

    if (!username || !password) {
      return res.status(400).json({ error: '用户名和密码不能为空' });
    }

    // 查询管理员
    const [admins] = await pool.query<Admin[]>(
      'SELECT * FROM admins WHERE username = ? AND status = "active"',
      [username]
    );

    if (admins.length === 0) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    const admin = admins[0];

    // 验证密码
    const isValidPassword = await bcrypt.compare(password, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '用户名或密码错误' });
    }

    // 更新最后登录时间
    await pool.query(
      'UPDATE admins SET last_login_at = NOW() WHERE id = ?',
      [admin.id]
    );

    // 生成 JWT token
    const token = jwt.sign(
      { adminId: admin.id, type: 'admin' },
      JWT_SECRET,
      { expiresIn: '24h' }
    );

    res.json({
      token,
      admin: {
        id: admin.id,
        username: admin.username,
        email: admin.email,
        name: admin.name
      }
    });
  } catch (error) {
    console.error('管理员登录失败:', error);
    res.status(500).json({ error: '登录失败' });
  }
};

// 获取当前管理员信息
export const getAdminProfile = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;

    const [admins] = await pool.query<Admin[]>(
      'SELECT id, username, email, name, status, last_login_at FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    res.json({ admin: admins[0] });
  } catch (error) {
    console.error('获取管理员信息失败:', error);
    res.status(500).json({ error: '获取管理员信息失败' });
  }
};

// 修改管理员密码
export const changeAdminPassword = async (req: AdminRequest, res: Response) => {
  try {
    const adminId = req.adminId;
    const { oldPassword, newPassword } = req.body;

    if (!oldPassword || !newPassword) {
      return res.status(400).json({ error: '旧密码和新密码不能为空' });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({ error: '新密码长度至少为6位' });
    }

    // 查询管理员
    const [admins] = await pool.query<Admin[]>(
      'SELECT * FROM admins WHERE id = ?',
      [adminId]
    );

    if (admins.length === 0) {
      return res.status(404).json({ error: '管理员不存在' });
    }

    const admin = admins[0];

    // 验证旧密码
    const isValidPassword = await bcrypt.compare(oldPassword, admin.password);
    if (!isValidPassword) {
      return res.status(401).json({ error: '旧密码错误' });
    }

    // 加密新密码
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // 更新密码
    await pool.query(
      'UPDATE admins SET password = ? WHERE id = ?',
      [hashedPassword, adminId]
    );

    res.json({ message: '密码修改成功' });
  } catch (error) {
    console.error('修改密码失败:', error);
    res.status(500).json({ error: '修改密码失败' });
  }
};

// 记录管理员操作日志
export const logAdminOperation = async (
  adminId: string,
  operationType: string,
  targetType?: string,
  targetId?: string,
  details?: any,
  ipAddress?: string
) => {
  try {
    await pool.query(
      `INSERT INTO admin_operation_logs
       (id, admin_id, operation_type, target_type, target_id, details, ip_address)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        uuidv4(),
        adminId,
        operationType,
        targetType || null,
        targetId || null,
        details ? JSON.stringify(details) : null,
        ipAddress || null
      ]
    );
  } catch (error) {
    console.error('记录操作日志失败:', error);
  }
};
