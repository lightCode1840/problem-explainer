# Problem Explainer Studio — 优化计划

> 更新日期：2026-05-02  
> 状态：待确认

---

## 一、P0 — Bug / 数据错误（必须修）

### B-01：audioUrl 硬编码 `localhost:3001`
- **位置**：`server.ts` L233、L296；`batchQueue.ts` L130
- **问题**：返回给前端的音频路径写死为 `http://localhost:3001/voiceover/xxx.mp3`。
  只要换端口或多开窗口，音频就会失效；Remotion 渲染时也用这个地址，同样受影响。
- **方案**：`server.ts` 里从 `req.headers.host` 动态拼；`batchQueue.ts` 里改为相对路径 `/voiceover/xxx.mp3`，由前端或 Remotion 服务本身负责补全 origin。

### B-02：批量流水线的 LLM 请求未注入用户 apiKey
- **位置**：`batchQueue.ts` L92 — `parseProblemWithLLM(rawText, item.type, 'deepseek-chat')`
- **问题**：批量任务在后端直接调 LLM，不走前端 fetch，因此用户在 SettingsModal 里配置的 apiKey/baseURL 完全无效，只能走 `.env` 默认值。
- **方案**：`/api/batch/start` 接口接收可选的 `{ apiKey, baseURL }`，透传进 `batchQueue.createJob(items, config?)`，再传给 `parseProblemWithLLM`。

### B-03：Grammar 题型表单字段缺失
- **位置**：`ProblemEditor.tsx`
- **问题**：ProblemEditor 只有 `java_interview` 的字段（keyPoints / visualIcon / graphData），AI 解析 grammar 题会返回 `options / correctAnswer`，但表单根本没有对应输入框，解析结果直接丢失。
- **方案**：在 ProblemEditor 里加一个类型切换（java_interview / grammar），grammar 模式下显示选项字段，或者拆成两个独立 Tab。

---

## 二、P1 — 重要功能缺失

### F-01：设置页加入"默认 AI 模型"和"TTS 语音角色"配置
- **位置**：`SettingsModal.tsx`、`tts.ts`
- **问题**：TTS 语音写死为 `zh-CN-XiaoxiaoNeural`（晓晓）；各编辑器里的"AI 模型"下拉框是局部 state，刷新即丢失。
- **方案**：
  - SettingsModal 加"默认模型"输入框（带预设 deepseek-v3-flash / deepseek-v3 / gpt-4o 等选项）
  - SettingsModal 加"TTS 语音"下拉框（5～6 个常用中文微软声音，附性别说明）
  - `generateTTS` 接收 `voice` 参数，`server.ts` 从 apiConfig 读取并透传

### F-02：解析历史记录
- **位置**：新增 `src/services/historyStore.ts` + 右侧面板 UI
- **问题**：每次 AI 解析结果关掉页面就丢失，只有草稿（只保最后一个）。
- **方案**：
  - 每次 `/api/parse` 成功后，在 localStorage 里追加一条 `{ id, title, type, timestamp, data }` 到 `pex_history` 数组（最多保留 20 条）
  - 在右侧预览区下方加一个可折叠的"历史记录"列表，点击条目恢复到编辑器

### F-03：LeetCode 代码区语法高亮
- **位置**：`LeetCodeTemplate.tsx`（视频模板）
- **问题**：代码显示区是纯白底 monospace 文本，没有颜色，观感较差。
- **方案**：引入 `@remotion/prism`（Remotion 官方推荐的轻量 Prism 方案），给代码添加关键字着色；同时把"打字效果"改为"按行展示（根据 codeLines 高亮当前行）"，去掉按字符打字的逻辑（与音频无关且视觉干扰大）。

---

## 三、P2 — 体验优化

### U-01：编辑器 AI 模型选项同步到 SettingsModal 默认值
- **问题**：三个编辑器里各自有独立的模型下拉框，与 Settings 里保存的默认模型互不关联。
- **方案**：编辑器 mount 时读取 `apiConfig.defaultModel`，默认填充到下拉框；下拉框修改不会持久化，只影响当次请求。

### U-02：批量流水线支持暂停 / 单条重试
- **位置**：`BatchEditor.tsx`、`batchQueue.ts`
- **问题**：某条 item 失败后，整个 job 继续跑完，但失败的那条没法单独重试，用户只能重新跑全部。
- **方案**：给每个 `BatchItem` 加"重试"按钮，`batchQueue` 支持 `retryItem(jobId, itemId)` 方法；在 BatchEditor 失败行旁显示"重试"按钮。

### U-03：预览播放器性能优化
- **位置**：`App.tsx`
- **问题**：Remotion Player 设置了 `autoPlay` + `loop`，页面加载即开始渲染，即使用户没打开视频 tab 也在消耗 CPU。
- **方案**：默认关闭 `autoPlay`；只有在 `videoData.audioUrl` 存在时才 `autoPlay`；在 `editorMode === 'batch'` 时隐藏/卸载 Player。

### U-04：Toast 显示时长可感知（区分轻重）
- **位置**：`Toast.tsx`
- **问题**：所有 Toast 都是 4000ms 自动消失，info 类型消失太快，error 类型有时来不及阅读。
- **方案**：`success/info` 保持 4s，`error` 改为 7s 或不自动消失（需手动关）。

---

## 四、P3 — 代码质量

### Q-01：`server.ts` 路由无统一错误处理
- **问题**：每个 route 都有各自的 `try/catch`，格式不统一，重复度高。
- **方案**：提取一个 `asyncHandler` 高阶函数包裹 route handler，统一 500 响应格式。

### Q-02：`batchQueue.ts` 的模型名写死 `'deepseek-chat'`
- **位置**：L92
- **问题**：批量任务用的模型名在代码里写死，无法跟前端用户选择的模型对齐。
- **方案**：`createJob` 接收 `model?: string`，不传则读 `process.env.DEFAULT_MODEL`，兜底 `deepseek-chat`。

---

## 五、P4 — 新功能（下一阶段）

### N-01：Grammar 题型完整支持
- 目前 GrammarTemplate.tsx 存在，但 ProblemEditor 里没有 grammar 表单。完整实现后，grammar 题型就可以从 AI 解析到预览到导出全流程跑通。

### N-02：视频主题/背景切换
- 在编辑器里加"模板主题"选项（深色/浅色/极简），参数传给 Remotion 模板控制配色。

### N-03：字幕时间轴同步
- 当前 TTS 只返回总时长，没有逐字时间戳。接入微软的 word boundary 事件（node-edge-tts 支持），实现视频底部字幕逐句高亮。

---

## 执行顺序建议

```
P0 (B-01, B-02, B-03) → F-01 (Settings 扩展) → F-03 (代码高亮) → U-03 (播放器优化) → U-01 (模型同步) → F-02 (历史记录)
```

P3 代码质量问题可以在任意时机顺手修，不需要独立安排。
