# 码帧 TutorReel - 开发规约与核心架构

## 项目定位
该项目将纯文本题目转化为"带解说和图解动画的短视频"（码帧 = 代码 + 视频帧）。
核心难点：大模型非结构化输出 → 结构化动画帧数据 → 视频时间轴精确映射。

## 架构说明（截至 2026-05-02）

### 插件系统 (`src/plugins/`)
新增核心抽象，每种题型对应一个 `ContentTypePlugin`：
```typescript
interface ContentTypePlugin {
  id: string;
  displayName: string;
  Icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }>; // lucide-react 组件，不能是 emoji 字符串
  buildSystemPrompt: (language?: string) => string;
  parseResponse: (raw: string) => AnyProblemData;
  EditorComponent: React.ComponentType<EditorProps>;
  defaultTemplateId: string;
  templates: VisualTemplate[];
}
```
- `src/plugins/registry.ts`：全局注册表，启动时注册三个插件（java_interview / grammar / leetcode）。
- `src/plugins/java-interview/`、`src/plugins/grammar/`、`src/plugins/leetcode/`：各自的 prompt、parseResponse 和 EditorComponent 封装。

### ⚠️ 关键约束：Composition.tsx 不得导入 registry
`src/Composition.tsx` 是 Remotion 渲染入口，**必须只导入模板组件**，不能 import `plugins/registry`。
原因：registry 依赖 EditorComponent（ProblemEditor 等），这些 UI 组件会被拉入 Remotion 的 Webpack bundle，导致打包失败/导出失败。
正确写法：在 Composition.tsx 里维护一个 `templateMap: Record<string, ComponentType>` 直接映射。

### 状态管理（三个 React Context，替代原来的 God Component App.tsx）
- `src/stores/videoStore.tsx`：`useVideoStore`，管理 `videoData`、`draftStatus`、`setVideoData`、`updateAudio`。
- `src/stores/workflowStore.tsx`：`useWorkflowStore`，管理 `isGeneratingAudio`、`isExporting`、`exportProgress`、`exportStatus`。
- `src/stores/pluginStore.tsx`：`usePluginStore`，管理 `activePlugin`、`setActivePluginId`、`allPlugins`（从 registry 派生）。
- `src/main.tsx` 包裹顺序：`<PluginProvider><VideoProvider><WorkflowProvider><App /></WorkflowProvider></VideoProvider></PluginProvider>`

### 编辑器 (`src/components/editor/`)
- `ProblemEditor`：八股/面试题，含 `question`、`keyPoints`、`explanation` 等字段。
- `ProgrammingEditor`：算法题（LeetCode），含代码 `steps` 和 `AnimationState`。
- `GrammarEditor`：英语语法题，含 `options` A-D 和 `correctAnswer`（单选）。
- `BatchEditor`：批量流水线；Free 版限制 ≤ 3 条同时处理。

### 视频模板 (`src/templates/`)
Remotion 组件，所有状态必须由 `props` 传入，**禁止** `useEffect` 副作用。
- `JavaInterviewTemplate`：左侧考点飞入 + 右侧图解 + 底部解析滚屏。
- `GrammarTemplate`：大字问题 + 四选项高亮揭晓。
- `LeetCodeTemplate`：代码步骤 + 数据结构动画同步。

### 主题 (`src/themes/tokens.ts`)
`THEMES` 常量映射（`dark-code` / `light-clean` / `blue-tech`），每条记录含 `ThemeConfig`（background/cardBg/textPrimary/textSecondary/accent/borderColor/codeFont）。

### 服务层 (`src/services/`)
- `apiConfig.ts`：用户 API Key / baseURL / 默认模型 / TTS 语音角色，持久化到 localStorage。
- `llm.ts`：大模型调用（OpenAI 兼容），含非流式 `callLLM()` 和流式版本。
- `tts.ts`：`node-edge-tts` 音频生成 + 文本净化 + `estimateSubtitles()` 基于字符数估算字幕时间戳。
- `historyStore.ts`：localStorage `pex_history`，最多 50 条，按 title+type 去重，`addToHistory` / `getHistory` / `removeFromHistory`。
- `licenseStore.ts`：free/pro 分级，`getCurrentTier()`，7 天离线宽限，`validateLicenseKey()` 调用远端验证。
- `exportQueue.ts`：单条视频后台渲染队列，接收 `showWatermark` 参数并透传到 Remotion `inputProps`。
- `batchQueue.ts`：批量解析队列，接收 `LLMConfig`（apiKey/baseURL/model）并在 processItem 时透传给 LLM 调用。
- `export.ts`：Remotion 渲染封装，接收 `showWatermark` 参数。

