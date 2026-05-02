import React, { useEffect, useState } from 'react';

type BackendStatus = 'checking' | 'connected' | 'disconnected';

interface TopBarProps {
  onSettingsOpen: () => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export const TopBar: React.FC<TopBarProps> = ({ onSettingsOpen, isDark, onThemeToggle }) => {
  const [backendStatus, setBackendStatus] = useState<BackendStatus>('checking');

  useEffect(() => {
    const check = async () => {
      try {
        const res = await fetch('http://localhost:3001/health', { signal: AbortSignal.timeout(3000) });
        setBackendStatus(res.ok ? 'connected' : 'disconnected');
      } catch {
        setBackendStatus('disconnected');
      }
    };
    check();
    const interval = setInterval(check, 10000);
    return () => clearInterval(interval);
  }, []);

  return (
    <header className="fixed top-0 inset-x-0 z-50 h-16 bg-white dark:bg-zinc-950 border-b border-gray-200 dark:border-zinc-800 flex items-center px-6 gap-4">
      <div className="flex items-center gap-2.5 shrink-0">
        <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center">
          <svg className="w-4 h-4 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M13 10V3L4 14h7v7l9-11h-7z" />
          </svg>
        </div>
        <span className="font-semibold text-gray-900 dark:text-zinc-100 text-sm tracking-tight">
          Problem Explainer <span className="text-indigo-600">Studio</span>
        </span>
      </div>

      <div className="flex-1" />

      <div className="flex items-center gap-2 shrink-0">
        <div className="flex items-center gap-1.5 text-xs font-medium">
          {backendStatus === 'checking' && (
            <span className="flex items-center gap-1.5 text-gray-400 dark:text-zinc-500">
              <span className="w-1.5 h-1.5 rounded-full bg-gray-400 dark:bg-zinc-500" />
              连接中
            </span>
          )}
          {backendStatus === 'connected' && (
            <span className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-500">
              <span className="relative flex h-1.5 w-1.5">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75" />
                <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500" />
              </span>
              后端已连接
            </span>
          )}
          {backendStatus === 'disconnected' && (
            <span className="flex items-center gap-1.5 text-red-500 dark:text-red-400">
              <span className="w-1.5 h-1.5 rounded-full bg-red-500" />
              <span>未运行</span>
              <code className="font-mono text-red-400 dark:text-red-500 text-[11px]">npm run dev:server</code>
            </span>
          )}
        </div>

        <div className="w-px h-4 bg-gray-200 dark:bg-zinc-700" />

        <button
          onClick={onThemeToggle}
          className="w-8 h-8 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title={isDark ? '切换浅色模式' : '切换深色模式'}
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
            </svg>
          )}
        </button>

        <button
          onClick={onSettingsOpen}
          className="w-8 h-8 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title="AI 服务配置"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
          </svg>
        </button>
      </div>
    </header>
  );
};
