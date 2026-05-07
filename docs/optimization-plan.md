# 项目优化执行计划

> 基于 2026-05-03 全量代码审计，按优先级排列。每项完成后打勾。

---

## P0：立即修复（安全隐患 + 配置错误）

- [x] P0-1: 撤销泄漏的 DeepSeek API Key，从 git 历史清理 `.env`
- [x] P0-2: 从 `asarUnpack` 移除已删除的 `ffmpeg-static` 引用

## P1：短期修复（稳定性 + 代码质量）

- [x] P1-1: 抽取 `streamSSE` 共享函数，消除 ProblemEditor/ProgrammingEditor 重复代码（~30 行 ×2）
- [x] P1-2: `POST /api/parse` 增加 `req.on('close')` 客户端断连检测
- [x] P1-3: `batchQueue` 轮询加 5 分钟超时保护（防内存泄漏）
- [x] P1-4: `build:remotion` 后增加产物验证步骤
- [x] P1-5: 统一前端 API 基地址 — 全部改用相对路径 + Vite proxy

## P2：中期优化（可靠性与安全）

- [ ] P2-1: 导出队列加磁盘持久化（服务器重启可恢复）
- [ ] P2-2: 核心 API 路由加 `express-rate-limit` 速率限制
- [ ] P2-3: 加 Helmet 安全头
- [ ] P2-4: `licenseStore` 增加服务端时间校验
- [ ] P2-5: JavaInterviewTemplate 硬编码像素值替换为文本测量

---

## 变更记录

| 日期 | 变更内容 | 涉及文件 |
|------|---------|---------|
| 2026-05-03 | P0-1: 确认 `.env` 未进 git，仅本地存在，无需清理 | — |
| 2026-05-03 | P0-2: 从 asarUnpack 移除 ffmpeg-static | `package.json` |
| 2026-05-03 | P1-1: 创建 `src/services/streamSSE.ts`，ProblemEditor/ProgrammingEditor 均改用共享函数 | `streamSSE.ts`, `ProblemEditor.tsx`, `ProgrammingEditor.tsx` |
| 2026-05-03 | P1-2: 服务端 SSE 端点增加 `aborted` 标记 + `req.on('close')` | `server.ts` |
| 2026-05-03 | P1-3: batchQueue processItem 轮询加 `MAX_POLL_MS` 5分钟超时检查 | `batchQueue.ts` |
| 2026-05-03 | P1-4: build:remotion 后验证 build/index.html 存在且非空 | `package.json` |
| 2026-05-03 | P1-5: 全部 fetch 改为相对路径，vite.config.ts 加 proxy 代理 /api、/health、/voiceover | `vite.config.ts`, `App.tsx`, `ProblemEditor.tsx`, `ProgrammingEditor.tsx`, `BatchEditor.tsx`, `SettingsModal.tsx`, `TopBar.tsx`, `licenseStore.ts` |

## 已知待处理（非本次引入）

- `ComparisonVisualizer.tsx:63` — 未使用变量 `isHighlighted`
- `GraphVisualizer.tsx:3` — 未使用 imports `GraphNode`, `GraphEdge`
- `GraphVisualizer.tsx:109` — 未使用变量 `endX`
