import React, { useState } from 'react';
import { Player } from '@remotion/player';
import { TopBar } from './components/ui/TopBar';
import { Sidebar } from './components/ui/Sidebar';
import { SettingsModal } from './components/ui/SettingsModal';
import { Toast, useToast } from './components/ui/Toast';
import { BatchEditor } from './components/editor/BatchEditor';
import { GenericExplainerVideo } from './Composition';
import { useVideoStore } from './stores/videoStore';
import { useWorkflowStore } from './stores/workflowStore';
import { usePluginStore } from './stores/pluginStore';
import { useTheme } from './hooks/useTheme';
import { hasApiConfig, getApiConfigForRequest } from './services/apiConfig';
import { LeetCodeProblemData } from './types/problem';
import { getCurrentTier } from './services/licenseStore';
import { addToHistory } from './services/historyStore';
import { HistoryPanel } from './components/ui/HistoryPanel';
import { LicenseModal } from './components/ui/LicenseModal';

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { videoData, draftStatus, setVideoData, updateAudio } = useVideoStore();
  const { isGeneratingAudio, setIsGeneratingAudio, isExporting, setIsExporting,
          exportProgress, setExportProgress, exportStatus, setExportStatus } = useWorkflowStore();
  const { activePlugin, setActivePluginId, allPlugins } = usePluginStore();
  const { toastMessage, showToast, setToastMessage } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
  const [licenseOpen, setLicenseOpen] = useState(false);
  const [apiConfigured, setApiConfigured] = useState(hasApiConfig);
  const [activeSection, setActiveSection] = useState<string>(allPlugins[0]?.id ?? 'java_interview');

  const handleSectionChange = (section: string) => {
    setActiveSection(section);
    if (section !== 'history' && section !== 'batch') {
      setActivePluginId(section);
    }
  };

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
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const iv = videoData as any;
        body.problemReading = iv.question;
        body.explanation = iv.explanation;
      }

      const res = await fetch('http://localhost:3001/api/generate-audio', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      });

      if (!res.ok) throw new Error('Failed to generate audio');
      const { audioUrl, durationInFrames, subtitles } = await res.json();
      updateAudio(audioUrl, durationInFrames, subtitles);
      showToast('配音已生成', '音频已更新，视频将自动同步。', 'success');
      addToHistory({ ...videoData, audioUrl, durationInFrames });
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
      const tier = getCurrentTier();
      const res = await fetch('http://localhost:3001/api/export', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoData, showWatermark: tier === 'free' }),
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
        } catch { /* ignore poll errors */ }
      }, 1000);
    } catch {
      showToast('导出失败', '无法连接到渲染服务，请检查终端日志。', 'error');
      setIsExporting(false);
      setExportProgress(null);
    }
  };

  const tier = getCurrentTier();
  const EditorComponent = activePlugin?.EditorComponent;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100">
      <TopBar onSettingsOpen={() => setSettingsOpen(true)} isDark={isDark} onThemeToggle={toggleTheme} />
      <Sidebar plugins={allPlugins} activeSection={activeSection} onSelect={handleSectionChange} />
      <SettingsModal
        open={settingsOpen}
        onClose={() => { setSettingsOpen(false); setApiConfigured(hasApiConfig()); }}
        onLicenseOpen={() => setLicenseOpen(true)}
      />
      <LicenseModal open={licenseOpen} onClose={() => setLicenseOpen(false)} />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      <div className="pl-16 pt-16 min-h-screen">
        {activeSection === 'batch' ? (
          <div className="p-6"><BatchEditor /></div>
        ) : activeSection === 'history' ? (
          <div className="p-6">
            <HistoryPanel onRestore={(data) => {
              setVideoData(data);
              setActivePluginId(data.type);
              setActiveSection(data.type);
            }} />
          </div>
        ) : (
          <div className="flex gap-0 h-[calc(100vh-4rem)]">
            {/* Editor panel ~45% */}
            <div className="w-[45%] overflow-y-auto p-6 border-r border-gray-200 dark:border-zinc-800">
              {!apiConfigured && (
                <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center gap-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">
                    未配置 API Key，AI 解析功能将使用后端默认密钥（如无则报错）。
                  </p>
                  <button
                    onClick={() => setSettingsOpen(true)}
                    className="text-sm font-semibold text-amber-900 dark:text-amber-200 underline underline-offset-2"
                  >
                    立即配置
                  </button>
                </div>
              )}
              {EditorComponent && (
                <EditorComponent
                  initialData={videoData.type === activePlugin?.id ? videoData : undefined}
                  onChange={data => setVideoData(data, activePlugin?.id === 'leetcode' ? 'programming' : 'standard')}
                  onSubmit={data => setVideoData(data)}
                />
              )}
            </div>

            {/* Preview panel ~55% */}
            <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
              {/* Visual style selector */}
              {activePlugin && activePlugin.templates.length > 1 && (
                <div className="flex items-center gap-2 flex-wrap">
                  {activePlugin.templates.map(tpl => (
                    <button
                      key={tpl.id}
                      onClick={() => setVideoData({ ...videoData, templateId: tpl.id })}
                      className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-colors ${
                        (videoData.templateId ?? activePlugin.defaultTemplateId) === tpl.id
                          ? 'border-indigo-500 bg-indigo-50 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300'
                          : 'border-gray-200 dark:border-zinc-700 text-gray-500 dark:text-zinc-400 hover:border-gray-300'
                      }`}
                    >
                      {tpl.name}
                    </button>
                  ))}
                </div>
              )}

              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-950 aspect-video relative">
                  <Player
                    component={GenericExplainerVideo as React.FC<{ data: typeof videoData; showWatermark?: boolean }>}
                    inputProps={{ data: videoData, showWatermark: tier === 'free' }}
                    durationInFrames={videoData.durationInFrames || 500}
                    fps={30}
                    compositionWidth={1920}
                    compositionHeight={1080}
                    style={{ width: '100%', height: '100%' }}
                    controls
                    loop={!!videoData.audioUrl}
                    autoPlay={!!videoData.audioUrl}
                  />
                  {!videoData.audioUrl && (
                    <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 bg-zinc-950/80 pointer-events-none">
                      <div className="w-11 h-11 rounded-xl bg-zinc-800 border border-zinc-700 flex items-center justify-center">
                        <svg className="w-5 h-5 text-zinc-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <p className="text-sm text-zinc-300 font-medium">点击左侧「生成配音预览」</p>
                    </div>
                  )}
                </div>
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
                    {Math.round((videoData.durationInFrames || 500) / 30)}s
                  </span>
                  {videoData.audioUrl && (
                    <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1">
                      <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />
                      已有配音
                    </span>
                  )}
                  {tier === 'free' && (
                    <span className="text-xs text-amber-600 dark:text-amber-400 bg-amber-50 dark:bg-amber-950/30 px-2 py-0.5 rounded-md">
                      Free 版（含水印）
                    </span>
                  )}
                </div>
              </div>

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
                      渲染中…{exportProgress !== null ? ` ${Math.round(exportProgress * 100)}%` : ''}
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

              {exportProgress !== null && exportStatus !== 'done' && exportStatus !== 'failed' && (
                <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 px-4 py-3">
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
