# AI Problem Explainer - 开发规约与核心架构

## 项目定位
该项目是一个将纯文本题目转化为“带解说和图解动画的短视频”的生成系统。
核心难点在于：大模型的非结构化输出 -> 结构化的动画帧数据 -> 视频时间轴的精确映射。

## 架构说明
- **双模架构**：
  - `src/components/editor/`：前端编辑器，用于用户交互、模型选择、表单调整。包含 `ProblemEditor`（语法/八股）、`ProgrammingEditor`（算法题）、`BatchEditor`（批量模式）。
  - `src/templates/`：Remotion 视频模板，不可包含任何非受控的副作用（如 `useEffect` 获取数据），所有状态必须由 `props` 传入。
- **状态流转**：
  - LLM 生成 `steps` JSON -> `server.ts` 合成 TTS 音频并计算 `durationInFrames` -> 传递给 `Root.tsx` 的 `calculateMetadata` -> `LeetCodeTemplate.tsx` 根据比例切分时间轴。
- **服务层** (`src/services/`)：
  - `apiConfig.ts`：用户 API Key / baseURL / 默认模型 / TTS 语音角色的 localStorage 持久化配置，所有编辑器通过它读写用户设置。
  - `llm.ts`：调用大模型（OpenAI 兼容接口），提示词和解析逻辑在此。
  - `tts.ts`：调用 `node-edge-tts` 生成音频，含文本净化逻辑。
  - `exportQueue.ts`：单条视频后台渲染队列。
  - `batchQueue.ts`：批量解析队列，独立于 exportQueue，管理多条 job/item 的异步 LLM 调用。
  - `export.ts`：Remotion 渲染调用封装。
- **UI 层**：
  - `src/hooks/useTheme.ts`：暗色模式 Hook，读写 `localStorage('pex_theme')`，切换 `<html class="dark">`，采用 Tailwind `dark:` class 策略。
  - `src/components/ui/`：`TopBar`、`Toast`（需用 React Portal 挂载到 body，见约定 5）、`SettingsModal`。
  - `react-resizable-panels`：左右面板拖拽分割（默认比例约 42/58），已集成在 `App.tsx`。

## 核心约定

### 1. 题型模式限制
- **编程算法题 (Leetcode)**：因其可视化图解空间占用大，强制限定为**单题模式**。
- **标准题型 (Grammar / Java Interview)**：支持**多题模式**（通过 UI 的 Progressive Disclosure 选项卡实现，如“第一题”、“第二题”切换比对）。

### 2. 动画与数据结构 (`AnimationState`)
大模型返回的数据必须遵循”多结构同屏”规范：
```typescript
export interface AnimationState {
  structures: Array<{
    id: string; // 唯一标识，如 “tree1”, “queue1”
    type: 'array' | 'tree' | 'linkedlist' | 'grid';
    data: any[];
    pointers: Record<string, number>;
    highlights: number[];
  }>;
}
```
可用 Visualizer 组件（`src/components/visualizers/`）：`ArrayVisualizer`、`TreeVisualizer`、`LinkedListVisualizer`、`GridVisualizer`、`GraphVisualizer`、`ComparisonVisualizer`、`TimelineVisualizer`。新增图解类型时优先复用已有组件。

### 3. 双轨配音制与净化 (TTS Sanitization)
- `text`：用于视频底部字幕，应精简、可包含代码符号。
- `spokenText`：专用于 TTS 配音，必须拟人化。
- **文本净化**：发送至 `node-edge-tts` 的文本，须在后端移除 Markdown 标记（如 `**`，`#`）以及连续的填空下划线（`___`替换为空格），避免 TTS 机械地读出“星号”、“下划线”。

### 4. 动画飞入节奏与音画同步
当开发无关键帧（无 `steps` 状态数组）的纯文本类模板（如 `JavaInterviewTemplate`）时：
- **禁止**根据总时长（`durationInFrames`）平摊要点的出场时间。
- **应当**采用**紧凑入场模式**（例如在开头的 1.5s - 4.5s 依次飞入核心考点），以保证视觉要点能在 AI 讲解概念的初期就呈现给观众，提升音画同步感。

### 5. Z-Index 遮挡问题处理
在开发前端 UI 时，由于 Remotion 播放器的层级影响，任何全局弹窗（如 Toast）必须使用 React Portal (`createPortal`) 挂载到 `document.body`，并设置 `z-[99999]`，以防止被右侧视频预览区遮挡。

### 6. 后端路由清单
- `POST /api/parse`：接收原始文本，调用 LLM 进行全流程解析和音频生成。
- `POST /api/generate-audio`：接收手动编辑后的表单 JSON 数据，重新生成 TTS 音频和时长（需确保带入 `problemReading` 和 `explanation` 文本）。
- `POST /api/export`：接收完整的视频配置，放入后台**渲染队列 (`exportQueue`)**，并返回 `taskId`。
- `GET /api/export/status/:id`：轮询渲染进度。
- `GET /api/export/download/:filename`：下载已生成的 MP4 文件。
