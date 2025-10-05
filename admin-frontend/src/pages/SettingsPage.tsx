import { useEffect, useState } from 'react';
import { creditSettingsService } from '../services/creditSettingsService';

export default function SettingsPage() {
  const [ratio, setRatio] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadSettings = async () => {
      try {
        const data = await creditSettingsService.fetch();
        setRatio(data.token_to_credit_ratio.toString());
      } catch (err) {
        console.error('加载积分配置失败:', err);
        setError('加载配置失败，请稍后重试');
      } finally {
        setLoading(false);
      }
    };

    loadSettings();
  }, []);

  const handleSave = async () => {
    setError(null);
    setMessage(null);

    const parsed = Number(ratio);
    if (!Number.isFinite(parsed) || parsed <= 0) {
      setError('比例必须是大于0的数字');
      return;
    }

    try {
      setSaving(true);
      const data = await creditSettingsService.update(parsed);
      setRatio(data.token_to_credit_ratio.toString());
      setMessage('已更新积分消耗比例');
    } catch (err) {
      console.error('更新积分配置失败:', err);
      setError('保存失败，请重试');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="bg-white rounded-lg shadow p-6">加载中...</div>;
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">积分设置</h2>
        <p className="mt-2 text-sm text-gray-600">
          配置调用模型时的积分扣费比例，系统按照「token × 比例」扣除积分。
        </p>
      </div>

      <div className="bg-white rounded-lg shadow p-6 space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            每个 Token 消耗积分比例
          </label>
          <div className="flex items-center gap-3">
            <input
              type="number"
              min="0"
              step="0.0001"
              value={ratio}
              onChange={(e) => setRatio(e.target.value)}
              className="flex-1 px-3 py-2 border border-gray-300 rounded-lg"
              placeholder="例如 0.1 表示 1 token = 0.1 积分"
            />
            <button
              onClick={handleSave}
              disabled={saving}
              className={`px-4 py-2 rounded-lg text-white ${
                saving ? 'bg-blue-300 cursor-not-allowed' : 'bg-blue-600 hover:bg-blue-700'
              }`}
            >
              {saving ? '保存中…' : '保存'}
            </button>
          </div>
          <p className="mt-2 text-xs text-gray-500">
            建议设置为小数，例如 0.1 表示每消耗 10 个 token 扣除 1 积分。
          </p>
        </div>

        {message && <div className="text-sm text-green-600">{message}</div>}
        {error && <div className="text-sm text-red-600">{error}</div>}
      </div>
    </div>
  );
}
