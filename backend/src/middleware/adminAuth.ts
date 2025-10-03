import { Request, Response, NextFunction } from 'express';
import jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'your-secret-key-change-in-production';

export interface AdminRequest extends Request {
  adminId?: string;
}

export const adminAuthMiddleware = (req: AdminRequest, res: Response, next: NextFunction) => {
  try {
    const token = req.headers.authorization?.replace('Bearer ', '');

    if (!token) {
      return res.status(401).json({ error: '未提供认证令牌' });
    }

    const decoded = jwt.verify(token, JWT_SECRET) as { adminId: string; type: string };

    // 验证是否为管理员令牌
    if (decoded.type !== 'admin') {
      return res.status(403).json({ error: '无权访问管理员接口' });
    }

    req.adminId = decoded.adminId;
    next();
  } catch (error) {
    return res.status(401).json({ error: '无效的认证令牌' });
  }
};
