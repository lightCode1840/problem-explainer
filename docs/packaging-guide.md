# 打包安装包操作手册

> 本文档记录将 码帧 TutorReel 打包为桌面安装包的完整流程，以及历次踩坑的解决方案。

---

## 一、前置环境检查

打包前确认以下内容已就绪：

| 项目 | 说明 |
|------|------|
| Node.js ≥ 18 | `node -v` 确认 |
| npm 依赖已安装 | `npm install` 完成，包含 `electron`、`electron-builder` |
| `build/icon.ico` | Windows 应用图标（必须存在，否则 electron-builder 报错） |
| `build/icon.icns` | macOS 应用图标（打 dmg 时需要） |
| `.env` 不会被打包 | 生产环境通过用户在 SettingsModal 填写 API Key，不依赖 .env |

---

## 二、标准打包步骤

### Windows（.exe 安装包）

```powershell
# 一条命令完成所有构建 + 打包
npm run dist:win
```

等价于：

```powershell
npm run build          # 步骤 1-4 见下方
npx electron-builder --win
```

### macOS（.dmg 安装包）

```bash
npm run dist:mac
```

> **注意**：macOS 包必须在 Mac 设备上打。Windows 设备无法交叉编译 .dmg。

---

## 三、构建步骤详解

`npm run build` 依次执行四个子步骤，**顺序不能乱**：

```
build:web          →  Vite 构建前端 SPA → dist/
build:remotion     →  Remotion bundle  → build/      ⚠️ 输出目录固定为 build/，--out 参数无效
build:server-bundle→  esbuild 打包服务端 → dist-electron/server.cjs
build:main-bundle  →  esbuild 打包 Electron 主进程 → dist-electron/main.js + preload.js
```

构建产物分布：

```
dist/                ← 前端 SPA（被 extraResources 以 dist → resources/dist 方式打入包）
build/               ← Remotion bundle（被 extraResources 以 build → resources/remotion-bundle 方式打入包）
dist-electron/       ← Electron 主进程 + 服务端（被 files 打入 ASAR）
```

---

## 四、关键配置说明（package.json build 段）

### 4.1 files vs extraResources

`files` 数组**遵守 .gitignore**，`dist/` 和 `build/` 均在 .gitignore 中，**不能**用 `files` 包含它们。

必须用 `extraResources`（绕过 .gitignore）：

```json
"extraResources": [
  { "from": "dist",  "to": "dist" },
  { "from": "build", "to": "remotion-bundle" }
]
```

打包后在安装目录 `resources/` 下可见：

```
resources/
  dist/                ← 前端 SPA
  remotion-bundle/     ← Remotion bundle（含 index.html、*.wasm 等全部文件）
  app.asar             ← 主进程 + node_modules
  app.asar.unpacked/   ← asarUnpack 解压的 native 模块
```

> ⚠️ 不要给 `extraResources` 里的 `build` 条目加 `filter`。之前过滤了 `*.wasm`，导致 Remotion 渲染时找不到 `source-map-helper.wasm`，Express 返回了 HTML 的 SPA fallback，JSON.parse 报错 `Unexpected token '<'`。

### 4.2 asarUnpack

native 二进制必须解包到 ASAR 外部才能执行：

```json
"asarUnpack": [
  "node_modules/@remotion/compositor-*/**",
  "node_modules/ffmpeg-static/**",
  "node_modules/get-audio-duration/**"
]
```

`@remotion/compositor-win32-x64-msvc` 包含 `remotion.exe`（无头 Chromium）、`ffmpeg.exe`、`ffprobe.exe`，是视频导出的核心依赖。

### 4.4 端口冲突自动回退

如果 3001 端口被占用，服务器会自动尝试 3002 → 3003 → ... → 3006（最多 5 次回退）。启动成功后更新 `process.env.PORT`，Electron 主进程会自动跟随新的端口号。

此逻辑在 `src/server.ts` 的 `startServer()` 函数中实现，通过 `err.code === 'EADDRINUSE'` 检测端口冲突。

Express 5 不支持裸 `*` 通配符路由，`app.get('*', handler)` 会在启动时抛出：

```
TypeError: Missing parameter name at index 1: *
```

`src/server.ts` 中的 SPA fallback 必须写成：

```typescript
// ✅ 正确：Express 5 兼容
app.use((_req, res) => {
  res.sendFile(path.join(distPath, 'index.html'));
});

// ❌ 错误：Express 5 启动时崩溃
app.get('*', (_req, res) => { ... });
```

---

## 五、受限网络环境（GitHub 无法访问）

