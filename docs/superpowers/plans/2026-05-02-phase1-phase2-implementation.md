# AI Problem Explainer — Phase 1 & Phase 2 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将现有本地工具重构为插件化架构，完善产品功能（历史记录、多视觉风格），并加入 License Key 变现体系，发布本地版 v1.0。

**Architecture:** Plugin Registry 模式——每种题型打包为独立 Plugin（prompt + editor + templates），`registry.ts` 统一管理，核心代码（server.ts、App.tsx、Composition.tsx）通过 registry 动态加载，零硬编码题型分支。状态管理拆分为 VideoStore / WorkflowStore / PluginStore 三个 Context。

**Tech Stack:** React 18, TypeScript, Remotion 4, Express, node-edge-tts, Tailwind CSS v4 dark mode, localStorage（history/license/draft）

---

## 文件结构总览

### 新建文件

```
src/plugins/types.ts                         ← Plugin 接口 & 共享类型
src/plugins/registry.ts                      ← 统一注册中心
src/plugins/leetcode/index.ts                ← LeetCode 插件
src/plugins/leetcode/prompt.ts               ← LeetCode 系统提示词
src/plugins/grammar/index.ts                 ← Grammar 插件
src/plugins/grammar/prompt.ts               ← Grammar 提示词
src/plugins/java-interview/index.ts          ← Java Interview 插件
src/plugins/java-interview/prompt.ts        ← Java Interview 提示词
src/stores/videoStore.tsx                    ← videoData / audioUrl state
src/stores/workflowStore.tsx                 ← isGeneratingAudio / isExporting
src/stores/pluginStore.tsx                   ← activePlugin
src/components/ui/Sidebar.tsx               ← 左侧图标导航栏
src/components/editor/GrammarEditor.tsx     ← Grammar 独立编辑器（修复 B-03）
src/themes/types.ts                          ← ThemeConfig 接口
src/themes/tokens.ts                         ← 内置主题定义
src/services/historyStore.ts                 ← 历史记录 CRUD
src/services/licenseStore.ts                 ← License Key 验证与缓存
src/components/ui/LicenseModal.tsx          ← License 激活 UI
src/components/ui/HistoryPanel.tsx          ← 历史记录面板
```

### 修改文件

```
src/types/problem.ts         ← 新增 SubtitleSegment, templateId 字段
src/services/tts.ts          ← 新增 estimateSubtitles, 返回 subtitles
src/services/llm.ts          ← 提取 callLLM 通用函数
src/server.ts                ← /api/parse 使用 plugin.buildSystemPrompt/parseResponse
src/Composition.tsx          ← 通过 registry 动态路由到插件模板
src/Root.tsx                 ← 无需改动（calculateMetadata 已通用）
src/App.tsx                  ← Sidebar 布局 + 使用 Stores + 历史/License 入口
src/components/ui/TopBar.tsx ← 移除 mode tabs（迁移到 Sidebar）
src/components/ui/SettingsModal.tsx ← 新增 TTS 语音 + License 入口
```

---

## Phase 1 — 架构基础（约 3 周）

---

### Task 1：定义 Plugin 类型

**Files:**
- Create: `src/plugins/types.ts`
- Modify: `src/types/problem.ts`

- [ ] **Step 1: 创建 Plugin 类型文件**

```typescript
// src/plugins/types.ts
import React from 'react';
import { AnyProblemData } from '../types/problem';

export interface SubtitleSegment {
  text: string;
  startMs: number;
  endMs: number;
}

export interface ThemeConfig {
  background: string;
  cardBg: string;
  textPrimary: string;
  textSecondary: string;
  accent: string;
  borderColor: string;
  codeFont: string;
}

export interface TemplateProps {
  data: AnyProblemData;
  theme: ThemeConfig;
}

export interface EditorProps {
  initialData?: AnyProblemData;
  onChange: (data: AnyProblemData) => void;
  onSubmit: (data: AnyProblemData) => void;
}

export interface VisualTemplate {
  id: string;
  name: string;
  theme: ThemeConfig;
  Component: React.ComponentType<TemplateProps>;
}

export interface ContentTypePlugin {
  id: string;
  displayName: string;
  icon: string;
  buildSystemPrompt: (language?: string) => string;
  parseResponse: (raw: string) => AnyProblemData;
  EditorComponent: React.ComponentType<EditorProps>;
  defaultTemplateId: string;
  templates: VisualTemplate[];
}
```

- [ ] **Step 2: 在 problem.ts 新增 SubtitleSegment 和 templateId**

在 `src/types/problem.ts` 的 `BaseProblemData` 接口添加两个字段：

```typescript
// 在现有 BaseProblemData 接口末尾添加：
  templateId?: string;       // 用户选择的视觉风格 id
  subtitles?: import('../plugins/types').SubtitleSegment[];  // 字幕时间轴
```

- [ ] **Step 3: Commit**

```bash
git add src/plugins/types.ts src/types/problem.ts
git commit -m "feat: add ContentTypePlugin types and SubtitleSegment to BaseProblemData"
```

---

### Task 2：创建 Plugin Registry

**Files:**
- Create: `src/plugins/registry.ts`

- [ ] **Step 1: 创建 registry（先不注册插件，避免循环依赖）**

```typescript
// src/plugins/registry.ts
import { ContentTypePlugin } from './types';

const plugins = new Map<string, ContentTypePlugin>();

export const registry = {
  register(plugin: ContentTypePlugin): void {
    plugins.set(plugin.id, plugin);
  },
  get(id: string): ContentTypePlugin | undefined {
    return plugins.get(id);
  },
  getAll(): ContentTypePlugin[] {
    return Array.from(plugins.values());
  },
};
```

- [ ] **Step 2: Commit**

```bash
git add src/plugins/registry.ts
git commit -m "feat: add plugin registry"
```

---

### Task 3：创建 LeetCode 插件

**Files:**
- Create: `src/plugins/leetcode/prompt.ts`
- Create: `src/plugins/leetcode/index.ts`

- [ ] **Step 1: 提取 LeetCode 系统提示词**

从 `src/services/llm.ts` 中找到 `targetType === 'leetcode'` 分支对应的 system prompt 内容，创建独立文件：

```typescript
// src/plugins/leetcode/prompt.ts
export function buildLeetCodeSystemPrompt(language: string = 'javascript'): string {
  return `你是一个专业的教师和题解视频文案编写专家。你的任务是将用户输入的原始力扣题目文本，解析并结构化为 JSON 格式数据。这个 JSON 数据将直接用于生成带配音的视频。

目标编程语言: ${language}

请严格按以下 JSON Schema 返回合法的 JSON 对象，不要包含任何 markdown 标记：
{
  "id": "随机生成唯一字符串",
  "type": "leetcode",
  "title": "题目标题",
  "description": "题目完整描述",
  "codeSnippet": "完整可执行的解题代码（注释在代码内部，方便视频展示）",
  "language": "${language}",
  "problemReading": "用于配音的读题文案，口语化，1-3句话介绍题意",
  "steps": [
    {
      "text": "该步骤的口语化讲解（将直接作为 TTS 配音文本，要拟人化、生动）",
      "spokenText": "如果 text 含有代码或特殊符号，此处提供专供 TTS 的净化版本；否则与 text 相同",
      "state": {
        "structures": [
          {
            "id": "arr1",
            "type": "array",
            "data": [],
            "pointers": {},
            "highlights": []
          }
        ]
      },
      "codeLines": []
    }
  ]
}

