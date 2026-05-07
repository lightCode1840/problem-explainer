# TutorReel — AI 题目讲解短视频生成工具

粘贴题目，AI 自动拆解知识点、生成配音与可视化动画，一键导出 MP4 讲解视频。支持 LeetCode 算法题、英语语法、Java 面试等多种题型。

## 主要功能

- **多模型接入** — 支持 DeepSeek、GPT、Qwen 等主流大模型，自由切换
- **自动配音** — 字幕与语音分离设计，字幕简洁可读，语音自然流畅
- **可视化动画** — 数组、树、链表等数据结构随讲解步骤自动推进，高亮与指针同步更新
- **多题型支持** — 内置 LeetCode 算法题、英语语法、Java 面试题三种模板，可扩展
- **内容可编辑** — AI 生成的脚本和动画状态支持手动调整
- **本地运行** — 数据在本地处理，无需上传云端

## 技术栈

| 层级 | 技术 |
|------|------|
| 前端框架 | React + Vite + Tailwind CSS |
| 视频引擎 | Remotion |
| 桌面壳 | Electron |
| 后端服务 | Express.js + Node.js |
| AI 接口 | OpenAI 兼容协议（DeepSeek / GPT / Qwen） |
| TTS 引擎 | edge-tts（内置 `node-edge-tts`） |

## 快速开始

### 前置要求

- Node.js 18+
- FFmpeg（macOS: `brew install ffmpeg` · Windows: `winget install ffmpeg`）

### 安装与运行

```bash
# 下载代码
git clone https://github.com/lightCode1840/TutorReel.git
cd TutorReel

# 安装依赖
npm install

# 配置 API Key
cp .env.example .env
# 编辑 .env，填入你的 API Key

# 构建并启动
npm run build
npm start
```

启动后浏览器打开 **http://localhost:3001**

> 导出的 MP4 文件保存在项目根目录的 `out/` 文件夹。

## 桌面应用

提供 macOS（.dmg）和 Windows（.exe）安装包，即装即用，无需配置开发环境。

### 构建安装包

```bash
npm run dist:mac    # → dist-app/*.dmg
npm run dist:win    # → dist-app/*.exe
```

打包约 3–10 分钟。生成的安装包：
- macOS：`TutorReel-1.0.0.dmg`（≈ 400–600 MB）
- Windows：`TutorReel Setup 1.0.0.exe`

## 开发

```bash
npm run dev          # 启动 Vite + Express 开发模式
npm run electron:dev # 在 Electron 窗口中预览（需先启动 npm run dev）
```

## 项目结构概览

```
src/
├── plugins/          # 题型插件（leetcode / grammar / java_interview）
│   ├── registry.ts   # 插件注册表
│   └── types.ts      # ContentTypePlugin 接口定义
├── stores/           # React Context 状态管理
│   ├── videoStore.tsx
│   ├── workflowStore.tsx
│   └── pluginStore.tsx
├── components/
│   ├── editor/       # 题目编辑器（ProblemEditor / ProgrammingEditor / GrammarEditor）
│   ├── visualizers/  # 数据结构动画组件（Array / Tree / LinkedList / Grid / Graph）
│   └── ui/           # 通用 UI 组件（Sidebar / TopBar / Modal / Toast）
├── templates/        # Remotion 视频模板
│   ├── LeetCodeTemplate.tsx
│   ├── GrammarTemplate.tsx
│   └── JavaInterviewTemplate.tsx
├── services/         # 服务层（LLM / TTS / export / history / license）
├── themes/           # 主题配置（dark-code / light-clean / blue-tech）
└── hooks/            # 自定义 Hook（useTheme）
```

## License

MIT
