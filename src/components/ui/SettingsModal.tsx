import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import { ApiConfig, PRESETS, getApiConfig, saveApiConfig } from '../../services/apiConfig';

interface SettingsModalProps {
  open: boolean;
  onClose: () => void;
}

type TestStatus = 'idle' | 'testing' | 'success' | 'error';

export const SettingsModal: React.FC<SettingsModalProps> = ({ open, onClose }) => {
  const [preset, setPreset] = useState<ApiConfig['preset']>('deepseek');
  const [apiKey, setApiKey] = useState('');
  const [baseURL, setBaseURL] = useState(PRESETS.deepseek.baseURL);
  const [showKey, setShowKey] = useState(false);
  const [testStatus, setTestStatus] = useState<TestStatus>('idle');
  const [testMessage, setTestMessage] = useState('');
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    if (open) {
      const config = getApiConfig();
      if (config.preset) setPreset(config.preset);
      if (config.apiKey) setApiKey(config.apiKey);
      if (config.baseURL) setBaseURL(config.baseURL);
      setTestStatus('idle');
      setTestMessage('');
      setSaved(false);
    }
  }, [open]);

  const handlePresetChange = (p: ApiConfig['preset']) => {
    setPreset(p);
    if (p !== 'custom') {
      setBaseURL(PRESETS[p].baseURL);
    }
    setTestStatus('idle');
  };

  const handleTest = async () => {
    if (!apiKey.trim()) {
      setTestMessage('请先输入 API Key');
      setTestStatus('error');
      return;
    }
    setTestStatus('testing');
    setTestMessage('');
    try {
      const res = await fetch('/api/test-config', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey, baseURL }),
      });
      const data = await res.json();
      if (data.success) {
        setTestStatus('success');
        setTestMessage('连接成功！API Key 有效。');
      } else {
        setTestStatus('error');
        setTestMessage(data.error || '连接失败');
      }
    } catch {
      setTestStatus('error');
      setTestMessage('无法连接到后端服务，请先启动后端。');
    }
  };

  const handleSave = () => {
    saveApiConfig({ preset, apiKey, baseURL });
    setSaved(true);
    setTimeout(() => {
      setSaved(false);
      onClose();
    }, 800);
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-[2px]"
        onClick={onClose}
      />

      {/* Drawer */}
      <div className="absolute right-0 top-0 h-full w-full max-w-md bg-white dark:bg-zinc-900 border-l border-gray-200 dark:border-zinc-800 flex flex-col animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100 dark:border-zinc-800">
          <div className="flex items-center gap-2.5">
            <div className="w-7 h-7 rounded-lg bg-gray-100 dark:bg-zinc-800 flex items-center justify-center">
              <svg className="w-4 h-4 text-gray-600 dark:text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
              </svg>
            </div>
            <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">AI 服务配置</h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-lg text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {/* Preset */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-3">服务商预设</label>
            <div className="grid grid-cols-3 gap-2">
              {(Object.keys(PRESETS) as ApiConfig['preset'][]).map((p) => (
                <button
                  key={p}
                  onClick={() => handlePresetChange(p)}
                  className={`py-2.5 px-3 rounded-xl text-sm font-semibold border-2 transition-all duration-150 ${
                    preset === p
                      ? 'border-cyan-500 bg-cyan-50 dark:bg-cyan-500/10 text-cyan-700 dark:text-cyan-400'
                      : 'border-gray-200 dark:border-zinc-700 bg-white dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:border-gray-300 dark:hover:border-zinc-600'
                  }`}
                >
                  {PRESETS[p].label}
                </button>
              ))}
            </div>
          </div>

          {/* API Key */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">API Key</label>
            <div className="relative">
              <input
                type={showKey ? 'text' : 'password'}
                value={apiKey}
                onChange={(e) => { setApiKey(e.target.value); setTestStatus('idle'); }}
                placeholder="sk-..."
                className="w-full px-4 py-3 pr-12 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-colors text-sm font-mono"
              />
              <button
                type="button"
                onClick={() => setShowKey(!showKey)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors"
              >
                {showKey ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858.908a3 3 0 114.243 4.243M9.878 9.878l4.242 4.242M9.88 9.88l-3.29-3.29m7.532 7.532l3.29 3.29M3 3l3.59 3.59m0 0A9.953 9.953 0 0112 5c4.478 0 8.268 2.943 9.543 7a10.025 10.025 0 01-4.132 5.411m0 0L21 21" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
            <p className="text-xs text-gray-400 dark:text-zinc-500 mt-1.5">API Key 仅存储在本地浏览器，不会上传到任何服务器。</p>
          </div>

          {/* Base URL */}
          <div>
            <label className="block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5">Base URL</label>
            <input
              type="text"
              value={baseURL}
              onChange={(e) => { setBaseURL(e.target.value); setTestStatus('idle'); }}
              placeholder="https://api.deepseek.com"
              className="w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-cyan-500/20 focus:border-cyan-500 outline-none transition-colors text-sm font-mono"
            />
          </div>

          {/* Connection test result */}
          {testStatus !== 'idle' && (
            <div className={`flex items-center gap-2.5 px-4 py-3 rounded-xl text-sm font-medium animate-in fade-in duration-200 ${
              testStatus === 'testing' ? 'bg-gray-50 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400' :
              testStatus === 'success' ? 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-700 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-900/30' :
              'bg-red-50 dark:bg-red-900/20 text-red-700 dark:text-red-400 border border-red-100 dark:border-red-900/30'
            }`}>
              {testStatus === 'testing' && (
                <svg className="animate-spin h-4 w-4 shrink-0" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
              )}
              {testStatus === 'success' && (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
              )}
              {testStatus === 'error' && (
                <svg className="w-4 h-4 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              )}
              <span>{testStatus === 'testing' ? '正在测试连接…' : testMessage}</span>
            </div>
          )}

          {/* Usage tip */}
          <div className="bg-gray-50 dark:bg-zinc-800 rounded-xl p-4 border border-gray-100 dark:border-zinc-700">
            <p className="text-xs text-gray-500 dark:text-zinc-400 leading-relaxed">
              <span className="font-semibold text-gray-600 dark:text-zinc-300">使用提示：</span>
              配置后，所有 AI 解析请求将使用此 API Key 和服务商。若留空，将使用后端{' '}
              <code className="font-mono text-cyan-600 dark:text-cyan-400">.env</code>{' '}
              中的默认配置。
            </p>
          </div>
        </div>

        {/* Footer */}
        <div className="px-6 py-4 border-t border-gray-100 dark:border-zinc-800 flex items-center gap-3">
          <button
            onClick={handleTest}
            disabled={testStatus === 'testing'}
            className="flex-1 py-2.5 px-4 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
          >
            {testStatus === 'testing' ? (
              <>
                <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                </svg>
                测试中…
              </>
            ) : '测试连接'}
          </button>
          <button
            onClick={handleSave}
            className={`flex-1 py-2.5 px-4 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
              saved
                ? 'bg-emerald-500 text-white'
                : 'bg-cyan-600 hover:bg-cyan-700 text-white'
            }`}
          >
            {saved ? (
              <>
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                </svg>
                已保存
              </>
            ) : '保存配置'}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
};