steps 数组是解题动画的关键帧序列，每个 step 对应一个动画状态。state.structures 支持同时渲染多个数据结构（如树 + 辅助队列）。type 可选值：array | tree | linkedlist | grid。`;
}
```

- [ ] **Step 2: 创建 LeetCode 插件**

```typescript
// src/plugins/leetcode/index.ts
import { ContentTypePlugin } from '../types';
import { buildLeetCodeSystemPrompt } from './prompt';
import { ProgrammingEditor } from '../../components/editor/ProgrammingEditor';
import { LeetCodeTemplate } from '../../templates/LeetCodeTemplate';
import { LeetCodeProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#0f0f11',
  cardBg: '#18181b',
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  accent: '#6366f1',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
};

export const leetcodePlugin: ContentTypePlugin = {
  id: 'leetcode',
  displayName: '算法图解',
  icon: '⚡',
  buildSystemPrompt: (language = 'javascript') => buildLeetCodeSystemPrompt(language),
  parseResponse: (raw: string): LeetCodeProblemData => {
    const parsed = JSON.parse(raw) as LeetCodeProblemData;
    if (!parsed.id) parsed.id = `lc-${Date.now()}`;
    return parsed;
  },
  EditorComponent: ProgrammingEditor,
  defaultTemplateId: 'dark-code',
  templates: [
    {
      id: 'dark-code',
      name: '深色代码风',
      theme: defaultTheme,
      Component: LeetCodeTemplate,
    },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/plugins/leetcode/
git commit -m "feat: add LeetCode plugin"
```

---

### Task 4：创建 Grammar 插件 + 独立编辑器（修复 B-03）

**Files:**
- Create: `src/plugins/grammar/prompt.ts`
- Create: `src/plugins/grammar/index.ts`
- Create: `src/components/editor/GrammarEditor.tsx`

- [ ] **Step 1: 创建 Grammar 提示词**

```typescript
// src/plugins/grammar/prompt.ts
export function buildGrammarSystemPrompt(): string {
  return `你是一个专业的英语语法题解析专家。将用户输入的语法题解析为 JSON 格式，用于生成配音视频。

请严格按以下 JSON Schema 返回，不要包含任何 markdown 标记：
{
  "id": "随机唯一字符串",
  "type": "grammar",
  "title": "题目标题（如：定语从句引导词辨析）",
  "question": "完整题目，挖空用 ___ 表示",
  "options": ["A. 选项内容", "B. 选项内容", "C. 选项内容", "D. 选项内容"],
  "correctAnswer": 0,
  "explanation": "口语化讲解，将直接用于 TTS 配音，要生动清晰，先说正确答案，再解释原因，100-200字"
}

correctAnswer 为 0-indexed 数字（0=A, 1=B, 2=C, 3=D）。`;
}
```

- [ ] **Step 2: 创建 Grammar 独立编辑器（修复 B-03：之前缺少 options/correctAnswer 字段）**

```tsx
// src/components/editor/GrammarEditor.tsx
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

  useEffect(() => { onChange(data); }, [data, onChange]);

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
```

- [ ] **Step 3: 创建 Grammar 插件**

```typescript
// src/plugins/grammar/index.ts
import { ContentTypePlugin } from '../types';
import { buildGrammarSystemPrompt } from './prompt';
import { GrammarEditor } from '../../components/editor/GrammarEditor';
import { GrammarTemplate } from '../../templates/GrammarTemplate';
import { GrammarProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#ffffff',
  cardBg: '#f9fafb',
  textPrimary: '#111827',
  textSecondary: '#6b7280',
  accent: '#4f46e5',
  borderColor: '#e5e7eb',
  codeFont: 'ui-monospace, monospace',
};

export const grammarPlugin: ContentTypePlugin = {
  id: 'grammar',
  displayName: '英语语法题',
  icon: '📝',
  buildSystemPrompt: () => buildGrammarSystemPrompt(),
  parseResponse: (raw: string): GrammarProblemData => {
    const parsed = JSON.parse(raw) as GrammarProblemData;
    if (!parsed.id) parsed.id = `gr-${Date.now()}`;
    return parsed;
  },
  EditorComponent: GrammarEditor,
  defaultTemplateId: 'light-clean',
  templates: [
    {
      id: 'light-clean',
      name: '清爽白底',
      theme: defaultTheme,
      Component: GrammarTemplate,
    },
  ],
};
```

- [ ] **Step 4: Commit**

```bash
git add src/plugins/grammar/ src/components/editor/GrammarEditor.tsx
git commit -m "feat: add Grammar plugin with dedicated editor (fixes B-03 missing options/correctAnswer fields)"
```

---

### Task 5：创建 Java Interview 插件

**Files:**
- Create: `src/plugins/java-interview/prompt.ts`
- Create: `src/plugins/java-interview/index.ts`

- [ ] **Step 1: 创建 Java Interview 提示词**

```typescript
// src/plugins/java-interview/prompt.ts
export function buildJavaInterviewSystemPrompt(): string {
  return `你是一个专业的 Java 面试辅导老师和视频文案专家。将用户输入的面试题解析为 JSON 格式，用于生成带配音的视频。

请严格按以下 JSON Schema 返回，不要包含任何 markdown 标记：
{
  "id": "随机唯一字符串",
  "type": "java_interview",
  "title": "核心考点标题（如：Java多态机制详解）",
  "question": "完整面试题目原文",
  "keyPoints": [
    "核心考点一（简洁，10-20字）",
    "核心考点二",
    "核心考点三"
  ],
  "visualIcon": "相关 emoji（如 🔄 ☕ 🧵）",
  "explanation": "口语化讲解文案，将直接用于 TTS 配音，150-300字，要生动清晰，先总后分"
}

keyPoints 最多 5 条，每条简洁有力。explanation 不要用 Markdown 格式，纯文字。`;
}
```

- [ ] **Step 2: 创建 Java Interview 插件**

```typescript
// src/plugins/java-interview/index.ts
import { ContentTypePlugin } from '../types';
import { buildJavaInterviewSystemPrompt } from './prompt';
import { ProblemEditor } from '../../components/editor/ProblemEditor';
import { JavaInterviewTemplate } from '../../templates/JavaInterviewTemplate';
import { JavaInterviewProblemData } from '../../types/problem';

const defaultTheme = {
  background: '#0f0f11',
  cardBg: '#18181b',
  textPrimary: '#f4f4f5',
  textSecondary: '#71717a',
  accent: '#6366f1',
  borderColor: '#27272a',
  codeFont: 'ui-monospace, monospace',
};

export const javaInterviewPlugin: ContentTypePlugin = {
  id: 'java_interview',
  displayName: '八股 / 面试题',
  icon: '☕',
  buildSystemPrompt: () => buildJavaInterviewSystemPrompt(),
  parseResponse: (raw: string): JavaInterviewProblemData => {
    const parsed = JSON.parse(raw) as JavaInterviewProblemData;
    if (!parsed.id) parsed.id = `ji-${Date.now()}`;
    return parsed;
  },
  EditorComponent: ProblemEditor,
  defaultTemplateId: 'dark-tech',
  templates: [
    {
      id: 'dark-tech',
      name: '深色科技风',
      theme: defaultTheme,
      Component: JavaInterviewTemplate,
    },
  ],
};
```

