import React, { useEffect, useState } from 'react';
import { Zap, Sun, Moon, Settings } from 'lucide-react';

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
        const res = await fetch('/health', { signal: AbortSignal.timeout(3000) });
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
        <div className="w-7 h-7 rounded-lg bg-cyan-600 flex items-center justify-center">
          <Zap className="w-4 h-4 text-white" fill="currentColor" />
        </div>
        <span className="font-semibold text-gray-900 dark:text-zinc-100 text-sm tracking-tight">
          码帧 <span className="text-cyan-500 font-medium">TutorReel</span>
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
          {isDark ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
        </button>

        <button
          onClick={onSettingsOpen}
          className="w-8 h-8 rounded-lg text-gray-400 dark:text-zinc-400 hover:text-gray-600 dark:hover:text-zinc-200 hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center transition-colors"
          title="AI 服务配置"
        >
          <Settings className="w-4 h-4" />
        </button>
      </div>
    </header>
  );
};
