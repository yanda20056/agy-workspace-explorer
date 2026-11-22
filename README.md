# Workspace Explorer

**[简体中文](#简体中文) | [English](#english)**

---

<a id="简体中文"></a>

## 简体中文

专为 **Google Antigravity** 打造的轻量级**本地工程文件目录树 & 多工程浏览** UI 插件（MCP App）。弥补 Antigravity App 右侧辅助面板缺少完整工作区文件目录树的痛点。

### 一键安装

环境要求：本机 `PATH` 中已安装 **Node.js >= 20**（仓库 `dist/` 目录已内置零依赖打包产物，安装后无需执行 `npm install`，开箱即用）。

```bash
agy plugin install https://github.com/yanda20056/agy-workspace-explorer
```

### 核心功能

- **自动定位当前对话 / 当前选中工程**：
  - 内置轻量生命周期 Hook（`SessionStart` / `PreInvocation`）与 `~/.gemini/config/projects/` 活跃时间检测，打开面板时自动聚焦**当前正在对话或刚选中的工程**。
  - 面板常驻打开时，在主界面切换工程或切换到其他工程对话框发消息，目录树会自动跟随切换；同时支持顶部一键切换查看**全部已注册工程**。
- **右侧辅助面板 & 左侧全屏双入口**：
  - 在对话界面右侧辅助面板点击 **`+` -> `Workspace Explorer`** 作为常驻侧边栏标签页打开；也可从左侧边栏全屏打开。
- **双模式打开开关（`分栏` / `原生`，默认内置分栏查看 + 右侧常驻目录树）**：
  - 工程下拉菜单旁内置 **`Split` / `分栏` ↔ `AGY` / `原生`** 模式切换开关（自动记住偏好）：
    - **`Split` / `分栏` 模式（默认）**：采用与 AGY 原生一致的**左看文件内容 + 右侧常驻文件树**分栏布局（中间分隔条可左右拖拽调节文件树宽度）。在右侧点击任意文件时，直接在左侧实时切换查看内容，**右侧文件树全程常驻不消失**：
      - **多标签页常驻（Multi-Tab）**：顶部支持多文件标签栏（点击切换、悬停或中键关闭、自动记忆每个标签页的滚动位置与渲染模式），重复点击同一文件自动激活已有标签页而不重复加载。
      - **文件内搜索（`Ctrl+F` / `Cmd+F`）**：内置查看器支持快捷键 `Ctrl+F`（或顶部搜索图标）呼出页面内查找栏，支持 **`Aa` 区分大小写**、**`.*` 正则表达式**、实时命中计数高亮，以及 `Enter` / `Shift+Enter` 上下跳转。
      - **文件树自动定位同步（Auto-Reveal，默认开启）**：顶部工具栏（模式切换与语言切换旁）内置准星定位开关，开启后凡是在内置查看器中打开或切换标签页的文件，右侧文件树会自动展开对应父目录、高亮选中并智能滚动定位（类似 Rider / VS Code）。
      - **Markdown (`.md`)**：内置 GitHub 风格 Markdown 渲染器（支持表格、标题、代码块语法高亮、引用、任务列表），顶部支持 **`预览 (Preview)` / `源码 (Raw)`** 一键切换。
      - **代码与文本文件**：带独立行号列（复制代码时不会连带复制行号）、轻量语法高亮、**`换行 (Wrap)`** 开关与 **`复制全文 (Copy)`**。
      - **图片文件 (`.png` / `.jpg` / `.svg` / `.webp` / `.gif`)**：内置透明棋盘格图片预览，自动显示图片分辨率尺寸与文件大小（`.svg` 同时支持预览与源码切换）。
      - **二进制 / Office 文档（`.docx` / `.pptx` / `.xlsx` / `.pdf` 等）**：居中友好提示并提供 **`在系统文件窗口中打开 (Reveal in File Explorer)`** 按钮，一键打开系统资源管理器并选中该文件。
      - 顶部同时保留 **`原生打开 (AGY Tab)`** 按钮，随时一键弹出 AGY 原生标签页。
    - **`AGY` / `原生` 模式**：左键点击文件直接调用 `com.google.antigravity/toggle-aux-pane` 在 AGY 原生 `fileView` 标签页中打开。
- **增强型搜索（模糊 / 正则 / 大小写）**：
  - 默认限定在当前工程内极速递归搜索（切换至“全部工程”视图时可跨所有工程搜索），自动跳过 `node_modules`、`.git`、`library`、`temp` 等缓存目录。
  - 搜索框内置三个模式开关：
    - `~` **模糊查找（Fuzzy Match，默认开启）**：支持非连续子序列、驼峰首字母与路径片段匹配并智能排序；关闭后切换为精确连续子串匹配。
    - `Aa` **区分大小写（Match Case）**：对模糊、子串、正则三种模式均生效。
    - `.*` **正则表达式（Regular Expression）**：支持完整正则匹配文件名或相对路径，语法错误实时友好提示。
  - 搜索结果支持命中字符高亮，以及一键在目录树中逐级展开并滚动定位（瞄准镜图标）。
- **快捷路径操作 & 右键菜单**：
  - 悬停或右键点击任意文件/文件夹，支持**在系统文件窗口中打开并高亮选中**（Windows Explorer / macOS Finder）、一键**复制相对路径**（`./`）、**复制绝对路径**、**复制文件名**，或直接将路径附加到当前对话上下文。
- **中英文双语切换（默认英文）**：
  - 工程下拉菜单右侧内置 **`EN` / `中`** 语言切换按钮，默认显示英文界面，支持一键切换中英文并自动记住语言偏好。

### 本地二次开发

```bash
npm install
npm run build
agy plugin validate --strict .
```

---

<a id="english"></a>

## English

A lightweight project file tree & multi-project browser MCP App plugin for **Google Antigravity**.

### Quick Install

Requires **Node.js >= 20** on your `PATH`. No `npm install` needed — prebuilt zero-dependency bundles are included in `dist/`.

```bash
agy plugin install https://github.com/yanda20056/agy-workspace-explorer
```

### Features

- **Auto-Follow Active Conversation & Selected Project**: Automatically detects and focuses the project of your active conversation (via lifecycle hooks) or most recently selected Antigravity project (`~/.gemini/config/projects/`), with a one-click toggle to browse all registered projects.
- **Side Pane & Full-Page Entrypoints**: Open directly from the auxiliary side pane (`+` -> **Workspace Explorer**) or from the left sidebar (**Workspace Explorer**).
- **Dual File-Open Mode Toggle (`Split` / `AGY`, Split View by default)**:
  - One-click **`Split` ↔ `AGY`** toggle button next to the project dropdown (persisted across sessions):
    - **`Split` Mode (Built-in Left Viewer + Right Docked File Tree)**: Keeps the enhanced file tree permanently docked on the right (with a draggable vertical splitter) while opening clicked files on the left:
      - **Multi-Tab Bar**: Keep multiple files open simultaneously with tab switching, middle-click or `×` close, per-tab scroll & render-mode persistence, and automatic click deduplication.
      - **In-File Find (`Ctrl+F` / `Cmd+F`)**: Search inside the currently opened file (Markdown preview or source code) with **`Aa` Match Case**, **`.*` Regex**, live match counter, and `Enter` / `Shift+Enter` navigation.
      - **Auto-Reveal Active File in Tree (Enabled by Default)**: Crosshair toggle button next to the mode and language switches; automatically expands parent directories, highlights, and smart-scrolls to the active viewer file in the right-hand file tree (similar to Rider / VS Code).
      - **Markdown (`.md`)**: Built-in GFM Markdown renderer (tables, headings, fenced code blocks with syntax highlighting, blockquotes, task lists) with a **`Preview` | `Raw`** toggle.
      - **Code & Text**: Syntax-highlighted code viewer with a non-selectable line-number gutter (clean copy-paste), **`Wrap`** toggle, and one-click **`Copy`**.
      - **Images (`.png`, `.jpg`, `.svg`, `.webp`, `.gif`)**: Centered image preview on a transparency grid with pixel dimensions and file size.
      - **Binary / Office Files (`.docx`, `.pptx`, `.xlsx`, `.pdf`, etc.)**: Displays a clean **`Binary file is not supported`** view with a **`Reveal in File Explorer`** button.
      - Includes an **`AGY Tab`** button in the viewer header to pop the file into Antigravity's native `fileView` tab anytime.
    - **`AGY` Mode (Native Tab)**: Clicking any file opens it directly in Antigravity's native side-pane `fileView` tab (`com.google.antigravity/toggle-aux-pane`).
- **Fuzzy, Regex & Case-Sensitive Search**: Fast recursive search scoped to the current project (or across all projects) supporting fuzzy subsequence matching (`~`), case sensitivity (`Aa`), regular expressions (`.*`), match highlighting, and one-click reveal in tree.
- **Quick Path Actions & OS Reveal**: Reveal any file or folder directly in your system file manager (Windows Explorer / macOS Finder), copy relative path, copy full path, copy file name, or attach selected paths directly to your conversation context.
- **Bilingual UI (`EN` / `中`, English by default)**: One-click language toggle button next to the project dropdown to switch between English and Chinese at any time, with persistent preference.

### Local Development

```bash
npm install
npm run build
agy plugin validate --strict .
```

## License

MIT
