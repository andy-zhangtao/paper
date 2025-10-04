import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import pool from '../config/database';
import { AuthRequest } from '../middleware/auth';
import * as aiService from '../services/aiService';

/**
 * 保存版本
 */
export const createVersion = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId } = req.params;
    const { content, manual } = req.body;
    const userId = req.userId!;

    if (!content) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '内容不能为空',
        },
      });
    }

    // 检查论文是否属于当前用户
    const [papers] = await pool.query(
      'SELECT id, title FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    // 获取上一个版本用于生成变更摘要
    const [lastVersion] = await pool.query(
      `SELECT content FROM paper_versions
       WHERE paper_id = ?
       ORDER BY created_at DESC
       LIMIT 1`,
      [paperId]
    );

    let changeSummary = '初始版本';

    // 如果有上一个版本,生成变更摘要
    if (Array.isArray(lastVersion) && lastVersion.length > 0) {
      const lastContent = JSON.parse((lastVersion[0] as any).content);
      changeSummary = await aiService.generateChangeSummary(
        JSON.stringify(lastContent),
        JSON.stringify(content)
      );
    }

    // 保存版本
    const versionId = uuidv4();
    const now = new Date();

    await pool.query(
      `INSERT INTO paper_versions (id, paper_id, content, change_summary, is_manual, created_at)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [versionId, paperId, JSON.stringify(content), changeSummary, manual ? 1 : 0, now]
    );

    return res.status(201).json({
      success: true,
      data: {
        version_id: versionId,
        change_summary: changeSummary,
        created_at: now.toISOString(),
      },
    });
  } catch (error) {
    console.error('保存版本错误:', error);
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
 * 获取版本列表
 */
export const getVersions = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId } = req.params;
    const userId = req.userId!;

    // 检查论文是否属于当前用户
    const [papers] = await pool.query(
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    // 查询版本列表
    const [versions] = await pool.query(
      `SELECT id, change_summary, is_manual, created_at
       FROM paper_versions
       WHERE paper_id = ?
       ORDER BY created_at DESC`,
      [paperId]
    );

    return res.status(200).json({
      success: true,
      data: versions,
    });
  } catch (error) {
    console.error('获取版本列表错误:', error);
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
 * 版本对比
 */
export const compareVersions = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId } = req.params;
    const { from, to } = req.query;
    const userId = req.userId!;

    if (!from || !to) {
      return res.status(400).json({
        success: false,
        error: {
          code: 'VALIDATION_ERROR',
          message: '缺少from或to参数',
        },
      });
    }

    // 检查论文是否属于当前用户
    const [papers] = await pool.query(
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    // 获取两个版本的内容
    const [versions] = await pool.query(
      `SELECT id, content FROM paper_versions
       WHERE paper_id = ? AND id IN (?, ?)`,
      [paperId, from, to]
    );

    if (!Array.isArray(versions) || versions.length !== 2) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '版本不存在',
        },
      });
    }

    const fromVersion = (versions as any[]).find((v) => v.id === from);
    const toVersion = (versions as any[]).find((v) => v.id === to);

    // 简单的diff实现(实际应用中需要用专业diff库)
    const fromContent = JSON.parse(fromVersion.content);
    const toContent = JSON.parse(toVersion.content);

    const diff = generateSimpleDiff(fromContent, toContent);

    return res.status(200).json({
      success: true,
      data: {
        diff,
      },
    });
  } catch (error) {
    console.error('版本对比错误:', error);
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
 * 回滚版本
 */
export const restoreVersion = async (req: AuthRequest, res: Response) => {
  try {
    const { paperId, versionId } = req.params;
    const userId = req.userId!;

    // 检查论文是否属于当前用户
    const [papers] = await pool.query(
      'SELECT id FROM papers WHERE id = ? AND user_id = ?',
      [paperId, userId]
    );

    if (!Array.isArray(papers) || papers.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '论文不存在',
        },
      });
    }

    // 获取版本内容
    const [versions] = await pool.query(
      'SELECT content FROM paper_versions WHERE id = ? AND paper_id = ?',
      [versionId, paperId]
    );

    if (!Array.isArray(versions) || versions.length === 0) {
      return res.status(404).json({
        success: false,
        error: {
          code: 'NOT_FOUND',
          message: '版本不存在',
        },
      });
    }

    const versionContent = JSON.parse((versions[0] as any).content);

    // 更新论文内容
    const now = new Date();
    await pool.query(
      'UPDATE papers SET content = ?, updated_at = ? WHERE id = ?',
      [JSON.stringify(versionContent), now, paperId]
    );

    return res.status(200).json({
      success: true,
      message: '已回滚至该版本',
    });
  } catch (error) {
    console.error('回滚版本错误:', error);
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
 * 简单的diff生成函数
 * 实际应用中应该使用专业库如 diff-match-patch
 */
function generateSimpleDiff(oldContent: any, newContent: any): any[] {
  const diff: any[] = [];

  // 简化实现:只对比字符串化后的内容
  const oldStr = JSON.stringify(oldContent, null, 2);
  const newStr = JSON.stringify(newContent, null, 2);

  if (oldStr !== newStr) {
    diff.push({
      type: 'modify',
      old: '原内容已更改',
      new: '新内容已应用',
    });
  }

  return diff;
}
