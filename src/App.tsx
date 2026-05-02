import React, { useState, useRef, useCallback } from 'react';
import { Player } from '@remotion/player';
import { ProblemEditor } from './components/editor/ProblemEditor';
import { ProgrammingEditor } from './components/editor/ProgrammingEditor';
import { BatchEditor } from './components/editor/BatchEditor';
import { TopBar } from './components/ui/TopBar';
import { SettingsModal } from './components/ui/SettingsModal';
import { Toast, useToast } from './components/ui/Toast';
import { GenericExplainerVideo } from './Composition';
import { AnyProblemData, JavaInterviewProblemData, LeetCodeProblemData } from './types/problem';
import { hasApiConfig, getApiConfigForRequest } from './services/apiConfig';
import { useTheme } from './hooks/useTheme';

const initialSampleData: AnyProblemData = {
  id: 'sample-2',
  type: 'java_interview',
  title: 'Java基础 - 面向对象',
  question: '什么是多态？它的实现机制是什么？',
  keyPoints: [
    '多态是指同一个方法调用，由于对象不同可能会有不同的行为',
    '三个必要条件：继承、重写、父类引用指向子类对象',
    '底层原理：动态绑定（后期绑定），通过方法表（Method Table）实现',
  ],
  explanation:
    '这道题是Java面试中非常高频的基础题。简单来说，多态就是允许不同类的对象对同一消息做出响应。从代码中可以看到，虽然 myDog 的声明类型是 Animal，但在运行时它实际指向的是 Dog 对象，因此调用 makeSound 时，执行的是 Dog 类中重写的方法。这种在运行期间判断引用对象的实际类型，根据其实际的类型调用其相应的方法，就是动态绑定。',
};

const DRAFT_KEYS = { standard: 'pex_draft_standard', programming: 'pex_draft_programming' } as const;

function loadDraft(key: string): AnyProblemData | null {
  try {
    const raw = localStorage.getItem(key);
    return raw ? (JSON.parse(raw) as AnyProblemData) : null;
  } catch {
    return null;
  }
}

