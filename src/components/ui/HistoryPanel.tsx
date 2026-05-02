import React, { useState } from 'react';
import { HistoryEntry, getHistory, removeFromHistory, clearHistory } from '../../services/historyStore';
import { AnyProblemData } from '../../types/problem';

interface HistoryPanelProps {
  onRestore: (data: AnyProblemData) => void;
}

const TYPE_LABELS: Record<string, string> = {
  java_interview: '八股题', grammar: '语法题', leetcode: '算法题',
};

export const HistoryPanel: React.FC<HistoryPanelProps> = ({ onRestore }) => {
  const [entries, setEntries] = useState<HistoryEntry[]>(() => getHistory());

  const handleRemove = (id: string) => {
    removeFromHistory(id);
    setEntries(getHistory());
  };

  const handleClear = () => {
    if (!window.confirm('确认清空所有历史记录？')) return;
    clearHistory();
    setEntries([]);
  };

  return (
    <div className="max-w-2xl mx-auto">
      <div className="flex items-center justify-between mb-4">
        <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">历史记录</h2>
        {entries.length > 0 && (
          <button onClick={handleClear} className="text-xs text-red-500 hover:text-red-600 transition-colors">
            清空全部
          </button>
        )}
      </div>
      {entries.length === 0 ? (
        <p className="text-sm text-gray-400 dark:text-zinc-500 text-center py-12">暂无历史记录</p>
      ) : (
        <div className="space-y-2">
          {entries.map(entry => (
            <div key={entry.id}
              className="flex items-center gap-3 p-3 rounded-xl border border-gray-200 dark:border-zinc-800
                bg-white dark:bg-zinc-900 hover:border-indigo-300 dark:hover:border-indigo-700 transition-colors group">
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 dark:text-zinc-100 truncate">{entry.title}</p>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">
                  {TYPE_LABELS[entry.type] ?? entry.type} · {new Date(entry.timestamp).toLocaleDateString('zh-CN', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                </p>
              </div>
              <button
                onClick={() => onRestore(entry.data)}
                className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                恢复
              </button>
              <button
                onClick={() => handleRemove(entry.id)}
                className="w-6 h-6 flex items-center justify-center rounded-md text-gray-400 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-all"
              >
                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
