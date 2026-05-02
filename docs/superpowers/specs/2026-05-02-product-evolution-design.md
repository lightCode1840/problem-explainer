# AI Problem Explainer — 产品演进设计文档

> 创建日期：2026-05-02  
> 状态：已确认，待实施  
> 目标：将本地开发工具演进为功能完整、具备商业化能力的产品

---

## 背景与目标

### 当前状态

- 本地运行工具（localhost:3001 后端 + localhost:5173 前端）
- 支持 3 种题型：LeetCode 算法图解、英语语法、Java 八股文
- 7 个可视化组件，3 个 Remotion 模板
- 单用户，无账号体系，无持久化存储

### 目标用户

- **A. 学生 / 自学者**：将学习笔记做成视频自用或发布
- **B. 教师 / 培训机构**：批量生产课程讲解视频
- **C. 技术内容创作者**（当前主要用户）：提升内容产出效率

### 核心目标

1. **功能设计达到大厂产品水准**：可扩展架构、精致的视频质量、完整的产品功能
2. **双线变现**：工具本身作为 SaaS 对外付费使用 + 创作者用工具产出的内容变现
3. **演进路径**：先做高质量本地版 → 再迁移到云端 SaaS

---

## 演进路径：三阶段方案

```
Phase 1（约 3 周）：架构基础
  → 内容类型插件系统（新题型靠配置注册）
  → 修 P0 Bug + 字幕精准同步
  → 界面架构重组（Left Sidebar 导航 + 状态管理拆分）

Phase 2（约 4 周）：产品完整性
  → 多视觉风格 / 主题系统
  → 历史记录 + 草稿管理
  → License Key 付费机制 + 水印门控
  → 发布本地版 v1.0

Phase 3（按节奏推进）：SaaS 化
  → 用户账号（Auth）
  → 云端渲染队列 + 对象存储
  → 订阅付费（微信支付 / Stripe）
  → 上线 Web 版
```

---

## Section 1：核心架构——内容类型插件系统

### 问题

现有代码每添加一种题型需同时改动 5 处：`App.tsx`、`server.ts`、`Root.tsx`、新 Editor 组件、新 Template 组件。强耦合，越扩越乱。

### 解决方案：Plugin Registry

每种内容类型打包为独立 Plugin，集中注册：

```
src/plugins/
  registry.ts                  ← 所有插件在此注册，核心代码只读这里
  leetcode/
    index.ts                   ← 插件入口，实现 ContentTypePlugin 接口
    prompt.ts                  ← LLM 提示词
    LeetCodeEditor.tsx         ← 编辑器表单
    templates/
      dark-code/               ← 视觉风格 A（深色代码风）
      light-clean/             ← 视觉风格 B（极简白板风）
  grammar/
    index.ts
    ...
  java-interview/
    index.ts
    ...
  [future-type]/               ← 新题型：只需新建此文件夹并注册
    index.ts
```

### ContentTypePlugin 接口

```typescript
interface ContentTypePlugin {
  id: string                              // "leetcode" | "grammar" | ...
  displayName: string                     // "算法图解"
  icon: string                            // 侧边栏图标
  buildPrompt: (raw: string) => string    // LLM 提示词构建
  parseResponse: (raw: string) => ProblemData  // LLM 结果解析
  EditorComponent: React.FC<EditorProps>  // 编辑器表单组件
  templates: VisualTemplate[]             // 该题型支持的视觉风格列表
}

interface VisualTemplate {
  id: string                              // "dark-code" | "light-clean"
  name: string                            // "深色代码风"
  thumbnail: string                       // 预览图（base64 或 URL）
  Component: React.FC<TemplateProps>      // Remotion 组件
  theme: ThemeConfig                      // 颜色/字体 Token
}
```

### 对现有核心代码的影响

| 文件 | 改动 |
|------|------|
| `App.tsx` | Tab/导航列表改为 `registry.getAllPlugins().map(...)` 动态生成 |
| `server.ts` | `/api/parse` 统一调 `plugin.buildPrompt()` / `plugin.parseResponse()`，移除所有 `if type ===` 分支 |
| `Root.tsx` | 从 registry 动态加载对应 Remotion 组件 |

**新增题型时：只新建一个文件夹 + 在 `registry.ts` 加一行注册，其他文件零修改。**

---

## Section 2：视频质量提升体系

### 2.1 多视觉风格系统

每个插件拥有多套视觉风格，风格差异不止于配色，而是整套布局和视觉语言：

```
LeetCode 算法图解
  ├── 深色代码风（黑底高亮，类 VS Code Dark+）
  ├── 极简白板风（白底、手绘感线条）
  └── B站讲课风（蓝紫渐变背景、大字幕）

Java 八股文
  ├── 科技感卡片（深色 + 荧光绿）
  └── 清爽白底（适合正式课程）
```

主题 Token 系统确保同一套内容换风格只需切换变量，动画逻辑复用：