const typeLabels: Record<string, string> = {
  java_interview: '八股 / 面试题',
  grammar: '英语语法题',
  leetcode: '算法图解',
};

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();

  const [standardInitial] = useState<AnyProblemData>(
    () => loadDraft(DRAFT_KEYS.standard) ?? initialSampleData
  );
  const [programmingInitial] = useState<AnyProblemData | undefined>(
    () => loadDraft(DRAFT_KEYS.programming) ?? undefined
  );

  const [videoData, setVideoData] = useState<AnyProblemData>(standardInitial);
  const [editorMode, setEditorMode] = useState<'standard' | 'programming' | 'batch'>('standard');
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(hasApiConfig);

  // Audio generation state (lifted from editors)
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  // Export state (lifted from editors)
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState<string>('');

  const saveTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);
  const statusTimerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  const { toastMessage, showToast, setToastMessage } = useToast();

  const handleChange = useCallback((mode: 'standard' | 'programming', data: AnyProblemData) => {
    setVideoData(data);
    clearTimeout(saveTimerRef.current);
    saveTimerRef.current = setTimeout(() => {
      try {
        localStorage.setItem(DRAFT_KEYS[mode], JSON.stringify(data));
        setDraftStatus('saved');
        clearTimeout(statusTimerRef.current);
        statusTimerRef.current = setTimeout(() => setDraftStatus('idle'), 2000);
      } catch {
        // localStorage full — fail silently
      }
    }, 1000);
  }, []);

  const handleGenerateAudio = async () => {
    setIsGeneratingAudio(true);
    try {
      const id = videoData.id || Date.now().toString();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const body: Record<string, any> = { id, ...getApiConfigForRequest() };

      if (videoData.type === 'leetcode') {
        const lc = videoData as LeetCodeProblemData;
        body.problemReading = lc.problemReading;
        body.stepsText = JSON.stringify(lc.steps);
      } else {
        const iv = videoData as JavaInterviewProblemData;
        body.problemReading = iv.question;
        body.explanation = iv.explanation;
      }

      const res = await fetch('http://localhost:3001/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to generate audio');
      const { audioUrl, durationInFrames } = await res.json();
      setVideoData(prev => ({ ...prev, audioUrl, durationInFrames }));
      showToast('配音已生成', '音频已更新，视频将自动同步。', 'success');
    } catch {
      showToast('生成失败', '无法连接到后端，请确认服务已启动。', 'error');
    } finally {
      setIsGeneratingAudio(false);
    }
  };

  const handleExportVideo = async () => {
    setIsExporting(true);
    setExportProgress(0);
    setExportStatus('pending');
    try {
      const res = await fetch('http://localhost:3001/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoData }),
      });
      if (!res.ok) throw new Error('Export request failed');

      const { taskId } = await res.json();
      showToast('导出已启动', '视频正在后台渲染中…', 'success');

      const poll = setInterval(async () => {
        try {
          const statusRes = await fetch(`http://localhost:3001/api/export/status/${taskId}`);
          if (!statusRes.ok) return;
          const task = await statusRes.json();
          setExportProgress(task.progress);
          setExportStatus(task.status);

          if (task.status === 'done') {
            clearInterval(poll);
            setIsExporting(false);
            showToast('导出完成', '视频已渲染完毕，即将下载。', 'success');
            window.open(`http://localhost:3001${task.outputUrl}`, '_blank');
          } else if (task.status === 'failed') {
            clearInterval(poll);
            setIsExporting(false);
            showToast('导出失败', task.error || '未知错误', 'error');
          }
        } catch {
          /* ignore poll errors */
        }
      }, 1000);
    } catch {
      showToast('导出失败', '无法连接到渲染服务，请检查终端日志。', 'error');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100 selection:bg-indigo-100 selection:text-indigo-900 pt-16">
      <TopBar
        editorMode={editorMode}
        onModeChange={setEditorMode}
        onSettingsOpen={() => setSettingsOpen(true)}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />
      <SettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setApiConfigured(hasApiConfig()); }}
      />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {!apiConfigured && (
        <div className="fixed top-16 inset-x-0 z-40 bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-6 py-2.5 flex items-center justify-center gap-3">
          <svg className="w-4 h-4 text-amber-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <p className="text-sm text-amber-800 dark:text-amber-300">
            未配置 API Key，AI 解析功能将使用后端默认密钥（如无则报错）。
          </p>
          <button
            onClick={() => setSettingsOpen(true)}
            className="text-sm font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2 hover:opacity-75 transition-opacity whitespace-nowrap"
          >
            立即配置
          </button>
        </div>
      )}

      <div className={`max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-6 ${!apiConfigured ? 'pt-16' : ''}`}>
        {editorMode === 'batch' ? (
          <BatchEditor />
        ) : (
          <div className="flex flex-col lg:flex-row gap-6 items-start">
            {/* Left: Editor (42%) */}
            <div className="w-full lg:w-[42%] order-2 lg:order-1">
              {editorMode === 'standard' ? (
                <ProblemEditor
                  initialData={standardInitial}
                  onChange={(data) => handleChange('standard', data)}
                  onSubmit={(data) => setVideoData(data)}
                />
              ) : (
                <ProgrammingEditor
                  initialData={programmingInitial}
                  onChange={(data) => handleChange('programming', data)}
                  onSubmit={(data) => setVideoData(data)}
                />
              )}
            </div>

            {/* Right: Video Preview (58%) */}
            <div className="w-full lg:w-[58%] order-1 lg:order-2 lg:sticky lg:top-24 flex flex-col gap-4">
              {/* Player card */}
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-950 aspect-video relative">
                  <Player
                    component={GenericExplainerVideo as React.FC<{ data: AnyProblemData }>}
                    inputProps={{ data: videoData }}
                    durationInFrames={videoData.durationInFrames || 500}
                    fps={30}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    style={{ width: '100%', height: '100%' }}
                    controls
                    loop
                  />
                  {!videoData.audioUrl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 pointer-events-none">
                      <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-center px-8">
                        <p className="text-sm text-zinc-300 font-medium">点击左侧「生成配音预览」</p>
                        <p className="text-xs text-zinc-500 mt-1">加载音频后视频将自动播放</p>
                      </div>
                    </div>
                  )}
                </div>

                {/* Status bar */}
                <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap border-t border-gray-100 dark:border-zinc-800">
                  {draftStatus === 'saved' && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                      <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
                      </svg>
                      草稿已保存
                    </span>
                  )}
                  <span className="text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {typeLabels[videoData.type] ?? videoData.type}
                  </span>
                  <span className="text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {Math.round((videoData.durationInFrames || 500) / 30)}s
                  </span>
                  {videoData.audioUrl && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      已有配音
                    </span>
                  )}
                </div>
              </div>

              {/* Action buttons */}
              <div className="flex gap-3">
                <button
                  onClick={handleGenerateAudio}
                  disabled={isGeneratingAudio}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 disabled:cursor-not-allowed text-white text-sm font-semibold rounded-xl transition-colors"
                >
                  {isGeneratingAudio ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      生成中…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11a7 7 0 01-7 7m0 0a7 7 0 01-7-7m7 7v4m0 0H8m4 0h4m-4-8a3 3 0 01-3-3V5a3 3 0 116 0v6a3 3 0 01-3 3z" />
                      </svg>
                      生成配音预览
                    </>
                  )}
                </button>
                <button
                  onClick={handleExportVideo}
                  disabled={isExporting}
                  className="flex-1 flex items-center justify-center gap-2 py-3 px-4 bg-gray-900 dark:bg-zinc-100 hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-60 disabled:cursor-not-allowed text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-colors"
                >
                  {isExporting ? (
                    <>
                      <svg className="animate-spin h-4 w-4" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                      </svg>
                      渲染中…
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                      </svg>
                      导出 MP4
                    </>
                  )}
                </button>
              </div>

              {/* Export progress */}
              {exportProgress !== null && exportStatus !== 'done' && exportStatus !== 'failed' && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 px-4 py-3 animate-in fade-in duration-200">
                  <div className="flex justify-between text-xs font-medium text-gray-500 dark:text-zinc-400 mb-2">
                    <span>{exportStatus === 'pending' ? '等待渲染队列…' : '正在渲染视频…'}</span>
                    <span>{Math.round(exportProgress * 100)}%</span>
                  </div>
                  <div className="w-full bg-gray-100 dark:bg-zinc-800 rounded-full h-1.5">
                    <div
                      className="bg-indigo-600 h-1.5 rounded-full transition-all duration-300"
                      style={{ width: `${exportProgress * 100}%` }}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