- [ ] **Step 3: Commit**

```bash
git add src/plugins/java-interview/
git commit -m "feat: add Java Interview plugin"
```

---

### Task 6：注册插件 + 重构 llm.ts + 重构 server.ts

**Files:**
- Modify: `src/plugins/registry.ts`
- Modify: `src/services/llm.ts`
- Modify: `src/server.ts`

- [ ] **Step 1: 在 registry.ts 注册所有插件**

```typescript
// src/plugins/registry.ts — 完整替换内容
import { ContentTypePlugin } from './types';
import { leetcodePlugin } from './leetcode';
import { grammarPlugin } from './grammar';
import { javaInterviewPlugin } from './java-interview';

const plugins = new Map<string, ContentTypePlugin>();

function register(plugin: ContentTypePlugin): void {
  plugins.set(plugin.id, plugin);
}

register(leetcodePlugin);
register(grammarPlugin);
register(javaInterviewPlugin);

export const registry = {
  register,
  get(id: string): ContentTypePlugin | undefined {
    return plugins.get(id);
  },
  getAll(): ContentTypePlugin[] {
    return Array.from(plugins.values());
  },
};
```

- [ ] **Step 2: 在 llm.ts 末尾新增 callLLM 通用函数**

在 `src/services/llm.ts` 末尾添加（不删除旧函数，保留兼容性）：

```typescript
// 新增通用 LLM 调用函数，供 plugin 系统使用
export async function callLLM(
  systemPrompt: string,
  userContent: string,
  modelName: string = 'deepseek-chat',
  config?: LLMConfig
): Promise<string> {
  const client = createClient(config);
  const response = await client.chat.completions.create({
    model: modelName,
    messages: [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userContent },
    ],
    response_format: { type: 'json_object' },
    temperature: 0.1,
  });
  return response.choices[0].message.content || '{}';
}
```

- [ ] **Step 3: 重构 server.ts 的 /api/parse 路由**

找到 `app.post('/api/parse', ...)` 路由，将其内部 LLM 调用改为使用 plugin：

```typescript
// server.ts 顶部新增 import
import { registry } from './plugins/registry';
import { callLLM, LLMConfig } from './services/llm';

// /api/parse 路由改为：
app.post('/api/parse', async (req, res) => {
  try {
    const { rawText, type, model = 'deepseek-chat', language = 'javascript', apiKey, baseURL } = req.body;
    if (!rawText || !type) {
      return res.status(400).json({ error: 'Missing rawText or type' });
    }

    const plugin = registry.get(type);
    if (!plugin) {
      return res.status(400).json({ error: `Unknown problem type: ${type}` });
    }

    const config: LLMConfig = {};
    if (apiKey) config.apiKey = apiKey;
    if (baseURL) config.baseURL = baseURL;

    const systemPrompt = plugin.buildSystemPrompt(language);
    const rawResult = await callLLM(systemPrompt, rawText, model, config);
    const problemData = plugin.parseResponse(rawResult);

    // TTS generation — 保持现有逻辑不变
    // （此处保留原来的 TTS 调用代码，只是上方 LLM 部分换成了 plugin）
    // ... 现有 TTS 代码 ...

    res.json(problemData);
  } catch (error) {
    console.error('API Error during parse:', error);
    res.status(500).json({ error: error instanceof Error ? error.message : 'Parse failed' });
  }
});
```

- [ ] **Step 4: 验证服务器编译无报错**

```bash
cd C:/Users/mirac/Projects/app
npx tsc --noEmit
```

预期输出：无错误。

- [ ] **Step 5: Commit**

```bash
git add src/plugins/registry.ts src/services/llm.ts src/server.ts
git commit -m "feat: wire plugin registry into server.ts /api/parse route"
```

---

### Task 7：更新 Composition.tsx 使用插件模板

**Files:**
- Modify: `src/Composition.tsx`

- [ ] **Step 1: 改为通过 registry 动态路由**

```tsx
// src/Composition.tsx — 完整替换
import React from 'react';
import { AbsoluteFill, Audio } from 'remotion';
import { AnyProblemData } from './types/problem';
import { registry } from './plugins/registry';
// 保留 fallback imports 以防 plugin 未注册
import { GrammarTemplate } from './templates/GrammarTemplate';
import { JavaInterviewTemplate } from './templates/JavaInterviewTemplate';
import { LeetCodeTemplate } from './templates/LeetCodeTemplate';

interface Props {
  data: AnyProblemData;
}

export const GenericExplainerVideo: React.FC<Props> = ({ data }) => {
  const plugin = registry.get(data.type);

  let TemplateComponent: React.ComponentType<{ data: AnyProblemData }>;

  if (plugin) {
    const template =
      plugin.templates.find(t => t.id === data.templateId) ?? plugin.templates[0];
    // VisualTemplate.Component expects { data, theme } — wrap to match legacy { data } signature
    const { Component, theme } = template;
    TemplateComponent = (props) => <Component data={props.data} theme={theme} />;
  } else {
    // fallback for types not yet migrated
    if (data.type === 'grammar') TemplateComponent = GrammarTemplate as React.ComponentType<{ data: AnyProblemData }>;
    else if (data.type === 'leetcode') TemplateComponent = LeetCodeTemplate as React.ComponentType<{ data: AnyProblemData }>;
    else TemplateComponent = JavaInterviewTemplate as React.ComponentType<{ data: AnyProblemData }>;
  }

  return (
    <AbsoluteFill className="bg-white">
      {data.audioUrl && <Audio src={data.audioUrl} />}
      <TemplateComponent data={data} />
    </AbsoluteFill>
  );
};
```

- [ ] **Step 2: 验证预览仍正常渲染**

运行 `npm run dev`，打开 `http://localhost:5173`，切换三种题型，确认视频预览区有内容。

- [ ] **Step 3: Commit**

```bash
git add src/Composition.tsx
git commit -m "feat: route Composition.tsx through plugin registry"
```

---

### Task 8：TTS 新增字幕估算

**Files:**
- Modify: `src/services/tts.ts`

- [ ] **Step 1: 新增 estimateSubtitles 工具函数并更新返回类型**

```typescript
// src/services/tts.ts — 在文件顶部 import 后，generateTTS 前插入：
import { SubtitleSegment } from '../plugins/types';

/**
 * 按句子切分文本，根据字符比例估算每段时间戳。
 * 以句末标点（。！？\n）为分割点。
 */
export function estimateSubtitles(text: string, durationInSeconds: number): SubtitleSegment[] {
  const phrases = text.split(/(?<=[。！？\n])\s*/g).map(s => s.trim()).filter(Boolean);
  if (phrases.length === 0) {
    return [{ text, startMs: 0, endMs: Math.round(durationInSeconds * 1000) }];
  }
  const totalChars = phrases.reduce((sum, p) => sum + p.length, 0);
  const totalMs = durationInSeconds * 1000;
  let currentMs = 0;
  return phrases.map(phrase => {
    const segMs = (phrase.length / totalChars) * totalMs;
    const segment: SubtitleSegment = {
      text: phrase,
      startMs: Math.round(currentMs),
      endMs: Math.round(currentMs + segMs),
    };
    currentMs += segMs;
    return segment;
  });
}
```

- [ ] **Step 2: 更新 generateTTS 返回值包含 subtitles**

