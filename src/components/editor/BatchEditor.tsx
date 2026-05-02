import React, { useState, useEffect } from 'react';
import { Toast, useToast } from '../ui/Toast';
import { ProblemType } from '../../types/problem';
import { getApiConfigForRequest } from '../../services/apiConfig';

interface ParsedItem {
  title: string;
  question: string;
  type: ProblemType;
}

export const BatchEditor: React.FC = () => {
  const [inputType, setInputType] = useState<'text' | 'url'>('text');
  const [inputValue, setInputValue] = useState('');
  const [aiModel, setAiModel] = useState('deepseek-v4-flash');
  const [isSplitting, setIsSplitting] = useState(false);
  const [parsedItems, setParsedItems] = useState<ParsedItem[]>([]);
  const [jobId, setJobId] = useState<string | null>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const [jobStatus, setJobStatus] = useState<any>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [mergedVideoUrl, setMergedVideoUrl] = useState<string | null>(null);
  const { toastMessage, showToast, setToastMessage } = useToast();

  useEffect(() => {
    if (!jobId) return;

    const interval = setInterval(async () => {
      try {
        const res = await fetch(`http://localhost:3001/api/batch/status/${jobId}`);
        if (res.ok) {
          const data = await res.json();
          setJobStatus(data);
          if (data.status === 'done' || data.status === 'failed') {
            clearInterval(interval);
          }
        }
      } catch (e) {
        console.error('Failed to fetch job status', e);
      }
    }, 1500);

    return () => clearInterval(interval);
  }, [jobId]);

  const handleSplit = async () => {
    if (!inputValue.trim()) return;
    setIsSplitting(true);
    setParsedItems([]);
    setJobId(null);
    setJobStatus(null);
    setMergedVideoUrl(null);

    try {
      const endpoint = inputType === 'text' ? '/api/batch/split-text' : '/api/batch/scrape';
      const apiCfg = getApiConfigForRequest();
      const payload = inputType === 'text'
        ? { rawText: inputValue, model: aiModel, ...apiCfg }
        : { url: inputValue, model: aiModel };

      const res = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to split');
      }

      const data = await res.json();
      setParsedItems(data.problems || []);
    } catch (error) {
      showToast('提取失败', error instanceof Error ? error.message : '未知错误', 'error');
    } finally {
      setIsSplitting(false);
    }
  };

  const handleStartBatch = async () => {
    if (parsedItems.length === 0) return;
    try {
      const res = await fetch('http://localhost:3001/api/batch/start', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ items: parsedItems })
      });

      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error || 'Failed to start batch');
      }

      const data = await res.json();
      setJobId(data.jobId);
    } catch (error) {
      showToast('启动失败', error instanceof Error ? error.message : '无法启动批量任务', 'error');
    }
  };

  const handleMergeVideos = async () => {
    if (!jobId) return;
    setIsMerging(true);
    try {
      const res = await fetch(`http://localhost:3001/api/batch/merge/${jobId}`, {
        method: 'POST',
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Failed to merge videos');
      setMergedVideoUrl(data.videoUrl);
      showToast('合并成功', '所有片段已合并，点击下方链接下载。', 'success');
    } catch (error) {
      showToast('合并失败', error instanceof Error ? error.message : '合并过程中出现未知错误', 'error');
    } finally {
      setIsMerging(false);
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending': return '等待中';
      case 'parsing': return 'AI 解析中';
      case 'tts': return '语音合成中';
      case 'rendering': return '视频渲染中';
      case 'done': return '完成';
      case 'failed': return '失败';
      default: return status;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'pending': return 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400';
      case 'parsing': return 'bg-blue-100 text-blue-700 dark:bg-blue-900/30 dark:text-blue-400';
      case 'tts': return 'bg-purple-100 text-purple-700 dark:bg-purple-900/30 dark:text-purple-400';
      case 'rendering': return 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400';
      case 'done': return 'bg-emerald-100 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-400';
      case 'failed': return 'bg-red-100 text-red-700 dark:bg-red-900/30 dark:text-red-400';
      default: return 'bg-gray-100 text-gray-500 dark:bg-zinc-800 dark:text-zinc-400';
    }
  };

  const inputCls = 'w-full px-4 py-3 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-xl text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors';

  return (
    <div className="h-full flex flex-col bg-white dark:bg-zinc-900 overflow-hidden">
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Header */}
      <div className="px-8 py-6 border-b border-gray-100 dark:border-zinc-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-gray-900 dark:text-zinc-100">批量生产流水线</h2>
          <p className="text-sm text-gray-400 dark:text-zinc-500 mt-0.5">支持长文本智能拆分与八股文网站抓取</p>
        </div>
        <div className="relative">
          <select
            value={aiModel}
            onChange={(e) => setAiModel(e.target.value)}
            className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer"
          >
            <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
            <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
            <option value="gpt-4o-mini">GPT-4o Mini</option>
          </select>
          <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
            <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
            </svg>
          </div>
        </div>
      </div>

      <div className="p-8 flex-1 overflow-y-auto">
        {!jobId ? (
          <>
            <div className="mb-6">
              {/* Input type toggle */}
              <div className="flex gap-2 mb-4">
                {[
                  { id: 'text', label: '长文本拆分' },
                  { id: 'url', label: '八股文 URL 抓取' },
                ].map(({ id, label }) => (
                  <button
                    key={id}
                    onClick={() => setInputType(id as 'text' | 'url')}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                      inputType === id
                        ? 'bg-indigo-600 text-white'
                        : 'bg-gray-100 dark:bg-zinc-800 text-gray-600 dark:text-zinc-400 hover:bg-gray-200 dark:hover:bg-zinc-700'
                    }`}
                  >
                    {label}
                  </button>
                ))}
              </div>

              {inputType === 'text' ? (
                <textarea
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  rows={7}
                  placeholder="在此粘贴包含多道八股文面试题的长文本、面经总结等..."
                  className={`${inputCls} resize-none`}
                />
              ) : (
                <input
                  type="url"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="输入面经网页 URL，例如：https://javaguide.cn/..."
                  className={inputCls}
                />
              )}

              <div className="mt-4 flex justify-end">
                <button
                  onClick={handleSplit}
                  disabled={isSplitting || !inputValue.trim()}
                  className="flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {isSplitting && (
                    <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                  )}
                  {isSplitting ? '智能拆分中…' : '提取题目列表'}
                </button>
              </div>
            </div>

            {parsedItems.length > 0 && (
              <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
                <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50">
                  <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">已提取 {parsedItems.length} 道题目</h3>
                  <button
                    onClick={handleStartBatch}
                    className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                    </svg>
                    开始批量生产
                  </button>
                </div>
                <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-[400px] overflow-y-auto">
                  {parsedItems.map((item, idx) => (
                    <div key={idx} className="p-4 hover:bg-gray-50 dark:hover:bg-zinc-800/50 transition-colors">
                      <div className="flex gap-3">
                        <span className="shrink-0 w-6 h-6 rounded-full bg-indigo-100 dark:bg-indigo-500/20 text-indigo-700 dark:text-indigo-400 flex items-center justify-center text-xs font-bold">
                          {idx + 1}
                        </span>
                        <div>
                          <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100 mb-0.5">{item.title}</h4>
                          <p className="text-xs text-gray-500 dark:text-zinc-400 line-clamp-2">{item.question}</p>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        ) : (
          <div className="bg-white dark:bg-zinc-900 border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between bg-gray-50 dark:bg-zinc-800/50">
              <div>
                <h3 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">任务队列执行中</h3>
                <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">系统将自动依序完成：AI解析 → 语音合成 → 视频渲染</p>
              </div>
              {jobStatus?.status === 'done' && (
                <div className="flex gap-2">
                  {mergedVideoUrl ? (
                    <a
                      href={`http://localhost:3001${mergedVideoUrl}`}
                      download
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      下载完整长视频
                    </a>
                  ) : (
                    <button
                      onClick={handleMergeVideos}
                      disabled={isMerging}
                      className="flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white text-xs font-semibold rounded-lg transition-colors"
                    >
                      {isMerging && (
                        <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                        </svg>
                      )}
                      合并所有片段
                    </button>
                  )}
                  <button
                    onClick={() => { setJobId(null); setJobStatus(null); setMergedVideoUrl(null); }}
                    className="px-4 py-2 bg-gray-100 dark:bg-zinc-800 hover:bg-gray-200 dark:hover:bg-zinc-700 text-gray-700 dark:text-zinc-300 text-xs font-semibold rounded-lg transition-colors"
                  >
                    返回新建任务
                  </button>
                </div>
              )}
            </div>

            <div className="divide-y divide-gray-100 dark:divide-zinc-800 max-h-[600px] overflow-y-auto">
              {/* eslint-disable-next-line @typescript-eslint/no-explicit-any */}
              {jobStatus?.items.map((item: any, idx: number) => (
                <div key={item.id} className="p-4">
                  <div className="flex items-start justify-between gap-3 mb-3">
                    <div className="flex gap-3">
                      <span className="shrink-0 w-6 h-6 rounded-full bg-gray-100 dark:bg-zinc-800 text-gray-500 dark:text-zinc-400 flex items-center justify-center text-xs font-bold">
                        {idx + 1}
                      </span>
                      <div>
                        <h4 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">{item.title}</h4>
                        <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5 line-clamp-1">{item.question}</p>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-1.5 shrink-0">
                      <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${getStatusColor(item.status)}`}>
                        {getStatusText(item.status)}
                      </span>
                      {item.videoUrl && (
                        <a
                          href={`http://localhost:3001${item.videoUrl}`}
                          download
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-xs text-indigo-600 dark:text-indigo-400 hover:text-indigo-800 font-medium"
                        >
                          下载视频
                        </a>
                      )}
                    </div>
                  </div>

                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1 overflow-hidden">
                    <div
                      className={`h-1 rounded-full transition-all duration-500 ${
                        item.status === 'failed' ? 'bg-red-500' : 'bg-indigo-600'
                      }`}
                      style={{ width: `${item.progress}%` }}
                    />
                  </div>
                  {item.error && (
                    <p className="text-xs text-red-500 dark:text-red-400 mt-1.5">错误: {item.error}</p>
                  )}
                </div>
              ))}

              {!jobStatus && (
                <div className="p-12 flex justify-center">
                  <svg className="animate-spin h-8 w-8 text-indigo-500" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                  </svg>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
