# Rebrand & Recolor Plan

> 品牌名：码帧 / TutorReel | 配色：方案 A 极简灰·青蓝
> 执行时间：2026-05-03

---

## Phase 1: 改名

- [x] P1-1 `package.json` — name, productName, appId, description
- [x] P1-2 `electron/main.ts` — 窗口标题、启动画面
- [x] P1-3 `index.html` — `<title>`
- [x] P1-4 `src/components/ui/TopBar.tsx` — Logo 旁文本
- [x] P1-5 `src/Composition.tsx` — 水印文字
- [x] P1-6 `CLAUDE.md` — 项目名
- [x] P1-7 `README.md` — 项目名
- [x] P1-8 `docs/packaging-guide.md` — 引用更新

## Phase 2: 改色

- [x] P2-1 `src/themes/tokens.ts` — 3 组新色值
- [x] P2-2 `src/index.css` — 滚动条色 + accent
- [x] P2-3 `src/components/ui/*` — indigo → cyan (TopBar, Sidebar, SettingsModal, LicenseModal, HistoryPanel)
- [x] P2-4 `src/components/editor/*` — indigo → cyan (ProblemEditor, ProgrammingEditor, GrammarEditor, BatchEditor)
- [x] P2-5 `src/templates/*` — indigo → cyan + #6366f1 → #22B8CF (JavaInterviewTemplate, LeetCodeTemplate)
- [x] P2-6 `src/components/visualizers/*` — indigo → cyan (Array, Tree, LinkedList, Grid, Graph, Comparison, Timeline)
- [x] P2-7 `src/plugins/*/index.ts` — defaultTheme.accent #6366f1 → #22B8CF

## 配色参考

```
暗色 Dark:    bg=#0B0B0D card=#141416 text1=#EDEDEF text2=#6E6E77 border=#232326
亮色 Light:   bg=#F7F7F8 card=#FFFFFF text1=#18181B text2=#71717A border=#E4E4E7
Accent:       #22B8CF (cyan-500) | hover: #06B6D4 (cyan-500)
```
