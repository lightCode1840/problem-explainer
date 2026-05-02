# UI 重设计实施方案 — 方案 A（折叠编辑 + 视频主导）

> 状态：待确认  
> 日期：2026-05-02

---

## 一、最终效果描述

### 整体布局

```
┌──────────────────────────────────────────────────────────────────────┐
│  ☁ Problem Explainer Studio  │ 八股/语法 │ 算法图解 │ 批量 │  ⚙  🌙  │
├─────────────────────────────┬────────────────────────────────────────┤
│                             │                                        │
│  ✨ AI 智能一键解析           │  ┌──────────────────────────────────┐  │
│  ┌─────────────────────┐    │  │                                  │  │
│  │ 粘贴题目文本...      │    │  │                                  │  │
│  └─────────────────────┘    │  │         视频预览                  │  │
│  模型: [DeepSeek V4 Flash ▾]│  │         (16:9, 全宽)              │  │
│  [      一键解析题目      ]  │  │                                  │  │
│                             │  └──────────────────────────────────┘  │
│  ─────── 手动编辑 ──────     │                                        │
│  ▼ 基础字段  （可展开/收起） │  08/30 已保存草稿  ·  45s  ·  ✅配音   │
│  ▼ 图解配置  （可展开/收起） │                                        │
│                             │  ┌────────────────┐ ┌──────────────┐  │
│                             │  │  🎙 生成配音预览  │ │  ⬇ 导出 MP4 │  │
│                             │  └────────────────┘ └──────────────┘  │
│         (42%)               │             (58%)                      │
└─────────────────────────────┴────────────────────────────────────────┘
```

### 暗色模式

```
背景：#0F0F11
卡片：#18181B（带 1px border #27272A）
文字：#F4F4F5
次要文字：#71717A
主色保持 Indigo-500 #6366F1
```

---

## 二、设计细节规范

### 颜色体系

| 用途 | 浅色模式 | 深色模式 |
|------|----------|----------|
| 页面背景 | `#F9FAFB` (gray-50) | `#0F0F11` |
| 卡片/面板背景 | `#FFFFFF` | `#18181B` |
| 边框 | `#E5E7EB` (gray-200) | `#27272A` |
| 主要文字 | `#111827` (gray-900) | `#F4F4F5` |
| 次要文字 | `#6B7280` (gray-500) | `#71717A` |
| 主色（按钮/高亮） | `#4F46E5` (indigo-600) | `#6366F1` (indigo-500) |
| 主色悬停 | `#4338CA` (indigo-700) | `#818CF8` (indigo-400) |
| 危险色 | `#DC2626` | `#EF4444` |
| 成功色 | `#16A34A` | `#22C55E` |

### 卡片/组件规范

- **边框**：1px solid，无阴影（彻底去掉所有 `shadow-*`）
- **圆角**：统一 `rounded-xl`（12px）
- **间距**：`p-5` 内边距，`gap-4` 组件间隔
- **按钮**：主按钮 filled indigo，次级按钮 `border border-gray-200 bg-transparent`，悬停只改背景色，无 `-translate-y` 上浮效果
- **输入框**：`bg-gray-50 dark:bg-zinc-900` 底色，`focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500`

### TopBar 改动

- 右侧增加主题切换按钮（🌙 / ☀️），icon button，点击切换 `<html class="dark">`
- 去掉 "Live Preview" 闪烁动效标签（太嘈杂）
- 后端状态改为更简洁的小圆点 + 文字，去掉红色大背景块

---

## 三、架构变化（重要）

### 核心变化：将"生成配音"和"导出"操作提升到 App.tsx

**当前架构（有问题）**：
```
ProblemEditor
  └─ handleSubmit() = 生成配音 + onSubmit(data)  ← 逻辑混在编辑器里
  └─ handleExportVideo() = 导出               ← 同上
```

**重设计后**：
```
App.tsx
  ├─ videoData state
  ├─ handleGenerateAudio()  ← 从 videoData 读数据，调 /api/generate-audio
  ├─ handleExportVideo()    ← 从 videoData 读数据，调 /api/export
  └─ 右侧面板：[生成配音] [导出MP4] 按钮

ProblemEditor (纯数据编辑器)
  └─ onChange(data) 实时同步表单到 App.tsx
  └─ 不再有 handleSubmit（删掉音频生成逻辑和导出逻辑）

ProgrammingEditor (同上)
```

**好处**：
1. 编辑器只负责编辑，不管"生产"操作，职责单一
2. 按钮可以放在右侧面板，布局更自由
3. 去掉重复的 isGeneratingAudio / isExporting 等状态
4. Toast 统一由 App.tsx 管理，不需要每个编辑器各自引入

---

## 四、需要修改的文件

### 1. `src/App.tsx` ★★★（最大改动）

**新增**：
- `isDark` state + `toggleTheme()` 函数（读写 `localStorage: 'pex_theme'`，切换 `<html>` 的 `dark` class）
- `isGeneratingAudio` / `isExporting` / `exportProgress` / `exportTaskId` state
- `handleGenerateAudio()` — 从 `videoData` 构建参数，调用 `/api/generate-audio`
- `handleExportVideo()` — 调用 `/api/export`，轮询进度
- `useToast()` — 统一 Toast 管理
- 右侧面板：大视频预览 + 状态栏 + 两个操作按钮 + 导出进度条

