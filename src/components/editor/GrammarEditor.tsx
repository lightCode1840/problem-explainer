import React, { useState, useEffect } from 'react';
import { EditorProps } from '../../plugins/types';
import { GrammarProblemData } from '../../types/problem';

const DEFAULT_GRAMMAR: GrammarProblemData = {
  id: '', type: 'grammar', title: '',
  question: '', options: ['', '', '', ''],
  correctAnswer: 0, explanation: '',
};

export const GrammarEditor: React.FC<EditorProps> = ({ initialData, onChange, onSubmit }) => {
  const [data, setData] = useState<GrammarProblemData>(
    (initialData?.type === 'grammar' ? initialData : DEFAULT_GRAMMAR) as GrammarProblemData
  );

  useEffect(() => { onChange?.(data); }, [data, onChange]);

  const update = (patch: Partial<GrammarProblemData>) =>
    setData(prev => ({ ...prev, ...patch }));

  const updateOption = (index: number, value: string) => {
    const options = [...data.options];
    options[index] = value;
    update({ options });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">题目标题</label>
        <input
          value={data.title}
          onChange={e => update({ title: e.target.value })}
          placeholder="如：初中英语定语从句解析"
          className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">题目内容（挖空用 ___ ）</label>
        <textarea
          value={data.question}
          onChange={e => update({ question: e.target.value })}
          rows={3}
          className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
        />
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">选项（A B C D）</label>
        {data.options.map((opt, i) => (
          <div key={i} className="flex items-center gap-2 mb-2">
            <span className="text-xs font-mono text-gray-400 w-4">{['A','B','C','D'][i]}</span>
            <input
              value={opt}
              onChange={e => updateOption(i, e.target.value)}
              className="flex-1 rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-1.5 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
            />
            <button
              onClick={() => update({ correctAnswer: i })}
              className={`w-5 h-5 rounded-full border-2 transition-colors ${
                data.correctAnswer === i
                  ? 'bg-indigo-600 border-indigo-600'
                  : 'border-gray-300 dark:border-zinc-600'
              }`}
            />
          </div>
        ))}
        <p className="text-xs text-gray-400 dark:text-zinc-500">右侧圆点标记正确答案</p>
      </div>
      <div>
        <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1">讲解文案（TTS 配音用）</label>
        <textarea
          value={data.explanation}
          onChange={e => update({ explanation: e.target.value })}
          rows={4}
          className="w-full rounded-lg border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-900 px-3 py-2 text-sm focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none resize-none"
        />
      </div>
      <button
        onClick={() => onSubmit(data)}
        className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-semibold rounded-xl transition-colors"
      >
        应用到预览
      </button>
    </div>
  );
};
