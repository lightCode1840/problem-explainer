# AI Problem Explainer - 智能题目解析与视频生成系统

这是一个基于 Remotion、React 和 Tailwind CSS 构建的自动化题目解析和视频生成平台。该系统能够接入大语言模型（如 DeepSeek），自动将编程算法题、英语语法题、Java 八股文等解析为带有动态图解和拟人化语音讲解的短视频。

## 核心能力

- **AI 智能解析**：一键输入力扣题目，自动生成解题思路和分步图解。
- **多图解同屏渲染**：支持在视频中同时渲染多种数据结构动画（如二叉树和辅助队列同步推演）。
- **智能语音合成 (TTS)**：内置 `node-edge-tts` 引擎，支持“双轨制”文案（字幕精简、配音拟人化）。
- **音画自动同步**：根据配音时长自动动态调整视频帧率与图解动画速度。
- **一键导出 MP4**：基于 `ffprobe` 和 Remotion 后台渲染，支持导出高清 MP4 视频。

## 技术栈

- **前端**：React, Vite, Tailwind CSS
- **视频引擎**：Remotion
- **后端**：Express.js, Node.js (`tsx watch` 热更新)
- **大模型**：DeepSeek (通过 OpenAI 兼容接口)
- **测试**：Playwright (E2E 测试)

## 快速开始

### 1. 环境准备

安装依赖：
```bash
npm install
```

如果你需要导出 MP4 视频或进行音轨分析，请确保系统已安装 `ffmpeg`：
```bash
# macOS
brew install ffmpeg

# Windows（使用 winget）
winget install ffmpeg
```

### 2. 环境变量

在项目根目录创建 `.env` 文件，并配置大模型 API Key：
```env
OPENAI_API_KEY="你的_deepseek_api_key"
OPENAI_BASE_URL="https://api.deepseek.com"
```

### 3. 启动项目

我们使用 `concurrently` 同时启动前端和后端服务，并支持后端热更新。

```bash
npm run dev
```
- 前端编辑器访问地址：`http://localhost:5173/`
- 后端 API 接口地址：`http://localhost:3001/`

### 4. 渲染与导出

通过前端页面的“导出视频”按钮，系统会在后台自动渲染。
导出的 MP4 文件将统一存放在项目根目录的 `/out` 文件夹中。

## 开发指南

- **数据结构与图解**：动画组件存放在 `src/components/visualizers/`，支持 `ArrayVisualizer`、`TreeVisualizer`、`LinkedListVisualizer`、`GridVisualizer`、`GraphVisualizer`、`ComparisonVisualizer`、`TimelineVisualizer`。
- **题目类型模板**：存放于 `src/templates/`，目前支持 `LeetCodeTemplate`（编程题单题图解）、`GrammarTemplate`（英语语法多题模式）、`JavaInterviewTemplate`（Java八股文多题模式）。
- **编辑器组件**：存放于 `src/components/editor/`，包含 `ProblemEditor`（语法/八股）、`ProgrammingEditor`（算法题）、`BatchEditor`（批量解析模式）。
- **用户设置**：位于 `src/services/apiConfig.ts`。API Key、baseURL、默认模型、TTS 语音角色均通过此模块持久化到 localStorage。
- **大模型提示词**：位于 `src/services/llm.ts`。修改大模型的输出格式或角色设定请在这里进行。
- **TTS 音频生成**：位于 `src/services/tts.ts`。文本在合成语音前会进行净化（移除 Markdown 符号和填空下划线）以保证发音自然。
- **渲染与导出队列**：位于 `src/services/exportQueue.ts`（单条视频）和 `src/services/batchQueue.ts`（批量解析）。采用后端轮询模式避免本地 CPU 过载。
- **暗色模式**：通过 `src/hooks/useTheme.ts` Hook 管理，读写 `localStorage('pex_theme')`，切换 `<html class="dark">`。