**修改**：
- 布局改为 42/58 分栏
- 右侧视频预览去掉"使用步骤"卡片，改为更大的视频区域
- `pt-16` 和 banner 的 padding 保持不变

**删除**：
- "使用步骤" 卡片（右侧底部那个 ol 列表）

---

### 2. `src/components/ui/TopBar.tsx` ★★

**新增**：
- `onThemeToggle` prop
- `isDark` prop（用于显示正确的图标）
- 主题切换按钮（🌙/☀️）

**修改**：
- 后端状态 UI 简化（去掉红色大背景块，改用小圆点）
- 整体颜色适配 dark mode（`dark:bg-zinc-950 dark:border-zinc-800`）

---

### 3. `src/components/editor/ProblemEditor.tsx` ★★★

**删除**：
- `handleSubmit()` 里的 `/api/generate-audio` 调用
- `handleExportVideo()` 整个函数
- `isGeneratingAudio` / `isExporting` / `exportProgress` / `exportStatus` state
- `useToast()` 导入和使用（Toast 移到 App.tsx）
- 底部那两个大按钮（"生成配音预览" 和 "导出 MP4"）
- Toast 组件渲染

**新增**：
- `isManualEditOpen` state（折叠控制，默认 `false`，AI 解析成功后自动 `true`）
- `isVisualizationOpen` state（图解配置折叠，默认 `false`）
- 折叠面板 toggle UI（带展开/收起箭头和标题）

**修改**：
- `handleSubmit` 简化为纯表单提交（只 `onSubmit(data)`，不再包含音频逻辑）
- `onChange` 保留原有逻辑（实时同步）
- AI 解析区域去掉渐变背景，改为简洁白卡片
- 整体 dark mode 适配

---

### 4. `src/components/editor/ProgrammingEditor.tsx` ★★★

与 ProblemEditor 相同的改动模式：删除音频生成和导出逻辑，加折叠面板，dark mode 适配。

---

### 5. `src/index.css` ★

**新增**：
```css
/* Dark mode transition */
html { transition: background-color 0.2s, color 0.2s; }
```

**Tailwind v4 的 dark mode 配置**：在 `@theme` 中确认 `darkMode: 'class'` 已启用（需检查 vite.config / css 配置）。

---

### 6. `src/components/editor/BatchEditor.tsx` ★

仅做 dark mode 适配（颜色类名调整），不改结构。

---

## 五、不改的部分

- **Remotion 视频模板**（`src/templates/`）— 只改前端 UI
- **后端** `server.ts` — 不动
- **类型定义** `types/problem.ts` — 不动
- **服务层** `services/` — 不动

---

## 六、实施顺序

```
Step 1：主题系统搭建
  → 配置 Tailwind dark mode（检查并启用 class 策略）
  → useTheme hook / App.tsx toggleTheme
  → TopBar 加 dark 切换按钮

Step 2：App.tsx 布局重构 + 操作逻辑提升
  → 42/58 布局
  → 右侧：大视频预览 + 按钮区
  → 提升 generateAudio / exportVideo 逻辑到 App.tsx
  → Toast 统一管理

Step 3：ProblemEditor 重构
  → 删除按钮和操作逻辑
  → 加折叠面板
  → dark mode 颜色适配

Step 4：ProgrammingEditor 重构（同 Step 3）

Step 5：TopBar + BatchEditor dark mode 适配

Step 6：全局 UI polish
  → 去掉所有 shadow-*，改细边框
  → 按钮 hover 效果统一
  → 去掉过度渐变背景
```

---

## 七、风险提示

1. **操作按钮提升的数据完整性**：
   - `ProgrammingEditor` 的 `stepsText` 是本地 JSON 字符串，`videoData` 存的是已解析的 `steps` 数组
   - `handleGenerateAudio` 在 App.tsx 调用时，需要 `JSON.stringify(videoData.steps)` 作为 `stepsText` 参数，这是可行的

2. **折叠面板 AI 解析完成后自动展开**：
   - AI 解析成功后需要调用一个回调通知父组件或自己设 state
   - 目前 AI 解析逻辑在编辑器内部，可以在解析成功时直接 `setIsManualEditOpen(true)`

3. **BatchEditor 独立**：
   - 批量模式下右侧不显示视频预览，编辑器全宽，按钮逻辑保持在 BatchEditor 内部不动

---

## 八、预估工作量

| 步骤 | 复杂度 | 预计时间 |
|------|--------|----------|
| Step 1 主题系统 | 低 | 15 min |
| Step 2 App.tsx 大改 | 高 | 45 min |
| Step 3 ProblemEditor | 中 | 30 min |
| Step 4 ProgrammingEditor | 中 | 25 min |
| Step 5 TopBar + BatchEditor | 低 | 15 min |
| Step 6 UI polish | 中 | 20 min |
| **合计** | | **~2.5h** |
