import React, { useState } from 'react';
import { AnyProblemData } from '../../types/problem';
import { getApiConfigForRequest } from '../../services/apiConfig';

interface ProblemEditorProps {
  initialData?: AnyProblemData;
  onChange?: (data: AnyProblemData) => void;
  onSubmit: (data: AnyProblemData) => void;
}

const Chevron: React.FC<{ open: boolean }> = ({ open }) => (
  <svg
    className={`w-4 h-4 transition-transform duration-200 ${open ? 'rotate-180' : ''}`}
    fill="none" viewBox="0 0 24 24" stroke="currentColor"
  >
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
  </svg>
);

export const ProblemEditor: React.FC<ProblemEditorProps> = ({ initialData, onChange, onSubmit }) => {
  const [title, setTitle] = useState(
    initialData?.type === 'java_interview' ? initialData.title : 'Java基础 - 面向对象'
  );
  const [question, setQuestion] = useState(
    initialData?.type === 'java_interview' ? initialData.question : '什么是多态？它的实现机制是什么？'
  );
  const [explanation, setExplanation] = useState(
    initialData?.type === 'java_interview' ? initialData.explanation : '这道题是Java面试中非常高频的基础题。简单来说，多态就是允许不同类的对象对同一消息做出响应。从代码中可以看到，虽然 myDog 的声明类型是 Animal，但在运行时它实际指向的是 Dog 对象，因此调用 makeSound 时，执行的是 Dog 类中重写的方法。这种在运行期间判断引用对象的实际类型，根据其实际的类型调用其相应的方法，就是动态绑定。'
  );
  const [keyPoints, setKeyPoints] = useState<string[]>(
    initialData?.type === 'java_interview' ? initialData.keyPoints : ['多态是指同一个方法调用，由于对象不同可能会有不同的行为', '三个必要条件：继承、重写、父类引用指向子类对象', '底层原理：动态绑定（后期绑定），通过方法表（Method Table）实现']
  );
  const [visualIcon, setVisualIcon] = useState(
    initialData?.type === 'java_interview' ? (initialData.visualIcon || '💡') : '💡'
  );
  const [graphData, setGraphData] = useState(
    initialData?.type === 'java_interview' ? initialData.graphData : undefined
  );
  const [comparisonData, setComparisonData] = useState(
    initialData?.type === 'java_interview' ? initialData.comparisonData : undefined
  );
  const [timelineData, setTimelineData] = useState(
    initialData?.type === 'java_interview' ? initialData.timelineData : undefined
  );
  const [audioUrl, setAudioUrl] = useState(initialData?.audioUrl || '');
  const [durationInFrames, setDurationInFrames] = useState(initialData?.durationInFrames || 0);
  const [aiModel, setAiModel] = useState('deepseek-v4-flash');
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Collapsible state — open after AI parse
  const [isManualEditOpen, setIsManualEditOpen] = useState(!!initialData);
  const [isVisualizationOpen, setIsVisualizationOpen] = useState(false);

  const loadingMessages = [
    '正在分析题目结构与考点…',
    '正在提取核心逻辑与解题思路…',
    '正在编写深入浅出的讲解文案…',
    '正在调用微软 Azure 合成专属配音…',
    '正在生成视频渲染数据…',
  ];

  React.useEffect(() => {
    const id = initialData?.id || Date.now().toString();
    const currentData: AnyProblemData = {
      id, type: 'java_interview', title, question,
      keyPoints: keyPoints.filter(p => p.trim() !== ''),
      visualIcon, graphData, comparisonData, timelineData, explanation,
    };
    if (audioUrl) {
      currentData.audioUrl = audioUrl;
      currentData.durationInFrames = durationInFrames;
    }
    onChange?.(currentData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, question, explanation, keyPoints, visualIcon, graphData, comparisonData, timelineData, audioUrl, durationInFrames]);

  const handleAutoGenerate = async () => {
    if (!rawText.trim()) return;
    setIsGenerating(true);
    setLoadingStep(0);

    const interval = setInterval(() => {
      setLoadingStep(prev => prev < loadingMessages.length - 1 ? prev + 1 : prev);
    }, 2000);

    try {
      const res = await fetch('http://localhost:3001/api/parse', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rawText, targetType: 'java_interview', model: aiModel, ...getApiConfigForRequest() }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error((err as { error?: string }).error || '请求失败');
      }

      const reader = res.body?.getReader();
      const decoder = new TextDecoder('utf-8');
      if (!reader) throw new Error('无法读取数据流');

      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let parsedData: any = null;
      let buffer = '';

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split('\n');
        buffer = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const dataStr = line.slice(6).trim();
          if (!dataStr) continue;
          try {
            const msg = JSON.parse(dataStr);
            if (msg.error) throw new Error(msg.error);
            if (msg.final) parsedData = msg.final;
          } catch (e) {
            if (e instanceof Error && e.message !== 'Unexpected end of JSON input') throw e;
          }
        }
      }

      if (!parsedData) throw new Error('未接收到完整的解析结果');

      if (parsedData.title) setTitle(parsedData.title);
      if (parsedData.question) setQuestion(parsedData.question);
      if (parsedData.explanation) setExplanation(parsedData.explanation);
      if (parsedData.keyPoints) setKeyPoints(parsedData.keyPoints);
      if (parsedData.visualIcon) setVisualIcon(parsedData.visualIcon);
      setGraphData(parsedData.graphData || undefined);
      setComparisonData(parsedData.comparisonData || undefined);
      setTimelineData(parsedData.timelineData || undefined);
      if (parsedData.audioUrl) setAudioUrl(parsedData.audioUrl);
      if (parsedData.durationInFrames) setDurationInFrames(parsedData.durationInFrames);

      setIsManualEditOpen(true);
      onSubmit(parsedData);
    } catch (error) {
      console.error(error);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

  const hasVisualization = !!(graphData || comparisonData || timelineData);

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">八股 / 语法题</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">AI 自动提取考点，生成图解动画视频</p>
        </div>
        <button
          type="button"
          onClick={() => {
            setTitle('Java基础 - 面向对象');
            setQuestion('什么是多态？它的实现机制是什么？');
            setKeyPoints(['多态是指同一个方法调用，由于对象不同可能会有不同的行为', '三个必要条件：继承、重写、父类引用指向子类对象', '底层原理：动态绑定（后期绑定），通过方法表（Method Table）实现']);
            setVisualIcon('💡');
            setGraphData(undefined); setComparisonData(undefined); setTimelineData(undefined);
            setExplanation('这道题是Java面试中非常高频的基础题。简单来说，多态就是允许不同类的对象对同一消息做出响应。从代码中可以看到，虽然 myDog 的声明类型是 Animal，但在运行时它实际指向的是 Dog 对象，因此调用 makeSound 时，执行的是 Dog 类中重写的方法。这种在运行期间判断引用对象的实际类型，根据其实际的类型调用其相应的方法，就是动态绑定。');
          }}
          className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800"
        >
          填充示例
        </button>
      </div>

      <div className="p-5 space-y-3">
        {/* AI Parse — always visible */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">AI 智能解析</span>
            <span className="ml-auto text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">推荐</span>
          </div>
          <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-zinc-800">
            <textarea
              rows={3}
              className={`${inputCls} mt-3 resize-none`}
              placeholder="粘贴题目文本，例如：什么是多态？它的实现机制是什么？"
              value={rawText}
              onChange={e => setRawText(e.target.value)}
            />
            <div className="flex items-center gap-3">
              <div className="relative">
                <select
                  className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none cursor-pointer"
                  value={aiModel}
                  onChange={e => setAiModel(e.target.value)}
                >
                  <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
                  <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400">
                  <svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                  </svg>
                </div>
              </div>
              <button
                type="button"
                onClick={handleAutoGenerate}
                disabled={isGenerating || !rawText.trim()}
                className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors"
              >
                {isGenerating ? (
                  <>
                    <svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
                    </svg>
                    {loadingMessages[loadingStep]}
                  </>
                ) : '一键解析题目'}
              </button>
            </div>
          </div>
        </div>

        {/* Manual edit — collapsible */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button
            type="button"
            onClick={() => setIsManualEditOpen(o => !o)}
            className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
          >
            <span>手动编辑</span>
            <Chevron open={isManualEditOpen} />
          </button>
          {isManualEditOpen && (
            <div className="px-5 pb-5 space-y-4 border-t border-gray-100 dark:border-zinc-800 pt-4">
              <div>
                <label className={labelCls}>题目标题</label>
                <input type="text" className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：Java基础 - 面向对象" />
              </div>
              <div>
                <label className={labelCls}>面试问题</label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={question} onChange={e => setQuestion(e.target.value)} placeholder="例如：什么是多态？" />
              </div>
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className={labelCls} style={{ marginBottom: 0 }}>核心考点</label>
                  <button
                    type="button"
                    onClick={() => setKeyPoints(p => [...p, ''])}
                    className="text-xs font-medium text-indigo-600 dark:text-indigo-400 hover:text-indigo-700 flex items-center gap-1 transition-colors"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                    </svg>
                    添加
                  </button>
                </div>
                <div className="space-y-2">
                  {keyPoints.map((point, idx) => (
                    <div key={idx} className="flex items-start gap-2">
                      <span className="mt-2.5 w-5 h-5 rounded-full bg-gray-100 dark:bg-zinc-800 text-xs font-bold text-gray-500 dark:text-zinc-400 flex items-center justify-center shrink-0">{idx + 1}</span>
                      <textarea
                        rows={2}
                        className={`${inputCls} flex-1 resize-none py-2`}
                        value={point}
                        onChange={e => { const n = [...keyPoints]; n[idx] = e.target.value; setKeyPoints(n); }}
                        placeholder={`考点 ${idx + 1}`}
                      />
                      {keyPoints.length > 1 && (
                        <button type="button" onClick={() => setKeyPoints(keyPoints.filter((_, i) => i !== idx))} className="mt-2 text-gray-300 dark:text-zinc-600 hover:text-red-400 transition-colors p-1">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
              <div>
                <label className={labelCls}>知识图解 Emoji</label>
                <input type="text" className={inputCls} value={visualIcon} onChange={e => setVisualIcon(e.target.value)} placeholder="💡" maxLength={5} />
              </div>
              <div>
                <label className={labelCls}>
                  讲解文案
                  <span className="ml-1.5 normal-case font-normal text-gray-400 dark:text-zinc-500">自动转配音与字幕</span>
                </label>
                <textarea rows={5} className={`${inputCls} resize-none`} value={explanation} onChange={e => setExplanation(e.target.value)} placeholder="请输入这道题的详细讲解过程，系统将把这段文字转化为配音…" />
              </div>
            </div>
          )}
        </div>

        {/* Visualization config — shown only when AI has generated it */}
        {hasVisualization && (
          <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
            <button
              type="button"
              onClick={() => setIsVisualizationOpen(o => !o)}
              className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors"
            >
              <div className="flex items-center gap-2">
                <span>图解配置</span>
                <span className="text-xs font-normal text-emerald-600 dark:text-emerald-500 bg-emerald-50 dark:bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  AI 已生成 · {graphData ? '节点图' : comparisonData ? '对比表' : '时间轴'}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={e => { e.stopPropagation(); setGraphData(undefined); setComparisonData(undefined); setTimelineData(undefined); }}
                  className="text-xs text-red-400 hover:text-red-600 transition-colors"
                >
                  清除
                </button>
                <Chevron open={isVisualizationOpen} />
              </div>
            </button>
            {isVisualizationOpen && (
              <div className="px-5 pb-5 border-t border-gray-100 dark:border-zinc-800 pt-4">
                <p className="text-xs text-gray-400 dark:text-zinc-500">图解数据由 AI 自动生成，可点击"清除"后重新解析以更新。</p>
                <pre className="mt-3 text-xs font-mono bg-gray-50 dark:bg-zinc-800 rounded-lg p-3 overflow-auto max-h-40 text-gray-500 dark:text-zinc-400 border border-gray-100 dark:border-zinc-700">
                  {JSON.stringify(graphData || comparisonData || timelineData, null, 2)}
                </pre>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