```typescript
interface ThemeConfig {
  background: string
  cardBg: string
  textPrimary: string
  textSecondary: string
  accent: string
  codeFont: string
  borderRadius: string
}
```

### 2.2 字幕精准同步（逐句高亮）

`node-edge-tts` 支持 Word Boundary 事件，可获取每个词的精确时间戳。

数据流：

```
TTS 生成时
  → 收集 word boundary 事件
  → 合并为字幕片段数组：[{ text, startMs, endMs }, ...]
  → 存入 videoData.subtitles，传给 Remotion

Remotion 渲染时
  → 当前帧时间落在哪个片段的 [startMs, endMs]
  → 该片段高亮，其他片段半透明
```

效果：字幕随配音精确跟读，达到专业字幕级别。

### 2.3 代码语法高亮（Phase 2）

引入 `@remotion/prism`，LeetCode 模板代码区改为：
- 关键字着色（类 VS Code Dark+ 配色）
- 当前执行行左侧高亮条 + 行号
- 支持 Java / Python / C++ / JavaScript

### 2.4 动画节奏优化（Phase 2）

- 元素飞入：改用 `spring()` 弹性曲线（Remotion 内置）
- 节点高亮：0.1s 缓冲过渡，非瞬间切换
- 步骤切换：前步淡出 + 后步飞入，非直接替换

---

## Section 3：界面架构重组

### 3.1 导航结构：Top Tabs → Left Sidebar

**问题**：顶部 Tab 栏空间有限，无法容纳 N 种插件题型和「历史记录」「模板市场」等新功能入口。

**方案**：改为 64px 宽图标侧边栏：

```
┌─────┬──────────────────────────┬─────────────────────┐
│     │                          │                     │
│ 算法│   编辑器区域（~45%）      │   视频预览（~55%）  │
│ 图解│                          │                     │
│ ──  │   ┌──────────────────┐   │  ┌───────────────┐  │
│ 八股│   │  AI 解析输入框    │   │  │               │  │
│ ──  │   └──────────────────┘   │  │   视频预览     │  │
│ 语法│   ▼ 手动编辑（折叠）      │  │               │  │
│ ──  │   ▼ 视觉风格选择（折叠）  │  └───────────────┘  │
│ 批量│                          │  时长 · 配音状态     │
│ ──  │                          │  [生成配音] [导出]   │
│ 历史│                          │                     │
│ ──  │                          │                     │
│ ⚙   │                          │                     │
└─────┴──────────────────────────┴─────────────────────┘
 64px         ~45%                       ~55%
```

题型图标由各插件在 `registry.ts` 注册时提供，新增题型自动出现在侧边栏，零改动。

### 3.2 状态管理：拆解 God Component

`App.tsx` 当前承载过多职责，按域拆分为独立 Context + Hook：

```
useVideoStore      → videoData, durationInFrames, audioUrl
useWorkflowStore   → isGeneratingAudio, isExporting, exportProgress
usePluginStore     → activePlugin, registeredPlugins
useTheme           → 已有，保留
useToast           → 已有，保留
```

`App.tsx` 只负责布局组合，业务逻辑全部下沉到对应 store。

### 3.3 新功能区布局规则

点击左侧「历史记录」「模板市场」等功能入口，中间编辑器区域切换为对应页面，右侧预览区保持不动：

- **历史记录页**：卡片列表（含缩略图/标题/日期），点击恢复到编辑器
- **模板市场页**（Phase 2）：风格预览卡片网格，点击即时应用到当前 videoData

---

## Section 4：变现机制设计

### 4.1 Phase 2：本地版 License Key 系统

**功能分层**

| 功能 | Free | Pro |
|------|------|-----|
| 所有题型 | ✅ | ✅ |
| 每月导出数量 | 5 个（含水印） | 无限（无水印） |
| 视觉风格 | 每题型 1 套 | 全部风格 |
| TTS 音色 | 仅晓晓 | 全部音色 |
| 批量模式 | 最多 3 条 | 无限制 |

水印是核心门控点：内容创作者发布视频必须去水印，付费意愿强。

**License Key 技术方案**

```
用户购买 → 收到 Key（格式：PEX-XXXX-XXXX-XXXX）
         → SettingsModal 输入 Key
         → App 请求 License Server 验证
         → 验证成功，本地缓存加密授权信息（含到期时间）
         → 7 天内离线可用（缓存有效期）

License Server：
  → Vercel Serverless Function（极简实现）
  → 数据库：只需 Keys 表（key, status, expiry, activated_at）
  → 接口：POST /validate、POST /deactivate
```

**购买渠道（无需自建商城）**

| 目标用户 | 平台 | 支付方式 |
|---------|------|---------|
| 国内 | 爱发电 / 蒸汽熊 | 微信 / 支付宝 |
| 海外 | Gumroad / Lemon Squeezy | Stripe |

两个平台均支持 Webhook，付款后自动生成并发送 Key，全流程无需人工介入。