electron-builder 打包过程中会自动下载以下工具，网络受限时需要提前手动准备：

### 5.1 Electron 二进制

安装 `electron` npm 包时会自动下载，缓存在：

```
%LOCALAPPDATA%\electron\Cache\electron-v41.5.0-win32-x64.zip
```

如果缓存存在，打包时通过环境变量指定：

```powershell
$env:ELECTRON_CACHE = "$env:LOCALAPPDATA\electron\Cache"
npx electron-builder --win
```

### 5.2 winCodeSign（Windows 代码签名工具）

electron-builder 缓存目录：`%LOCALAPPDATA%\electron-builder\Cache\winCodeSign\`

手动下载地址（从 electron-builder 报错信息中获取确切版本号和 URL）：

```powershell
# 示例（版本号以实际报错为准）
Invoke-WebRequest -Uri "https://github.com/electron-userland/electron-builder-binaries/releases/download/winCodeSign-2.6.0/winCodeSign-2.6.0.7z" -OutFile "winCodeSign.7z"

# 用 npm 自带的 7za 解压
$sevenZip = "node_modules\7zip-bin\win\x64\7za.exe"
& $sevenZip x winCodeSign.7z -o"$env:LOCALAPPDATA\electron-builder\Cache\winCodeSign\winCodeSign-2.6.0"
```

### 5.3 NSIS（安装包制作工具）

缓存目录：`%LOCALAPPDATA%\electron-builder\Cache\nsis\`

```powershell
Invoke-WebRequest -Uri "https://github.com/electron-userland/electron-builder-binaries/releases/download/nsis-3.0.4.2/nsis-3.0.4.2.7z" -OutFile "nsis.7z"
& $sevenZip x nsis.7z -o"$env:LOCALAPPDATA\electron-builder\Cache\nsis\nsis-3.0.4.2"
```

> 具体版本号和下载地址以 `npx electron-builder --win` 报错输出为准，报错中会打印完整 URL。

### 5.4 ffmpeg-static（已从项目中移除）

`ffmpeg-static` 包在 npm install 时从 GitHub 下载二进制，网络受限时会超时。该依赖已从 `package.json` 移除，视频合并功能改为 fallback 到系统 `ffmpeg`（Remotion 的 `@remotion/compositor-*` 已内置 ffmpeg.exe）。

---

## 六、常见报错速查

| 报错 | 原因 | 解决方案 |
|------|------|---------|
| `Cannot GET /` | `dist/` 未被打入安装包（被 .gitignore 拦截） | 确保 `extraResources` 中有 `{ "from": "dist", "to": "dist" }` |
| `TypeError: Missing parameter name at index 1: *` | Express 5 不支持 `app.get('*', ...)` | 改为 `app.use(handler)` 放在所有 API 路由之后 |
| `Unexpected token '<'` 导出失败 | Remotion bundle 中缺少 `.wasm` 文件，Chromium 请求时拿到 HTML | 去掉 `extraResources` 中 `build` 条目的 `filter`，打包全部文件 |
| `ERR_ELECTRON_BUILDER_CANNOT_EXECUTE` | winCodeSign 或 nsis 工具下载失败 | 手动下载并解压到 electron-builder 缓存目录（见第五节） |
| Electron binary 下载失败 | GitHub 网络不可达 | 设置 `ELECTRON_CACHE` 环境变量指向本地缓存 |
| `remotion bundle --out` 参数被忽略 | Remotion v4 不支持 `--out` 参数，输出固定为 `build/` | 移除 `--out` 参数，所有路径统一引用 `build/` |

---

## 七、PEX_* 环境变量（运行时路径）

打包应用启动时，`electron/main.ts` 会在加载服务器之前设置以下环境变量：

| 变量 | 开发时 | 打包后 |
|------|--------|--------|
| `PEX_APP_DIR` | 项目根目录 | `process.resourcesPath` |
| `PEX_DATA_DIR` | 项目根目录 | `~/Library/Application Support/码帧 TutorReel`（Mac）或 `%APPDATA%\码帧 TutorReel`（Win） |
| `PEX_REMOTION_BUNDLE_DIR` | `build/` | `resources/remotion-bundle/` |

`PEX_DATA_DIR` 用于存放用户生成的数据（TTS 音频、导出的 MP4），与只读的 `resources/` 分离，避免权限问题。

---

## 八、输出产物

打包成功后，安装包输出在 `dist-app/`：

```
dist-app/
  码帧 TutorReel Setup 1.0.0.exe   ← Windows NSIS 安装程序
  码帧 TutorReel-1.0.0.dmg         ← macOS 磁盘镜像（Mac 上打包）
```