将 `generateTTS` 函数的返回类型和 return 语句改为：

```typescript
// 返回类型改为：
export async function generateTTS(
  text: string,
  _filename?: string
): Promise<{ audioUrl: string; durationInSeconds: number; subtitles: SubtitleSegment[] }> {

// 原 return 语句（两处，含缓存命中的那个）改为：
return {
  audioUrl: `/voiceover/${filename}.mp3`,
  durationInSeconds,
  subtitles: estimateSubtitles(text, durationInSeconds),
};
```

- [ ] **Step 3: 确认 server.ts 中使用 generateTTS 的地方解构 subtitles**

在 `server.ts` 中找到所有 `const { audioUrl, durationInSeconds } = await generateTTS(...)` 调用，改为：

```typescript
const { audioUrl, durationInSeconds, subtitles } = await generateTTS(...);
// 在返回给前端的 JSON 中包含 subtitles
```

- [ ] **Step 4: Commit**

```bash
git add src/services/tts.ts src/server.ts
git commit -m "feat: add subtitle estimation to TTS service"
```

---

### Task 9：创建状态 Stores

**Files:**
- Create: `src/stores/videoStore.tsx`
- Create: `src/stores/workflowStore.tsx`
- Create: `src/stores/pluginStore.tsx`

- [ ] **Step 1: 创建 videoStore**

```tsx
// src/stores/videoStore.tsx
import React, { createContext, useCallback, useContext, useRef, useState } from 'react';
import { AnyProblemData } from '../types/problem';
import { SubtitleSegment } from '../plugins/types';

const DRAFT_KEYS = { standard: 'pex_draft_standard', programming: 'pex_draft_programming' } as const;

const DEFAULT_DATA: AnyProblemData = {
  id: 'sample-1', type: 'java_interview', title: 'Java基础 - 面向对象',
  question: '什么是多态？', keyPoints: ['多态三要素：继承、重写、父类引用指向子类'],
  explanation: '多态是Java面向对象的核心特性之一。', visualIcon: '☕',
} as AnyProblemData;

interface VideoStore {
  videoData: AnyProblemData;
  draftStatus: 'idle' | 'saved';
  setVideoData: (data: AnyProblemData, persistDraftKey?: 'standard' | 'programming') => void;
  updateAudio: (audioUrl: string, durationInFrames: number, subtitles?: SubtitleSegment[]) => void;
}

const VideoContext = createContext<VideoStore | null>(null);

export function VideoProvider({ children }: { children: React.ReactNode }) {
  const [videoData, setVideoDataState] = useState<AnyProblemData>(() => {
    try {
      const raw = localStorage.getItem(DRAFT_KEYS.standard);
      return raw ? JSON.parse(raw) : DEFAULT_DATA;
    } catch { return DEFAULT_DATA; }
  });
  const [draftStatus, setDraftStatus] = useState<'idle' | 'saved'>('idle');
  const saveTimer = useRef<ReturnType<typeof setTimeout>>();
  const statusTimer = useRef<ReturnType<typeof setTimeout>>();

  const setVideoData = useCallback((data: AnyProblemData, persistDraftKey?: 'standard' | 'programming') => {
    setVideoDataState(data);
    if (persistDraftKey) {
      clearTimeout(saveTimer.current);
      saveTimer.current = setTimeout(() => {
        try {
          localStorage.setItem(DRAFT_KEYS[persistDraftKey], JSON.stringify(data));
          setDraftStatus('saved');
          clearTimeout(statusTimer.current);
          statusTimer.current = setTimeout(() => setDraftStatus('idle'), 2000);
        } catch { /* localStorage full */ }
      }, 1000);
    }
  }, []);

  const updateAudio = useCallback((audioUrl: string, durationInFrames: number, subtitles?: SubtitleSegment[]) => {
    setVideoDataState(prev => ({ ...prev, audioUrl, durationInFrames, ...(subtitles ? { subtitles } : {}) }));
  }, []);

  return (
    <VideoContext.Provider value={{ videoData, draftStatus, setVideoData, updateAudio }}>
      {children}
    </VideoContext.Provider>
  );
}

export function useVideoStore(): VideoStore {
  const ctx = useContext(VideoContext);
  if (!ctx) throw new Error('useVideoStore must be used within VideoProvider');
  return ctx;
}
```

- [ ] **Step 2: 创建 workflowStore**

```tsx
// src/stores/workflowStore.tsx
import React, { createContext, useContext, useState } from 'react';

interface WorkflowStore {
  isGeneratingAudio: boolean;
  setIsGeneratingAudio: (v: boolean) => void;
  isExporting: boolean;
  setIsExporting: (v: boolean) => void;
  exportProgress: number | null;
  setExportProgress: (v: number | null) => void;
  exportStatus: string;
  setExportStatus: (v: string) => void;
}

const WorkflowContext = createContext<WorkflowStore | null>(null);

export function WorkflowProvider({ children }: { children: React.ReactNode }) {
  const [isGeneratingAudio, setIsGeneratingAudio] = useState(false);
  const [isExporting, setIsExporting] = useState(false);
  const [exportProgress, setExportProgress] = useState<number | null>(null);
  const [exportStatus, setExportStatus] = useState('');

  return (
    <WorkflowContext.Provider value={{
      isGeneratingAudio, setIsGeneratingAudio,
      isExporting, setIsExporting,
      exportProgress, setExportProgress,
      exportStatus, setExportStatus,
    }}>
      {children}
    </WorkflowContext.Provider>
  );
}

export function useWorkflowStore(): WorkflowStore {
  const ctx = useContext(WorkflowContext);
  if (!ctx) throw new Error('useWorkflowStore must be used within WorkflowProvider');
  return ctx;
}
```

- [ ] **Step 3: 创建 pluginStore**

```tsx
// src/stores/pluginStore.tsx
import React, { createContext, useContext, useState } from 'react';
import { ContentTypePlugin } from '../plugins/types';
import { registry } from '../plugins/registry';

interface PluginStore {
  activePlugin: ContentTypePlugin;
  setActivePluginId: (id: string) => void;
  allPlugins: ContentTypePlugin[];
}

const PluginContext = createContext<PluginStore | null>(null);

export function PluginProvider({ children }: { children: React.ReactNode }) {
  const allPlugins = registry.getAll();
  const [activePlugin, setActivePlugin] = useState<ContentTypePlugin>(allPlugins[0]);

  const setActivePluginId = (id: string) => {
    const plugin = registry.get(id);
    if (plugin) setActivePlugin(plugin);
  };

  return (
    <PluginContext.Provider value={{ activePlugin, setActivePluginId, allPlugins }}>
      {children}
    </PluginContext.Provider>
  );
}

export function usePluginStore(): PluginStore {
  const ctx = useContext(PluginContext);
  if (!ctx) throw new Error('usePluginStore must be used within PluginProvider');
  return ctx;
}
```

- [ ] **Step 4: 在 main.tsx 包裹 Providers**

找到 `src/main.tsx`，在 `<App />` 外包裹所有 Provider：

```tsx
import { VideoProvider } from './stores/videoStore';
import { WorkflowProvider } from './stores/workflowStore';
import { PluginProvider } from './stores/pluginStore';

// ReactDOM.createRoot(...).render 里改为：
<React.StrictMode>
  <PluginProvider>
    <VideoProvider>
      <WorkflowProvider>
        <App />
      </WorkflowProvider>
    </VideoProvider>
  </PluginProvider>
</React.StrictMode>
```

