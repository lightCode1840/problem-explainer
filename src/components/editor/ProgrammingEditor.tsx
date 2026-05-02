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

const defaultStyleConfig = { layoutSplit: 35, codeFontSize: 'text-[0.9rem]', textFontWeight: 'font-medium' };

const defaultSteps = '[\n  {\n    "text": "初始化左右指针",\n    "state": {\n      "structures": [{ "id": "arr", "type": "array", "data": [2, 7, 11, 15], "pointers": { "left": 0, "right": 3 }, "highlights": [] }]\n    }\n  }\n]';

export const ProgrammingEditor: React.FC<ProblemEditorProps> = ({ initialData, onChange, onSubmit }) => {
  const [title, setTitle] = useState(initialData?.type === 'leetcode' ? initialData.title : '102. 二叉树的层序遍历');
  const [description, setDescription] = useState(initialData?.type === 'leetcode' ? initialData.description : '给你二叉树的根节点 root，返回其节点值的层序遍历。');
  const [codeSnippet, setCodeSnippet] = useState(initialData?.type === 'leetcode' ? initialData.codeSnippet : 'class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        List<List<Integer>> res = new ArrayList<>();\n        if (root == null) return res;\n        Queue<TreeNode> q = new LinkedList<>();\n        q.offer(root);\n        while (!q.isEmpty()) {\n            int size = q.size();\n            List<Integer> level = new ArrayList<>();\n            for (int i = 0; i < size; i++) {\n                TreeNode node = q.poll();\n                level.add(node.val);\n                if (node.left != null) q.offer(node.left);\n                if (node.right != null) q.offer(node.right);\n            }\n            res.add(level);\n        }\n        return res;\n    }\n}');
  const [language, setLanguage] = useState(initialData?.type === 'leetcode' ? initialData.language : 'java');
  const [problemReading, setProblemReading] = useState(initialData?.type === 'leetcode' ? (initialData as unknown as Record<string, unknown>).problemReading as string || '' : '');
  const [styleConfig, setStyleConfig] = useState(
    initialData?.type === 'leetcode' && initialData.styleConfig ? initialData.styleConfig : defaultStyleConfig
  );
  const initialStepsObj = initialData?.type === 'leetcode' ? (initialData as unknown as Record<string, unknown>).steps : null;
  const [stepsText, setStepsText] = useState(
    initialStepsObj ? JSON.stringify(initialStepsObj, null, 2) : defaultSteps
  );
  const [audioUrl, setAudioUrl] = useState(initialData?.audioUrl || '');
  const [durationInFrames, setDurationInFrames] = useState(initialData?.durationInFrames || 0);
  const [aiModel, setAiModel] = useState('deepseek-v4-flash');
  const [rawText, setRawText] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [loadingStep, setLoadingStep] = useState(0);

  // Collapsible sections
  const [isStyleOpen, setIsStyleOpen] = useState(false);
  const [isContentOpen, setIsContentOpen] = useState(!!initialData);
  const [isStepsOpen, setIsStepsOpen] = useState(!!initialData);

  const loadingMessages = [
    '正在分析题目结构…', '正在提取解题思路…', '正在编写讲解文案…',
    '正在调用 Azure 合成配音…', '正在生成动画数据…',
  ];

  React.useEffect(() => {
    const id = initialData?.id || Date.now().toString();
    const currentData: AnyProblemData = {
      id, type: 'leetcode', title, description, codeSnippet, language, problemReading, styleConfig,
      steps: (() => { try { return JSON.parse(stepsText); } catch { return []; } })(),
    } as AnyProblemData;
    if (audioUrl) { currentData.audioUrl = audioUrl; currentData.durationInFrames = durationInFrames; }
    onChange?.(currentData);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [title, description, codeSnippet, language, problemReading, stepsText, audioUrl, durationInFrames, styleConfig]);

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
        body: JSON.stringify({ rawText, targetType: 'leetcode', model: aiModel, language, ...getApiConfigForRequest() }),
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
      if (parsedData.description) setDescription(parsedData.description);
      if (parsedData.codeSnippet) setCodeSnippet(parsedData.codeSnippet);
      if (parsedData.language) setLanguage(parsedData.language);
      if (parsedData.problemReading) setProblemReading(parsedData.problemReading);
      if (parsedData.steps) setStepsText(JSON.stringify(parsedData.steps, null, 2));
      if (parsedData.audioUrl) setAudioUrl(parsedData.audioUrl);
      if (parsedData.durationInFrames) setDurationInFrames(parsedData.durationInFrames);

      setIsContentOpen(true);
      setIsStepsOpen(true);
      onSubmit(parsedData);
    } catch (error) {
      console.error(error);
    } finally {
      clearInterval(interval);
      setIsGenerating(false);
    }
  };

  const fillTemplate = () => {
    setTitle('102. 二叉树的层序遍历');
    setDescription('给你二叉树的根节点 root，返回其节点值的层序遍历。示例：输入 [3,9,20,null,null,15,7]，输出 [[3],[9,20],[15,7]]');
    setLanguage('java');
    setCodeSnippet('class Solution {\n    public List<List<Integer>> levelOrder(TreeNode root) {\n        List<List<Integer>> res = new ArrayList<>();\n        if (root == null) return res;\n        Queue<TreeNode> queue = new LinkedList<>();\n        queue.offer(root);\n        while (!queue.isEmpty()) {\n            int size = queue.size();\n            List<Integer> level = new ArrayList<>();\n            for (int i = 0; i < size; i++) {\n                TreeNode node = queue.poll();\n                level.add(node.val);\n                if (node.left != null) queue.offer(node.left);\n                if (node.right != null) queue.offer(node.right);\n            }\n            res.add(level);\n        }\n        return res;\n    }\n}');
    setProblemReading('现在我们来看力扣第102题：二叉树的层序遍历。');
    setStepsText(JSON.stringify([
      { text: '初始化队列，将根节点 3 放入', spokenText: '首先，我们创建一个队列，并把二叉树的根节点 3 放进去。', state: { structures: [{ id: 'tree', type: 'tree', data: [3, 9, 20, null, null, 15, 7], pointers: { curr: 0 }, highlights: [0] }, { id: 'queue', type: 'array', data: [3], pointers: {}, highlights: [0] }] } },
      { text: '取出 3，加入其子节点 9 和 20', spokenText: '接下来从队列取出 3，把它的左子节点 9 和右子节点 20 依次放入队列。', state: { structures: [{ id: 'tree', type: 'tree', data: [3, 9, 20, null, null, 15, 7], pointers: { curr: 1 }, highlights: [1, 2] }, { id: 'queue', type: 'array', data: [9, 20], pointers: { head: 0 }, highlights: [0, 1] }] } },
    ], null, 2));
  };

  const inputCls = 'w-full px-3.5 py-2.5 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-sm text-gray-900 dark:text-zinc-100 placeholder-gray-400 dark:placeholder-zinc-500 focus:bg-white dark:focus:bg-zinc-800 focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none transition-colors';
  const darkInputCls = 'w-full px-3.5 py-2.5 bg-zinc-900 dark:bg-zinc-950 border border-zinc-700 dark:border-zinc-700 rounded-lg text-sm font-mono text-zinc-100 placeholder-zinc-500 focus:ring-2 focus:ring-indigo-500/30 focus:border-zinc-600 outline-none transition-colors';
  const labelCls = 'block text-xs font-semibold text-gray-500 dark:text-zinc-400 uppercase tracking-wide mb-1.5';

  return (
    <div className="w-full bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
      {/* Header */}
      <div className="px-5 py-4 border-b border-gray-100 dark:border-zinc-800 flex items-center justify-between">
        <div>
          <h2 className="text-sm font-semibold text-gray-900 dark:text-zinc-100">算法图解</h2>
          <p className="text-xs text-gray-400 dark:text-zinc-500 mt-0.5">AI 解析代码逻辑，生成步骤动画视频</p>
        </div>
        <button type="button" onClick={fillTemplate} className="text-xs font-medium text-gray-400 dark:text-zinc-500 hover:text-gray-600 dark:hover:text-zinc-300 transition-colors px-2.5 py-1.5 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800">
          填充模板
        </button>
      </div>

      <div className="p-5 space-y-3">
        {/* AI Parse */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <div className="px-5 py-4 flex items-center gap-2">
            <svg className="w-4 h-4 text-indigo-500 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
            </svg>
            <span className="text-sm font-semibold text-gray-900 dark:text-zinc-100">AI 智能解析</span>
            <span className="ml-auto text-xs bg-indigo-50 dark:bg-indigo-500/10 text-indigo-600 dark:text-indigo-400 px-2 py-0.5 rounded-full font-medium">推荐</span>
          </div>
          <div className="px-5 pb-5 space-y-3 border-t border-gray-100 dark:border-zinc-800">
            <textarea rows={3} className={`${inputCls} mt-3 resize-none`} placeholder="粘贴题目文本，例如：两数之和…" value={rawText} onChange={e => setRawText(e.target.value)} />
            <div className="flex items-center gap-2 flex-wrap">
              <div className="relative">
                <select className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer" value={aiModel} onChange={e => setAiModel(e.target.value)}>
                  <option value="deepseek-v4-flash">DeepSeek V4 Flash</option>
                  <option value="deepseek-v4-pro">DeepSeek V4 Pro</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
              <div className="relative">
                <select className="appearance-none pl-3 pr-8 py-2 bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700 rounded-lg text-xs font-medium text-gray-700 dark:text-zinc-300 focus:ring-2 focus:ring-indigo-500/20 outline-none cursor-pointer" value={language} onChange={e => setLanguage(e.target.value)}>
                  <option value="java">Java</option>
                  <option value="javascript">JavaScript</option>
                  <option value="python">Python</option>
                  <option value="cpp">C++</option>
                  <option value="go">Go</option>
                </select>
                <div className="absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none text-gray-400"><svg className="w-3 h-3" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg></div>
              </div>
              <button type="button" onClick={handleAutoGenerate} disabled={isGenerating || !rawText.trim()} className="ml-auto flex items-center gap-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-semibold rounded-lg transition-colors">
                {isGenerating ? (
                  <><svg className="animate-spin h-3.5 w-3.5" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" /></svg>{loadingMessages[loadingStep]}</>
                ) : '一键解析题目'}
              </button>
            </div>
          </div>
        </div>

        {/* Style config — collapsible */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setIsStyleOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <span>视觉排版设置</span>
            <Chevron open={isStyleOpen} />
          </button>
          {isStyleOpen && (
            <div className="px-5 pb-5 pt-4 border-t border-gray-100 dark:border-zinc-800 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className={labelCls}>代码区宽度 {styleConfig.layoutSplit}%</label>
                <input type="range" min="20" max="80" step="1" className="w-full accent-indigo-600" value={styleConfig.layoutSplit} onChange={e => setStyleConfig({ ...styleConfig, layoutSplit: parseInt(e.target.value) })} />
              </div>
              <div>
                <label className={labelCls}>代码字体大小</label>
                <select className={`${inputCls} py-2`} value={styleConfig.codeFontSize} onChange={e => setStyleConfig({ ...styleConfig, codeFontSize: e.target.value })}>
                  <option value="text-xs">极小</option><option value="text-sm">小</option><option value="text-[0.9rem]">标准</option><option value="text-base">中</option><option value="text-lg">大</option>
                </select>
              </div>
              <div>
                <label className={labelCls}>字幕粗细</label>
                <select className={`${inputCls} py-2`} value={styleConfig.textFontWeight} onChange={e => setStyleConfig({ ...styleConfig, textFontWeight: e.target.value })}>
                  <option value="font-normal">常规</option><option value="font-medium">中等</option><option value="font-semibold">半粗</option><option value="font-bold">粗体</option>
                </select>
              </div>
            </div>
          )}
        </div>

        {/* Content — collapsible */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setIsContentOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <span>题目内容</span>
            <Chevron open={isContentOpen} />
          </button>
          {isContentOpen && (
            <div className="px-5 pb-5 pt-4 border-t border-gray-100 dark:border-zinc-800 space-y-4">
              <div>
                <label className={labelCls}>题目标题</label>
                <input type="text" className={inputCls} value={title} onChange={e => setTitle(e.target.value)} placeholder="例如：102. 二叉树的层序遍历" />
              </div>
              <div>
                <label className={labelCls}>题目描述</label>
                <textarea rows={3} className={`${inputCls} resize-none`} value={description} onChange={e => setDescription(e.target.value)} />
              </div>
              <div>
                <label className={labelCls}>读题配音文案 <span className="normal-case font-normal text-gray-400 ml-1">自动转配音</span></label>
                <textarea rows={2} className={`${inputCls} resize-none`} value={problemReading} onChange={e => setProblemReading(e.target.value)} placeholder="现在我们来看力扣第…题…" />
              </div>
              <div>
                <label className={labelCls}>代码片段</label>
                <textarea rows={8} className={`${darkInputCls} resize-none`} value={codeSnippet} onChange={e => setCodeSnippet(e.target.value)} spellCheck={false} />
              </div>
            </div>
          )}
        </div>

        {/* Steps JSON — collapsible */}
        <div className="border border-gray-200 dark:border-zinc-700 rounded-xl overflow-hidden">
          <button type="button" onClick={() => setIsStepsOpen(o => !o)} className="w-full flex items-center justify-between px-5 py-3.5 text-sm font-semibold text-gray-700 dark:text-zinc-300 hover:bg-gray-50 dark:hover:bg-zinc-800 transition-colors">
            <span>动画步骤 JSON</span>
            <Chevron open={isStepsOpen} />
          </button>
          {isStepsOpen && (
            <div className="px-5 pb-5 pt-4 border-t border-gray-100 dark:border-zinc-800">
              <textarea rows={14} className={`${darkInputCls} resize-none w-full`} value={stepsText} onChange={e => setStepsText(e.target.value)} spellCheck={false} />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
