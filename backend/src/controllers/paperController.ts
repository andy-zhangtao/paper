import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { execute, query } from '../utils/pgQuery';
import { AuthRequest } from '../middleware/auth';

/**
 * 创建论文
 */
export const createPaper = async (req: AuthRequest, res: Response) => {
  try {
    const { title, content } = req.body;
    const userId = req.userId;

    if (!title) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '标题不能为空',
        },
      });
    }

    const paperId = uuidv4();
    const now = new Date();
    const paperContent = content || { type: 'doc', content: [] };

    await execute(
      pool,
      `INSERT INTO papers (id, user_id, title, content, word_count, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [paperId, userId, title, JSON.stringify(paperContent), 0, now, now]
    );

    return res.status(201).json({
      success: true,
      data: {
        id: paperId,
        title,
        word_count: 0,
        created_at: now.toISOString(),
      },
      message: '论文创建成功',
    });
  } catch (error) {
    console.error('创建论文错误:', error);
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
 * 获取论文列表
 */
export const getPapers = async (req: AuthRequest, res: Response) => {
  try {
    const userId = req.userId;
    const page = parseInt(req.query.page as string) || 1;
    const limit = parseInt(req.query.limit as string) || 10;
    const tag = req.query.tag as string;
    const offset = (page - 1) * limit;

    // 构建查询条件
    let sql = 'SELECT id, title, word_count, tags, updated_at FROM papers WHERE user_id = ?';
    const params: any[] = [userId];

    if (tag) {
      sql += ' AND JSON_CONTAINS(tags, ?)';
      params.push(JSON.stringify(tag));
    }

    sql += ' ORDER BY updated_at DESC LIMIT ? OFFSET ?';
    params.push(limit, offset);

    const [papers] = await query(
      pool,
      sql,
      params
    );

    // 获取总数
    let countSql = 'SELECT COUNT(*) as total FROM papers WHERE user_id = ?';
    const countParams: any[] = [userId];
    if (tag) {
      countSql += ' AND JSON_CONTAINS(tags, ?)';
      countParams.push(JSON.stringify(tag));
    }

    const [countResult] = await query<{ total: number }>(
      pool,
      countSql,
      countParams
    );
    const total = countResult[0]?.total ?? 0;

    return res.status(200).json({
      success: true,
      data: {
        items: papers,
        pagination: {
          total,
          page,
          limit,
        },
      },
    });
  } catch (error) {
    console.error('获取论文列表错误:', error);
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
 * 获取论文详情
 */
export const getPaper = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const [papers] = await query<{
      id: string;
      title: string;
      content: string;
      word_count: number;
      tags: string | null;
      created_at: Date;
      updated_at: Date;
    }>(
      pool,
      'SELECT id, title, content, word_count, tags, created_at, updated_at FROM papers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    const paper = papers[0];

    return res.status(200).json({
      success: true,
      data: {
        id: paper.id,
        title: paper.title,
        content: JSON.parse(paper.content),
        word_count: paper.word_count,
        tags: paper.tags ? JSON.parse(paper.tags) : [],
        created_at: paper.created_at,
        updated_at: paper.updated_at,
      },
    });
  } catch (error) {
    console.error('获取论文详情错误:', error);
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
 * 更新论文
 */
export const updatePaper = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;
    const { title, content, tags } = req.body;

    // 检查论文是否存在
    const [papers] = await query<{ id: string }>(
      pool,
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    const updates: string[] = [];
    const params: any[] = [];

    if (title !== undefined) {
      updates.push('title = ?');
      params.push(title);
    }

    if (content !== undefined) {
      updates.push('content = ?');
      params.push(JSON.stringify(content));

      // 计算字数（简单统计）
      const textContent = JSON.stringify(content);
      const wordCount = textContent.replace(/[^一-龥a-zA-Z0-9]/g, '').length;
      updates.push('word_count = ?');
      params.push(wordCount);
    }

    if (tags !== undefined) {
      updates.push('tags = ?');
      params.push(JSON.stringify(tags));
    }

    updates.push('updated_at = ?');
    params.push(new Date());

    params.push(id, userId);

    await execute(
      pool,
      `UPDATE papers SET ${updates.join(', ')} WHERE id = ? AND user_id = ?`,
      params
    );

    return res.status(200).json({
      success: true,
      data: {
        id,
        updated_at: new Date().toISOString(),
      },
      message: '论文更新成功',
    });
  } catch (error) {
    console.error('更新论文错误:', error);
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
 * 删除论文
 */
export const deletePaper = async (req: AuthRequest, res: Response) => {
  try {
    const { id } = req.params;
    const userId = req.userId;

    const result = await execute(
      pool,
      'DELETE FROM papers WHERE id = ? AND user_id = ?',
      [id, userId]
    );

    if (result.rowCount === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    return res.status(200).json({
      success: true,
      message: '论文已删除',
    });
  } catch (error) {
    console.error('删除论文错误:', error);
    return res.status(500).json({
      success: false,
      error: {
        code: 'INTERNAL_ERROR',
        message: '服务器内部错误',
      },
    });
  }
};