- [ ] **Step 5: Commit**

```bash
git add src/stores/ src/main.tsx
git commit -m "feat: add VideoStore, WorkflowStore, PluginStore contexts"
```

---

### Task 10：实现左侧 Sidebar 导航

**Files:**
- Create: `src/components/ui/Sidebar.tsx`
- Modify: `src/components/ui/TopBar.tsx`
- Modify: `src/App.tsx`

- [ ] **Step 1: 创建 Sidebar 组件**

```tsx
// src/components/ui/Sidebar.tsx
import React from 'react';
import { ContentTypePlugin } from '../../plugins/types';

type SidebarSection = string; // plugin id | 'history' | 'settings'

interface SidebarProps {
  plugins: ContentTypePlugin[];
  activeSection: SidebarSection;
  onSelect: (section: SidebarSection) => void;
  isDark: boolean;
  onThemeToggle: () => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ plugins, activeSection, onSelect, isDark, onThemeToggle }) => {
  return (
    <aside className="fixed left-0 top-16 bottom-0 w-16 z-40 flex flex-col items-center py-3 gap-1
      bg-white dark:bg-zinc-950 border-r border-gray-200 dark:border-zinc-800">
      {/* Plugin icons */}
      {plugins.map(plugin => (
        <SidebarButton
          key={plugin.id}
          label={plugin.displayName}
          active={activeSection === plugin.id}
          onClick={() => onSelect(plugin.id)}
        >
          <span className="text-lg leading-none">{plugin.icon}</span>
        </SidebarButton>
      ))}

      {/* Batch mode */}
      <SidebarButton
        label="批量流水线"
        active={activeSection === 'batch'}
        onClick={() => onSelect('batch')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 002-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
        </svg>
      </SidebarButton>

      <div className="flex-1" />

      {/* History */}
      <SidebarButton
        label="历史记录"
        active={activeSection === 'history'}
        onClick={() => onSelect('history')}
      >
        <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
            d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </SidebarButton>

      {/* Theme toggle */}
      <button
        onClick={onThemeToggle}
        className="w-10 h-10 rounded-xl flex items-center justify-center text-gray-400 dark:text-zinc-400
          hover:bg-gray-100 dark:hover:bg-zinc-800 transition-colors"
        title={isDark ? '切换浅色模式' : '切换深色模式'}
      >
        {isDark ? (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707M16 12a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
        ) : (
          <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75}
              d="M20.354 15.354A9 9 0 018.646 3.646 9.003 9.003 0 0012 21a9.003 9.003 0 008.354-5.646z" />
          </svg>
        )}
      </button>
    </aside>
  );
};

interface SidebarButtonProps {
  label: string;
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}

const SidebarButton: React.FC<SidebarButtonProps> = ({ label, active, onClick, children }) => (
  <button
    onClick={onClick}
    title={label}
    className={`w-10 h-10 rounded-xl flex items-center justify-center transition-colors group relative
      ${active
        ? 'bg-indigo-50 dark:bg-indigo-950 text-indigo-600 dark:text-indigo-400'
        : 'text-gray-400 dark:text-zinc-500 hover:bg-gray-100 dark:hover:bg-zinc-800 hover:text-gray-600 dark:hover:text-zinc-300'
      }`}
  >
    {children}
    {/* Tooltip */}
    <span className="absolute left-12 px-2 py-1 rounded-md text-xs font-medium whitespace-nowrap
      bg-gray-900 dark:bg-zinc-100 text-white dark:text-zinc-900
      opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">
      {label}
    </span>
  </button>
);
```

- [ ] **Step 2: 简化 TopBar（移除 mode tabs，由 Sidebar 接管）**

在 `src/components/ui/TopBar.tsx` 中：
- 删除 `editorMode`、`onModeChange` props 及对应的 nav 部分
- 保留：Logo、后端状态指示、设置按钮

```tsx
// TopBar.tsx 更新后的 Props 接口
interface TopBarProps {
  onSettingsOpen: () => void;
  isDark: boolean;       // 保留供后备使用，但实际切换移到 Sidebar
  onThemeToggle: () => void;
}
```

删除 `<nav>` 区域的 mode switch 代码块（约 L48-L81）。

- [ ] **Step 3: 更新 App.tsx 使用 Sidebar + Stores**

