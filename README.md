# 码帧 TutorReel — AI 题目解析与视频生成系统

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

## 分发方式

| 方式 | 适合对象 | 命令 |
|------|----------|------|
| **桌面应用（推荐）** | 普通用户 | `npm run dist:mac` / `npm run dist:win` |
| **网页模式** | 本地使用 | `npm run build && npm start` → 浏览器打开 |
| **开发模式** | 开发者 | `npm run dev` |

---

## 快速开始

### 前置要求

| 工具 | 版本 | 安装 |
|------|------|------|
| Node.js | 18+ | https://nodejs.org |
| FFmpeg | 任意 | macOS: `brew install ffmpeg` · Windows: `winget install ffmpeg` |

### 第一步：下载代码

```bash
git clone <仓库地址>
cd problem-explainer
```

或直接下载 ZIP 解压。

### 第二步：安装依赖

```bash
npm install
```

### 第三步：配置 API Key

将 `.env.example` 复制为 `.env`，填入你的大模型 API Key：

```bash
cp .env.example .env
```

```env
# 大模型（DeepSeek / OpenAI 兼容接口均可）
OPENAI_API_KEY=你的_api_key
OPENAI_BASE_URL=https://api.deepseek.com

# License Key（购买后填入，不填默认 Free 版）
VALID_LICENSE_KEYS=PEX-XXXX-XXXX-XXXX
```

### 第四步：构建并启动

```bash
npm run build    # 构建前端（约 30 秒）
npm start        # 启动服务
```

启动后在浏览器打开 **http://localhost:3001**

> 导出的 MP4 文件保存在项目根目录的 `out/` 文件夹。

---

## 打包为桌面应用（.dmg / .exe）

### 前置要求

除 Node.js + FFmpeg 外，还需要：
- **macOS**：Xcode Command Line Tools（`xcode-select --install`）
- **Windows**：无额外要求，nsis 由 electron-builder 自动下载

### 打包步骤

```bash
# 安装依赖（首次）
npm install

# 填好 .env（API Key + License Keys）
cp .env.example .env

# 打包（在 macOS 上打 .dmg，在 Windows 上打 .exe）
npm run dist:mac    # → dist-app/*.dmg
npm run dist:win    # → dist-app/*.exe
```

打包时间约 3–10 分钟（主要是 Remotion bundle 构建）。

生成的安装包在 `dist-app/` 目录：
- macOS：`码帧 TutorReel-1.0.0.dmg`（约 400–600 MB）
- Windows：`码帧 TutorReel Setup 1.0.0.exe`

### 应用图标（可选）

在 `build/` 目录放置：
- `build/icon.icns`（macOS，1024×1024）
- `build/icon.ico`（Windows，256×256）

### 用户数据目录

安装后，用户生成的文件保存在：
- macOS：`~/Library/Application Support/码帧 TutorReel/`
- Windows：`%APPDATA%\码帧 TutorReel\`

---

### 开发模式（仅限开发者）

```bash
npm run dev          # 启动 Vite + Express（两个进程）
npm run electron:dev # 在 Electron 窗口中运行（先确保 npm run dev 已启动）
```

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