### UI 层 (`src/components/ui/`)
- `Sidebar.tsx`：左侧 64px 固定图标栏，图标从 plugin.Icon（lucide）动态渲染，含批量/历史固定入口。
- `TopBar.tsx`：仅含 Logo、后端状态指示、暗色切换、设置按钮（已移除题型 Tabs）。
- `SettingsModal.tsx`：AI 服务配置抽屉 + License 跳转按钮。
- `LicenseModal.tsx`：License 激活弹窗（Free/Pro 状态显示 + Key 输入）。
- `HistoryPanel.tsx`：历史记录列表（还原 + 删除）。
- `Toast.tsx`：必须用 React Portal 挂载到 body，设置 `z-[99999]`，避免被 Remotion Player 遮挡。
- `src/hooks/useTheme.ts`：暗色模式，读写 `localStorage('pex_theme')`，切换 `<html class="dark">`。

## 核心约定

### 1. 题型模式限制
- **算法题 (leetcode)**：强制单题模式（可视化占用空间大）。
- **Grammar / Java Interview**：支持多题模式（Progressive Disclosure 选项卡）。

### 2. 动画与数据结构 (`AnimationState`)
大模型返回数据须遵循多结构同屏规范：
```typescript
export interface AnimationState {
  structures: Array<{
    id: string;       // 如 "tree1", "queue1"
    type: 'array' | 'tree' | 'linkedlist' | 'grid';
    data: any[];
    pointers: Record<string, number>;
    highlights: number[];
  }>;
}
```
可用 Visualizer：`ArrayVisualizer`、`TreeVisualizer`、`LinkedListVisualizer`、`GridVisualizer`、`GraphVisualizer`、`ComparisonVisualizer`、`TimelineVisualizer`。

### 3. 双轨配音制与净化
- `text`：字幕用，可含代码符号。
- `spokenText`：TTS 用，必须拟人化，净化掉 Markdown 和 `___` 填空线。

### 4. 动画飞入节奏
纯文本类模板（无 `steps` 数组）须用**紧凑入场模式**（开头 1.5s 起每 1.5s 飞入一条），不平摊到全程。

### 5. Z-Index 遮挡
全局弹窗（Toast / Modal）必须用 `createPortal` 挂到 `document.body`，并设置 `z-[99999]`。

### 6. 插件图标规范
`ContentTypePlugin.Icon` 必须是 lucide-react 组件引用（如 `BookOpen`），不能是 emoji 字符串。Sidebar 用 `<plugin.Icon size={20} strokeWidth={1.75} />` 渲染。

### 7. 后端路由清单
**核心路由**
- `POST /api/parse`：SSE 流式返回，接收 `{ rawText, type|targetType, apiKey?, baseURL? }`，调用 LLM 解析 + TTS 合成。
- `POST /api/generate-audio`：接收编辑后的 JSON，重新生成 TTS，返回 `{ audioUrl, durationInFrames, subtitles }`。
- `POST /api/export`：接收 `{ videoData, showWatermark }` 加入渲染队列，返回 `taskId`。
- `GET /api/export/status/:id`：轮询渲染进度。
- `GET /api/export/download/:filename`：下载 MP4。
- `POST /api/test-config`：测试用户 API Key 连通性。

**批量路由**
- `POST /api/batch/split-text`：接收长文本，LLM 拆题，返回 `{ problems: ParsedItem[] }`。
- `POST /api/batch/scrape`：接收八股文 URL，爬取并解析，返回题目列表。
- `POST /api/batch/start`：接收 `{ items, apiKey?, baseURL?, model? }`，创建批量 job，返回 `{ jobId }`。
- `GET /api/batch/status/:id`：轮询批量任务状态。
- `POST /api/batch/merge/:id`：合并批量 job 的所有视频片段，返回 `{ videoUrl }`。
