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

### 插件系统
题型以插件形式注册于 `src/plugins/registry.ts`，每个插件实现 `ContentTypePlugin` 接口（`src/plugins/types.ts`），包含 `buildSystemPrompt`、`parseResponse`、`EditorComponent`、`templates` 等字段。目前有三个插件：`java_interview`、`grammar`、`leetcode`，分别位于 `src/plugins/` 对应子目录。

新增题型时：在 `src/plugins/<type>/` 创建 `index.ts`（插件定义）和 `prompt.ts`（系统提示词），然后在 `registry.ts` 注册。

### 状态管理
`src/stores/` 下有三个 React Context：`videoStore`（videoData）、`workflowStore`（isGeneratingAudio/isExporting）、`pluginStore`（activePlugin/allPlugins）。

### 视频模板
模板存放于 `src/templates/`，是纯 Remotion 组件，所有状态由 props 传入。**注意：`src/Composition.tsx` 不得导入 `plugins/registry`**，否则编辑器组件会被打入 Remotion bundle 导致导出失败。

- `LeetCodeTemplate`：编程题单题图解
- `GrammarTemplate`：英语语法多题模式
- `JavaInterviewTemplate`：Java 八股文，左考点 + 右图解 + 底部滚屏解析

### 数据结构可视化
动画组件存放在 `src/components/visualizers/`，支持 Array / Tree / LinkedList / Grid / Graph / Comparison / Timeline。

### 服务层
- `src/services/apiConfig.ts` — API Key / baseURL / 默认模型 / TTS 角色，localStorage 持久化
- `src/services/llm.ts` — 大模型调用（OpenAI 兼容），含流式和非流式版本
- `src/services/tts.ts` — TTS 音频生成 + 文本净化 + 字幕时间戳估算
- `src/services/historyStore.ts` — 解析历史，最多 50 条，key: `pex_history`
- `src/services/licenseStore.ts` — Free/Pro 分级，7 天离线宽限
- `src/services/exportQueue.ts` — 单条视频后台渲染队列
- `src/services/batchQueue.ts` — 批量解析队列，透传用户 API Key

### 主题
`src/themes/tokens.ts` 导出 `THEMES` 对象（`dark-code`、`light-clean`、`blue-tech`）。

### 暗色模式
通过 `src/hooks/useTheme.ts` Hook 管理，读写 `localStorage('pex_theme')`，切换 `<html class="dark">`。
