import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { validateLicenseKey, clearLicense, getCurrentTier, getLicense } from '../../services/licenseStore';

interface LicenseModalProps {
  open: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ open, onClose }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentTier = getCurrentTier();
  const license = getLicense();

  const handleActivate = async () => {
    if (!key.trim()) { setError('请输入 License Key'); return; }
    setLoading(true); setError('');
    try {
      await validateLicenseKey(key.trim());
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '激活失败，请检查 Key 是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    clearLicense();
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">License 激活</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className={`rounded-xl p-3 mb-5 flex items-center gap-3 ${
          currentTier === 'pro'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
            : 'bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700'
        }`}>
          <span className="text-lg">{currentTier === 'pro' ? '✨' : '🆓'}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              当前：{currentTier === 'pro' ? 'Pro 版' : 'Free 版'}
            </p>
            {currentTier === 'pro' && license && (
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {license.expiresAt === -1 ? '永久有效' : `有效期至 ${new Date(license.expiresAt).toLocaleDateString('zh-CN')}`}
              </p>
            )}
            {currentTier === 'free' && (
              <p className="text-xs text-gray-500 dark:text-zinc-400">每月 5 次导出（含水印）</p>
            )}
          </div>
          {currentTier === 'pro' && (
            <button onClick={handleDeactivate} className="ml-auto text-xs text-red-500 hover:text-red-600">停用</button>
          )}
        </div>

        {currentTier === 'free' && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">License Key</label>
              <input
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="PEX-XXXX-XXXX-XXXX"
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              {success && <p className="text-xs text-emerald-600 mt-1.5">✓ 激活成功！</p>}
            </div>
            <button
              onClick={handleActivate}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? '验证中…' : '激活 Pro 版'}
            </button>
            <p className="text-xs text-center text-gray-400 dark:text-zinc-500 mt-3">
              购买 License Key：
              <a href="https://afdian.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline ml-1">爱发电</a>
              <span className="mx-1">·</span>
              <a href="https://gumroad.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Gumroad</a>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