### 4.2 Phase 3：SaaS 订阅体系

```
Free          → 每月 5 个视频（有水印），历史记录云端同步
Pro（月付）   → ¥39/月 或 ¥299/年，200 分钟渲染时长/月，无水印
Team（月付）  → ¥99/月，最多 5 成员，共享模板和历史
```

计费单位为**渲染分钟数**（而非视频数），更准确反映服务器成本。

**本地版 → 云端版迁移激励**：年付 License Key 可兑换等值云端 Pro 时长，避免用户感觉被重复收费。

---

## Section 5：SaaS 化路径与整体架构

### 5.1 迁移优势

现有架构天然友好于迁移——`server.ts` 已是标准 Express 后端，前后端已分离。迁移是**逐层替换**，非推倒重来：

| 本地版 | 云端版 |
|--------|--------|
| 本地文件系统（音频/视频） | 对象存储（OSS / S3 / R2） |
| 内存中的 exportQueue | 任务队列（BullMQ + Redis） |
| 无用户概念 | Auth 中间件（JWT） |
| 无数据持久化 | 数据库（PostgreSQL） |
| localhost:3001 | 云端 API 服务 |
| localhost:5173 | CDN 托管静态前端 |

Remotion 渲染逻辑、TTS 服务、LLM 调用三块**代码完全不需要改**。

### 5.2 Phase 3 系统架构

```
┌─────────────────────────────────────────────────────────┐
│                    用户浏览器                            │
│            React SPA（Vite 构建，CDN 分发）              │
└──────────────────────┬──────────────────────────────────┘
                       │ HTTPS
┌──────────────────────▼──────────────────────────────────┐
│                   API 服务器                             │
│              Express + Auth 中间件（JWT）                │
│                                                         │
│  /api/parse          → 调用 LLM（DeepSeek / OpenAI）    │
│  /api/generate-audio → 调用 TTS，音频上传 OSS           │
│  /api/export         → 推入渲染队列，返回 taskId         │
│  /api/export/status  → 查询队列进度                     │
│  /api/auth/*         → 登录 / 注册 / 刷新 Token         │
└───────┬──────────────────────────────┬──────────────────┘
        │                              │
┌───────▼────────┐            ┌────────▼────────┐
│  渲染 Worker   │            │   PostgreSQL     │
│ BullMQ + Redis │            │                 │
│                │            │  users          │
│ 执行 Remotion  │            │  history        │
│ render 命令    │            │  licenses       │
│ 输出 → OSS     │            │  subscriptions  │
└───────┬────────┘            └─────────────────┘
        │
┌───────▼────────┐
│  对象存储       │
│  OSS / R2      │
│  /audio/*.mp3  │
│  /videos/*.mp4 │
└────────────────┘
```

### 5.3 推荐技术选型

**方向 A：轻运维（推荐起步）**

| 组件 | 选型 | 理由 |
|------|------|------|
| 前端托管 | Vercel | 零配置，自动 CI/CD |
| API 服务 | Railway / Render | 直接部署 Express |
| 数据库 + Auth | Supabase | 自带 Auth，省大量代码 |
| 存储 | Cloudflare R2 | 无出流量费，S3 兼容 |
| 渲染 Worker | Railway 独立服务 | 可单独扩容 |

**方向 B：国内部署**

| 组件 | 选型 |
|------|------|
| 服务器 | 阿里云 ECS（2核4G 起） |
| 存储 | 阿里云 OSS |
| 数据库 | 阿里云 RDS PostgreSQL |
| 域名/CDN | 阿里云 CDN（需 ICP 备案） |

### 5.4 三阶段详细时间线

```
Phase 1（约 3 周）—— 架构基础
  Week 1：Plugin Registry + 现有 3 个插件迁移进新架构
  Week 2：Left Sidebar 导航重组 + 状态管理拆分（useVideoStore 等）
  Week 3：字幕精准同步（word boundary）+ P0 Bug 全修

Phase 2（约 4 周）—— 产品完整性
  Week 4：多视觉风格系统 + 主题 Token
  Week 5：历史记录功能（localStorage，最多 50 条）
  Week 6：License Server（Vercel Function）+ 爱发电/Gumroad 接入
  Week 7：水印系统 + 功能门控 + 发布本地版 v1.0

Phase 3（按节奏推进）—— SaaS 化
  Step 1：Supabase Auth 接入（2-3 天）
  Step 2：本地文件系统 → OSS 替换（1 周）
  Step 3：BullMQ 渲染队列云化（1 周）
  Step 4：订阅付费接入（Stripe / 微信支付，1-2 周）
  Step 5：Beta 上线，邀请早期用户
```

---

## 不在本次范围内

- 移动端 App
- 公开 API（第三方接入）
- 社区 / 用户生成内容市场
- 视频直接发布到 B 站 / 抖音（平台 API 接入）

以上均为 Phase 3 之后的扩展方向，当前设计为其预留了扩展空间，但不纳入实施计划。