```tsx
// src/App.tsx — 核心结构（保留现有逻辑，重组布局）
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
import { JavaInterviewProblemData, LeetCodeProblemData } from './types/problem';

export const App: React.FC = () => {
  const { isDark, toggleTheme } = useTheme();
  const { videoData, draftStatus, setVideoData, updateAudio } = useVideoStore();
  const { isGeneratingAudio, setIsGeneratingAudio, isExporting, setIsExporting,
          exportProgress, setExportProgress, exportStatus, setExportStatus } = useWorkflowStore();
  const { activePlugin, setActivePluginId, allPlugins } = usePluginStore();
  const { toastMessage, showToast, setToastMessage } = useToast();

  const [settingsOpen, setSettingsOpen] = useState(false);
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
        const iv = videoData as JavaInterviewProblemData;
        body.problemReading = iv.question;
        body.explanation = iv.explanation;
      }
      const res = await fetch('http://localhost:3001/api/generate-audio', {
        method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body),
      });
      if (!res.ok) throw new Error('Failed');
      const { audioUrl, durationInFrames, subtitles } = await res.json();
      updateAudio(audioUrl, durationInFrames, subtitles);
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
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ videoData }),
      });
      if (!res.ok) throw new Error('Export failed');
      const { taskId } = await res.json();
      showToast('导出已启动', '视频正在后台渲染中…', 'success');
      const poll = setInterval(async () => {
        try {
          const s = await fetch(`http://localhost:3001/api/export/status/${taskId}`);
          const task = await s.json();
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
      showToast('导出失败', '无法连接到渲染服务。', 'error');
      setIsExporting(false);
    }
  };

  const EditorComponent = activePlugin?.EditorComponent;

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-zinc-950 font-sans text-gray-900 dark:text-zinc-100">
      <TopBar onSettingsOpen={() => setSettingsOpen(true)} isDark={isDark} onThemeToggle={toggleTheme} />
      <Sidebar
        plugins={allPlugins}
        activeSection={activeSection}
        onSelect={handleSectionChange}
        isDark={isDark}
        onThemeToggle={toggleTheme}
      />
      <SettingsModal open={settingsOpen} onClose={() => { setSettingsOpen(false); setApiConfigured(hasApiConfig()); }} />
      <Toast message={toastMessage} onClose={() => setToastMessage(null)} />

      {/* Main content: offset for TopBar (h-16) + Sidebar (w-16) */}
      <div className="pl-16 pt-16 min-h-screen">
        {activeSection === 'batch' ? (
          <div className="p-6"><BatchEditor /></div>
        ) : activeSection === 'history' ? (
          <div className="p-6"><p className="text-gray-500 dark:text-zinc-400 text-sm">历史记录面板（Task 14 实现）</p></div>
        ) : (
          <div className="flex gap-0 h-[calc(100vh-4rem)]">
            {/* Editor panel ~45% */}
            <div className="w-[45%] overflow-y-auto p-6 border-r border-gray-200 dark:border-zinc-800">
              {!apiConfigured && (
                <div className="mb-4 rounded-xl bg-amber-50 dark:bg-amber-950/40 border border-amber-200 dark:border-amber-800 px-4 py-3 flex items-center gap-3">
                  <p className="text-sm text-amber-800 dark:text-amber-300 flex-1">未配置 API Key</p>
                  <button onClick={() => setSettingsOpen(true)} className="text-sm font-semibold text-amber-900 dark:text-amber-200 underline">立即配置</button>
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
              <div className="bg-white dark:bg-zinc-900 rounded-xl border border-gray-200 dark:border-zinc-800 overflow-hidden">
                <div className="bg-zinc-950 aspect-video">
                  <Player
                    component={GenericExplainerVideo as React.FC<{ data: typeof videoData }>}
                    inputProps={{ data: videoData }}
                    durationInFrames={videoData.durationInFrames || 500}
                    fps={30} compositionWidth={1920} compositionHeight={1080}
                    style={{ width: '100%', height: '100%' }}
                    controls loop={!!videoData.audioUrl}
                    autoPlay={!!videoData.audioUrl}
                  />
                </div>
                <div className="px-4 py-2.5 flex items-center gap-2 flex-wrap border-t border-gray-100 dark:border-zinc-800">
                  {draftStatus === 'saved' && <span className="text-xs text-emerald-600 dark:text-emerald-500 font-medium">✓ 草稿已保存</span>}
                  <span className="text-xs text-gray-400 dark:text-zinc-500 bg-gray-100 dark:bg-zinc-800 px-2 py-0.5 rounded-md">
                    {Math.round((videoData.durationInFrames || 500) / 30)}s
                  </span>
                  {videoData.audioUrl && <span className="text-xs font-medium text-emerald-600 dark:text-emerald-500 flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-emerald-500 inline-block" />已有配音</span>}
                </div>
              </div>
              <div className="flex gap-3">
                <button onClick={handleGenerateAudio} disabled={isGeneratingAudio}
                  className="flex-1 py-3 px-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors">
                  {isGeneratingAudio ? '生成中…' : '🎙 生成配音预览'}
                </button>
                <button onClick={handleExportVideo} disabled={isExporting}
                  className="flex-1 py-3 px-4 bg-gray-900 dark:bg-zinc-100 hover:bg-gray-800 dark:hover:bg-zinc-200 disabled:opacity-60 text-white dark:text-zinc-900 text-sm font-semibold rounded-xl transition-colors">
                  {isExporting ? `渲染中… ${exportProgress !== null ? Math.round(exportProgress * 100) + '%' : ''}` : '⬇ 导出 MP4'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
```

- [ ] **Step 4: 验证应用运行正常**

```bash
npm run dev
```

打开 `http://localhost:5173`：
- 左侧 64px Sidebar 显示 ☕ 📝 ⚡ 图标 + 批量/历史按钮
- 点击不同图标切换编辑器
- 视频预览区仍正常显示

- [ ] **Step 5: Commit**

```bash
git add src/components/ui/Sidebar.tsx src/components/ui/TopBar.tsx src/App.tsx
git commit -m "feat: replace TopBar tabs with left Sidebar, wire to PluginStore"
```

---

### Task 11：修复 P0 Bugs（B-01 audioUrl 硬编码）

**Files:**
- Modify: `src/server.ts`

B-02（batchQueue apiKey）和 B-03（已在 Task 4 修复）。

- [ ] **Step 1: 修复 B-01 — audioUrl 动态 host**

在 `src/server.ts` 中找到所有 `audioUrl: \`http://localhost:3001/voiceover/...\`` 或类似硬编码，改为动态生成：

```typescript
// 在每个生成 audioUrl 的地方，改为相对路径：
// 原来：audioUrl: `http://localhost:3001/voiceover/${filename}.mp3`
// 改为：audioUrl: `/voiceover/${filename}.mp3`
// 前端已经知道 base URL（fetch 到 localhost:3001），audioUrl 作为路径拼接即可
```

确认 `src/services/tts.ts` 已返回相对路径（上面 Task 8 已处理）。

- [ ] **Step 2: 修复 batchQueue.ts B-02 — apiKey 透传**

```typescript
// src/services/batchQueue.ts — 在 createJob 函数签名处新增可选 config 参数
// 找到类似 parseProblemWithLLM(rawText, item.type, 'deepseek-chat') 的调用
// 改为从 job.config 读取 apiKey/baseURL/model 并透传
```

具体改动：在 `batchQueue.ts` 中为 `createJob` 新增参数 `config?: { apiKey?: string; baseURL?: string; model?: string }`，并在 `parseProblemWithLLM` 调用处透传。

- [ ] **Step 3: Commit**

```bash
git add src/server.ts src/services/batchQueue.ts
git commit -m "fix: B-01 dynamic audioUrl host, B-02 batchQueue apiKey passthrough"
```

---

## Phase 2 — 产品完整性（约 4 周）

---

### Task 12：主题 Token 系统 + 样式选择器

**Files:**
- Create: `src/themes/tokens.ts`
- Modify: `src/App.tsx`（新增风格选择下拉）

- [ ] **Step 1: 定义内置主题 Tokens**

```typescript
// src/themes/tokens.ts
import { ThemeConfig } from '../plugins/types';

export const THEMES: Record<string, ThemeConfig & { name: string }> = {
  'dark-code': {
    name: '深色代码风',
    background: '#0f0f11',
    cardBg: '#18181b',
    textPrimary: '#f4f4f5',
    textSecondary: '#71717a',
    accent: '#6366f1',
    borderColor: '#27272a',
    codeFont: 'ui-monospace, SFMono-Regular, Menlo, monospace',
  },
  'light-clean': {
    name: '极简白底',
    background: '#ffffff',
    cardBg: '#f9fafb',
    textPrimary: '#111827',
    textSecondary: '#6b7280',
    accent: '#4f46e5',
    borderColor: '#e5e7eb',
    codeFont: 'ui-monospace, monospace',
  },
  'blue-tech': {
    name: 'B站讲课风',
    background: '#0d1117',
    cardBg: '#161b22',
    textPrimary: '#e6edf3',
    textSecondary: '#8b949e',
    accent: '#58a6ff',
    borderColor: '#30363d',
    codeFont: 'ui-monospace, monospace',
  },
};
```

- [ ] **Step 2: 在 App.tsx 的预览区顶部加风格选择器**

在预览面板的视频卡片上方添加：

```tsx
{/* Template selector — 仅在有 plugin 且 plugin.templates.length > 1 时显示 */}
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
```

- [ ] **Step 3: Commit**

```bash
git add src/themes/tokens.ts src/App.tsx
git commit -m "feat: add theme token system and visual style selector"
```

---

### Task 13：历史记录 Store + 面板

**Files:**
- Create: `src/services/historyStore.ts`
- Create: `src/components/ui/HistoryPanel.tsx`
- Modify: `src/App.tsx`（在 handleGenerateAudio 后自动保存历史）

- [ ] **Step 1: 创建历史记录 Store**

```typescript
// src/services/historyStore.ts
import { AnyProblemData } from '../types/problem';

const HISTORY_KEY = 'pex_history';
const MAX_ENTRIES = 50;

export interface HistoryEntry {
  id: string;
  type: string;
  title: string;
  timestamp: number; // Unix ms
  data: AnyProblemData;
}

export function getHistory(): HistoryEntry[] {
  try {
    const raw = localStorage.getItem(HISTORY_KEY);
    return raw ? (JSON.parse(raw) as HistoryEntry[]) : [];
  } catch {
    return [];
  }
}

export function addToHistory(data: AnyProblemData): void {
  const entries = getHistory();
  const entry: HistoryEntry = {
    id: `hist-${Date.now()}`,
    type: data.type,
    title: data.title || '未命名',
    timestamp: Date.now(),
    data,
  };
  // Remove duplicate by matching title+type
  const deduplicated = entries.filter(e => !(e.type === data.type && e.title === data.title));
  const updated = [entry, ...deduplicated].slice(0, MAX_ENTRIES);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(updated));
}

export function removeFromHistory(id: string): void {
  const entries = getHistory().filter(e => e.id !== id);
  localStorage.setItem(HISTORY_KEY, JSON.stringify(entries));
}

export function clearHistory(): void {
  localStorage.removeItem(HISTORY_KEY);
}
```

- [ ] **Step 2: 创建历史记录面板**

```tsx
// src/components/ui/HistoryPanel.tsx
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
```

- [ ] **Step 3: 在 App.tsx 接入历史记录**

1. 在 `handleGenerateAudio` 成功后调用 `addToHistory(videoData)`
2. 将 `activeSection === 'history'` 的占位符替换为 `<HistoryPanel onRestore={...} />`

```tsx
// handleGenerateAudio 成功后添加：
import { addToHistory } from './services/historyStore';
// ...
showToast('配音已生成', '音频已更新，视频将自动同步。', 'success');
addToHistory({ ...videoData, audioUrl, durationInFrames });

// history section 替换：
) : activeSection === 'history' ? (
  <div className="p-6">
    <HistoryPanel onRestore={(data) => {
      setVideoData(data);
      setActivePluginId(data.type);
      setActiveSection(data.type);
    }} />
  </div>
```

- [ ] **Step 4: Commit**

```bash
git add src/services/historyStore.ts src/components/ui/HistoryPanel.tsx src/App.tsx
git commit -m "feat: add history store (50 entries) and history panel"
```

---

### Task 14：License Store + 激活 UI

**Files:**
- Create: `src/services/licenseStore.ts`
- Create: `src/components/ui/LicenseModal.tsx`
- Modify: `src/components/ui/SettingsModal.tsx`

- [ ] **Step 1: 创建 License Store**

```typescript
// src/services/licenseStore.ts
const LICENSE_KEY = 'pex_license';
const OFFLINE_GRACE_DAYS = 7;

export type LicenseTier = 'free' | 'pro';

export interface LicenseState {
  key: string;
  tier: LicenseTier;
  expiresAt: number; // Unix ms, -1 = never
  activatedAt: number;
  lastValidatedAt: number;
}

export function getLicense(): LicenseState | null {
  try {
    const raw = localStorage.getItem(LICENSE_KEY);
    return raw ? (JSON.parse(raw) as LicenseState) : null;
  } catch {
    return null;
  }
}

export function getCurrentTier(): LicenseTier {
  const license = getLicense();
  if (!license) return 'free';
  // Check expiry
  if (license.expiresAt !== -1 && Date.now() > license.expiresAt) return 'free';
  // Check offline grace
  const daysSinceValidation = (Date.now() - license.lastValidatedAt) / (1000 * 60 * 60 * 24);
  if (daysSinceValidation > OFFLINE_GRACE_DAYS) return 'free';
  return license.tier;
}

export function saveLicense(state: LicenseState): void {
  localStorage.setItem(LICENSE_KEY, JSON.stringify(state));
}

export function clearLicense(): void {
  localStorage.removeItem(LICENSE_KEY);
}

// License Server URL — 开发期间可指向 mock 或未来的 Vercel Function
const LICENSE_SERVER = import.meta.env.VITE_LICENSE_SERVER_URL ?? 'https://license.problemexplainer.app';

export async function validateLicenseKey(key: string): Promise<LicenseState> {
  const res = await fetch(`${LICENSE_SERVER}/validate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ key }),
  });
  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: 'Invalid key' }));
    throw new Error(err.error ?? 'License validation failed');
  }
  const { tier, expiresAt } = await res.json() as { tier: LicenseTier; expiresAt: number };
  const state: LicenseState = {
    key, tier, expiresAt,
    activatedAt: Date.now(),
    lastValidatedAt: Date.now(),
  };
  saveLicense(state);
  return state;
}
```

- [ ] **Step 2: 创建 License 激活弹窗**

```tsx
// src/components/ui/LicenseModal.tsx
import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { validateLicenseKey, clearLicense, getCurrentTier, getLicense } from '../../services/licenseStore';

interface LicenseModalProps {
  open: boolean;
  onClose: () => void;
}

export const LicenseModal: React.FC<LicenseModalProps> = ({ open, onClose }) => {
  const [key, setKey] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(false);

  const currentTier = getCurrentTier();
  const license = getLicense();

  const handleActivate = async () => {
    if (!key.trim()) { setError('请输入 License Key'); return; }
    setLoading(true); setError('');
    try {
      await validateLicenseKey(key.trim());
      setSuccess(true);
      setTimeout(onClose, 1500);
    } catch (e) {
      setError(e instanceof Error ? e.message : '激活失败，请检查 Key 是否正确');
    } finally {
      setLoading(false);
    }
  };

  const handleDeactivate = () => {
    clearLicense();
    onClose();
  };

  if (!open) return null;

  return createPortal(
    <div className="fixed inset-0 z-[99999] flex items-center justify-center bg-black/50">
      <div className="bg-white dark:bg-zinc-900 rounded-2xl border border-gray-200 dark:border-zinc-800 p-6 w-full max-w-md mx-4 shadow-2xl">
        <div className="flex items-center justify-between mb-5">
          <h2 className="text-base font-semibold text-gray-900 dark:text-zinc-100">License 激活</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-gray-100 dark:hover:bg-zinc-800 flex items-center justify-center text-gray-400">
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Current status */}
        <div className={`rounded-xl p-3 mb-5 flex items-center gap-3 ${
          currentTier === 'pro'
            ? 'bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800'
            : 'bg-gray-50 dark:bg-zinc-800 border border-gray-200 dark:border-zinc-700'
        }`}>
          <span className="text-lg">{currentTier === 'pro' ? '✨' : '🆓'}</span>
          <div>
            <p className="text-sm font-semibold text-gray-900 dark:text-zinc-100">
              当前：{currentTier === 'pro' ? 'Pro 版' : 'Free 版'}
            </p>
            {currentTier === 'pro' && license && (
              <p className="text-xs text-gray-500 dark:text-zinc-400">
                {license.expiresAt === -1 ? '永久有效' : `有效期至 ${new Date(license.expiresAt).toLocaleDateString('zh-CN')}`}
              </p>
            )}
            {currentTier === 'free' && (
              <p className="text-xs text-gray-500 dark:text-zinc-400">每月 5 次导出（含水印）</p>
            )}
          </div>
          {currentTier === 'pro' && (
            <button onClick={handleDeactivate} className="ml-auto text-xs text-red-500 hover:text-red-600">停用</button>
          )}
        </div>

        {currentTier === 'free' && (
          <>
            <div className="mb-3">
              <label className="block text-xs font-medium text-gray-500 dark:text-zinc-400 mb-1.5">License Key</label>
              <input
                value={key}
                onChange={e => setKey(e.target.value)}
                placeholder="PEX-XXXX-XXXX-XXXX"
                className="w-full rounded-xl border border-gray-200 dark:border-zinc-700 bg-gray-50 dark:bg-zinc-800 px-3 py-2.5 text-sm font-mono focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none"
              />
              {error && <p className="text-xs text-red-500 mt-1.5">{error}</p>}
              {success && <p className="text-xs text-emerald-600 mt-1.5">✓ 激活成功！</p>}
            </div>
            <button
              onClick={handleActivate}
              disabled={loading}
              className="w-full py-2.5 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white text-sm font-semibold rounded-xl transition-colors"
            >
              {loading ? '验证中…' : '激活 Pro 版'}
            </button>
            <p className="text-xs text-center text-gray-400 dark:text-zinc-500 mt-3">
              购买 License Key：
              <a href="https://afdian.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline ml-1">爱发电</a>
              <span className="mx-1">·</span>
              <a href="https://gumroad.com" target="_blank" rel="noreferrer" className="text-indigo-500 hover:underline">Gumroad</a>
            </p>
          </>
        )}
      </div>
    </div>,
    document.body
  );
};
```

- [ ] **Step 3: 在 SettingsModal 中加入 License 入口**

在 `src/components/ui/SettingsModal.tsx` 底部区域新增一个按钮，点击关闭 SettingsModal 并打开 LicenseModal。在 App.tsx 中管理 licenseModalOpen state，并将 `onLicenseOpen` prop 传入。

- [ ] **Step 4: Commit**

```bash
git add src/services/licenseStore.ts src/components/ui/LicenseModal.tsx src/components/ui/SettingsModal.tsx src/App.tsx
git commit -m "feat: add License store with 7-day offline grace + activation modal"
```

---

### Task 15：水印系统 + 功能门控

**Files:**
- Create: `src/components/ui/Watermark.tsx`（Remotion 水印组件）
- Modify: `src/Composition.tsx`（根据 tier 注入水印）
- Modify: `src/App.tsx`（导出和批量功能门控）

- [ ] **Step 1: 创建 Remotion 水印组件**

```tsx
// src/components/ui/Watermark.tsx
import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Watermark: React.FC = () => (
  <AbsoluteFill style={{ pointerEvents: 'none', zIndex: 9999 }}>
    {/* 右下角水印 */}
    <div style={{
      position: 'absolute', bottom: 32, right: 40,
      display: 'flex', alignItems: 'center', gap: 6,
      background: 'rgba(0,0,0,0.45)', backdropFilter: 'blur(4px)',
      borderRadius: 8, padding: '6px 12px',
    }}>
      <span style={{ color: 'rgba(255,255,255,0.7)', fontSize: 18, fontWeight: 700, letterSpacing: '-0.5px', fontFamily: 'system-ui, sans-serif' }}>
        ⚡ Problem Explainer
      </span>
    </div>
  </AbsoluteFill>
);
```

- [ ] **Step 2: 在 Composition.tsx 根据 tier 注入水印**

```tsx
// Composition.tsx 中，在 <TemplateComponent /> 后添加：
import { Watermark } from './components/ui/Watermark';

// 注意：Composition.tsx 是 Remotion 组件，不能 import 浏览器 API（localStorage）。
// 通过 props 传递 showWatermark 标志：

interface Props {
  data: AnyProblemData;
  showWatermark?: boolean;
}

export const GenericExplainerVideo: React.FC<Props> = ({ data, showWatermark = false }) => {
  // ... existing code ...
  return (
    <AbsoluteFill className="bg-white">
      {data.audioUrl && <Audio src={data.audioUrl} />}
      <TemplateComponent data={data} />
      {showWatermark && <Watermark />}
    </AbsoluteFill>
  );
};
```

- [ ] **Step 3: 在 App.tsx 的 Player 中传入 showWatermark**

```tsx
// Player inputProps 改为：
import { getCurrentTier } from './services/licenseStore';

const tier = getCurrentTier();

// Player:
inputProps={{ data: videoData, showWatermark: tier === 'free' }}
```

- [ ] **Step 4: 导出时传入 showWatermark**

在 `handleExportVideo` 的 POST body 中加入 `showWatermark: tier === 'free'`，并在 `server.ts` 的 `/api/export` 路由里将其传给 Remotion 渲染。

- [ ] **Step 5: 批量模式门控（Free 最多 3 条）**

在 `BatchEditor.tsx` 中，启动批量任务前检查：

```typescript
import { getCurrentTier } from '../../services/licenseStore';

// 在 handleStartBatch 开始处：
const tier = getCurrentTier();
if (tier === 'free' && items.length > 3) {
  showToast('免费版限制', '免费版最多同时处理 3 条题目，升级 Pro 解锁无限制。', 'error');
  return;
}
```

- [ ] **Step 6: Commit**

```bash
git add src/components/ui/Watermark.tsx src/Composition.tsx src/App.tsx src/components/editor/BatchEditor.tsx src/server.ts
git commit -m "feat: watermark for free tier, feature gates for export count and batch size"
```

---

## Phase 3 — SaaS 化里程碑（无需细化到任务级）

Phase 3 的每个里程碑完成后可独立启动新的实施计划。

### 里程碑 1：Auth 层（约 3 天）
- 接入 Supabase Auth（Email/Password + 可选 GitHub OAuth）
- `server.ts` 所有 `/api/*` 路由添加 JWT 验证中间件
- 前端 localStorage license 替换为后端 user.subscription_tier

### 里程碑 2：存储层迁移（约 1 周）
- 音频文件：`public/voiceover/` → Cloudflare R2 / 阿里云 OSS
- 视频文件：`out/` → 同上
- `generateTTS` 和 `exportQueue` 改为上传并返回公网 URL

### 里程碑 3：渲染 Worker 云化（约 1 周）
- 引入 BullMQ + Redis（Railway 部署）
- `exportQueue.ts` 改为向队列推任务，Worker 进程消费并执行 Remotion render
- 实现渲染进度 SSE 推送（替代轮询）

### 里程碑 4：订阅付费接入（约 2 周）
- 国内：接入微信支付 / 支付宝（JSAPI 或 Native 模式）
- 海外：接入 Stripe Checkout
- Webhook 处理付款成功事件 → 更新 user.subscription_tier

### 里程碑 5：Beta 上线
- 部署前端到 Vercel，后端到 Railway
- 域名 + HTTPS + CDN 配置
- 邀请前 100 位早期用户，收集反馈

---

## 执行检查点

| 完成时间 | 验收标准 |
|---------|---------|
| Task 7 后 | `npm run dev` 正常，三种题型切换无报错 |
| Task 10 后 | 左侧 Sidebar 导航正常，编辑/预览布局完整 |
| Task 11 后 | `npx tsc --noEmit` 无类型错误 |
| Phase 1 全部完成 | TTS 配音 + 视频导出端到端流程正常 |
| Task 13 后 | 历史记录存取功能正常，最多 50 条 |
| Task 15 后 | Free 版导出有水印，Pro 版无水印；批量限 3 条 |
| Phase 2 全部完成 | 可以收取 License Key，完整 v1.0 用户体验 |
