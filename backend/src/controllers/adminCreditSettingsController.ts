import { Response } from 'express';
import { AdminRequest } from '../middleware/adminAuth';
import { getCreditSettings, updateTokenToCreditRatio } from '../services/creditSettingsService';
import { logAdminOperation } from './adminAuthController';

export const fetchCreditSettings = async (req: AdminRequest, res: Response) => {
  try {
    const settings = await getCreditSettings();
    res.json({
      token_to_credit_ratio: settings.token_to_credit_ratio,
    });
  } catch (error) {
    console.error('获取积分比例配置失败:', error);
    res.status(500).json({ error: '获取积分配置失败' });
  }
};

export const updateCreditSettings = async (req: AdminRequest, res: Response) => {
  try {
    const { token_to_credit_ratio } = req.body as { token_to_credit_ratio: number };

    const ratio = Number(token_to_credit_ratio);
    if (!Number.isFinite(ratio) || ratio <= 0) {
      return res.status(400).json({ error: '比例必须是大于0的数字' });
    }

    const updated = await updateTokenToCreditRatio(ratio);

    await logAdminOperation(
      req.adminId!,
      'update_credit_ratio',
      'system',
      undefined,
      { token_to_credit_ratio: updated.token_to_credit_ratio },
      req.ip
    );

    res.json({
      token_to_credit_ratio: updated.token_to_credit_ratio,
    });
  } catch (error) {
    console.error('更新积分比例配置失败:', error);
    res.status(500).json({ error: '更新积分配置失败' });
  }
};
